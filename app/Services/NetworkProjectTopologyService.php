<?php

namespace App\Services;

use App\Models\Device;
use App\Models\NetworkCloud;
use App\Models\NetworkProject;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class NetworkProjectTopologyService
{
    public function list(): array
    {
        return NetworkProject::query()
            ->withCount(['devices', 'networkClouds', 'links'])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (NetworkProject $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'devices_count' => $project->devices_count,
                'network_clouds_count' => $project->network_clouds_count,
                'links_count' => $project->links_count,
                'updated_at' => $project->updated_at?->toIso8601String(),
            ])->all();
    }

    public function create(array $payload): NetworkProject
    {
        return DB::transaction(fn (): NetworkProject => $this->persist(new NetworkProject(), $payload));
    }

    public function update(NetworkProject $project, array $payload): NetworkProject
    {
        return DB::transaction(fn (): NetworkProject => $this->persist($project, $payload, true));
    }

    public function serialize(NetworkProject $project): array
    {
        $project->loadMissing([
            'devices.interfaces',
            'devices.routeEntries',
            'networkClouds',
            'links.interfaceA',
            'links.interfaceB',
            'links.networkCloud',
        ]);

        return [
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'devices' => $project->devices
                ->sortBy('id')
                ->values()
                ->map(fn (Device $device): array => [
                    'id' => $device->id,
                    'client_id' => $this->deviceClientId($device->id),
                    'name' => $device->name,
                    'type' => $device->effectiveType(),
                    'position_x' => $device->position_x,
                    'position_y' => $device->position_y,
                    'default_gateway' => $device->default_gateway,
                    'metadata_json' => $device->metadata_json,
                    'interfaces' => $device->interfaces
                        ->sortBy('id')
                        ->values()
                        ->map(fn ($interface): array => [
                            'id' => $interface->id,
                            'client_id' => $this->interfaceClientId($interface->id),
                            'name' => $interface->name,
                            'ip_address' => $interface->ip_address,
                            'subnet_mask' => $interface->subnet_mask,
                            'metadata_json' => $interface->metadata_json ?? [],
                        ])->all(),
                    'route_entries' => $device->routeEntries
                        ->sortBy('id')
                        ->values()
                        ->map(fn ($routeEntry): array => [
                            'id' => $routeEntry->id,
                            'destination_network' => $routeEntry->destination_network,
                            'subnet_mask' => $routeEntry->subnet_mask,
                            'next_hop' => $routeEntry->next_hop,
                            'outgoing_interface_client_id' => $routeEntry->outgoing_interface_id !== null
                                ? $this->interfaceClientId($routeEntry->outgoing_interface_id)
                                : null,
                        ])->all(),
                ])->all(),
            'network_clouds' => $project->networkClouds
                ->sortBy('id')
                ->values()
                ->map(fn (NetworkCloud $cloud): array => [
                    'id' => $cloud->id,
                    'client_id' => $this->cloudClientId($cloud->id),
                    'name' => $cloud->name,
                    'type' => $cloud->type,
                    'position_x' => $cloud->position_x,
                    'position_y' => $cloud->position_y,
                    'representative_ip' => $cloud->representative_ip,
                    'network_address' => $cloud->network_address,
                    'subnet_mask' => $cloud->subnet_mask,
                    'metadata_json' => $cloud->metadata_json,
                ])->all(),
            'links' => $project->links
                ->sortBy('id')
                ->values()
                ->map(fn ($link): array => [
                    'id' => $link->id,
                    'client_id' => $this->linkClientId($link->id),
                    'interface_a_client_id' => $this->interfaceClientId($link->interface_a_id),
                    'interface_b_client_id' => $link->interface_b_id !== null
                        ? $this->interfaceClientId($link->interface_b_id)
                        : null,
                    'network_cloud_client_id' => $link->network_cloud_id !== null
                        ? $this->cloudClientId($link->network_cloud_id)
                        : null,
                ])->all(),
        ];
    }

    private function persist(NetworkProject $project, array $payload, bool $replaceExisting = false): NetworkProject
    {
        $project->fill([
            'name' => $payload['name'],
            'description' => $payload['description'] ?? null,
        ])->save();

        if ($replaceExisting) {
            $project->links()->delete();
            $project->networkClouds()->delete();
            $project->devices()->delete();
        }

        $interfaceIdsByClientId = [];
        $cloudIdsByClientId = [];

        foreach ($payload['devices'] as $devicePayload) {
            $normalizedType = $this->normalizeDeviceType(
                $devicePayload['type'],
                $devicePayload['metadata_json'] ?? [],
            );
            $device = $project->devices()->create([
                'name' => $devicePayload['name'],
                'type' => $normalizedType,
                'position_x' => $devicePayload['position_x'],
                'position_y' => $devicePayload['position_y'],
                'default_gateway' => $devicePayload['default_gateway'] ?? null,
                'metadata_json' => $this->normalizeDeviceMetadata(
                    $normalizedType,
                    $devicePayload['metadata_json'] ?? [],
                ),
            ]);

            foreach ($devicePayload['interfaces'] as $interfacePayload) {
                $interface = $device->interfaces()->create([
                    'name' => $interfacePayload['name'],
                    'ip_address' => $interfacePayload['ip_address'] ?? null,
                    'subnet_mask' => $interfacePayload['subnet_mask'] ?? null,
                    'metadata_json' => $this->normalizeInterfaceMetadata(
                        $normalizedType,
                        $interfacePayload['metadata_json'] ?? [],
                    ),
                ]);

                $interfaceIdsByClientId[$interfacePayload['client_id']] = $interface->id;
            }

            foreach ($devicePayload['route_entries'] ?? [] as $routeEntryPayload) {
                $outgoingInterfaceId = null;

                if (!empty($routeEntryPayload['outgoing_interface_client_id'])) {
                    $outgoingInterfaceId = $interfaceIdsByClientId[$routeEntryPayload['outgoing_interface_client_id']] ?? null;

                    if ($outgoingInterfaceId === null) {
                        throw new InvalidArgumentException('Unknown outgoing interface client id.');
                    }
                }

                $device->routeEntries()->create([
                    'destination_network' => $routeEntryPayload['destination_network'],
                    'subnet_mask' => $routeEntryPayload['subnet_mask'],
                    'next_hop' => $routeEntryPayload['next_hop'] ?? null,
                    'outgoing_interface_id' => $outgoingInterfaceId,
                ]);
            }
        }

        foreach ($payload['network_clouds'] as $cloudPayload) {
            $cloud = $project->networkClouds()->create([
                'name' => $cloudPayload['name'],
                'type' => $cloudPayload['type'],
                'position_x' => $cloudPayload['position_x'],
                'position_y' => $cloudPayload['position_y'],
                'representative_ip' => $cloudPayload['representative_ip'] ?? null,
                'network_address' => $cloudPayload['network_address'] ?? null,
                'subnet_mask' => $cloudPayload['subnet_mask'] ?? null,
                'metadata_json' => $cloudPayload['metadata_json'] ?? null,
            ]);

            $cloudIdsByClientId[$cloudPayload['client_id']] = $cloud->id;
        }

        foreach ($payload['links'] as $linkPayload) {
            $interfaceAId = $interfaceIdsByClientId[$linkPayload['interface_a_client_id']] ?? null;
            $interfaceBId = !empty($linkPayload['interface_b_client_id'])
                ? ($interfaceIdsByClientId[$linkPayload['interface_b_client_id']] ?? null)
                : null;
            $cloudId = !empty($linkPayload['network_cloud_client_id'])
                ? ($cloudIdsByClientId[$linkPayload['network_cloud_client_id']] ?? null)
                : null;

            if ($interfaceAId === null) {
                throw new InvalidArgumentException('Unknown primary interface client id.');
            }

            if ($linkPayload['interface_b_client_id'] !== null && $interfaceBId === null) {
                throw new InvalidArgumentException('Unknown interface peer client id.');
            }

            if ($linkPayload['network_cloud_client_id'] !== null && $cloudId === null) {
                throw new InvalidArgumentException('Unknown cloud peer client id.');
            }

            $project->links()->create([
                'interface_a_id' => $interfaceAId,
                'interface_b_id' => $interfaceBId,
                'network_cloud_id' => $cloudId,
            ]);
        }

        return $project->fresh();
    }

    private function deviceClientId(int $id): string
    {
        return "device-{$id}";
    }

    private function normalizeDeviceType(string $type, array $metadata): string
    {
        return match ($type) {
            Device::TYPE_SWITCH => ($metadata['switch_mode'] ?? 'l2') === 'l3'
                ? Device::TYPE_L3_SWITCH
                : Device::TYPE_L2_SWITCH,
            Device::TYPE_L2_SWITCH,
            Device::TYPE_L3_SWITCH,
            Device::TYPE_ONU,
            Device::TYPE_AP,
            Device::TYPE_PC,
            Device::TYPE_ROUTER,
            Device::TYPE_FIREWALL => $type,
            default => throw new InvalidArgumentException('Unknown device type.'),
        };
    }

    private function normalizeDeviceMetadata(string $type, array $metadata): array
    {
        if ($type === Device::TYPE_L2_SWITCH) {
            return [...$metadata, 'switch_mode' => 'l2'];
        }

        if ($type === Device::TYPE_L3_SWITCH) {
            return [...$metadata, 'switch_mode' => 'l3'];
        }

        if ($type === Device::TYPE_AP) {
            $ssidProfiles = collect($metadata['ssid_profiles'] ?? [])
                ->map(fn ($profile): array => [
                    'name' => (string) ($profile['name'] ?? 'SSID'),
                    'vlan_id' => (int) ($profile['vlan_id'] ?? 1),
                    'security' => (string) ($profile['security'] ?? 'wpa2_psk'),
                ])
                ->values()
                ->all();

            return [
                ...$metadata,
                'ssid_profiles' => $ssidProfiles,
            ];
        }

        return $metadata;
    }

    private function normalizeInterfaceMetadata(string $deviceType, array $metadata): array
    {
        if ($deviceType === Device::TYPE_L2_SWITCH) {
            return [
                'role' => 'switchport',
                'access_vlan' => (int) ($metadata['access_vlan'] ?? 1),
            ];
        }

        if ($deviceType === Device::TYPE_L3_SWITCH) {
            $role = (string) ($metadata['role'] ?? 'switchport');

            if ($role === 'svi') {
                return [
                    'role' => 'svi',
                    'vlan_id' => (int) ($metadata['vlan_id'] ?? 1),
                ];
            }

            if ($role === 'routed') {
                return [
                    'role' => 'routed',
                ];
            }

            return [
                'role' => 'switchport',
                'access_vlan' => (int) ($metadata['access_vlan'] ?? 1),
            ];
        }

        if ($deviceType === Device::TYPE_ONU || $deviceType === Device::TYPE_AP) {
            return [
                'role' => 'switchport',
                'access_vlan' => (int) ($metadata['access_vlan'] ?? 1),
            ];
        }

        return $metadata;
    }

    private function interfaceClientId(int $id): string
    {
        return "interface-{$id}";
    }

    private function cloudClientId(int $id): string
    {
        return "cloud-{$id}";
    }

    private function linkClientId(int $id): string
    {
        return "link-{$id}";
    }
}
