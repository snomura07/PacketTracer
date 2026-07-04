<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NetworkProject extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
    ];

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function networkClouds(): HasMany
    {
        return $this->hasMany(NetworkCloud::class);
    }

    public function links(): HasMany
    {
        return $this->hasMany(Link::class);
    }
}
