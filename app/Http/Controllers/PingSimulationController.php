<?php

namespace App\Http\Controllers;

use App\Models\NetworkProject;
use App\Services\NetworkSimulator\PingSimulator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PingSimulationController extends Controller
{
    public function __construct(
        private readonly PingSimulator $pingSimulator,
    ) {
    }

    public function __invoke(Request $request, NetworkProject $networkProject): JsonResponse
    {
        $payload = $request->validate([
            'source_device_id' => ['required', 'integer'],
            'destination_type' => ['required', Rule::in(['device', 'cloud'])],
            'destination_id' => ['required', 'integer'],
        ]);

        return response()->json(
            $this->pingSimulator->simulate(
                $networkProject,
                (int) $payload['source_device_id'],
                (string) $payload['destination_type'],
                (int) $payload['destination_id'],
            ),
        );
    }
}
