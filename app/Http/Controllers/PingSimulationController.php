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
            'destination_mode' => ['nullable', Rule::in(['node', 'ip'])],
            'destination_type' => ['nullable', Rule::in(['device', 'cloud'])],
            'destination_id' => ['nullable', 'integer'],
            'destination_ip' => ['nullable', 'ip'],
        ]);

        $destinationMode = (string) ($payload['destination_mode'] ?? 'node');

        if ($destinationMode === 'node') {
            validator($payload, [
                'destination_type' => ['required', Rule::in(['device', 'cloud'])],
                'destination_id' => ['required', 'integer'],
            ])->validate();
        } else {
            validator($payload, [
                'destination_ip' => ['required', 'ip'],
            ])->validate();
        }

        return response()->json(
            $this->pingSimulator->simulate(
                $networkProject,
                (int) $payload['source_device_id'],
                $destinationMode,
                isset($payload['destination_type']) ? (string) $payload['destination_type'] : null,
                isset($payload['destination_id']) ? (int) $payload['destination_id'] : null,
                isset($payload['destination_ip']) ? (string) $payload['destination_ip'] : null,
            ),
        );
    }
}
