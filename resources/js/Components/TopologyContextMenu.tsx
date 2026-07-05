import type { DeviceType, NetworkCloudType } from '../Types/network';

type FlowPosition = {
    x: number;
    y: number;
};

type ContextMenuState = {
    screenX: number;
    screenY: number;
    flowPosition: FlowPosition;
    targetNodeId: string | null;
};

type TopologyContextMenuProps = {
    contextMenu: ContextMenuState;
    canAddInterface: boolean;
    onAddDevice: (type: DeviceType, position: FlowPosition) => void;
    onAddCloud: (type: NetworkCloudType, position: FlowPosition) => void;
    onEditNode: (nodeId: string) => void;
    onAddInterface: () => void;
    onDeleteNode: (nodeId: string) => void;
};

export default function TopologyContextMenu({
    contextMenu,
    canAddInterface,
    onAddDevice,
    onAddCloud,
    onEditNode,
    onAddInterface,
    onDeleteNode,
}: TopologyContextMenuProps) {
    return (
        <div
            className="context-menu"
            style={{
                left: `${contextMenu.screenX}px`,
                top: `${contextMenu.screenY}px`,
            }}
        >
            {contextMenu.targetNodeId === null ? (
                <>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddDevice('pc', contextMenu.flowPosition)}
                    >
                        PC を追加
                    </button>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddDevice('l2_switch', contextMenu.flowPosition)}
                    >
                        L2 スイッチを追加
                    </button>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddDevice('l3_switch', contextMenu.flowPosition)}
                    >
                        L3 スイッチを追加
                    </button>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddDevice('onu', contextMenu.flowPosition)}
                    >
                        ONU を追加
                    </button>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddDevice('ap', contextMenu.flowPosition)}
                    >
                        AP を追加
                    </button>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddDevice('router', contextMenu.flowPosition)}
                    >
                        ルータを追加
                    </button>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddDevice('firewall', contextMenu.flowPosition)}
                    >
                        ファイアウォールを追加
                    </button>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddCloud('internet', contextMenu.flowPosition)}
                    >
                        Internet クラウドを追加
                    </button>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onAddCloud('masters_one', contextMenu.flowPosition)}
                    >
                        Master'sONE クラウドを追加
                    </button>
                </>
            ) : (
                <>
                    <button
                        type="button"
                        className="context-menu-item"
                        onClick={() => onEditNode(contextMenu.targetNodeId ?? '')}
                    >
                        ノードを編集
                    </button>
                    {canAddInterface && (
                        <button
                            type="button"
                            className="context-menu-item"
                            onClick={onAddInterface}
                        >
                            インターフェースを追加
                        </button>
                    )}
                    <button
                        type="button"
                        className="context-menu-item danger"
                        onClick={() => onDeleteNode(contextMenu.targetNodeId ?? '')}
                    >
                        ノードを削除
                    </button>
                </>
            )}
        </div>
    );
}
