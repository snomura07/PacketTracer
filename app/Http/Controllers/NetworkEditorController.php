<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class NetworkEditorController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('NetworkEditor', [
            'milestone' => 'PC-A -> Switch -> Router -> Cloud',
            'supportedDeviceTypes' => [
                'pc',
                'l2_switch',
                'l3_switch',
                'onu',
                'ap',
                'router',
                'firewall',
            ],
            'supportedCloudTypes' => [
                'internet',
                'masters_one',
            ],
        ]);
    }
}
