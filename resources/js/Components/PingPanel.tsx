import type { SimulationResult, TopologyCloud, TopologyDevice } from '../Types/network';

type PingPanelProps = {
    pingSourceDeviceId: number | null;
    pingDestinationType: 'device' | 'cloud';
    pingDestinationId: number | null;
    pingSourceOptions: TopologyDevice[];
    pingDestinationDeviceOptions: TopologyDevice[];
    pingDestinationCloudOptions: TopologyCloud[];
    isSimulating: boolean;
    simulationResult: SimulationResult | null;
    onPingSourceDeviceIdChange: (value: number | null) => void;
    onPingDestinationTypeChange: (value: 'device' | 'cloud') => void;
    onPingDestinationIdChange: (value: number | null) => void;
    onRunPingSimulation: () => void;
};

export default function PingPanel({
    pingSourceDeviceId,
    pingDestinationType,
    pingDestinationId,
    pingSourceOptions,
    pingDestinationDeviceOptions,
    pingDestinationCloudOptions,
    isSimulating,
    simulationResult,
    onPingSourceDeviceIdChange,
    onPingDestinationTypeChange,
    onPingDestinationIdChange,
    onRunPingSimulation,
}: PingPanelProps) {
    return (
        <div className="selected-card">
            <p className="panel-label">Ping シミュレーション</p>
            <div className="field-stack">
                <label className="field-group">
                    <span>送信元 PC</span>
                    <select
                        className="editor-input"
                        value={pingSourceDeviceId ?? ''}
                        onChange={(event) =>
                            onPingSourceDeviceIdChange(
                                event.target.value === '' ? null : Number(event.target.value),
                            )
                        }
                    >
                        <option value="">送信元を選択</option>
                        {pingSourceOptions.map((device) => (
                            <option key={device.id} value={device.id}>
                                {device.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-group">
                    <span>宛先種別</span>
                    <select
                        className="editor-input"
                        value={pingDestinationType}
                        onChange={(event) =>
                            onPingDestinationTypeChange(
                                event.target.value as 'device' | 'cloud',
                            )
                        }
                    >
                        <option value="device">PC</option>
                        <option value="cloud">クラウド</option>
                    </select>
                </label>
                <label className="field-group">
                    <span>宛先</span>
                    <select
                        className="editor-input"
                        value={pingDestinationId ?? ''}
                        onChange={(event) =>
                            onPingDestinationIdChange(
                                event.target.value === '' ? null : Number(event.target.value),
                            )
                        }
                    >
                        <option value="">宛先を選択</option>
                        {pingDestinationType === 'device'
                            ? pingDestinationDeviceOptions
                                  .filter((device) => device.id !== pingSourceDeviceId)
                                  .map((device) => (
                                      <option key={device.id} value={device.id}>
                                          {device.name}
                                      </option>
                                  ))
                            : pingDestinationCloudOptions.map((cloud) => (
                                  <option key={cloud.id} value={cloud.id}>
                                      {cloud.name}
                                  </option>
                              ))}
                    </select>
                </label>
                <button
                    type="button"
                    className="action-button primary"
                    onClick={onRunPingSimulation}
                    disabled={isSimulating}
                >
                    {isSimulating ? '実行中...' : 'Ping 実行'}
                </button>
            </div>

            {simulationResult && (
                <div className="simulation-card">
                    <div
                        className={`simulation-banner ${simulationResult.success ? 'is-success' : 'is-failure'}`}
                    >
                        {simulationResult.success
                            ? `成功: ${simulationResult.destination}`
                            : `失敗: ${simulationResult.error_code}`}
                    </div>
                    {simulationResult.error_message && (
                        <p className="selected-summary-text">
                            {simulationResult.error_message}
                        </p>
                    )}
                    <div className="detail-section">
                        <span className="detail-heading">経路</span>
                        {simulationResult.hops.map((hop, index) => (
                            <div key={`${hop.device_name}-${index}`} className="detail-card">
                                <strong>{hop.device_name}</strong>
                                <span className="hop-meta">
                                    {hop.action} / {hop.result}
                                </span>
                                <span>{hop.message}</span>
                            </div>
                        ))}
                    </div>
                    {simulationResult.suggestions.length > 0 && (
                        <div className="detail-section">
                            <span className="detail-heading">改善案</span>
                            {simulationResult.suggestions.map((suggestion) => (
                                <div key={suggestion} className="inline-link-row">
                                    <span>{suggestion}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
