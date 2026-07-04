<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NetworkProjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_and_returns_a_network_project_topology(): void
    {
        $payload = $this->samplePayload();

        $response = $this->postJson('/api/network-projects', $payload);

        $response->assertCreated()
            ->assertJsonPath('project.name', 'HQ Internet Access')
            ->assertJsonPath('project.devices.0.name', 'PC-A')
            ->assertJsonPath('project.devices.1.interfaces.1.name', 'wan0')
            ->assertJsonPath('project.network_clouds.0.type', 'internet')
            ->assertJsonPath('project.links.1.network_cloud_client_id', 'cloud-1');

        $this->assertDatabaseCount('network_projects', 1);
        $this->assertDatabaseCount('devices', 2);
        $this->assertDatabaseCount('network_clouds', 1);
        $this->assertDatabaseCount('device_interfaces', 3);
        $this->assertDatabaseCount('links', 2);
        $this->assertDatabaseCount('route_entries', 1);
    }

    public function test_it_updates_and_reloads_a_saved_topology(): void
    {
        $createResponse = $this->postJson('/api/network-projects', $this->samplePayload());
        $projectId = $createResponse->json('project.id');

        $updatedPayload = $this->samplePayload();
        $updatedPayload['name'] = 'HQ and WAN';
        $updatedPayload['devices'][0]['name'] = 'PC-A1';
        $updatedPayload['network_clouds'][] = [
            'client_id' => 'cloud-wan',
            'name' => 'WAN Cloud',
            'type' => 'wan',
            'position_x' => 780,
            'position_y' => 240,
            'representative_ip' => null,
            'network_address' => '10.10.0.0',
            'subnet_mask' => '255.255.0.0',
            'metadata_json' => [],
        ];
        $updatedPayload['links'][] = [
            'interface_a_client_id' => 'router-wan0',
            'interface_b_client_id' => null,
            'network_cloud_client_id' => 'cloud-wan',
        ];

        $this->putJson("/api/network-projects/{$projectId}", $updatedPayload)
            ->assertOk()
            ->assertJsonPath('project.name', 'HQ and WAN')
            ->assertJsonPath('project.devices.0.name', 'PC-A1');

        $this->getJson("/api/network-projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('project.network_clouds.1.type', 'wan')
            ->assertJsonCount(3, 'project.links');

        $this->assertDatabaseCount('network_projects', 1);
        $this->assertDatabaseCount('devices', 2);
        $this->assertDatabaseCount('network_clouds', 2);
        $this->assertDatabaseCount('device_interfaces', 3);
        $this->assertDatabaseCount('links', 3);
    }

    private function samplePayload(): array
    {
        return [
            'name' => 'HQ Internet Access',
            'description' => 'MVP save/load check',
            'devices' => [
                [
                    'client_id' => 'device-pc-a',
                    'name' => 'PC-A',
                    'type' => 'pc',
                    'position_x' => 100,
                    'position_y' => 180,
                    'default_gateway' => '192.168.10.1',
                    'metadata_json' => [],
                    'interfaces' => [
                        [
                            'client_id' => 'pc-a-eth0',
                            'name' => 'eth0',
                            'ip_address' => '192.168.10.10',
                            'subnet_mask' => '255.255.255.0',
                        ],
                    ],
                    'route_entries' => [],
                ],
                [
                    'client_id' => 'device-router-1',
                    'name' => 'Router-1',
                    'type' => 'router',
                    'position_x' => 420,
                    'position_y' => 180,
                    'default_gateway' => null,
                    'metadata_json' => [],
                    'interfaces' => [
                        [
                            'client_id' => 'router-lan0',
                            'name' => 'lan0',
                            'ip_address' => '192.168.10.1',
                            'subnet_mask' => '255.255.255.0',
                        ],
                        [
                            'client_id' => 'router-wan0',
                            'name' => 'wan0',
                            'ip_address' => '203.0.113.2',
                            'subnet_mask' => '255.255.255.252',
                        ],
                    ],
                    'route_entries' => [
                        [
                            'destination_network' => '0.0.0.0',
                            'subnet_mask' => '0.0.0.0',
                            'next_hop' => '203.0.113.1',
                            'outgoing_interface_client_id' => 'router-wan0',
                        ],
                    ],
                ],
            ],
            'network_clouds' => [
                [
                    'client_id' => 'cloud-internet',
                    'name' => 'Internet Cloud',
                    'type' => 'internet',
                    'position_x' => 760,
                    'position_y' => 80,
                    'representative_ip' => '8.8.8.8',
                    'network_address' => null,
                    'subnet_mask' => null,
                    'metadata_json' => [],
                ],
            ],
            'links' => [
                [
                    'interface_a_client_id' => 'pc-a-eth0',
                    'interface_b_client_id' => 'router-lan0',
                    'network_cloud_client_id' => null,
                ],
                [
                    'interface_a_client_id' => 'router-wan0',
                    'interface_b_client_id' => null,
                    'network_cloud_client_id' => 'cloud-internet',
                ],
            ],
        ];
    }
}
