<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouteEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'destination_network',
        'subnet_mask',
        'next_hop',
        'outgoing_interface_id',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function outgoingInterface(): BelongsTo
    {
        return $this->belongsTo(DeviceInterface::class, 'outgoing_interface_id');
    }
}
