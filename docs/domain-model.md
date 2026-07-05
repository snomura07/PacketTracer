# ドメインモデル設計

## 概要

PacketTracerでは、ネットワーク構成を以下の要素で表現する。

- NetworkProject
- Device
- NetworkCloud
- DeviceInterface
- Link
- RouteEntry
- SimulationResult

## NetworkProject

ネットワーク構成の単位。

```text
NetworkProject
- id
- name
- description
- created_at
- updated_at
```

1つのプロジェクトに複数の機器、ネットワーククラウド、接続、ルート情報を持つ。

## Device

PC、スイッチ、ルータ、ファイアウォールなどの物理・論理機器を表す。

```text
Device
- id
- network_project_id
- name
- type
- position_x
- position_y
- default_gateway
- metadata_json
- created_at
- updated_at
```

### type

```text
pc
l2_switch
l3_switch
onu
ap
router
firewall
```

### 補足

PCのデフォルトゲートウェイはDeviceに持たせる。

L2 SwitchはVLAN内のL2転送を担う機器として扱い、L3ルーティング情報は持たせない。

L3 Switchは複数インターフェースにIPを持てるL3機器として扱い、RouteEntryを持てる。

ONUは光アクセス回線の終端装置として扱い、初期段階ではL2受け渡しのみを担う。

APは無線クライアントを有線LANへ収容するアクセスポイントとして扱い、初期段階ではL2ブリッジのみを担う。

RouterとFirewallとL3 SwitchのデフォルトルートはRouteEntryとして持たせる。

Firewallは初期実装ではRouterに近いL3機器として扱うが、将来のポリシー制御拡張を考慮してDevice typeを分ける。

## NetworkCloud

InternetやMaster'sONEのような、機器ではなくネットワークそのものを表す抽象要素。

```text
NetworkCloud
- id
- network_project_id
- name
- type
- position_x
- position_y
- representative_ip
- network_address
- subnet_mask
- metadata_json
- created_at
- updated_at
```

### type

```text
internet
masters_one
wan
```

### Internet Cloud

インターネット側を表すクラウド。

代表IPを設定できる。

```text
Internet Cloud
- representative_ip: 8.8.8.8
```

初期実装では、RouterまたはFirewallに `0.0.0.0/0` のdefault routeがあり、next hopへ到達できればInternet到達可能とみなす。

### Master'sONE Cloud

NTTコミュニケーションズのMaster'sONEのような閉域網・WANサービスを表すクラウド。

Master'sONEはPCやルータのような単体機器ではなく、拠点間をつなぐ閉域網そのものとして扱う。

```text
Master'sONE Cloud
- network_address: 172.16.0.0
- subnet_mask: 255.255.0.0
```

Master'sONE Cloudには複数のRouterまたはFirewallを接続できる。

初期実装では、RouterまたはFirewallにMaster'sONE向け静的ルートがあり、接続されたCloudへ到達できれば到達可能とみなす。

## DeviceInterface

Deviceが持つインターフェースを表す。

```text
DeviceInterface
- id
- device_id
- name
- ip_address
- subnet_mask
- created_at
- updated_at
```

例：

```text
PC-A eth0 192.168.10.10 255.255.255.0
Firewall-1 lan 192.168.10.1 255.255.255.0
Firewall-1 wan 10.0.0.2 255.255.255.252
Router-Branch wan 10.0.0.6 255.255.255.252
```

L2スイッチは初期段階ではIPを持たなくてもよい。

## Link

DeviceInterface同士、またはDeviceInterfaceとNetworkCloudの接続を表す。

```text
Link
- id
- network_project_id
- interface_a_id
- interface_b_id
- network_cloud_id
- created_at
- updated_at
```

初期段階では、リンクは常に有効なケーブルまたはWAN接続として扱う。

以下のどちらかを表現する。

```text
DeviceInterface <-> DeviceInterface
DeviceInterface <-> NetworkCloud
```

将来的には以下を追加する可能性がある。

```text
- status: up / down
- cable_type
- bandwidth
- provider
```

## RouteEntry

RouterまたはFirewallの静的ルーティング情報を表す。

```text
RouteEntry
- id
- device_id
- destination_network
- subnet_mask
- next_hop
- outgoing_interface_id
- created_at
- updated_at
```

例：

```text
Firewall-1
0.0.0.0 0.0.0.0 via 203.0.113.1
172.16.0.0 255.255.0.0 via 10.0.0.1
```

## SimulationResult

DB永続化は必須ではない。

APIレスポンスとして以下の形式で返す。

```text
SimulationResult
- success
- source_device
- destination
- hops
- error_code
- error_message
- suggestions
```

### hops

通信経路の追跡結果。

```text
Hop
- device_name
- action
- result
- message
```

例：

```text
PC-A: 宛先は別ネットワークのためデフォルトゲートウェイへ送信
Firewall-1: Master'sONE向けルート 172.16.0.0/16 を発見
Master'sONE Cloud: 閉域網クラウドへ到達
Branch-Router: 拠点LANへのルートを確認
PC-B: 到達
```

## ERイメージ

```text
NetworkProject
  ├─ Device
  │   ├─ DeviceInterface
  │   └─ RouteEntry
  │
  ├─ NetworkCloud
  │
  └─ Link
      ├─ interface_a_id -> DeviceInterface
      ├─ interface_b_id -> DeviceInterface
      └─ network_cloud_id -> NetworkCloud
```

## 初期データ例

```text
Project: Sample Network

PC-A
- eth0: 192.168.10.10/24
- default gateway: 192.168.10.1

SW-1

Firewall-1
- lan: 192.168.10.1/24
- wan: 10.0.0.2/30
- route: 172.16.0.0/16 via 10.0.0.1

Master'sONE Cloud
- network: 172.16.0.0/16

Branch-Router
- wan: 10.0.0.6/30
- lan: 192.168.20.1/24

PC-B
- eth0: 192.168.20.10/24
- default gateway: 192.168.20.1
```

この構成では、PC-AからMaster'sONE Cloudを経由してPC-Bへ到達する流れを表現できる。
