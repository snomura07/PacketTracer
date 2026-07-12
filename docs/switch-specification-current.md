# スイッチ仕様 現在実装版

このドキュメントは、現時点の PacketTracer 実装における L2 スイッチ / L3 スイッチの仕様をまとめたもの。

設計方針だけではなく、実際に保存されるデータ、UI 上で編集できる項目、Ping シミュレーション時の扱い、既知の暫定仕様まで含める。

関連資料:

- [network-design-l3-switch.md](./network-design-l3-switch.md)
- [domain-model.md](./domain-model.md)

## 1. 基本方針

- L2 スイッチと L3 スイッチは、どちらも `Device.type = "switch"` で表現する
- L2 / L3 の違いは `Device.metadata_json.switch_mode` で表現する
- `switch_mode` は `l2` または `l3`
- 旧データ互換として `l2_switch` / `l3_switch` 入力も受けるが、保存時は `switch` に正規化する

例:

```json
{
  "type": "switch",
  "metadata_json": {
    "switch_mode": "l2",
    "port_count": 8
  }
}
```

```json
{
  "type": "switch",
  "metadata_json": {
    "switch_mode": "l3",
    "port_count": 8
  }
}
```

## 2. L2 スイッチ仕様

### 2.1 役割

- 同一 VLAN 内の L2 転送を行う
- 物理ポートはすべて `switchport` として扱う
- ルーティングは行わない
- `RouteEntry` は実質使わない

### 2.2 インターフェース

L2 スイッチの各インターフェースは以下の前提で扱う。

- `metadata_json.role = "switchport"`
- `metadata_json.access_vlan` を持つ
- `ip_address` は持たない
- `subnet_mask` は持たない

保存時には、L2 スイッチに対して `svi` や `routed` を送っても `switchport` に正規化される。

また、`ip_address` / `subnet_mask` を送っても保存時に `null` へ落とされる。

### 2.3 UI

インターフェース編集画面では以下のみを編集する。

- 名称
- MAC アドレス
- 所属 VLAN

表示上は `L2 VLAN ポート` として扱う。

IP アドレスやサブネットマスク入力欄は表示しない。

### 2.4 管理 IP

現状の L2 スイッチには管理用 IP の専用表現はない。

方針としては以下。

- L2 スイッチの物理ポートに管理 IP を持たせない
- 将来的に管理用 SVI として表現する

したがって、現時点では「L2 スイッチ本体の管理 IP」は未実装である。

## 3. L3 スイッチ仕様

### 3.1 役割

- L2 スイッチの責務を持つ
- ルーティング機能を持つ
- `RouteEntry` を持てる
- VLAN ベースの L3 ゲートウェイを将来的に SVI へ寄せる前提で実装している

### 3.2 インターフェース種別

L3 スイッチではインターフェースごとに 3 種類を扱う。

#### `switchport`

- VLAN に所属する L2 ポート
- `metadata_json.access_vlan` を持つ
- `ip_address` は持たない
- `subnet_mask` は持たない

#### `svi`

- VLAN に対応する論理インターフェース
- `metadata_json.vlan_id` を持つ
- `ip_address` を持てる
- `subnet_mask` を持てる

#### `routed`

- VLAN 非依存の L3 ポート
- `ip_address` を持てる
- `subnet_mask` を持てる

### 3.3 UI

インターフェース編集画面では、役割ごとに表示項目を分けている。

#### `switchport` の場合

- 名称
- インターフェース種別
- MAC アドレス
- 所属 VLAN

#### `svi` の場合

- 名称
- インターフェース種別
- MAC アドレス
- 対象 VLAN
- SVI の IP アドレス
- SVI のサブネットマスク

#### `routed` の場合

- 名称
- インターフェース種別
- MAC アドレス
- Routed ポートの IP アドレス
- Routed ポートのサブネットマスク

### 3.4 役割変更時の挙動

- `switchport` に変更した場合は `ip_address` / `subnet_mask` をクリアする
- `l2` モードへ戻した場合、全ポートを `switchport` 扱いに戻し、`ip_address` / `subnet_mask` をクリアする

## 4. 保存データ仕様

### 4.1 Device

スイッチは以下の形で保存される。

```json
{
  "type": "switch",
  "metadata_json": {
    "switch_mode": "l2",
    "port_count": 8
  }
}
```

または

```json
{
  "type": "switch",
  "metadata_json": {
    "switch_mode": "l3",
    "port_count": 8
  }
}
```

### 4.2 DeviceInterface

L2 switchport:

```json
{
  "name": "port1",
  "ip_address": null,
  "subnet_mask": null,
  "metadata_json": {
    "role": "switchport",
    "access_vlan": 10
  }
}
```

L3 switch SVI:

```json
{
  "name": "vlan10",
  "ip_address": "192.168.10.1",
  "subnet_mask": "255.255.255.0",
  "metadata_json": {
    "role": "svi",
    "vlan_id": 10
  }
}
```

L3 switch routed port:

```json
{
  "name": "uplink0",
  "ip_address": "10.0.0.2",
  "subnet_mask": "255.255.255.252",
  "metadata_json": {
    "role": "routed"
  }
}
```

## 5. 正規化ルール

保存時の正規化ルールは以下。

### 5.1 デバイスタイプ

- `l2_switch` 入力は `switch + switch_mode=l2` に正規化
- `l3_switch` 入力は `switch + switch_mode=l3` に正規化

### 5.2 L2 スイッチの role

- L2 スイッチに `svi` / `routed` を送っても `switchport` に正規化

### 5.3 IP アドレスの保持可否

- L2 スイッチの全ポートは `ip_address` / `subnet_mask` を保持しない
- L3 スイッチの `switchport` も `ip_address` / `subnet_mask` を保持しない
- L3 スイッチの `svi` / `routed` のみ `ip_address` / `subnet_mask` を保持する

### 5.4 VLAN 番号

- `access_vlan` は switchport に対して保持する
- `vlan_id` は SVI に対して保持する
- UI 上は一時的に空文字を保持できるが、保存時には backend 正規化で数値へ寄せる

## 6. Ping シミュレーションでの扱い

### 6.1 L2 到達性

- `switchport` は VLAN ごとのブリッジグループとして扱う
- 同じ `access_vlan` に属する switchport 同士は同一 L2 セグメントとして扱う

### 6.2 SVI

- `svi` は論理インターフェースとして扱う
- SVI 自身を始点 / 終点候補とするのではなく、同じ VLAN に属する switchport 群へ展開して L2 到達性を判定する

### 6.3 接続制約

- `svi` は論理インターフェース扱いのため、直接リンク接続の対象にはしない
- UI 上でも SVI は接続元として選択できない

## 7. インターフェース編集画面の現在仕様

現在の UI は「L2 と L3 を完全に別画面に分ける」のではなく、同じタブ内で表示項目を切り替える方式を採用している。

そのため:

- L2 スイッチでは VLAN ポート設定だけを表示する
- L3 スイッチでは role に応じて VLAN 設定または L3 設定を表示する

現状の表示ラベル:

- `L2 VLAN ポート`
- `VLAN ポート`
- `SVI (VLAN インターフェース)`
- `Routed ポート`

## 8. 既知の暫定仕様

現状は現実のスイッチ実装を完全再現していない。主な暫定仕様は以下。

- trunk port は未実装
- native VLAN は未実装
- allowed VLAN list は未実装
- 管理用 SVI は未実装
- STP は未実装
- MAC 学習は UI / 永続化されたテーブルとしては未実装
- L3 スイッチの connected route 自動生成は厳密には未整理

## 9. 今後の推奨拡張

今後は以下の順で寄せるのが自然。

1. VLAN entity を導入する
2. switchport に `access` / `trunk` を導入する
3. L2 スイッチの管理用 SVI を導入する
4. L3 スイッチの SVI ベース設計を強化する
5. connected route の明示化と route lookup を整理する

## 10. 根拠となる主要実装

- [app/Models/Device.php](/home/snomura/workspace/PacketTracer/app/Models/Device.php:1)
- [app/Services/NetworkProjectTopologyService.php](/home/snomura/workspace/PacketTracer/app/Services/NetworkProjectTopologyService.php:1)
- [app/Services/NetworkSimulator/PingSimulator.php](/home/snomura/workspace/PacketTracer/app/Services/NetworkSimulator/PingSimulator.php:1)
- [resources/js/Pages/NetworkEditor.tsx](/home/snomura/workspace/PacketTracer/resources/js/Pages/NetworkEditor.tsx:1)
