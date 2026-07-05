<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\NetworkCloud;
use App\Models\NetworkProject;
use App\Services\NetworkProjectTopologyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NetworkProjectController extends Controller
{
    public function __construct(
        private readonly NetworkProjectTopologyService $topologyService,
    ) {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'projects' => $this->topologyService->list(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);
        $project = $this->topologyService->create($payload);

        return response()->json([
            'project' => $this->topologyService->serialize($project),
        ], 201);
    }

    public function show(NetworkProject $networkProject): JsonResponse
    {
        return response()->json([
            'project' => $this->topologyService->serialize($networkProject),
        ]);
    }

    public function update(Request $request, NetworkProject $networkProject): JsonResponse
    {
        $payload = $this->validatedPayload($request);
        $project = $this->topologyService->update($networkProject, $payload);

        return response()->json([
            'project' => $this->topologyService->serialize($project),
        ]);
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'devices' => ['required', 'array'],
            'devices.*.client_id' => ['required', 'string', 'max:255'],
            'devices.*.name' => ['required', 'string', 'max:255'],
            'devices.*.type' => ['required', Rule::in(Device::INPUT_TYPES)],
            'devices.*.position_x' => ['required', 'integer'],
            'devices.*.position_y' => ['required', 'integer'],
            'devices.*.default_gateway' => ['nullable', 'ip'],
            'devices.*.metadata_json' => ['nullable', 'array'],
            'devices.*.interfaces' => ['required', 'array', 'min:1'],
            'devices.*.interfaces.*.client_id' => ['required', 'string', 'max:255'],
            'devices.*.interfaces.*.name' => ['required', 'string', 'max:255'],
            'devices.*.interfaces.*.ip_address' => ['nullable', 'ip'],
            'devices.*.interfaces.*.subnet_mask' => ['nullable', 'ip'],
            'devices.*.interfaces.*.metadata_json' => ['nullable', 'array'],
            'devices.*.route_entries' => ['nullable', 'array'],
            'devices.*.route_entries.*.destination_network' => ['required', 'ip'],
            'devices.*.route_entries.*.subnet_mask' => ['required', 'ip'],
            'devices.*.route_entries.*.next_hop' => ['nullable', 'ip'],
            'devices.*.route_entries.*.outgoing_interface_client_id' => ['nullable', 'string', 'max:255'],
            'network_clouds' => ['required', 'array'],
            'network_clouds.*.client_id' => ['required', 'string', 'max:255'],
            'network_clouds.*.name' => ['required', 'string', 'max:255'],
            'network_clouds.*.type' => ['required', Rule::in(NetworkCloud::TYPES)],
            'network_clouds.*.position_x' => ['required', 'integer'],
            'network_clouds.*.position_y' => ['required', 'integer'],
            'network_clouds.*.representative_ip' => ['nullable', 'ip'],
            'network_clouds.*.network_address' => ['nullable', 'ip'],
            'network_clouds.*.subnet_mask' => ['nullable', 'ip'],
            'network_clouds.*.metadata_json' => ['nullable', 'array'],
            'links' => ['required', 'array'],
            'links.*.interface_a_client_id' => ['required', 'string', 'max:255'],
            'links.*.interface_b_client_id' => ['nullable', 'string', 'max:255'],
            'links.*.network_cloud_client_id' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
