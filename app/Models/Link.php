<?php

namespace App\Models;

use InvalidArgumentException;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Link extends Model
{
    use HasFactory;

    protected $fillable = [
        'network_project_id',
        'interface_a_id',
        'interface_b_id',
        'network_cloud_id',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $link): void {
            $hasInterfacePeer = $link->interface_b_id !== null;
            $hasCloudPeer = $link->network_cloud_id !== null;

            if ($hasInterfacePeer === $hasCloudPeer) {
                throw new InvalidArgumentException(
                    'A link must connect interface A to exactly one interface peer or one network cloud.'
                );
            }
        });
    }

    public function networkProject(): BelongsTo
    {
        return $this->belongsTo(NetworkProject::class);
    }

    public function interfaceA(): BelongsTo
    {
        return $this->belongsTo(DeviceInterface::class, 'interface_a_id');
    }

    public function interfaceB(): BelongsTo
    {
        return $this->belongsTo(DeviceInterface::class, 'interface_b_id');
    }

    public function networkCloud(): BelongsTo
    {
        return $this->belongsTo(NetworkCloud::class);
    }
}
