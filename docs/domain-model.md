# ドメインモデル設計

## 概要

PacketTracerでは、ネットワーク構成を以下の要素で表現する。

- Project
- Device
- Interface
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

1つのプロジェクトに複数の機器、接続、ルート情報を持つ。

## Device

PC、スイッチ、ルータ、インターネット雲などの機器を表す。

```text
Device
- id
- network_project_id
- name
- type
- position_x
- position_y
- default_gateway
- created_at
- updated_at
```

### type

```text
pc
switch
router
internet
```

### 補足

PCのデフォルトゲートウェイはDeviceに持たせる。

ルータのデフォルトルートはRouteEntryとして持たせる。

## DeviceInterface

機器が持つインターフェースを表す。

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
Router-1 eth0 192.168.10.1 255.255.255.0
Router-1 eth1 192.168.20.1 255.255.255.0
```

L2スイッチは初期段階ではIPを持たなくてもよい。

## Link

インターフェース同士の接続を表す。

```text
Link
- id
- network_project_id
- interface_a_id
- interface_b_id
- created_at
- updated_at
```

初期段階では、リンクは常に有効なケーブルとして扱う。

将来的には以下を追加する可能性がある。

```text
- status: up / down
- cable_type
- bandwidth
```

## RouteEntry

ルータの静的ルーティング情報を表す。

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
Router-1
192.168.20.0 255.255.255.0 via 192.168.30.2
0.0.0.0 0.0.0.0 via 192.168.30.254
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
Router-1: 192.168.20.0/24 へのルートを発見
Router-2: 宛先ネットワークに接続
PC-B: 到達
```

## ERイメージ

```text
NetworkProject
  ├─ Device
  │   ├─ DeviceInterface
  │   └─ RouteEntry
  │
  └─ Link
      ├─ interface_a_id -> DeviceInterface
      └─ interface_b_id -> DeviceInterface
```

## 初期データ例

```text
Project: Sample Network

PC-A
- eth0: 192.168.10.10/24
- default gateway: 192.168.10.1

SW-1

Router-1
- eth0: 192.168.10.1/24
- eth1: 192.168.20.1/24

PC-B
- eth0: 192.168.20.10/24
- default gateway: 192.168.20.1
```

この構成では、PC-AからPC-Bへのpingが成功する。
