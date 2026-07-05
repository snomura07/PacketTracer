<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Device extends Model
{
    use HasFactory;

    public const TYPE_PC = 'pc';
    public const TYPE_SWITCH = 'switch';
    public const TYPE_L2_SWITCH = 'l2_switch';
    public const TYPE_L3_SWITCH = 'l3_switch';
    public const TYPE_ONU = 'onu';
    public const TYPE_AP = 'ap';
    public const TYPE_ROUTER = 'router';
    public const TYPE_FIREWALL = 'firewall';

    public const TYPES = [
        self::TYPE_PC,
        self::TYPE_L2_SWITCH,
        self::TYPE_L3_SWITCH,
        self::TYPE_ONU,
        self::TYPE_AP,
        self::TYPE_ROUTER,
        self::TYPE_FIREWALL,
    ];

    public const INPUT_TYPES = [
        self::TYPE_PC,
        self::TYPE_SWITCH,
        self::TYPE_L2_SWITCH,
        self::TYPE_L3_SWITCH,
        self::TYPE_ONU,
        self::TYPE_AP,
        self::TYPE_ROUTER,
        self::TYPE_FIREWALL,
    ];

    public const LAYER2_BRIDGE_TYPES = [
        self::TYPE_L2_SWITCH,
        self::TYPE_ONU,
        self::TYPE_AP,
    ];

    public const ROUTING_TYPES = [
        self::TYPE_L3_SWITCH,
        self::TYPE_ROUTER,
        self::TYPE_FIREWALL,
    ];

    protected $fillable = [
        'network_project_id',
        'name',
        'type',
        'position_x',
        'position_y',
        'default_gateway',
        'metadata_json',
    ];

    protected $casts = [
        'metadata_json' => 'array',
    ];

    public function networkProject(): BelongsTo
    {
        return $this->belongsTo(NetworkProject::class);
    }

    public function interfaces(): HasMany
    {
        return $this->hasMany(DeviceInterface::class);
    }

    public function routeEntries(): HasMany
    {
        return $this->hasMany(RouteEntry::class);
    }

    public function effectiveType(): string
    {
        if ($this->type !== self::TYPE_SWITCH) {
            return $this->type;
        }

        return ($this->metadata_json['switch_mode'] ?? 'l2') === 'l3'
            ? self::TYPE_L3_SWITCH
            : self::TYPE_L2_SWITCH;
    }
}
