# Codex作業指示書

## プロジェクト概要

このリポジトリでは、Packet Tracer風のネットワーク到達性シミュレータを作成する。

目的は、社内ネットワーク構成の理解と障害切り分け練習である。

実際のパケット送信やCisco IOS風CLIの再現は行わない。

GUI上にネットワーク機器を配置し、IPアドレス、サブネットマスク、デフォルトゲートウェイ、静的ルーティング、機器間接続を設定し、端末間のping可否を論理的に判定する。

## 最重要方針

まずは完成度よりも、最小構成で動くことを優先する。

最初のゴールは以下である。

```text
Internet / MastersOne
        |
     Firewall
        |
      Switch
      /    \
    PC-A   PC-B
```

この構成で、以下を判定できるようにする。

- PC-A から PC-B にpingできるか
- PC-A から Internet に出られるか
- PC-A から MastersOne に到達できるか
- 設定ミスがある場合、どこで失敗したかを表示する

## 採用アーキテクチャ

以下の構成で実装する。

- Laravel 11
- Inertia
- React
- TypeScript
- React Flow
- MySQL

## 初期実装の優先順位

### 優先度A

必ず実装する。

- Laravelプロジェクト初期化
- Inertia + React + TypeScript導入
- React Flow導入
- MySQL接続
- ネットワークエディタ画面
- Device / Interface / Link / RouteEntry のDBモデル
- PC / Switch / Router / Firewall / Internet / MastersOne のノード表示
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
- 入力バリデーション強化

### 優先度C

今回は実装しない。

- VLAN
- DHCP
- DNS
- NATの詳細再現
- ACL
- STP
- 実パケット送信
- MQTTシミュレーション
- Cisco IOS風CLI
- 複数ユーザー認証

## 登場機器

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
- wan_interface
- lan_interface
- route_entries
- default_route

初期実装では、Firewallルールやポリシー制御は実装しない。

ただし、将来拡張しやすいようにDevice typeとして `firewall` を持たせる。

### Internet

インターネット側を表す抽象ノード。

設定項目：

- name
- representative_ip

例：

```text
Internet: 8.8.8.8
```

初期実装では、FirewallまたはRouterにdefault routeがあれば到達可能とみなす。

### MastersOne

閉域網、WANサービス、外部ネットワークサービスを表す抽象ノード。

実サービスの詳細再現は行わない。

このアプリ上では、Internetとは別の外部ネットワークとして扱う。

用途：

- 拠点間ネットワーク
- 閉域網
- WAN側ネットワーク
- 社内LANから外部サービス網へ到達できるかの確認

設定項目：

- name
- network_address
- subnet_mask
- gateway_ip

例：

```text
MastersOne
network: 172.16.0.0
mask: 255.255.0.0
```

初期実装では、MastersOneは `external_network` として扱う。

Device typeは `masters_one` とする。

## Device type一覧

```text
pc
switch
router
firewall
internet
masters_one
```

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

`metadata_json` には、InternetやMastersOneなど通常機器と少し違う情報を格納してよい。

例：

```json
{
  "representative_ip": "8.8.8.8"
}
```

```json
{
  "network_address": "172.16.0.0",
  "subnet_mask": "255.255.0.0",
  "gateway_ip": "172.16.0.1"
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
created_at
updated_at
```

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

## 画面要件

### NetworkEditor

ネットワーク構成を編集するメイン画面。

構成：

```text
+--------------------------------------------------+
| Toolbar                                          |
| [PC] [Switch] [Router] [Firewall] [Internet]     |
| [MastersOne] [Save]                              |
+-------------------------------+------------------+
|                               | Property Panel   |
|        React Flow Canvas      |                  |
|                               | Ping Panel       |
+-------------------------------+------------------+
| Simulation Result                                |
+--------------------------------------------------+
```

### Toolbar

以下のノードを追加できるようにする。

- PC
- Switch
- Router
- Firewall
- Internet
- MastersOne

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

Internetの場合：

- name
- representative_ip

MastersOneの場合：

- name
- network_address
- subnet_mask
- gateway_ip

### PingPanel

以下を入力してpingシミュレーションを実行する。

- source_device_id
- destination_type
- destination_device_id
- destination_ip

宛先は、PC、Internet、MastersOneを選べるようにする。

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
10. next_hopをたどる
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
Firewallにdefault routeが設定されていないため、Internetへ到達できません。
```

### Internetの扱い

Internetは代表IPを持つ外部ノードとする。

例：

```text
8.8.8.8
```

FirewallまたはRouterに `0.0.0.0/0` のdefault routeがあり、next_hopに到達できればInternet到達可能とみなす。

### MastersOneの扱い

MastersOneは外部ネットワークを表す抽象ノードとする。

例：

```text
172.16.0.0/16
```

RouterまたはFirewallにMastersOne向けの静的ルートが存在し、next_hopへ到達できれば到達可能とみなす。

例：

```text
destination_network: 172.16.0.0
subnet_mask: 255.255.0.0
next_hop: 10.0.0.2
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
      "message": "0.0.0.0/0 のdefault routeを使用します。"
    },
    {
      "device": "Internet",
      "message": "宛先に到達しました。"
    }
  ],
  "suggestions": []
}
```

失敗例：

```json
{
  "success": false,
  "message": "Internetへ到達できません。",
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
      "message": "default routeがありません。"
    }
  ],
  "error_code": "DEFAULT_ROUTE_MISSING",
  "suggestions": [
    "Firewallに 0.0.0.0/0 のルートを追加してください。",
    "WAN側next hopが正しいか確認してください。"
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
ROUTE_NOT_FOUND
NEXT_HOP_NOT_FOUND
RETURN_ROUTE_NOT_FOUND
DEFAULT_ROUTE_MISSING
INVALID_IP_ADDRESS
INVALID_SUBNET_MASK
```

## 初期サンプル構成

### 正常系: LANからInternet

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

Internet
- representative_ip: 8.8.8.8
```

### 正常系: LANからMastersOne

```text
PC-A
- ip: 192.168.10.10
- mask: 255.255.255.0
- gateway: 192.168.10.1

Firewall-1
- lan: 192.168.10.1/24
- wan: 10.0.0.2/30
- route: 172.16.0.0/16 via 10.0.0.1

MastersOne
- network: 172.16.0.0
- mask: 255.255.0.0
```

## 実装順序

以下の順序で作業すること。

1. Laravel + Inertia + React + TypeScriptの初期セットアップ
2. React Flowで空のエディタ画面を表示
3. Device type定義を作成
4. PC / Switch / Router / Firewall / Internet / MastersOneノードを追加可能にする
5. DBマイグレーションを作成
6. 構成保存APIを作成
7. 構成読み込みAPIを作成
8. PropertyPanelで設定編集
9. PingSimulationControllerを作成
10. PingSimulatorサービスを作成
11. IP計算処理を作成
12. route解決処理を作成
13. 結果表示パネルを作成
14. サンプル構成を作成

## 注意事項

- 最初から完璧なネットワークシミュレータを目指さないこと
- Firewallのポリシー制御は初期実装しないこと
- MastersOneは実サービス再現ではなく、外部ネットワーク抽象として扱うこと
- VLAN、NAT、DHCP、DNSは後回しにすること
- 通信判定の説明文を丁寧に出すこと
- 失敗理由は情シス初学者が読んで理解できる日本語にすること

## 完了条件

Codexの初回実装では、最低限以下を満たすこと。

- アプリが起動する
- ネットワークエディタ画面が表示される
- PC / Switch / Firewall / Internet / MastersOne を配置できる
- ノード同士を接続できる
- PCにIP、mask、gatewayを設定できる
- FirewallにLAN/WAN interfaceとrouteを設定できる
- PCからInternetへのping判定ができる
- PCからMastersOneへのping判定ができる
- 成功/失敗と理由が画面に表示される
