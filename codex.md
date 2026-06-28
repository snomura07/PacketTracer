# Codex作業指示書

## プロジェクト概要

このリポジトリでは、Packet Tracer風のネットワーク到達性シミュレータを作成する。

目的は、社内ネットワーク構成の理解と障害切り分け練習である。

実際のパケット送信、Cisco IOS風CLI、MQTTシミュレーションは行わない。

GUI上にネットワーク機器とネットワーククラウドを配置し、IPアドレス、サブネットマスク、デフォルトゲートウェイ、静的ルーティング、機器間接続を設定し、端末間または端末から外部ネットワークへのping可否を論理的に判定する。

## 最重要方針

まずは完成度よりも、最小構成で動くことを優先する。

最初のゴールは以下である。

```text
Internet Cloud
      |
   Firewall
      |
    Switch
   /      \
 PC-A    PC-B

Master'sONE Cloud
      |
   Firewall
      |
    Switch
      |
    PC-A
```

この構成で、以下を判定できるようにする。

- PC-A から PC-B にpingできるか
- PC-A から Internet Cloud に出られるか
- PC-A から Master'sONE Cloud に到達できるか
- 設定ミスがある場合、どこで失敗したかを表示する

## 採用アーキテクチャ

以下の構成で実装する。

- Laravel 11
- Inertia
- React
- TypeScript
- React Flow
- MySQL

## 設計上の重要概念

### Device

PC、Switch、Router、Firewallなどの機器を表す。

Device typeは以下とする。

```text
pc
switch
router
firewall
```

### NetworkCloud

InternetやMaster'sONEのような、単体機器ではなくネットワークそのものを表す抽象ノード。

NetworkCloud typeは以下とする。

```text
internet
masters_one
wan
```

### Master'sONEの扱い

Master'sONEはNTTコミュニケーションズの法人向け閉域ネットワークサービスを想定する。

ただし、このアプリでは実サービス仕様そのものは再現しない。

Master'sONEはPCやルータのような機器ではなく、本社・支店・データセンター・クラウドなどを接続する閉域網クラウドとして扱う。

したがって、`masters_one` は Device type ではなく NetworkCloud type とする。

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
- 自身は通常端末のIPを持たない
- route_entriesの宛先ネットワークとして扱える
- Internet Cloudとは別の外部ネットワークとして表示する
- 閉域網やWANサービスを抽象的に表現する

## 初期実装の優先順位

### 優先度A

必ず実装する。

- Laravelプロジェクト初期化
- Inertia + React + TypeScript導入
- React Flow導入
- MySQL接続
- ネットワークエディタ画面
- Device / NetworkCloud / Interface / Link / RouteEntry のDBモデル
- PC / Switch / Router / Firewall のDeviceノード表示
- Internet Cloud / Master'sONE Cloud のNetworkCloudノード表示
- ノード配置と接続
- IP設定パネル
- pingシミュレーションAPI
- ping結果表示

### 優先度B

余裕があれば実装する。

- サンプルトポロジー自動作成
- 失敗理由の詳細表示
- 戻り経路不足の判定
- default routeの判定
- Master'sONE向け静的ルートの判定
- 入力バリデーション強化

### 優先度C

今回は実装しない。

- VLAN
- DHCP
- DNS
- NATの詳細再現
- Firewallポリシー
- ACL
- STP
- 実パケット送信
- MQTTシミュレーション
- Cisco IOS風CLI
- 複数ユーザー認証

## 登場要素

### PC

社内端末を表す。

設定項目：

- name
- ip_address
- subnet_mask
- default_gateway

pingの送信元・宛先になれる。

### Switch

L2スイッチを表す。

初期実装ではMAC学習やVLANは再現しない。

役割は、同一L2セグメント上の接続をまとめることである。

設定項目：

- name

### Router

L3ルータを表す。

設定項目：

- name
- interfaces
- route_entries

### Firewall

WANからLANへの入り口に置く境界機器を表す。

初期実装では、FirewallはRouterに近いL3機器として扱う。

ただし、画面上ではRouterとは別アイコン・別typeにする。

設定項目：

- name
- lan_interface
- wan_interface
- route_entries
- default_route

初期実装では、Firewallルールやポリシー制御は実装しない。

ただし、将来拡張しやすいようにDevice typeとして `firewall` を持たせる。

### Internet Cloud

インターネット側を表すNetworkCloud。

設定項目：

- name
- representative_ip

例：

```text
Internet Cloud: 8.8.8.8
```

初期実装では、FirewallまたはRouterに `0.0.0.0/0` のdefault routeがあり、next hopまたはInternet Cloudへ到達できればInternet到達可能とみなす。

### Master'sONE Cloud

閉域網、WANサービス、外部ネットワークサービスを表すNetworkCloud。

設定項目：

- name
- network_address
- subnet_mask

例：

```text
Master'sONE Cloud
network: 172.16.0.0
mask: 255.255.0.0
```

初期実装では、RouterまたはFirewallにMaster'sONE向けの静的ルートが存在し、接続されたMaster'sONE Cloudへ到達できれば到達可能とみなす。

## DB設計方針

### network_projects

```text
id
name
description
created_at
updated_at
```

### devices

```text
id
network_project_id
name
type
position_x
position_y
default_gateway
metadata_json
created_at
updated_at
```

`type` は以下のみを許可する。

```text
pc
switch
router
firewall
```

### network_clouds

```text
id
network_project_id
name
type
position_x
position_y
representative_ip
network_address
subnet_mask
metadata_json
created_at
updated_at
```

`type` は以下のみを許可する。

```text
internet
masters_one
wan
```

Internet Cloudの例：

```json
{
  "type": "internet",
  "representative_ip": "8.8.8.8"
}
```

Master'sONE Cloudの例：

```json
{
  "type": "masters_one",
  "network_address": "172.16.0.0",
  "subnet_mask": "255.255.0.0"
}
```

### device_interfaces

```text
id
device_id
name
ip_address
subnet_mask
created_at
updated_at
```

### links

```text
id
network_project_id
interface_a_id
interface_b_id
network_cloud_id
created_at
updated_at
```

以下のどちらかを表現する。

```text
DeviceInterface <-> DeviceInterface
DeviceInterface <-> NetworkCloud
```

実装上は以下の制約を守る。

- interface_a_id は必須
- interface_b_id または network_cloud_id のどちらか一方のみを持つ
- interface_b_id と network_cloud_id を同時に持たない

### route_entries

```text
id
device_id
destination_network
subnet_mask
next_hop
outgoing_interface_id
created_at
updated_at
```

RouteEntryはRouterまたはFirewallに紐づく。

## 画面要件

### NetworkEditor

ネットワーク構成を編集するメイン画面。

構成：

```text
+-----------------------------------------------------------+
| Toolbar                                                   |
| [PC] [Switch] [Router] [Firewall]                         |
| [Internet Cloud] [Master'sONE Cloud] [Save]               |
+--------------------------------------+--------------------+
|                                      | Property Panel     |
|           React Flow Canvas          |                    |
|                                      | Ping Panel         |
+--------------------------------------+--------------------+
| Simulation Result                                         |
+-----------------------------------------------------------+
```

### Toolbar

以下のノードを追加できるようにする。

Device：

- PC
- Switch
- Router
- Firewall

NetworkCloud：

- Internet Cloud
- Master'sONE Cloud

### PropertyPanel

選択したノードの設定を編集する。

PCの場合：

- name
- ip_address
- subnet_mask
- default_gateway

Router / Firewallの場合：

- name
- interfaces
- route_entries

Internet Cloudの場合：

- name
- representative_ip

Master'sONE Cloudの場合：

- name
- network_address
- subnet_mask

### PingPanel

以下を入力してpingシミュレーションを実行する。

- source_device_id
- destination_type
- destination_device_id
- destination_cloud_id
- destination_ip

宛先は以下を選べるようにする。

- PC
- Internet Cloud
- Master'sONE Cloud
- 任意IPアドレス

## シミュレーション仕様

### 基本方針

実パケットは送信しない。

DB上の構成情報をもとに、到達性を論理的に判定する。

### ping判定の流れ

1. 送信元Deviceが存在するか確認する
2. 送信元DeviceにIP設定があるか確認する
3. 宛先IPまたは宛先ネットワークを決定する
4. 宛先が同一ネットワークか判定する
5. 同一ネットワークの場合、同一L2到達可能範囲に宛先がいるか確認する
6. 別ネットワークの場合、送信元のdefault gatewayを確認する
7. default gatewayが送信元と同一ネットワーク内にあるか確認する
8. default gatewayを持つRouterまたはFirewallを探す
9. Router/Firewallのroute_entriesから宛先への経路を探す
10. next_hopまたはNetworkCloudをたどる
11. 宛先に到達できるか判定する
12. 戻り経路が必要な場合は逆方向も確認する
13. 成功または失敗理由を返す

### Firewallの扱い

初期実装ではFirewallポリシーは判定しない。

Firewallは以下の特徴を持つRouterとして扱う。

- LAN側interface
- WAN側interface
- default route
- route_entries

ただし、失敗理由表示ではFirewallとして表示する。

例：

```text
Firewallにdefault routeが設定されていないため、Internet Cloudへ到達できません。
```

### Internet Cloudの扱い

Internet Cloudは代表IPを持つ外部ネットワーククラウドとする。

例：

```text
8.8.8.8
```

FirewallまたはRouterに `0.0.0.0/0` のdefault routeがあり、next_hopまたはInternet Cloudへ到達できればInternet到達可能とみなす。

### Master'sONE Cloudの扱い

Master'sONE Cloudは閉域網・WANを表すNetworkCloudとする。

例：

```text
172.16.0.0/16
```

RouterまたはFirewallにMaster'sONE向けの静的ルートが存在し、outgoing_interfaceがMaster'sONE Cloudへ接続されている、またはnext_hopをたどってMaster'sONE Cloudへ到達できれば到達可能とみなす。

例：

```text
destination_network: 172.16.0.0
subnet_mask: 255.255.0.0
next_hop: 10.0.0.1
```

## SimulationResultレスポンス例

成功例：

```json
{
  "success": true,
  "message": "到達可能です。",
  "hops": [
    {
      "device": "PC-A",
      "message": "宛先は別ネットワークのため、default gateway 192.168.10.1 に送信します。"
    },
    {
      "device": "Firewall-1",
      "message": "172.16.0.0/16 への静的ルートを使用します。"
    },
    {
      "device": "Master'sONE Cloud",
      "message": "閉域網クラウドへ到達しました。"
    }
  ],
  "suggestions": []
}
```

失敗例：

```json
{
  "success": false,
  "message": "Master'sONE Cloudへ到達できません。",
  "hops": [
    {
      "device": "PC-A",
      "message": "宛先は別ネットワークです。"
    },
    {
      "device": "PC-A",
      "message": "default gateway 192.168.10.1 を使用します。"
    },
    {
      "device": "Firewall-1",
      "message": "172.16.0.0/16 への静的ルートがありません。"
    }
  ],
  "error_code": "MASTERS_ONE_ROUTE_MISSING",
  "suggestions": [
    "Firewallに 172.16.0.0/16 宛ての静的ルートを追加してください。",
    "Master'sONE Cloudへ接続するWAN側interfaceが正しいか確認してください。"
  ]
}
```

## エラーコード案

```text
SOURCE_DEVICE_NOT_FOUND
SOURCE_IP_MISSING
DESTINATION_NOT_FOUND
DESTINATION_IP_MISSING
DEFAULT_GATEWAY_MISSING
DEFAULT_GATEWAY_OUT_OF_SUBNET
GATEWAY_DEVICE_NOT_FOUND
LINK_NOT_CONNECTED
CLOUD_NOT_CONNECTED
ROUTE_NOT_FOUND
NEXT_HOP_NOT_FOUND
RETURN_ROUTE_NOT_FOUND
DEFAULT_ROUTE_MISSING
MASTERS_ONE_ROUTE_MISSING
INVALID_IP_ADDRESS
INVALID_SUBNET_MASK
```

## 初期サンプル構成

### 正常系: LANからInternet Cloud

```text
PC-A
- ip: 192.168.10.10
- mask: 255.255.255.0
- gateway: 192.168.10.1

Switch-1

Firewall-1
- lan: 192.168.10.1/24
- wan: 203.0.113.2/30
- default route: 0.0.0.0/0 via 203.0.113.1

Internet Cloud
- representative_ip: 8.8.8.8
```

### 正常系: LANからMaster'sONE Cloud

```text
PC-A
- ip: 192.168.10.10
- mask: 255.255.255.0
- gateway: 192.168.10.1

Firewall-1
- lan: 192.168.10.1/24
- wan: 10.0.0.2/30
- route: 172.16.0.0/16 via 10.0.0.1

Master'sONE Cloud
- network: 172.16.0.0
- mask: 255.255.0.0
```

### 将来想定: 本社から支店LAN

```text
HeadOffice-PC
  |
HeadOffice-Switch
  |
HeadOffice-Firewall
  |
Master'sONE Cloud
  |
Branch-Router
  |
Branch-Switch
  |
Branch-PC
```

## 実装順序

以下の順序で作業すること。

1. Laravel + Inertia + React + TypeScriptの初期セットアップ
2. React Flowで空のエディタ画面を表示
3. Device type定義を作成
4. NetworkCloud type定義を作成
5. PC / Switch / Router / Firewallノードを追加可能にする
6. Internet Cloud / Master'sONE Cloudノードを追加可能にする
7. DBマイグレーションを作成
8. 構成保存APIを作成
9. 構成読み込みAPIを作成
10. PropertyPanelで設定編集
11. PingSimulationControllerを作成
12. PingSimulatorサービスを作成
13. IP計算処理を作成
14. route解決処理を作成
15. NetworkCloud到達判定を作成
16. 結果表示パネルを作成
17. サンプル構成を作成

## 注意事項

- 最初から完璧なネットワークシミュレータを目指さないこと
- Firewallのポリシー制御は初期実装しないこと
- Master'sONEは実サービス再現ではなく、NetworkCloudとして扱うこと
- Master'sONEをDeviceとして実装しないこと
- VLAN、NAT、DHCP、DNSは後回しにすること
- 通信判定の説明文を丁寧に出すこと
- 失敗理由は情シス初学者が読んで理解できる日本語にすること

## 完了条件

Codexの初回実装では、最低限以下を満たすこと。

- アプリが起動する
- ネットワークエディタ画面が表示される
- PC / Switch / Firewall / Internet Cloud / Master'sONE Cloud を配置できる
- ノード同士を接続できる
- PCにIP、mask、gatewayを設定できる
- FirewallにLAN/WAN interfaceとrouteを設定できる
- Internet Cloudにrepresentative_ipを設定できる
- Master'sONE Cloudにnetwork_addressとsubnet_maskを設定できる
- PCからInternet Cloudへのping判定ができる
- PCからMaster'sONE Cloudへのping判定ができる
- 成功/失敗と理由が画面に表示される
