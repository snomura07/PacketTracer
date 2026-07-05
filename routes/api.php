<?php

use App\Http\Controllers\NetworkProjectController;
use App\Http\Controllers\PingSimulationController;
use Illuminate\Support\Facades\Route;

Route::prefix('network-projects')->group(function () {
    Route::get('/', [NetworkProjectController::class, 'index']);
    Route::post('/', [NetworkProjectController::class, 'store']);
    Route::get('/{networkProject}', [NetworkProjectController::class, 'show']);
    Route::put('/{networkProject}', [NetworkProjectController::class, 'update']);
    Route::post('/{networkProject}/simulate/ping', PingSimulationController::class);
});
