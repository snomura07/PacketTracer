<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NetworkCloud extends Model
{
    use HasFactory;

    public const TYPE_INTERNET = 'internet';
    public const TYPE_MASTERS_ONE = 'masters_one';
    public const TYPE_WAN = 'wan';

    public const TYPES = [
        self::TYPE_INTERNET,
        self::TYPE_MASTERS_ONE,
        self::TYPE_WAN,
    ];

    protected $fillable = [
        'network_project_id',
        'name',
        'type',
        'position_x',
        'position_y',
        'representative_ip',
        'network_address',
        'subnet_mask',
        'metadata_json',
    ];

    protected $casts = [
        'metadata_json' => 'array',
    ];

    public function networkProject(): BelongsTo
    {
        return $this->belongsTo(NetworkProject::class);
    }

    public function links(): HasMany
    {
        return $this->hasMany(Link::class);
    }
}
