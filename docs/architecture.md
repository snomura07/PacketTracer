# アーキテクチャ設計

## 採用構成

このプロジェクトでは、以下の構成を採用する。

- Laravel 11
- Inertia
- React
- React Flow
- MySQL

## 採用理由

### Laravel 11

バックエンド、DB管理、API、認証追加の余地、開発環境構築のしやすさを考慮してLaravelを採用する。

初期段階ではローカル利用を想定し、ログイン機能は実装しない。

### Inertia + React

画面側はGUIキャンバスの実装が中心になるため、Reactを採用する。LaravelとReactの接続はInertiaで行う。

### React Flow

NW機器をノード、ケーブルをエッジとして扱えるため、Packet Tracer風の画面を作りやすい。

ドラッグ配置、接続線、ズーム、パン、選択状態などを自前実装せずに済む。

### MySQL

ネットワーク構成、機器、インターフェース、接続、ルーティング情報を保存するために使用する。

## 全体構成

```text
Browser
  |
  | Inertia / HTTP
  v
Laravel
  |
  +-- Controller
  |
  +-- Eloquent Model
  |
  +-- NetworkSimulator Service
  |
  v
MySQL
```

## フロントエンド構成

```text
resources/js/
├─ Pages/
│  └─ NetworkEditor.tsx
│
├─ Components/
│  ├─ TopologyCanvas.tsx
│  ├─ DeviceNode.tsx
│  ├─ PropertyPanel.tsx
│  ├─ PingPanel.tsx
│  └─ SimulationResultPanel.tsx
│
└─ Types/
   └─ network.ts
```

## バックエンド構成

```text
app/
├─ Models/
│  ├─ NetworkProject.php
│  ├─ Device.php
│  ├─ DeviceInterface.php
│  ├─ Link.php
│  └─ RouteEntry.php
│
├─ Http/Controllers/
│  ├─ NetworkProjectController.php
│  └─ PingSimulationController.php
│
└─ Services/
   └─ NetworkSimulator/
      ├─ PingSimulator.php
      ├─ IpCalculator.php
      ├─ RouteResolver.php
      ├─ TopologyResolver.php
      └─ SimulationResult.php
```

## シミュレーション方針

このアプリでは、実際のICMPパケットは送信しない。

DBに保存されたネットワーク構成情報をもとに、送信元から宛先までの到達経路を論理的に追跡する。

### ping判定の流れ

1. 送信元端末のIP設定を確認する
2. 宛先IPが同一ネットワークか判定する
3. 同一ネットワークであれば、同一L2接続上に宛先が存在するか確認する
4. 異なるネットワークであれば、デフォルトゲートウェイを確認する
5. ゲートウェイに到達できるか確認する
6. ルータのルーティングテーブルを確認する
7. 次ホップへ進む
8. 宛先ネットワークに到達できるか確認する
9. 戻り経路が存在するか確認する
10. 成功または失敗理由を返す

## 初期対応範囲

### 対応する機器

- PC
- L2 Switch
- Router
- Internet

### 対応する設定

- IPアドレス
- サブネットマスク
- デフォルトゲートウェイ
- 静的ルート
- 接続情報

### 対応する判定

- 同一セグメント通信
- デフォルトゲートウェイ設定ミス
- サブネットマスク設定ミス
- ルーティング不足
- 戻り経路不足
- ケーブル未接続

## 初期段階で対応しないもの

- VLAN
- DHCP
- DNS
- NAT
- ACL
- STP
- 無線
- Cisco IOS風CLI
- 実パケット送信

これらは最初から入れず、L3到達性判定が動いてから段階的に追加する。
