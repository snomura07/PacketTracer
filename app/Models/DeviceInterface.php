<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeviceInterface extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'name',
        'ip_address',
        'subnet_mask',
        'mac_address',
        'metadata_json',
    ];

    protected $casts = [
        'metadata_json' => 'array',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function linksAsEndpointA(): HasMany
    {
        return $this->hasMany(Link::class, 'interface_a_id');
    }

    public function linksAsEndpointB(): HasMany
    {
        return $this->hasMany(Link::class, 'interface_b_id');
    }

    public function routeEntries(): HasMany
    {
        return $this->hasMany(RouteEntry::class, 'outgoing_interface_id');
    }
}
