# ネットワーク機器メモ

## 目的

このドキュメントは、PacketTracer を現実にかなり近いレベルまで実装するための、機器責務とドメイン設計の基準をまとめたもの。

最初から全機能を再現するのではなく、現実の責務に沿って段階的にモデルを増やす。

## 重要な前提

- 現実のネットワーク機器は「見た目」ではなく「どの層で何を判断して転送するか」で分かれる
- L2 と L3 は別責務
- ルーティング、フィルタ、NAT は別責務
- VLAN、ARP、MAC 学習、ルーティングテーブル、ACL/NAT は独立した概念として持つべき
- 1 台の機器が複数責務を持つことはある
  - 例: L3 スイッチは L2 スイッチ + VLAN 間ルータに近い
  - 例: ファイアウォールは ルータ + パケットフィルタ + NAT に近い

## 参考にした一次資料

- Juniper: Bridging and VLANs
  - https://www.juniper.net/documentation/us/en/software/junos/multicast-l2/topics/topic-map/bridging-and-vlans.html
- Juniper: Integrated Routing and Bridging
  - https://www.juniper.net/documentation/us/en/software/junos/multicast-l2/topics/topic-map/irb-and-bridging.html
- Cisco: Layer 2 interfaces / access and trunk
  - https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/7-x/interfaces/configuration/guide/b_Cisco_Nexus_9000_Series_NX-OS_Interfaces_Configuration_Guide_7x/b_Cisco_Nexus_9000_Series_NX-OS_Interfaces_Configuration_Guide_7x_chapter_0100.html
- Cisco: STP overview
  - https://www.cisco.com/en/US/docs/switches/lan/catalyst3650/software/release/3se/consolidated_guide/configuration_guide/b_consolidated_3850_3se_cg_chapter_01001001.html
- RFC 826: ARP
  - https://www.rfc-editor.org/info/rfc826/
- RFC 792: ICMP
  - https://www.rfc-editor.org/info/rfc792/
- RFC 1812: Router requirements
  - https://www.rfc-editor.org/info/rfc1812/
- Fortinet: Static routing / routing concepts / policy routes / central SNAT
  - https://docs.fortinet.com/document/fortigate/6.4.0/administration-guide/804259/static-routing
  - https://docs.fortinet.com/document/fortigate/latest/administration-guide/139692/routing-concepts
  - https://docs.fortinet.com/document/fortigate/7.4.8/administration-guide/144044/policy-routes
  - https://docs.fortinet.com/document/fortigate/7.4.0/administration-guide/421028/central-snat

## 機器ごとの現実的な責務

### PC / Server / Host

責務:

- 自分宛の IP パケットを送受信する
- 同一サブネット宛かどうかを判定する
- 同一サブネットなら ARP で相手 MAC を解決して送る
- 異なるサブネットならデフォルトゲートウェイへ送る
- ルータのような中継はしない

最低限必要な属性:

- ホスト名
- NIC 一覧
- 各 NIC の IP / mask / MAC
- デフォルトゲートウェイ
- 必要なら DNS

シミュレータ上の扱い:

- 送信元 / 宛先エンドポイント
- 初期段階では 1 NIC でもよい
- 将来は複数 NIC 対応を見据える

### L2 スイッチ

責務:

- MAC アドレスを学習する
- フレームを同一 VLAN 内で転送する
- 未知ユニキャスト / ブロードキャスト / 一部マルチキャストをフラッディングする
- VLAN でブロードキャストドメインを分割する
- ループを避けるため STP 系で一部ポートをブロックしうる

やらないこと:

- VLAN 間ルーティング
- IP ルート選択
- next-hop 解決

最低限必要な属性:

- ポート一覧
- ポートモード: access / trunk
- access VLAN
- trunk allowed VLAN list
- native VLAN
- VLAN 一覧
- STP 状態を簡略化するなら link active / blocked

シミュレータ上の扱い:

- 「全部のポートが全部に通る」では不十分
- 実際には VLAN ごとに到達性が分かれる
- 同じ L2 スイッチでも VLAN が違えば通信不可

### L3 スイッチ

責務:

- L2 スイッチの責務を持つ
- VLAN ごとの L3 インターフェースを持てる
- VLAN 間ルーティングを行う
- 直結ルートを持つ
- 静的ルート、場合によっては動的ルートを持つ

重要な点:

- 現実には「ただ IP が付いた L2 スイッチ」ではない
- VLAN または bridge domain に対応する SVI / IRB が gateway になる
- 同一 VLAN 内はブリッジ、VLAN 間はルーティング

最低限必要な属性:

- L2 スイッチの属性一式
- SVI / IRB 一覧
  - VLAN ID
  - IP / mask
  - 管理状態
- ルーティングテーブル
- 必要なら VRF

シミュレータ上の扱い:

- Router にかなり近いが、入口と出口が VLAN / SVI に紐づく
- 将来は「物理ポートに IP を付ける routed port」と「SVI」の両方を区別したい

### Router

責務:

- 複数の L3 ネットワーク間でパケットを中継する
- 直結ルートと静的 / 動的ルートに基づいて経路選択する
- next-hop を解決する
- TTL を減算し、必要なら ICMP エラーを返す

最低限必要な属性:

- L3 インターフェース一覧
- IP / mask
- 直結ネットワーク
- ルーティングテーブル
  - 宛先 prefix
  - next hop
  - outgoing interface
  - administrative distance
  - metric
- default route

シミュレータ上の扱い:

- longest prefix match を実装する
- next-hop が同一セグメントに存在するか確認する
- 直結 / 静的 route から始めて、将来 OSPF/BGP を追加する

### ONU

責務:

- 光アクセス回線の加入者側終端として動作する
- PON 側と Ethernet 側の受け渡しを行う
- 初期段階では L2 のメディア終端 / 受け渡し装置として扱う

やらないこと:

- ルーティング
- NAT
- セキュリティポリシー制御

最低限必要な属性:

- uplink/downlink ポート
- 回線状態
- 必要なら provider 情報

シミュレータ上の扱い:

- 当面は L2 ブリッジとして扱う
- 将来は PON セグメントや回線断を表現できるようにする

### Access Point

責務:

- 無線クライアントを有線LANへ収容する
- SSID と VLAN の対応に従って L2 ブリッジする
- 必要に応じて複数 SSID を提供する

やらないこと:

- 初期段階ではルーティング
- NAT
- コントローラ連携の再現

最低限必要な属性:

- uplink ポート
- SSID 一覧
- SSID ごとの VLAN

シミュレータ上の扱い:

- 当面は L2 ブリッジとして扱う
- 将来は無線クライアント、ローミング、WGB などを追加する

### Firewall

責務:

- ルーティングする
- セキュリティポリシーに基づいて通す / 落とす
- NAT を実行することが多い
- ゾーンやインターフェース方向に基づいて判定する
- 製品によっては stateful inspection を行う

Router との違い:

- ルートがあるだけでは通らない
- ポリシーで明示許可されない通信は拒否されることが多い
- NAT の前後で見えるアドレスが変わる

最低限必要な属性:

- L3 インターフェース
- ゾーン
- ルーティングテーブル
- Security Policy
  - src zone / dst zone
  - src address
  - dst address
  - service / protocol / port
  - action allow / deny
- NAT Rule
  - SNAT / DNAT
  - 変換前後アドレス

シミュレータ上の扱い:

- Router の上位互換として実装するのがよい
- 経路判定の後に policy 判定、必要なら NAT 判定を入れる
- 最初は stateless でもよいが、将来は stateful を入れたい

### Network Cloud

責務:

- 単体機器ではなく外部ネットワークの抽象
- Internet, WAN, 閉域網, ISP 網などを表す

種類:

- Internet
- MPLS / WAN / 閉域網
- ISP access network

シミュレータ上の扱い:

- 最初は「特定ルートを持っていれば到達可」の抽象でよい
- 将来は cloud 内部に複数 endpoint / transit network を持てるようにする

## 実装で区別すべき概念

### Interface

区別が必要:

- 物理ポート
- 論理 L3 インターフェース
- SVI / IRB
- サブインターフェース

現状の `DeviceInterface` 1 種類だけでは、将来 VLAN や SVI を入れると苦しくなる。

少なくとも概念としては以下を分けたい。

- PhysicalPort
  - device_id
  - name
  - admin status
  - oper status
  - mode access / trunk / routed
- VlanInterface
  - device_id
  - vlan_id
  - name
  - ip / mask
- RoutedInterface
  - device_id
  - physical_port_id
  - ip / mask

### VLAN

現実寄りにするなら VLAN は独立エンティティにした方がよい。

必要な属性:

- vlan_id
- name
- member ports
- trunk allowed list
- native VLAN
- L3 gateway interface

### MAC 学習

本格再現では以下が必要:

- VLAN ごとの MAC table
- learned MAC -> port
- unknown destination の flooding

ただし初期段階では、MAC 学習を省略して「同一 VLAN 内なら L2 到達可」でもよい。

### ARP

ARP は現実の到達性判定で重要。

最低限必要な判定:

- 同一セグメント上に next-hop の IP が存在するか
- その相手へ L2 到達できるか

最初は ARP table を持たず、都度解決で十分。

### Routing Table

最低限必要:

- connected route
- static route
- default route
- longest prefix match

将来必要:

- administrative distance
- metric
- ECMP
- policy-based routing

### Security Policy / ACL

区別:

- Router ACL
  - routed packet を条件で permit / deny
- Firewall policy
  - zone / address / service / action

最初は firewall policy を独立モデルにした方がよい。
ACL を router と firewall で無理に共通化しない方が実装しやすい。

### NAT

区別:

- SNAT / PAT
- DNAT
- static NAT
- policy NAT

実務でよく見るのは:

- 社内 -> Internet への SNAT
- Internet -> 公開サーバへの DNAT

最初は Firewall 専用機能として入れるのが自然。

## パケット処理の現実寄りな順序

### Host から送るとき

1. 宛先 IP を見る
2. 同一サブネットか判定する
3. 同一なら宛先 IP の ARP 解決
4. 別サブネットなら default gateway の ARP 解決
5. L2 フレーム化して送信

### L2 スイッチで受けたとき

1. 受信ポートと VLAN を決める
2. source MAC を学習する
3. destination MAC を見る
4. 同一 VLAN 内で転送先を決める
5. 未知なら flooding
6. STP blocked port には出さない

### L3 機器で受けたとき

1. 宛先 MAC が自機器宛か確認
2. L3 パケットを取り出す
3. 宛先 IP に対して route lookup
4. longest prefix match
5. egress interface と next-hop を決める
6. next-hop の ARP 解決
7. TTL 更新などを行って転送
8. Firewall なら policy / NAT 判定を挟む

## このプロジェクトで今後持つべきドメイン

### Phase A: すぐ必要

- DeviceType を厳密化
  - host
  - l2_switch
  - l3_switch
  - router
  - firewall
- Interface を物理ポート中心で整理
- Routing table を connected + static で整理
- L2 到達性を VLAN 単位で判定

### Phase B: 現実寄りにする上で重要

- VLAN entity
- port mode access / trunk / routed
- SVI / IRB
- connected route 自動生成
- next-hop 再帰解決

### Phase C: 実務っぽさが一気に増す

- Firewall policy
- SNAT / DNAT
- policy based routing
- STP blocked link
- ACL

### Phase D: かなり本格的

- dynamic routing
- VRF
- DHCP
- DNS
- HSRP / VRRP
- LACP
- ECMP

## ドメイン設計の推奨

現実に寄せたいなら、`DeviceInterface` に全部詰め込むより、少なくとも内部概念として以下を分けた方がよい。

- Device
- PhysicalPort
- Vlan
- VlanMembership
- VlanInterface
- Link
- RouteEntry
- FirewallPolicy
- NatRule

### 推奨する責務分担

- `l2_switch`
  - VLAN
  - port mode
  - MAC forwarding
- `l3_switch`
  - 上記 + SVI + route lookup
- `router`
  - L3 interface + route lookup
- `firewall`
  - route lookup + policy + NAT

## 実装上の注意

- L3 スイッチを「IP が設定できる L2 スイッチ」として扱わない
- Router と Firewall を同一扱いにしすぎない
- Internet Cloud を単なる成功フラグにしすぎない
- next-hop の存在確認を省略しない
- 戻り経路確認では NAT の影響を将来考慮できる形にする

## まず着手すべき順番

1. VLAN と port mode の導入
2. L2 到達性を VLAN ベースへ変更
3. L3 スイッチに SVI を導入
4. connected route 自動生成
5. next-hop 再帰解決
6. Firewall policy
7. NAT

この順番なら、現実の責務に寄せながら破綻しにくい。
