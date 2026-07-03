#!/usr/bin/env sh
set -eu

cd /app

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p database

if [ ! -f database/database.sqlite ]; then
  touch database/database.sqlite
fi

if [ ! -d vendor ]; then
  composer install
fi

if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --ansi
fi

php artisan migrate --graceful --ansi

exec php artisan serve --host=0.0.0.0 --port=8000
