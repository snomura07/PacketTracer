import { Head, usePage } from '@inertiajs/react';
import {
    Background,
    Controls,
    MarkerType,
    MiniMap,
    ReactFlow,
    type Edge,
    type Node,
    useEdgesState,
    useNodesState,
} from 'reactflow';

type PageProps = {
    appName: string;
    milestone: string;
    supportedDeviceTypes: string[];
    supportedCloudTypes: string[];
};

const initialNodes: Node[] = [
    {
        id: 'pc-a',
        position: { x: 0, y: 160 },
        data: { label: 'PC-A\n192.168.10.10/24\nGW 192.168.10.1' },
        type: 'default',
    },
    {
        id: 'switch-1',
        position: { x: 240, y: 160 },
        data: { label: 'SW-1\nL2 segment' },
        type: 'default',
    },
    {
        id: 'router-1',
        position: { x: 500, y: 160 },
        data: { label: 'Router-1\nLAN 192.168.10.1\nWAN 203.0.113.2' },
        type: 'default',
    },
    {
        id: 'internet',
        position: { x: 820, y: 60 },
        data: { label: 'Internet Cloud\n8.8.8.8' },
        type: 'default',
    },
    {
        id: 'masters-one',
        position: { x: 820, y: 280 },
        data: { label: "Master'sONE Cloud\n172.16.0.0/16" },
        type: 'default',
    },
];

const initialEdges: Edge[] = [
    {
        id: 'pc-a-switch-1',
        source: 'pc-a',
        target: 'switch-1',
        markerEnd: { type: MarkerType.ArrowClosed },
    },
    {
        id: 'switch-1-router-1',
        source: 'switch-1',
        target: 'router-1',
        markerEnd: { type: MarkerType.ArrowClosed },
    },
    {
        id: 'router-1-internet',
        source: 'router-1',
        target: 'internet',
        markerEnd: { type: MarkerType.ArrowClosed },
    },
    {
        id: 'router-1-masters-one',
        source: 'router-1',
        target: 'masters-one',
        markerEnd: { type: MarkerType.ArrowClosed },
    },
];

export default function NetworkEditor() {
    const { props } = usePage<PageProps>();
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    return (
        <>
            <Head title="Network Editor" />

            <main className="app-shell">
                <section className="hero-panel">
                    <div className="hero-copy">
                        <p className="eyebrow">{props.appName}</p>
                        <h1>Reachability simulator bootstrap</h1>
                        <p className="hero-text">
                            Packet Tracer 風 UI の最小骨格です。まずは L3 到達性に絞り、
                            React Flow 上でトポロジーを見せるところまで立ち上げています。
                        </p>
                    </div>

                    <div className="status-card">
                        <p className="status-label">Current milestone</p>
                        <strong>{props.milestone}</strong>
                        <p className="status-note">
                            次は永続化モデルとプロパティ編集パネルを載せます。
                        </p>
                    </div>
                </section>

                <section className="workspace-grid">
                    <aside className="sidebar-card">
                        <div>
                            <p className="panel-label">Supported devices</p>
                            <ul className="token-list">
                                {props.supportedDeviceTypes.map((deviceType) => (
                                    <li key={deviceType}>{deviceType}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <p className="panel-label">Supported clouds</p>
                            <ul className="token-list">
                                {props.supportedCloudTypes.map((cloudType) => (
                                    <li key={cloudType}>{cloudType}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="checklist-card">
                            <p className="panel-label">Bootstrap status</p>
                            <ul className="checklist">
                                <li>Laravel 11 skeleton</li>
                                <li>Inertia + React + TypeScript</li>
                                <li>React Flow canvas</li>
                                <li>Initial topology preview</li>
                            </ul>
                        </div>
                    </aside>

                    <section className="canvas-card">
                        <div className="canvas-header">
                            <div>
                                <p className="panel-label">Topology canvas</p>
                                <h2>Starter network graph</h2>
                            </div>
                            <p className="canvas-hint">
                                ノードはドラッグ可能です。保存や接続編集は次段階で追加します。
                            </p>
                        </div>

                        <div className="canvas-frame">
                            <ReactFlow
                                fitView
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                            >
                                <Background color="#1f2937" gap={20} />
                                <MiniMap
                                    nodeColor="#ea580c"
                                    maskColor="rgba(15, 23, 42, 0.65)"
                                />
                                <Controls />
                            </ReactFlow>
                        </div>
                    </section>
                </section>
            </main>
        </>
    );
}
