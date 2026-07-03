<?php

use App\Http\Controllers\NetworkProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('network-projects')->group(function () {
    Route::post('/', [NetworkProjectController::class, 'store']);
    Route::get('/{networkProject}', [NetworkProjectController::class, 'show']);
    Route::put('/{networkProject}', [NetworkProjectController::class, 'update']);
});
