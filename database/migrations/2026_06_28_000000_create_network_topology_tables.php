<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('network_projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('network_project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type');
            $table->integer('position_x')->default(0);
            $table->integer('position_y')->default(0);
            $table->string('default_gateway', 45)->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();

            $table->index(['network_project_id', 'type']);
        });

        Schema::create('network_clouds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('network_project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type');
            $table->integer('position_x')->default(0);
            $table->integer('position_y')->default(0);
            $table->string('representative_ip', 45)->nullable();
            $table->string('network_address', 45)->nullable();
            $table->string('subnet_mask', 45)->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();

            $table->index(['network_project_id', 'type']);
        });

        Schema::create('device_interfaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('ip_address', 45)->nullable();
            $table->string('subnet_mask', 45)->nullable();
            $table->timestamps();

            $table->unique(['device_id', 'name']);
        });

        Schema::create('links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('network_project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('interface_a_id')->constrained('device_interfaces')->cascadeOnDelete();
            $table->foreignId('interface_b_id')->nullable()->constrained('device_interfaces')->nullOnDelete();
            $table->foreignId('network_cloud_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('route_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('destination_network', 45);
            $table->string('subnet_mask', 45);
            $table->string('next_hop', 45)->nullable();
            $table->foreignId('outgoing_interface_id')->nullable()->constrained('device_interfaces')->nullOnDelete();
            $table->timestamps();

            $table->index(['device_id', 'destination_network']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_entries');
        Schema::dropIfExists('links');
        Schema::dropIfExists('device_interfaces');
        Schema::dropIfExists('network_clouds');
        Schema::dropIfExists('devices');
        Schema::dropIfExists('network_projects');
    }
};
