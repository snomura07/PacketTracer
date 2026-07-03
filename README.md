# PacketTracer

社内ネットワーク構成の理解と障害切り分け練習を目的とした、Packet Tracer風のネットワーク到達性シミュレータです。

## 目的

このプロジェクトでは、NW機器をGUI上に配置し、IPアドレス、サブネットマスク、デフォルトゲートウェイ、静的ルーティングなどを設定して、端末間の通信可否を確認できるWebアプリケーションを作成します。

実パケットを流すのではなく、設定情報をもとに通信経路を論理的に追跡する到達性判定シミュレータとして実装します。

## 初期スコープ

- PC、L2スイッチ、ルータ、インターネット雲の配置
- 機器同士の接続
- IPアドレス、ネットマスク、デフォルトゲートウェイの設定
- ルータの静的ルーティング設定
- pingの到達性判定
- 失敗時の原因候補表示

## 採用予定アーキテクチャ

- Laravel 11
- Inertia
- React
- React Flow
- MySQL

## 方針

最初からPacket Tracer全体を再現するのではなく、まずは情シス実務で重要なL3到達性確認と障害切り分けに絞って実装します。

## ローカル実行方針

WSL は開発作業用のワークスペースとして扱い、常設の実行環境にはしません。

現時点の最小実行構成は以下です。

- PHP / Composer: Docker Compose 上の `app` サービス
- Web: Laravel 開発サーバー (`php artisan serve`)
- Frontend: Docker Compose 上の `vite` サービス
- DB: sqlite

Nginx + php-fpm + MySQL は、保存 API と ping シミュレーションが固まってから追加します。

## 起動手順

初回セットアップ:

```bash
docker compose up --build app vite
```

起動後のアクセス先:

- アプリ: `http://localhost:8000`
- Vite: `http://localhost:5173`

`app` サービスは初回起動時に以下を自動実行します。

- `.env` が無ければ `.env.example` から作成
- `database/database.sqlite` の作成
- `composer install`
- `php artisan key:generate`
- `php artisan migrate`

詳細は [docs/local-development.md](docs/local-development.md) を参照してください。
