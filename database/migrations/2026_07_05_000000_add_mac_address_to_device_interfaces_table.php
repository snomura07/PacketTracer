<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_interfaces', function (Blueprint $table): void {
            $table->string('mac_address', 17)->nullable()->after('subnet_mask');
        });

        DB::table('device_interfaces')
            ->orderBy('id')
            ->get(['id'])
            ->each(function (object $interface): void {
                DB::table('device_interfaces')
                    ->where('id', $interface->id)
                    ->update([
                        'mac_address' => sprintf(
                            '02:00:%02X:%02X:%02X:%02X',
                            ($interface->id >> 24) & 0xFF,
                            ($interface->id >> 16) & 0xFF,
                            ($interface->id >> 8) & 0xFF,
                            $interface->id & 0xFF,
                        ),
                    ]);
            });
    }

    public function down(): void
    {
        Schema::table('device_interfaces', function (Blueprint $table): void {
            $table->dropColumn('mac_address');
        });
    }
};
