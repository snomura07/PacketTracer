<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\NetworkCloud;
use App\Services\NetworkProjectTopologyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PingSimulationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_simulates_ping_from_pc_to_pc_through_router(): void
    {
        $project = app(NetworkProjectTopologyService::class)->create([
            'name' => 'PC to PC',
            'description' => null,
            'devices' => [
                [
                    'client_id' => 'pc-a',
                    'name' => 'PC-A',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => '192.168.10.1',
                    'metadata_json' => [],
                    'interfaces' => [[
                        'client_id' => 'pc-a-eth0',
                        'name' => 'eth0',
                        'ip_address' => '192.168.10.10',
                        'subnet_mask' => '255.255.255.0',
                        'mac_address' => '02:00:00:00:10:10',
                        'metadata_json' => [],
                    ]],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'sw-1',
                    'name' => 'SW-1',
                    'type' => Device::TYPE_SWITCH,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => ['switch_mode' => 'l2'],
                    'interfaces' => [
                        ['client_id' => 'sw-1-port1', 'name' => 'port1', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:11:01', 'metadata_json' => ['access_vlan' => 10]],
                        ['client_id' => 'sw-1-port2', 'name' => 'port2', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:11:02', 'metadata_json' => ['access_vlan' => 10]],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'router-1',
                    'name' => 'Router-1',
                    'type' => Device::TYPE_ROUTER,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => [],
                    'interfaces' => [
                        ['client_id' => 'router-lan0', 'name' => 'lan0', 'ip_address' => '192.168.10.1', 'subnet_mask' => '255.255.255.0', 'mac_address' => '02:00:00:00:12:01', 'metadata_json' => []],
                        ['client_id' => 'router-lan1', 'name' => 'lan1', 'ip_address' => '192.168.20.1', 'subnet_mask' => '255.255.255.0', 'mac_address' => '02:00:00:00:12:02', 'metadata_json' => []],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'sw-2',
                    'name' => 'SW-2',
                    'type' => Device::TYPE_SWITCH,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => ['switch_mode' => 'l2'],
                    'interfaces' => [
                        ['client_id' => 'sw-2-port1', 'name' => 'port1', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:13:01', 'metadata_json' => ['access_vlan' => 20]],
                        ['client_id' => 'sw-2-port2', 'name' => 'port2', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:13:02', 'metadata_json' => ['access_vlan' => 20]],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'pc-b',
                    'name' => 'PC-B',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => '192.168.20.1',
                    'metadata_json' => [],
                        'interfaces' => [[
                            'client_id' => 'pc-b-eth0',
                            'name' => 'eth0',
                            'ip_address' => '192.168.20.10',
                            'subnet_mask' => '255.255.255.0',
                            'mac_address' => '02:00:00:00:20:10',
                            'metadata_json' => [],
                        ]],
                    'route_entries' => [],
                ],
            ],
            'network_clouds' => [],
            'links' => [
                ['interface_a_client_id' => 'pc-a-eth0', 'interface_b_client_id' => 'sw-1-port1', 'network_cloud_client_id' => null],
                ['interface_a_client_id' => 'sw-1-port2', 'interface_b_client_id' => 'router-lan0', 'network_cloud_client_id' => null],
                ['interface_a_client_id' => 'router-lan1', 'interface_b_client_id' => 'sw-2-port1', 'network_cloud_client_id' => null],
                ['interface_a_client_id' => 'sw-2-port2', 'interface_b_client_id' => 'pc-b-eth0', 'network_cloud_client_id' => null],
            ],
        ]);

        $source = $project->devices->firstWhere('name', 'PC-A');
        $destination = $project->devices->firstWhere('name', 'PC-B');

        $this->postJson("/api/network-projects/{$project->id}/simulate/ping", [
            'source_device_id' => $source->id,
            'destination_type' => 'device',
            'destination_id' => $destination->id,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('destination', 'PC-B')
            ->assertJsonCount(2, 'arp_table')
            ->assertJsonPath('arp_table.0.ip_address', '192.168.10.1')
            ->assertJsonPath('arp_table.1.ip_address', '192.168.20.10');
    }

    public function test_it_reports_missing_default_gateway(): void
    {
        $project = app(NetworkProjectTopologyService::class)->create([
            'name' => 'Broken gateway',
            'description' => null,
            'devices' => [
                [
                    'client_id' => 'pc-a',
                    'name' => 'PC-A',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => [],
                        'interfaces' => [[
                            'client_id' => 'pc-a-eth0',
                            'name' => 'eth0',
                            'ip_address' => '192.168.10.10',
                            'subnet_mask' => '255.255.255.0',
                            'mac_address' => '02:00:00:00:10:10',
                            'metadata_json' => [],
                        ]],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'pc-b',
                    'name' => 'PC-B',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => [],
                        'interfaces' => [[
                            'client_id' => 'pc-b-eth0',
                            'name' => 'eth0',
                            'ip_address' => '192.168.20.10',
                            'subnet_mask' => '255.255.255.0',
                            'mac_address' => '02:00:00:00:20:10',
                            'metadata_json' => [],
                        ]],
                    'route_entries' => [],
                ],
            ],
            'network_clouds' => [],
            'links' => [],
        ]);

        $source = $project->devices->firstWhere('name', 'PC-A');
        $destination = $project->devices->firstWhere('name', 'PC-B');

        $this->postJson("/api/network-projects/{$project->id}/simulate/ping", [
            'source_device_id' => $source->id,
            'destination_type' => 'device',
            'destination_id' => $destination->id,
        ])->assertOk()
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'DEFAULT_GATEWAY_MISSING');
    }

    public function test_it_uses_a_non_first_source_interface_when_it_is_the_reachable_one(): void
    {
        $project = app(NetworkProjectTopologyService::class)->create([
            'name' => 'Multi-interface source',
            'description' => null,
            'devices' => [
                [
                    'client_id' => 'pc-a',
                    'name' => 'PC-A',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => [],
                    'interfaces' => [
                        [
                            'client_id' => 'pc-a-eth0',
                            'name' => 'eth0',
                            'ip_address' => '10.0.0.10',
                            'subnet_mask' => '255.255.255.0',
                            'mac_address' => '02:00:00:00:50:10',
                            'metadata_json' => [],
                        ],
                        [
                            'client_id' => 'pc-a-eth1',
                            'name' => 'eth1',
                            'ip_address' => '192.168.10.10',
                            'subnet_mask' => '255.255.255.0',
                            'mac_address' => '02:00:00:00:50:11',
                            'metadata_json' => [],
                        ],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'pc-b',
                    'name' => 'PC-B',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => [],
                    'interfaces' => [[
                        'client_id' => 'pc-b-eth0',
                        'name' => 'eth0',
                        'ip_address' => '192.168.10.20',
                        'subnet_mask' => '255.255.255.0',
                        'mac_address' => '02:00:00:00:50:20',
                        'metadata_json' => [],
                    ]],
                    'route_entries' => [],
                ],
            ],
            'network_clouds' => [],
            'links' => [
                ['interface_a_client_id' => 'pc-a-eth1', 'interface_b_client_id' => 'pc-b-eth0', 'network_cloud_client_id' => null],
            ],
        ]);

        $source = $project->devices->firstWhere('name', 'PC-A');
        $destination = $project->devices->firstWhere('name', 'PC-B');

        $this->postJson("/api/network-projects/{$project->id}/simulate/ping", [
            'source_device_id' => $source->id,
            'destination_type' => 'device',
            'destination_id' => $destination->id,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('destination', 'PC-B')
            ->assertJsonPath('arp_table.0.ip_address', '192.168.10.20');
    }

    public function test_it_uses_a_non_first_destination_interface_when_it_is_the_usable_one(): void
    {
        $project = app(NetworkProjectTopologyService::class)->create([
            'name' => 'Multi-interface destination',
            'description' => null,
            'devices' => [
                [
                    'client_id' => 'pc-a',
                    'name' => 'PC-A',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => [],
                    'interfaces' => [[
                        'client_id' => 'pc-a-eth0',
                        'name' => 'eth0',
                        'ip_address' => '192.168.10.10',
                        'subnet_mask' => '255.255.255.0',
                        'mac_address' => '02:00:00:00:60:10',
                        'metadata_json' => [],
                    ]],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'pc-b',
                    'name' => 'PC-B',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => [],
                    'interfaces' => [
                        [
                            'client_id' => 'pc-b-eth0',
                            'name' => 'eth0',
                            'ip_address' => null,
                            'subnet_mask' => null,
                            'mac_address' => '02:00:00:00:60:20',
                            'metadata_json' => [],
                        ],
                        [
                            'client_id' => 'pc-b-eth1',
                            'name' => 'eth1',
                            'ip_address' => '192.168.10.20',
                            'subnet_mask' => '255.255.255.0',
                            'mac_address' => '02:00:00:00:60:21',
                            'metadata_json' => [],
                        ],
                    ],
                    'route_entries' => [],
                ],
            ],
            'network_clouds' => [],
            'links' => [
                ['interface_a_client_id' => 'pc-a-eth0', 'interface_b_client_id' => 'pc-b-eth1', 'network_cloud_client_id' => null],
            ],
        ]);

        $source = $project->devices->firstWhere('name', 'PC-A');
        $destination = $project->devices->firstWhere('name', 'PC-B');

        $this->postJson("/api/network-projects/{$project->id}/simulate/ping", [
            'source_device_id' => $source->id,
            'destination_type' => 'device',
            'destination_id' => $destination->id,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('destination', 'PC-B')
            ->assertJsonPath('arp_table.0.ip_address', '192.168.10.20');
    }

    public function test_it_routes_between_subnets_through_an_l3_switch_svis(): void
    {
        $project = app(NetworkProjectTopologyService::class)->create([
            'name' => 'PC to PC through L3 switch',
            'description' => null,
            'devices' => [
                [
                    'client_id' => 'pc-a',
                    'name' => 'PC-A',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => '192.168.10.1',
                    'metadata_json' => [],
                    'interfaces' => [[
                        'client_id' => 'pc-a-eth0',
                        'name' => 'eth0',
                        'ip_address' => '192.168.10.10',
                        'subnet_mask' => '255.255.255.0',
                        'mac_address' => '02:00:00:00:10:10',
                        'metadata_json' => [],
                    ]],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'sw-core',
                    'name' => 'Core-SW',
                    'type' => Device::TYPE_SWITCH,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => ['switch_mode' => 'l3'],
                    'interfaces' => [
                        ['client_id' => 'sw-core-port1', 'name' => 'port1', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:40:01', 'metadata_json' => ['role' => 'switchport', 'access_vlan' => 10]],
                        ['client_id' => 'sw-core-port2', 'name' => 'port2', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:40:02', 'metadata_json' => ['role' => 'switchport', 'access_vlan' => 20]],
                        ['client_id' => 'sw-core-vlan10', 'name' => 'vlan10', 'ip_address' => '192.168.10.1', 'subnet_mask' => '255.255.255.0', 'mac_address' => '02:00:00:00:40:0A', 'metadata_json' => ['role' => 'svi', 'vlan_id' => 10]],
                        ['client_id' => 'sw-core-vlan20', 'name' => 'vlan20', 'ip_address' => '192.168.20.1', 'subnet_mask' => '255.255.255.0', 'mac_address' => '02:00:00:00:40:14', 'metadata_json' => ['role' => 'svi', 'vlan_id' => 20]],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'pc-b',
                    'name' => 'PC-B',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => '192.168.20.1',
                    'metadata_json' => [],
                    'interfaces' => [[
                        'client_id' => 'pc-b-eth0',
                        'name' => 'eth0',
                        'ip_address' => '192.168.20.10',
                        'subnet_mask' => '255.255.255.0',
                        'mac_address' => '02:00:00:00:20:10',
                        'metadata_json' => [],
                    ]],
                    'route_entries' => [],
                ],
            ],
            'network_clouds' => [],
            'links' => [
                ['interface_a_client_id' => 'pc-a-eth0', 'interface_b_client_id' => 'sw-core-port1', 'network_cloud_client_id' => null],
                ['interface_a_client_id' => 'sw-core-port2', 'interface_b_client_id' => 'pc-b-eth0', 'network_cloud_client_id' => null],
            ],
        ]);

        $source = $project->devices->firstWhere('name', 'PC-A');
        $destination = $project->devices->firstWhere('name', 'PC-B');

        $this->postJson("/api/network-projects/{$project->id}/simulate/ping", [
            'source_device_id' => $source->id,
            'destination_type' => 'device',
            'destination_id' => $destination->id,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('destination', 'PC-B');
    }

    public function test_it_routes_between_l2_access_switches_through_an_l3_switch_svis(): void
    {
        $project = app(NetworkProjectTopologyService::class)->create([
            'name' => 'PC to PC through edge L2 and core L3 switches',
            'description' => null,
            'devices' => [
                [
                    'client_id' => 'pc-a',
                    'name' => 'PC-A',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => '192.168.10.1',
                    'metadata_json' => [],
                    'interfaces' => [[
                        'client_id' => 'pc-a-eth0',
                        'name' => 'eth0',
                        'ip_address' => '192.168.10.10',
                        'subnet_mask' => '255.255.255.0',
                        'mac_address' => '02:00:00:00:10:10',
                        'metadata_json' => [],
                    ]],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'sw-edge-1',
                    'name' => 'Edge-SW-1',
                    'type' => Device::TYPE_SWITCH,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => ['switch_mode' => 'l2'],
                    'interfaces' => [
                        ['client_id' => 'sw-edge-1-port1', 'name' => 'port1', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:31:01', 'metadata_json' => ['role' => 'switchport', 'access_vlan' => 10]],
                        ['client_id' => 'sw-edge-1-port2', 'name' => 'port2', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:31:02', 'metadata_json' => ['role' => 'switchport', 'access_vlan' => 10]],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'sw-core',
                    'name' => 'Core-SW',
                    'type' => Device::TYPE_SWITCH,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => ['switch_mode' => 'l3'],
                    'interfaces' => [
                        ['client_id' => 'sw-core-port1', 'name' => 'port1', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:40:01', 'metadata_json' => ['role' => 'switchport', 'access_vlan' => 10]],
                        ['client_id' => 'sw-core-port2', 'name' => 'port2', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:40:02', 'metadata_json' => ['role' => 'switchport', 'access_vlan' => 20]],
                        ['client_id' => 'sw-core-vlan10', 'name' => 'vlan10', 'ip_address' => '192.168.10.1', 'subnet_mask' => '255.255.255.0', 'mac_address' => '02:00:00:00:40:0A', 'metadata_json' => ['role' => 'svi', 'vlan_id' => 10]],
                        ['client_id' => 'sw-core-vlan20', 'name' => 'vlan20', 'ip_address' => '192.168.20.1', 'subnet_mask' => '255.255.255.0', 'mac_address' => '02:00:00:00:40:14', 'metadata_json' => ['role' => 'svi', 'vlan_id' => 20]],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'sw-edge-2',
                    'name' => 'Edge-SW-2',
                    'type' => Device::TYPE_SWITCH,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => ['switch_mode' => 'l2'],
                    'interfaces' => [
                        ['client_id' => 'sw-edge-2-port1', 'name' => 'port1', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:32:01', 'metadata_json' => ['role' => 'switchport', 'access_vlan' => 20]],
                        ['client_id' => 'sw-edge-2-port2', 'name' => 'port2', 'ip_address' => null, 'subnet_mask' => null, 'mac_address' => '02:00:00:00:32:02', 'metadata_json' => ['role' => 'switchport', 'access_vlan' => 20]],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'pc-b',
                    'name' => 'PC-B',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => '192.168.20.1',
                    'metadata_json' => [],
                    'interfaces' => [[
                        'client_id' => 'pc-b-eth0',
                        'name' => 'eth0',
                        'ip_address' => '192.168.20.10',
                        'subnet_mask' => '255.255.255.0',
                        'mac_address' => '02:00:00:00:20:10',
                        'metadata_json' => [],
                    ]],
                    'route_entries' => [],
                ],
            ],
            'network_clouds' => [],
            'links' => [
                ['interface_a_client_id' => 'pc-a-eth0', 'interface_b_client_id' => 'sw-edge-1-port1', 'network_cloud_client_id' => null],
                ['interface_a_client_id' => 'sw-edge-1-port2', 'interface_b_client_id' => 'sw-core-port1', 'network_cloud_client_id' => null],
                ['interface_a_client_id' => 'sw-core-port2', 'interface_b_client_id' => 'sw-edge-2-port1', 'network_cloud_client_id' => null],
                ['interface_a_client_id' => 'sw-edge-2-port2', 'interface_b_client_id' => 'pc-b-eth0', 'network_cloud_client_id' => null],
            ],
        ]);

        $source = $project->devices->firstWhere('name', 'PC-A');
        $destination = $project->devices->firstWhere('name', 'PC-B');

        $this->postJson("/api/network-projects/{$project->id}/simulate/ping", [
            'source_device_id' => $source->id,
            'destination_type' => 'device',
            'destination_id' => $destination->id,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('destination', 'PC-B')
            ->assertJsonPath('arp_table.0.ip_address', '192.168.10.1');
    }

    public function test_it_reaches_internet_cloud_with_default_route(): void
    {
        $project = app(NetworkProjectTopologyService::class)->create([
            'name' => 'Internet access',
            'description' => null,
            'devices' => [
                [
                    'client_id' => 'pc-a',
                    'name' => 'PC-A',
                    'type' => Device::TYPE_PC,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => '192.168.10.1',
                    'metadata_json' => [],
                    'interfaces' => [[
                        'client_id' => 'pc-a-eth0',
                        'name' => 'eth0',
                        'ip_address' => '192.168.10.10',
                        'subnet_mask' => '255.255.255.0',
                        'mac_address' => '02:00:00:00:10:10',
                    ]],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'fw-1',
                    'name' => 'Firewall-1',
                    'type' => Device::TYPE_FIREWALL,
                    'position_x' => 0,
                    'position_y' => 0,
                    'default_gateway' => null,
                    'metadata_json' => [],
                    'interfaces' => [
                        ['client_id' => 'fw-lan', 'name' => 'lan', 'ip_address' => '192.168.10.1', 'subnet_mask' => '255.255.255.0', 'mac_address' => '02:00:00:00:30:01'],
                        ['client_id' => 'fw-wan', 'name' => 'wan', 'ip_address' => '203.0.113.2', 'subnet_mask' => '255.255.255.252', 'mac_address' => '02:00:00:00:30:02'],
                    ],
                    'route_entries' => [[
                        'destination_network' => '0.0.0.0',
                        'subnet_mask' => '0.0.0.0',
                        'next_hop' => '203.0.113.1',
                        'outgoing_interface_client_id' => 'fw-wan',
                    ]],
                ],
            ],
            'network_clouds' => [[
                'client_id' => 'cloud-internet',
                'name' => 'Internet Cloud',
                'type' => NetworkCloud::TYPE_INTERNET,
                'position_x' => 0,
                'position_y' => 0,
                'representative_ip' => '8.8.8.8',
                'network_address' => null,
                'subnet_mask' => null,
                'metadata_json' => [],
            ]],
            'links' => [
                ['interface_a_client_id' => 'pc-a-eth0', 'interface_b_client_id' => 'fw-lan', 'network_cloud_client_id' => null],
                ['interface_a_client_id' => 'fw-wan', 'interface_b_client_id' => null, 'network_cloud_client_id' => 'cloud-internet'],
            ],
        ]);

        $source = $project->devices->firstWhere('name', 'PC-A');
        $cloud = $project->networkClouds->firstWhere('name', 'Internet Cloud');

        $this->postJson("/api/network-projects/{$project->id}/simulate/ping", [
            'source_device_id' => $source->id,
            'destination_type' => 'cloud',
            'destination_id' => $cloud->id,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('destination', 'Internet Cloud')
            ->assertJsonCount(1, 'arp_table')
            ->assertJsonPath('arp_table.0.ip_address', '192.168.10.1');
    }
}
