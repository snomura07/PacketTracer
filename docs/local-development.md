# ローカル開発環境

## 現在の前提

このリポジトリは WSL を開発用ワークスペースとして使う。

現時点では、WSL に PHP や Composer を直接入れず、Docker Compose で最小実行環境を立ち上げる。

## 採用する最小構成

- `app`: PHP 8.3 CLI + Composer
- `vite`: Node 24 + Vite
- DB: sqlite
- Web: Laravel 開発サーバー (`php artisan serve`)

まだ `Nginx + php-fpm + MySQL` にはしない。

理由:

- この WSL には PHP / Composer が未導入
- まずはアプリを最短で起動したい
- 保存 API と ping シミュレーションの前段としては sqlite で十分

## 起動

```bash
docker compose up --build app vite
```

起動すると、`app` サービスは初回のみ以下を自動で行う。

- `.env.example` から `.env` を作成
- `database/database.sqlite` を作成
- `composer install`
- `php artisan key:generate`
- `php artisan migrate`

アクセス先:

- Laravel: `http://localhost:8000`
- Vite: `http://localhost:5173`

## よく使うコマンド

依存関係を個別に入れたい場合:

```bash
docker compose run --rm app composer install
docker compose run --rm vite npm install
```

マイグレーション:

```bash
docker compose run --rm app php artisan migrate
```

テスト:

```bash
docker compose run --rm app php artisan test
```

## 次段階

保存 API と再読込が通った段階で、以下を再評価する。

- Web を `Nginx + php-fpm` へ切り替える
- DB を MySQL へ切り替える
- 必要なら `docker compose` に DB サービスを追加する
