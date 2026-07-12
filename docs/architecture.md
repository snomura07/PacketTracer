# アーキテクチャ設計

## 採用構成

このプロジェクトでは、以下の構成を採用する。

- Laravel 11
- Inertia
- React
- TypeScript
- React Flow
- MySQL

ただし、MVP のローカル開発環境では起動を優先し、暫定的に sqlite を使う。

保存 API、再読込、Ping シミュレーションの土台を固めた後に、開発用 DB も MySQL へ切り替える。

## 採用理由

### Laravel 11

バックエンド、DB管理、API、認証追加の余地、開発環境構築のしやすさを考慮してLaravelを採用する。

初期段階ではローカル利用を想定し、ログイン機能は実装しない。

### Inertia + React

画面側はGUIキャンバスの実装が中心になるため、Reactを採用する。LaravelとReactの接続はInertiaで行う。

### React Flow

NW機器やネットワーククラウドをノード、ケーブルやWAN接続をエッジとして扱えるため、Packet Tracer風の画面を作りやすい。

ドラッグ配置、接続線、ズーム、パン、選択状態などを自前実装せずに済む。

### MySQL

ネットワーク構成、機器、ネットワーククラウド、インターフェース、接続、ルーティング情報を保存するために使用する。

現時点の Docker Compose ベースの最小開発環境では sqlite を利用しているが、これはローカル起動を簡素化するための暫定措置である。

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
│  ├─ NetworkCloudNode.tsx
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
│  ├─ NetworkCloud.php
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

## 重要な設計方針

### DeviceとNetworkCloudを分ける

PC、Switch、Router、FirewallはDeviceとして扱う。

InternetやMaster'sONEは、単体機器ではなくネットワークそのものを表すため、NetworkCloudとして扱う。

```text
Device
- pc
- switch
- onu
- ap
- router
- firewall

NetworkCloud
- internet
- masters_one
- wan
```

### Master'sONEの扱い

Master'sONEは、NTTコミュニケーションズの法人向け閉域ネットワークサービスを想定する。

ただし、サービス仕様そのものを再現するのではなく、社内拠点や外部ネットワークを接続する閉域網クラウドとして抽象化する。

```text
Head Office LAN
    |
Firewall
    |
Master'sONE Cloud
    |
Branch Router
    |
Branch LAN
```

初期実装では、Master'sONE Cloudは以下の役割を持つ。

- 複数のRouterまたはFirewallを接続できる
- 自身は通常の端末IPを持たない
- route_entriesの宛先ネットワークとして扱える
- Internetとは別の外部ネットワークとして表示する

## シミュレーション方針

このアプリでは、実際のICMPパケットは送信しない。

DBに保存されたネットワーク構成情報をもとに、送信元から宛先までの到達経路を論理的に追跡する。

### ping判定の流れ

1. 送信元端末のIP設定を確認する
2. 宛先IPまたは宛先ネットワークを決定する
3. 宛先IPが同一ネットワークか判定する
4. 同一ネットワークであれば、同一L2接続上に宛先が存在するか確認する
5. 異なるネットワークであれば、デフォルトゲートウェイを確認する
6. ゲートウェイに到達できるか確認する
7. RouterまたはFirewallのルーティングテーブルを確認する
8. 次ホップ、または接続先NetworkCloudへ進む
9. 宛先ネットワークに到達できるか確認する
10. 戻り経路が存在するか確認する
11. 成功または失敗理由を返す

## 初期対応範囲

### 対応するDevice

- PC
- L2 Switch
- L3 Switch
- Router
- Firewall

### 対応するNetworkCloud

- Internet Cloud
- Master'sONE Cloud

### 対応する設定

- IPアドレス
- サブネットマスク
- デフォルトゲートウェイ
- 静的ルート
- 接続情報
- NetworkCloudの代表IPまたはネットワークアドレス

### 対応する判定

- 同一セグメント通信
- デフォルトゲートウェイ設定ミス
- サブネットマスク設定ミス
- ルーティング不足
- default route不足
- Master'sONE向け静的ルート不足
- 戻り経路不足
- ケーブル未接続
- WAN/Cloud未接続

### スイッチポートの扱い

- L2 スイッチの物理ポートは L3 の IP / サブネットを持たない
- L3 スイッチでも `switchport` は IP / サブネットを持たない
- L3 の IP を持てるのは `SVI` または `routed` インターフェースのみ
- L2 スイッチの管理 IP は将来的に管理用 SVI として表現する

## 初期段階で対応しないもの

- VLAN
- DHCP
- DNS
- NAT詳細再現
- Firewallポリシー
- ACL
- STP
- 無線
- Cisco IOS風CLI
- 実パケット送信

これらは最初から入れず、L3到達性判定が動いてから段階的に追加する。
