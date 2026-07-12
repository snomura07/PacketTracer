import { Handle, Position, type NodeProps } from 'reactflow';

type TopologyNodeData = {
    title: string;
    category: string;
    details: string[];
    kind:
        | 'pc'
        | 'switch'
        | 'onu'
        | 'ap'
        | 'router'
        | 'firewall'
        | 'internet'
        | 'masters_one'
        | 'wan';
    onSelect?: () => void;
    onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

const iconForKind = (kind: TopologyNodeData['kind']) => {
    switch (kind) {
        case 'pc':
            return (
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <rect x="10" y="14" width="44" height="28" rx="4" />
                    <rect x="16" y="20" width="32" height="16" rx="2" className="node-icon-screen" />
                    <path d="M24 48h16l4 6H20z" />
                </svg>
            );
        case 'switch':
            return (
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <rect x="8" y="18" width="48" height="28" rx="6" />
                    <path d="M18 28h8M30 28h16M18 36h12M34 36h12" className="node-icon-screen" />
                    <circle cx="18" cy="28" r="2" className="node-icon-screen" />
                    <circle cx="18" cy="36" r="2" className="node-icon-screen" />
                </svg>
            );
        case 'onu':
            return (
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <rect x="12" y="18" width="40" height="28" rx="6" />
                    <path d="M20 28h24M20 36h10M34 36h10" className="node-icon-screen" />
                    <circle cx="18" cy="32" r="3" className="node-icon-screen" />
                </svg>
            );
        case 'ap':
            return (
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle cx="32" cy="42" r="5" />
                    <path d="M22 34a14 14 0 0 1 20 0M16 28a22 22 0 0 1 32 0M10 22a30 30 0 0 1 44 0" className="node-icon-screen" />
                </svg>
            );
        case 'router':
            return (
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle cx="32" cy="32" r="22" />
                    <path d="M32 18v28M18 32h28M23 23l18 18M41 23 23 41" className="node-icon-screen" />
                </svg>
            );
        case 'firewall':
            return (
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <path d="M32 10 50 18v12c0 12-7 20-18 24-11-4-18-12-18-24V18z" />
                    <path d="M26 20v24M38 20v24M20 28h24M20 36h24" className="node-icon-screen" />
                </svg>
            );
        case 'internet':
            return (
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle cx="32" cy="32" r="22" />
                    <path d="M12 32h40M32 12a26 26 0 0 1 0 40M32 12a26 26 0 0 0 0 40" className="node-icon-screen" />
                </svg>
            );
        case 'masters_one':
        case 'wan':
            return (
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <path d="M16 24c4-8 12-12 16-12s12 4 16 12c6 0 10 4 10 10s-4 10-10 10H18c-7 0-12-5-12-10s5-10 10-10z" />
                    <path d="M22 36h20M26 30h12" className="node-icon-screen" />
                </svg>
            );
    }
};

export default function TopologyNode({ data, selected }: NodeProps<TopologyNodeData>) {
    return (
        <div
            className={`topology-node ${selected ? 'is-selected' : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                data.onSelect?.();
            }}
            onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                data.onContextMenu?.(event);
            }}
        >
            <Handle type="target" position={Position.Left} className="topology-handle" />
            <Handle type="source" position={Position.Right} className="topology-handle" />

            <div className={`node-icon kind-${data.kind}`}>{iconForKind(data.kind)}</div>
            <div className="node-copy">
                <div className="node-title">{data.title}</div>
                <div className="node-category">{data.category}</div>
                <div className="node-details">
                    {data.details.map((detail) => (
                        <div key={detail}>{detail}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}
