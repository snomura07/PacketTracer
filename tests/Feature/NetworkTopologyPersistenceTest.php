<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\DeviceInterface;
use App\Models\Link;
use App\Models\NetworkCloud;
use App\Models\NetworkProject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class NetworkTopologyPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_persists_a_project_with_devices_clouds_links_and_routes(): void
    {
        $project = NetworkProject::create([
            'name' => 'Head Office Internet Access',
            'description' => 'Bootstrap persistence check',
        ]);

        $pc = $project->devices()->create([
            'name' => 'PC-A',
            'type' => Device::TYPE_PC,
            'position_x' => 100,
            'position_y' => 180,
            'default_gateway' => '192.168.10.1',
        ]);

        $router = $project->devices()->create([
            'name' => 'Router-1',
            'type' => Device::TYPE_ROUTER,
            'position_x' => 420,
            'position_y' => 180,
        ]);

        $internet = $project->networkClouds()->create([
            'name' => 'Internet Cloud',
            'type' => NetworkCloud::TYPE_INTERNET,
            'position_x' => 760,
            'position_y' => 80,
            'representative_ip' => '8.8.8.8',
        ]);

        $pcInterface = $pc->interfaces()->create([
            'name' => 'eth0',
            'ip_address' => '192.168.10.10',
            'subnet_mask' => '255.255.255.0',
        ]);

        $routerLan = $router->interfaces()->create([
            'name' => 'lan0',
            'ip_address' => '192.168.10.1',
            'subnet_mask' => '255.255.255.0',
        ]);

        $routerWan = $router->interfaces()->create([
            'name' => 'wan0',
            'ip_address' => '203.0.113.2',
            'subnet_mask' => '255.255.255.252',
        ]);

        $project->links()->create([
            'interface_a_id' => $pcInterface->id,
            'interface_b_id' => $routerLan->id,
        ]);

        $cloudLink = $project->links()->create([
            'interface_a_id' => $routerWan->id,
            'network_cloud_id' => $internet->id,
        ]);

        $defaultRoute = $router->routeEntries()->create([
            'destination_network' => '0.0.0.0',
            'subnet_mask' => '0.0.0.0',
            'next_hop' => '203.0.113.1',
            'outgoing_interface_id' => $routerWan->id,
        ]);

        $this->assertDatabaseCount('network_projects', 1);
        $this->assertDatabaseCount('devices', 2);
        $this->assertDatabaseCount('network_clouds', 1);
        $this->assertDatabaseCount('device_interfaces', 3);
        $this->assertDatabaseCount('links', 2);
        $this->assertDatabaseCount('route_entries', 1);

        $this->assertTrue($project->devices->contains($pc));
        $this->assertTrue($project->networkClouds->contains($internet));
        $this->assertTrue($router->interfaces->contains($routerWan));
        $this->assertTrue($router->routeEntries->contains($defaultRoute));
        $this->assertSame($internet->id, $cloudLink->networkCloud?->id);
    }

    public function test_link_requires_exactly_one_secondary_target(): void
    {
        $project = NetworkProject::create([
            'name' => 'Constraint Test',
        ]);

        $device = $project->devices()->create([
            'name' => 'Router-1',
            'type' => Device::TYPE_ROUTER,
            'position_x' => 0,
            'position_y' => 0,
        ]);

        $interface = $device->interfaces()->create([
            'name' => 'wan0',
        ]);

        $cloud = $project->networkClouds()->create([
            'name' => 'Internet Cloud',
            'type' => NetworkCloud::TYPE_INTERNET,
            'position_x' => 0,
            'position_y' => 0,
        ]);

        $this->expectException(InvalidArgumentException::class);

        Link::create([
            'network_project_id' => $project->id,
            'interface_a_id' => $interface->id,
            'interface_b_id' => $interface->id,
            'network_cloud_id' => $cloud->id,
        ]);
    }
}
