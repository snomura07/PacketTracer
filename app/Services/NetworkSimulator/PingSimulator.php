<?php

namespace App\Services\NetworkSimulator;

use App\Models\Device;
use App\Models\DeviceInterface;
use App\Models\Link;
use App\Models\NetworkCloud;
use App\Models\NetworkProject;
use App\Models\RouteEntry;
use Illuminate\Support\Collection;

class PingSimulator
{
    public function simulate(
        NetworkProject $project,
        int $sourceDeviceId,
        string $destinationType,
        int $destinationId,
    ): array {
        $project->loadMissing([
            'devices.interfaces',
            'devices.routeEntries',
            'networkClouds',
            'links',
        ]);

        $source = $project->devices->firstWhere('id', $sourceDeviceId);
        if (!$source instanceof Device) {
            return $this->failure('SOURCE_NOT_FOUND', 'Source device was not found.', []);
        }

        $sourceInterfaces = $this->usableIpInterfaces($source);
        if ($sourceInterfaces->isEmpty()) {
            return $this->failure(
                'SOURCE_IP_MISSING',
                'Source device does not have a usable IP interface.',
                [
                    $this->hop($source->name, 'validate-source', 'failed', 'No usable IP interface is configured on the source device.'),
                ],
            );
        }

        if ($destinationType === 'device') {
            $destination = $project->devices->firstWhere('id', $destinationId);

            if (!$destination instanceof Device) {
                return $this->failure('DESTINATION_NOT_FOUND', 'Destination device was not found.', []);
            }

            $destinationInterfaces = $this->usableIpInterfaces($destination);
            if ($destinationInterfaces->isEmpty()) {
                return $this->failure(
                    'DESTINATION_IP_MISSING',
                    'Destination device does not have a usable IP interface.',
                    [
                        $this->hop($destination->name, 'validate-destination', 'failed', 'No usable IP interface is configured on the destination device.'),
                    ],
                );
            }

            return $this->simulateAcrossDeviceInterfaces(
                $project,
                $source,
                $sourceInterfaces,
                $destination,
                $destinationInterfaces,
            );
        }

        $cloud = $project->networkClouds->firstWhere('id', $destinationId);
        if (!$cloud instanceof NetworkCloud) {
            return $this->failure('DESTINATION_NOT_FOUND', 'Destination cloud was not found.', []);
        }

        return $this->simulateAcrossSourceInterfacesToCloud($project, $source, $sourceInterfaces, $cloud);
    }

    private function simulateAcrossDeviceInterfaces(
        NetworkProject $project,
        Device $source,
        Collection $sourceInterfaces,
        Device $destination,
        Collection $destinationInterfaces,
    ): array {
        $firstFailure = null;

        foreach ($sourceInterfaces as $sourceInterface) {
            if (!$sourceInterface instanceof DeviceInterface) {
                continue;
            }

            foreach ($destinationInterfaces as $destinationInterface) {
                if (!$destinationInterface instanceof DeviceInterface) {
                    continue;
                }

                $result = $this->simulateToDevice(
                    $project,
                    $source,
                    $sourceInterface,
                    $destination,
                    $destinationInterface,
                );

                if (($result['success'] ?? false) === true) {
                    return $result;
                }

                $firstFailure ??= $result;
            }
        }

        return $firstFailure ?? $this->failure(
            'SOURCE_IP_MISSING',
            'Source device does not have a usable IP interface.',
            [],
        );
    }

    private function simulateAcrossSourceInterfacesToCloud(
        NetworkProject $project,
        Device $source,
        Collection $sourceInterfaces,
        NetworkCloud $cloud,
    ): array {
        $firstFailure = null;

        foreach ($sourceInterfaces as $sourceInterface) {
            if (!$sourceInterface instanceof DeviceInterface) {
                continue;
            }

            $result = $this->simulateToCloud($project, $source, $sourceInterface, $cloud);

            if (($result['success'] ?? false) === true) {
                return $result;
            }

            $firstFailure ??= $result;
        }

        return $firstFailure ?? $this->failure(
            'SOURCE_IP_MISSING',
            'Source device does not have a usable IP interface.',
            [],
        );
    }

    private function simulateToDevice(
        NetworkProject $project,
        Device $source,
        DeviceInterface $sourceInterface,
        Device $destination,
        DeviceInterface $destinationInterface,
    ): array {
        $arpTable = [];
        $hops = [
            $this->hop(
                $source->name,
                'start',
                'ok',
                sprintf('Source IP %s/%s.', $sourceInterface->ip_address, $sourceInterface->subnet_mask),
            ),
        ];

        if ($this->inSameSubnet(
            $sourceInterface->ip_address,
            $sourceInterface->subnet_mask,
            $destinationInterface->ip_address,
        )) {
            $hops[] = $this->hop(
                $source->name,
                'same-subnet-check',
                'ok',
                sprintf('%s is in the same subnet.', $destination->name),
            );

            if ($this->isLayer2Reachable($project, $sourceInterface->id, $destinationInterface->id)) {
                $arpResolution = $this->resolveArpEntry(
                    $project,
                    $sourceInterface,
                    $destinationInterface->ip_address,
                );

                if (!$arpResolution['success']) {
                    $hops[] = $this->hop($source->name, 'arp', 'failed', $arpResolution['message']);

                    return $this->failure(
                        'ARP_TARGET_UNRESOLVED',
                        'Destination MAC address could not be resolved.',
                        $hops,
                        $arpTable,
                    );
                }

                $arpTable[] = $arpResolution['entry'];
                $hops[] = $this->hop($source->name, 'arp', 'ok', $arpResolution['message']);
                $hops[] = $this->hop($destination->name, 'deliver', 'ok', 'Destination interface is reachable on the same L2 path.');

                return $this->success($source->name, $destination->name, $hops, $arpTable);
            }

            $hops[] = $this->hop($source->name, 'same-subnet-check', 'failed', 'Destination is in the same subnet but no cable/L2 path exists.');

            return $this->failure('L2_PATH_MISSING', 'Same-subnet destination is not reachable on the current links.', $hops);
        }

        if (!$source->default_gateway) {
            $hops[] = $this->hop($source->name, 'default-gateway', 'failed', 'Default gateway is not configured.');

            return $this->failure('DEFAULT_GATEWAY_MISSING', 'Source device is missing a default gateway.', $hops);
        }

        if (!$this->inSameSubnet(
            $sourceInterface->ip_address,
            $sourceInterface->subnet_mask,
            $source->default_gateway,
        )) {
            $hops[] = $this->hop($source->name, 'default-gateway', 'failed', 'Default gateway is outside the source subnet.');

            return $this->failure('DEFAULT_GATEWAY_INVALID', 'Default gateway is not in the source subnet.', $hops);
        }

        $gatewayInterface = $this->findInterfaceByIp($project->devices, $source->default_gateway);
        if (!$gatewayInterface instanceof DeviceInterface) {
            $hops[] = $this->hop($source->name, 'gateway-resolution', 'failed', 'No interface matches the configured default gateway.');

            return $this->failure('GATEWAY_INTERFACE_NOT_FOUND', 'Configured default gateway was not found on any device interface.', $hops);
        }

        if (!$this->isLayer2Reachable($project, $sourceInterface->id, $gatewayInterface->id)) {
            $hops[] = $this->hop($source->name, 'gateway-resolution', 'failed', 'Default gateway exists but is not L2 reachable.');

            return $this->failure('GATEWAY_NOT_REACHABLE', 'Default gateway is not reachable on the current topology.', $hops, $arpTable);
        }

        $gatewayArpResolution = $this->resolveArpEntry($project, $sourceInterface, $source->default_gateway);
        if (!$gatewayArpResolution['success']) {
            $hops[] = $this->hop($source->name, 'arp', 'failed', $gatewayArpResolution['message']);

            return $this->failure(
                'GATEWAY_ARP_UNRESOLVED',
                'Default gateway MAC address could not be resolved.',
                $hops,
                $arpTable,
            );
        }

        $arpTable[] = $gatewayArpResolution['entry'];
        $hops[] = $this->hop($source->name, 'arp', 'ok', $gatewayArpResolution['message']);

        $gatewayDevice = $project->devices->firstWhere('id', $gatewayInterface->device_id);
        $hops[] = $this->hop(
            $source->name,
            'default-gateway',
            'ok',
            sprintf('Traffic is forwarded to default gateway %s on %s.', $source->default_gateway, $gatewayDevice?->name ?? 'unknown'),
        );

        if (!$gatewayDevice instanceof Device) {
            return $this->failure('ROUTER_NOT_FOUND', 'The gateway device could not be resolved.', $hops);
        }

        $routeDecision = $this->resolveDeviceRoute($project, $gatewayDevice, $destinationInterface->ip_address);
        $hops = [...$hops, ...$routeDecision['hops']];

        if (!$routeDecision['success']) {
            return $this->failure($routeDecision['error_code'], $routeDecision['error_message'], $hops, $arpTable);
        }

        /** @var DeviceInterface|null $exitInterface */
        $exitInterface = $routeDecision['exit_interface'];
        if (!$exitInterface instanceof DeviceInterface) {
            return $this->failure('EXIT_INTERFACE_MISSING', 'No exit interface was selected for the route.', $hops, $arpTable);
        }

        $nextHopIp = $routeDecision['next_hop_ip'];
        if (is_string($nextHopIp)) {
            $nextHopArpResolution = $this->resolveArpEntry($project, $exitInterface, $nextHopIp);

            if (!$nextHopArpResolution['success']) {
                $hops[] = $this->hop($gatewayDevice->name, 'arp', 'failed', $nextHopArpResolution['message']);

                return $this->failure(
                    'NEXT_HOP_ARP_UNRESOLVED',
                    'Next-hop MAC address could not be resolved.',
                    $hops,
                    $arpTable,
                );
            }

            $arpTable[] = $nextHopArpResolution['entry'];
            $hops[] = $this->hop($gatewayDevice->name, 'arp', 'ok', $nextHopArpResolution['message']);
        }

        if (!$this->isLayer2Reachable($project, $exitInterface->id, $destinationInterface->id)) {
            $hops[] = $this->hop($gatewayDevice->name, 'deliver', 'failed', 'Route exists but destination interface is not reachable on L2 from the exit interface.');

            return $this->failure('DESTINATION_L2_UNREACHABLE', 'Route exists but the destination interface is not reachable on the current links.', $hops, $arpTable);
        }

        $hops[] = $this->hop($destination->name, 'deliver', 'ok', 'Destination reached through routed path.');

        if (!$this->hasReturnPath($project, $destination, $destinationInterface, $sourceInterface->ip_address)) {
            $hops[] = $this->hop($destination->name, 'return-path', 'failed', 'No return path to the source network was found.');

            return $this->failure('RETURN_PATH_MISSING', 'Destination does not have a return path to the source network.', $hops, $arpTable);
        }

        $hops[] = $this->hop($destination->name, 'return-path', 'ok', 'Return path to the source network exists.');

        return $this->success($source->name, $destination->name, $hops, $arpTable);
    }

    private function simulateToCloud(
        NetworkProject $project,
        Device $source,
        DeviceInterface $sourceInterface,
        NetworkCloud $cloud,
    ): array {
        $arpTable = [];
        $hops = [
            $this->hop(
                $source->name,
                'start',
                'ok',
                sprintf('Source IP %s/%s.', $sourceInterface->ip_address, $sourceInterface->subnet_mask),
            ),
        ];

        if (!$source->default_gateway) {
            $hops[] = $this->hop($source->name, 'default-gateway', 'failed', 'Default gateway is not configured.');

            return $this->failure('DEFAULT_GATEWAY_MISSING', 'Source device is missing a default gateway.', $hops);
        }

        $gatewayInterface = $this->findInterfaceByIp($project->devices, $source->default_gateway);
        if (!$gatewayInterface instanceof DeviceInterface) {
            $hops[] = $this->hop($source->name, 'gateway-resolution', 'failed', 'No interface matches the configured default gateway.');

            return $this->failure('GATEWAY_INTERFACE_NOT_FOUND', 'Configured default gateway was not found on any device interface.', $hops);
        }

        if (!$this->isLayer2Reachable($project, $sourceInterface->id, $gatewayInterface->id)) {
            $hops[] = $this->hop($source->name, 'gateway-resolution', 'failed', 'Default gateway exists but is not L2 reachable.');

            return $this->failure('GATEWAY_NOT_REACHABLE', 'Default gateway is not reachable on the current topology.', $hops, $arpTable);
        }

        $gatewayArpResolution = $this->resolveArpEntry($project, $sourceInterface, $source->default_gateway);
        if (!$gatewayArpResolution['success']) {
            $hops[] = $this->hop($source->name, 'arp', 'failed', $gatewayArpResolution['message']);

            return $this->failure(
                'GATEWAY_ARP_UNRESOLVED',
                'Default gateway MAC address could not be resolved.',
                $hops,
                $arpTable,
            );
        }

        $arpTable[] = $gatewayArpResolution['entry'];
        $hops[] = $this->hop($source->name, 'arp', 'ok', $gatewayArpResolution['message']);

        $gatewayDevice = $project->devices->firstWhere('id', $gatewayInterface->device_id);
        $hops[] = $this->hop(
            $source->name,
            'default-gateway',
            'ok',
            sprintf('Traffic is forwarded to default gateway %s on %s.', $source->default_gateway, $gatewayDevice?->name ?? 'unknown'),
        );

        if (!$gatewayDevice instanceof Device) {
            return $this->failure('ROUTER_NOT_FOUND', 'The gateway device could not be resolved.', $hops);
        }

        $cloudDecision = $this->resolveCloudRoute($project, $gatewayDevice, $cloud);
        $hops = [...$hops, ...$cloudDecision['hops']];

        if (!$cloudDecision['success']) {
            return $this->failure($cloudDecision['error_code'], $cloudDecision['error_message'], $hops, $arpTable);
        }

        $hops[] = $this->hop($cloud->name, 'deliver', 'ok', 'Cloud destination reached.');

        return $this->success($source->name, $cloud->name, $hops, $arpTable);
    }

    private function resolveDeviceRoute(NetworkProject $project, Device $router, string $destinationIp): array
    {
        $hops = [];

        foreach ($router->interfaces as $interface) {
            if (
                $interface->ip_address &&
                $interface->subnet_mask &&
                $this->inSameSubnet($interface->ip_address, $interface->subnet_mask, $destinationIp)
            ) {
                $hops[] = $this->hop($router->name, 'route-lookup', 'ok', sprintf('Destination matches directly connected network on %s.', $interface->name));

                return [
                    'success' => true,
                    'exit_interface' => $interface,
                    'next_hop_ip' => $destinationIp,
                    'hops' => $hops,
                    'error_code' => null,
                    'error_message' => null,
                ];
            }
        }

        $route = $this->findBestRoute($router->routeEntries, $destinationIp);
        if (!$route instanceof RouteEntry) {
            $hops[] = $this->hop($router->name, 'route-lookup', 'failed', 'No matching route entry was found.');

            return [
                'success' => false,
                'exit_interface' => null,
                'next_hop_ip' => null,
                'hops' => $hops,
                'error_code' => 'ROUTE_NOT_FOUND',
                'error_message' => 'No route to the destination network was found.',
            ];
        }

        $interface = $router->interfaces->firstWhere('id', $route->outgoing_interface_id);
        if (!$interface instanceof DeviceInterface) {
            $hops[] = $this->hop($router->name, 'route-lookup', 'failed', 'Matched route entry has no valid outgoing interface.');

            return [
                'success' => false,
                'exit_interface' => null,
                'next_hop_ip' => null,
                'hops' => $hops,
                'error_code' => 'OUTGOING_INTERFACE_MISSING',
                'error_message' => 'The matched route does not specify a usable outgoing interface.',
            ];
        }

        $hops[] = $this->hop(
            $router->name,
            'route-lookup',
            'ok',
            sprintf(
                'Matched route %s/%s via %s on %s.',
                $route->destination_network,
                $route->subnet_mask,
                $route->next_hop ?? 'direct',
                $interface->name,
            ),
        );

        return [
            'success' => true,
            'exit_interface' => $interface,
            'next_hop_ip' => $route->next_hop ?? $destinationIp,
            'hops' => $hops,
            'error_code' => null,
            'error_message' => null,
        ];
    }

    private function resolveCloudRoute(NetworkProject $project, Device $router, NetworkCloud $cloud): array
    {
        $hops = [];

        $cloudLink = $project->links->first(
            fn (Link $link) => $link->network_cloud_id === $cloud->id &&
                $router->interfaces->contains('id', $link->interface_a_id),
        );

        if ($cloud->type === NetworkCloud::TYPE_INTERNET) {
            $defaultRoute = $router->routeEntries->first(
                fn (RouteEntry $routeEntry) => $routeEntry->destination_network === '0.0.0.0' &&
                    $routeEntry->subnet_mask === '0.0.0.0',
            );

            if (!$defaultRoute instanceof RouteEntry) {
                $hops[] = $this->hop($router->name, 'route-lookup', 'failed', 'Internet requires a default route, but none was found.');

                return [
                    'success' => false,
                    'hops' => $hops,
                    'error_code' => 'DEFAULT_ROUTE_MISSING',
                    'error_message' => 'No default route was found for the Internet cloud.',
                ];
            }

            $interface = $router->interfaces->firstWhere('id', $defaultRoute->outgoing_interface_id);
            if (!$cloudLink instanceof Link || !$interface instanceof DeviceInterface || $cloudLink->interface_a_id !== $interface->id) {
                $hops[] = $this->hop($router->name, 'route-lookup', 'failed', 'Default route exists but its interface is not linked to the Internet cloud.');

                return [
                    'success' => false,
                    'hops' => $hops,
                    'error_code' => 'CLOUD_LINK_MISSING',
                    'error_message' => 'Default route interface is not connected to the Internet cloud.',
                ];
            }

            $hops[] = $this->hop($router->name, 'route-lookup', 'ok', sprintf('Default route uses %s and reaches the Internet cloud.', $interface->name));

            return [
                'success' => true,
                'hops' => $hops,
                'error_code' => null,
                'error_message' => null,
            ];
        }

        if (!$cloud->network_address || !$cloud->subnet_mask) {
            $hops[] = $this->hop($cloud->name, 'validate-cloud', 'failed', 'Cloud network address or subnet mask is missing.');

            return [
                'success' => false,
                'hops' => $hops,
                'error_code' => 'CLOUD_NETWORK_MISSING',
                'error_message' => 'Cloud network address or mask is missing.',
            ];
        }

        $route = $this->findBestRoute($router->routeEntries, $cloud->network_address);
        if (!$route instanceof RouteEntry) {
            $hops[] = $this->hop($router->name, 'route-lookup', 'failed', 'No static route was found for the cloud network.');

            return [
                'success' => false,
                'hops' => $hops,
                'error_code' => 'CLOUD_ROUTE_MISSING',
                'error_message' => 'No static route to the cloud network was found.',
            ];
        }

        $interface = $router->interfaces->firstWhere('id', $route->outgoing_interface_id);
        if (!$cloudLink instanceof Link || !$interface instanceof DeviceInterface || $cloudLink->interface_a_id !== $interface->id) {
            $hops[] = $this->hop($router->name, 'route-lookup', 'failed', 'Static route exists but its outgoing interface is not linked to the target cloud.');

            return [
                'success' => false,
                'hops' => $hops,
                'error_code' => 'CLOUD_LINK_MISSING',
                'error_message' => 'Static route interface is not connected to the target cloud.',
            ];
        }

        $hops[] = $this->hop(
            $router->name,
            'route-lookup',
            'ok',
            sprintf(
                'Matched cloud route %s/%s via %s on %s.',
                $route->destination_network,
                $route->subnet_mask,
                $route->next_hop ?? 'direct',
                $interface->name,
            ),
        );

        return [
            'success' => true,
            'hops' => $hops,
            'error_code' => null,
            'error_message' => null,
        ];
    }

    private function hasReturnPath(NetworkProject $project, Device $destination, DeviceInterface $destinationInterface, string $sourceIp): bool
    {
        if (!$destination->default_gateway) {
            return false;
        }

        if ($this->inSameSubnet($destinationInterface->ip_address, $destinationInterface->subnet_mask, $sourceIp)) {
            return true;
        }

        if (!$this->inSameSubnet($destinationInterface->ip_address, $destinationInterface->subnet_mask, $destination->default_gateway)) {
            return false;
        }

        $gatewayInterface = $this->findInterfaceByIp($project->devices, $destination->default_gateway);
        if (!$gatewayInterface instanceof DeviceInterface) {
            return false;
        }

        $gatewayDevice = $project->devices->firstWhere('id', $gatewayInterface->device_id);
        if (!$gatewayDevice instanceof Device) {
            return false;
        }

        $decision = $this->resolveDeviceRoute($project, $gatewayDevice, $sourceIp);

        return (bool) $decision['success'];
    }

    private function isLayer2Reachable(NetworkProject $project, int $sourceInterfaceId, int $targetInterfaceId): bool
    {
        if ($sourceInterfaceId === $targetInterfaceId) {
            return true;
        }

        $interfacesById = $project->devices
            ->flatMap(fn (Device $device) => $device->interfaces)
            ->keyBy('id');
        $sourceCandidates = $this->expandLayer2Candidates(
            $project,
            $interfacesById->get($sourceInterfaceId),
        );
        $targetCandidates = $this->expandLayer2Candidates(
            $project,
            $interfacesById->get($targetInterfaceId),
        );

        if ($sourceCandidates === [] || $targetCandidates === []) {
            return false;
        }

        $graph = [];

        foreach ($project->links as $link) {
            if (
                $link->interface_b_id !== null &&
                $this->isPhysicalLayer2Interface($interfacesById->get($link->interface_a_id)) &&
                $this->isPhysicalLayer2Interface($interfacesById->get($link->interface_b_id))
            ) {
                $graph[$link->interface_a_id][] = $link->interface_b_id;
                $graph[$link->interface_b_id][] = $link->interface_a_id;
            }
        }

        foreach ($project->devices as $switch) {
            $bridgeGroups = [];

            foreach ($switch->interfaces as $interface) {
                if (!$this->isSwitchport($switch, $interface)) {
                    continue;
                }

                $bridgeGroups[$this->accessVlanId($interface)][] = $interface->id;
            }

            foreach ($bridgeGroups as $interfaceIds) {
                foreach ($interfaceIds as $idA) {
                    foreach ($interfaceIds as $idB) {
                        if ($idA !== $idB) {
                            $graph[$idA][] = $idB;
                        }
                    }
                }
            }
        }

        $targetLookup = array_fill_keys($targetCandidates, true);
        $queue = $sourceCandidates;
        $visited = array_fill_keys($sourceCandidates, true);

        while ($queue !== []) {
            $current = array_shift($queue);

            if (isset($targetLookup[$current])) {
                return true;
            }

            foreach ($graph[$current] ?? [] as $neighbor) {
                if (isset($visited[$neighbor])) {
                    continue;
                }

                if (isset($targetLookup[$neighbor])) {
                    return true;
                }

                $visited[$neighbor] = true;
                $queue[] = $neighbor;
            }
        }

        return false;
    }

    private function expandLayer2Candidates(NetworkProject $project, mixed $interface): array
    {
        if (!$interface instanceof DeviceInterface) {
            return [];
        }

        $device = $project->devices->firstWhere('id', $interface->device_id);
        if (!$device instanceof Device) {
            return [];
        }

        if ($this->isSvi($device, $interface)) {
            $vlanId = $this->sviVlanId($interface);

            return $device->interfaces
                ->filter(
                    fn (DeviceInterface $candidate) =>
                        $this->isSwitchport($device, $candidate) &&
                        $this->accessVlanId($candidate) === $vlanId,
                )
                ->pluck('id')
                ->all();
        }

        if (!$this->isPhysicalLayer2Interface($interface)) {
            return [];
        }

        return [$interface->id];
    }

    private function isPhysicalLayer2Interface(mixed $interface): bool
    {
        return $interface instanceof DeviceInterface && ($interface->metadata_json['role'] ?? null) !== 'svi';
    }

    private function isSwitchport(Device $device, DeviceInterface $interface): bool
    {
        if (!$device->isSwitch()) {
            return false;
        }

        if ($device->switchMode() === 'l2') {
            return true;
        }

        return ($interface->metadata_json['role'] ?? 'switchport') === 'switchport';
    }

    private function isSvi(Device $device, DeviceInterface $interface): bool
    {
        return $device->isSwitch() &&
            $device->switchMode() === 'l3' &&
            ($interface->metadata_json['role'] ?? null) === 'svi';
    }

    private function accessVlanId(DeviceInterface $interface): int
    {
        return (int) ($interface->metadata_json['access_vlan'] ?? 1);
    }

    private function sviVlanId(DeviceInterface $interface): int
    {
        return (int) ($interface->metadata_json['vlan_id'] ?? 1);
    }

    private function usableIpInterfaces(Device $device): Collection
    {
        return $device->interfaces
            ->filter(
                fn (DeviceInterface $interface) =>
                    $interface->ip_address !== null && $interface->subnet_mask !== null,
            )
            ->values();
    }

    private function findInterfaceByIp(Collection $devices, string $ipAddress): ?DeviceInterface
    {
        foreach ($devices as $device) {
            $interface = $device->interfaces->firstWhere('ip_address', $ipAddress);
            if ($interface instanceof DeviceInterface) {
                return $interface;
            }
        }

        return null;
    }

    private function findBestRoute(Collection $routeEntries, string $destinationIp): ?RouteEntry
    {
        /** @var RouteEntry|null $best */
        $best = null;
        $bestPrefix = -1;

        foreach ($routeEntries as $routeEntry) {
            if (!$this->inSameSubnet($routeEntry->destination_network, $routeEntry->subnet_mask, $destinationIp)) {
                continue;
            }

            $prefix = $this->maskToPrefixLength($routeEntry->subnet_mask);
            if ($prefix > $bestPrefix) {
                $best = $routeEntry;
                $bestPrefix = $prefix;
            }
        }

        return $best;
    }

    private function inSameSubnet(string $ipAddress, string $subnetMask, string $targetIp): bool
    {
        $networkA = sprintf('%u', ip2long($ipAddress)) & sprintf('%u', ip2long($subnetMask));
        $networkB = sprintf('%u', ip2long($targetIp)) & sprintf('%u', ip2long($subnetMask));

        return $networkA === $networkB;
    }

    private function maskToPrefixLength(string $subnetMask): int
    {
        $binary = str_pad(decbin((int) ip2long($subnetMask)), 32, '0', STR_PAD_LEFT);

        return substr_count($binary, '1');
    }

    private function resolveArpEntry(
        NetworkProject $project,
        DeviceInterface $requesterInterface,
        string $targetIp,
    ): array {
        $resolvedInterface = $this->findInterfaceByIp($project->devices, $targetIp);

        if (!$resolvedInterface instanceof DeviceInterface) {
            return [
                'success' => false,
                'entry' => null,
                'message' => sprintf('No interface owns IP %s for ARP resolution.', $targetIp),
            ];
        }

        if (!$resolvedInterface->mac_address) {
            return [
                'success' => false,
                'entry' => null,
                'message' => sprintf('Interface %s has no MAC address configured.', $resolvedInterface->name),
            ];
        }

        $device = $project->devices->firstWhere('id', $resolvedInterface->device_id);
        $deviceName = $device instanceof Device ? $device->name : 'unknown';

        return [
            'success' => true,
            'entry' => [
                'device_name' => $deviceName,
                'interface_name' => $resolvedInterface->name,
                'ip_address' => $targetIp,
                'mac_address' => $resolvedInterface->mac_address,
            ],
            'message' => sprintf(
                '%s resolved %s to %s.',
                $requesterInterface->name,
                $targetIp,
                $resolvedInterface->mac_address,
            ),
        ];
    }

    private function success(string $sourceDevice, string $destination, array $hops, array $arpTable = []): array
    {
        return [
            'success' => true,
            'source_device' => $sourceDevice,
            'destination' => $destination,
            'hops' => $hops,
            'error_code' => null,
            'error_message' => null,
            'suggestions' => [],
            'arp_table' => $arpTable,
        ];
    }

    private function failure(string $errorCode, string $message, array $hops, array $arpTable = []): array
    {
        return [
            'success' => false,
            'source_device' => null,
            'destination' => null,
            'hops' => $hops,
            'error_code' => $errorCode,
            'error_message' => $message,
            'suggestions' => $this->suggestionsForError($errorCode),
            'arp_table' => $arpTable,
        ];
    }

    private function hop(string $deviceName, string $action, string $result, string $message): array
    {
        return [
            'device_name' => $deviceName,
            'action' => $action,
            'result' => $result,
            'message' => $message,
        ];
    }

    private function suggestionsForError(string $errorCode): array
    {
        return match ($errorCode) {
            'DEFAULT_GATEWAY_MISSING' => ['Configure the PC default gateway.'],
            'DEFAULT_GATEWAY_INVALID' => ['Set the default gateway inside the source subnet.'],
            'ROUTE_NOT_FOUND', 'CLOUD_ROUTE_MISSING' => ['Add a matching static route on the router or firewall.'],
            'RETURN_PATH_MISSING' => ['Check the destination default gateway and reverse route.'],
            'L2_PATH_MISSING', 'DESTINATION_L2_UNREACHABLE' => ['Check the cable or switch path between the interfaces.'],
            'CLOUD_LINK_MISSING' => ['Connect the route interface to the expected cloud.'],
            'ARP_TARGET_UNRESOLVED', 'GATEWAY_ARP_UNRESOLVED', 'NEXT_HOP_ARP_UNRESOLVED' => ['Check whether the target interface has a valid IP/MAC configuration and is reachable on the expected segment.'],
            default => [],
        };
    }
}
