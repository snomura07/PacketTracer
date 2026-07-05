import type { ArpTableEntry } from '../Types/network';

type ArpTablePanelProps = {
    arpTable: ArpTableEntry[];
};

export default function ArpTablePanel({ arpTable }: ArpTablePanelProps) {
    return (
        <div className="selected-card">
            <p className="panel-label">ARP テーブル</p>
            {arpTable.length === 0 ? (
                <p className="selected-summary-text">
                    まだエントリはありません。通信後に学習結果を表示します。
                </p>
            ) : (
                <div className="detail-section">
                    <span className="detail-heading">学習済みエントリ</span>
                    {arpTable.map((entry) => (
                        <div
                            key={`${entry.device_name}-${entry.interface_name}-${entry.ip_address}`}
                            className="detail-card"
                        >
                            <strong>{entry.device_name}</strong>
                            <span className="hop-meta">{entry.interface_name}</span>
                            <span>
                                {entry.ip_address} -&gt; {entry.mac_address}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
