import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Background,
    type Connection,
    Controls,
    MarkerType,
    MiniMap,
    ReactFlow,
    type Edge,
    type Node,
    type ReactFlowInstance,
} from 'reactflow';
import PingPanel from '../Components/PingPanel';
import ProjectToolbar from '../Components/ProjectToolbar';
import TopologyNode from '../Components/TopologyNode';
import TopologyContextMenu from '../Components/TopologyContextMenu';
import type {
    DeviceType,
    NetworkCloudType,
    RouteEntry,
    SavedProjectSummary,
    SimulationResult,
    TopologyCloud,
    TopologyDevice,
    TopologyProject,
} from '../Types/network';

type PageProps = {
    appName: string;
    milestone: string;
    supportedDeviceTypes: string[];
    supportedCloudTypes: string[];
};

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

type EditorTab = 'basic' | 'interfaces' | 'routing' | 'links';

const nodeTypes = {
    topologyNode: TopologyNode,
};

const SWITCH_PORT_COUNT_OPTIONS = [8, 24, 48] as const;

const nextClientId = (prefix: string): string =>
    `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const initialProject = (): TopologyProject => ({
    name: '疎通確認ラボ',
    description: 'PC-A から Internet と Master\'sONE へ接続する最小構成トポロジー',
    devices: [
        {
            client_id: 'device-pc-a',
            name: 'PC-A',
            type: 'pc',
            position_x: 0,
            position_y: 160,
            default_gateway: '192.168.10.1',
            metadata_json: {},
            interfaces: [
                {
                    client_id: 'interface-pc-a-eth0',
                    name: 'eth0',
                    ip_address: '192.168.10.10',
                    subnet_mask: '255.255.255.0',
                    metadata_json: {},
                },
            ],
            route_entries: [],
        },
        {
            client_id: 'device-switch-1',
            name: 'SW-1',
            type: 'l2_switch',
            position_x: 240,
            position_y: 160,
            default_gateway: null,
            metadata_json: {
                switch_mode: 'l2',
                port_count: 8,
            },
            interfaces: [
                {
                    client_id: 'interface-switch-1-port1',
                    name: 'port1',
                    ip_address: null,
                    subnet_mask: null,
                    metadata_json: { role: 'switchport', access_vlan: 10 },
                },
                {
                    client_id: 'interface-switch-1-port2',
                    name: 'port2',
                    ip_address: null,
                    subnet_mask: null,
                    metadata_json: { role: 'switchport', access_vlan: 10 },
                },
                {
                    client_id: 'interface-switch-1-port3',
                    name: 'port3',
                    ip_address: null,
                    subnet_mask: null,
                    metadata_json: { role: 'switchport', access_vlan: 10 },
                },
                {
                    client_id: 'interface-switch-1-port4',
                    name: 'port4',
                    ip_address: null,
                    subnet_mask: null,
                    metadata_json: { role: 'switchport', access_vlan: 10 },
                },
                {
                    client_id: 'interface-switch-1-port5',
                    name: 'port5',
                    ip_address: null,
                    subnet_mask: null,
                    metadata_json: { role: 'switchport', access_vlan: 10 },
                },
                {
                    client_id: 'interface-switch-1-port6',
                    name: 'port6',
                    ip_address: null,
                    subnet_mask: null,
                    metadata_json: { role: 'switchport', access_vlan: 10 },
                },
                {
                    client_id: 'interface-switch-1-port7',
                    name: 'port7',
                    ip_address: null,
                    subnet_mask: null,
                    metadata_json: { role: 'switchport', access_vlan: 10 },
                },
                {
                    client_id: 'interface-switch-1-port8',
                    name: 'port8',
                    ip_address: null,
                    subnet_mask: null,
                    metadata_json: { role: 'switchport', access_vlan: 10 },
                },
            ],
            route_entries: [],
        },
        {
            client_id: 'device-router-1',
            name: 'Router-1',
            type: 'router',
            position_x: 500,
            position_y: 160,
            default_gateway: null,
            metadata_json: {},
            interfaces: [
                {
                    client_id: 'interface-router-1-lan0',
                    name: 'lan0',
                    ip_address: '192.168.10.1',
                    subnet_mask: '255.255.255.0',
                    metadata_json: {},
                },
                {
                    client_id: 'interface-router-1-wan0',
                    name: 'wan0',
                    ip_address: '203.0.113.2',
                    subnet_mask: '255.255.255.252',
                    metadata_json: {},
                },
                {
                    client_id: 'interface-router-1-wan1',
                    name: 'wan1',
                    ip_address: '10.0.0.1',
                    subnet_mask: '255.255.255.252',
                    metadata_json: {},
                },
            ],
            route_entries: [
                {
                    destination_network: '0.0.0.0',
                    subnet_mask: '0.0.0.0',
                    next_hop: '203.0.113.1',
                    outgoing_interface_client_id: 'interface-router-1-wan0',
                },
                {
                    destination_network: '172.16.0.0',
                    subnet_mask: '255.255.0.0',
                    next_hop: '10.0.0.2',
                    outgoing_interface_client_id: 'interface-router-1-wan1',
                },
            ],
        },
    ],
    network_clouds: [
        {
            client_id: 'cloud-internet',
            name: 'Internet クラウド',
            type: 'internet',
            position_x: 820,
            position_y: 60,
            representative_ip: '8.8.8.8',
            network_address: null,
            subnet_mask: null,
            metadata_json: {},
        },
        {
            client_id: 'cloud-masters-one',
            name: "Master'sONE クラウド",
            type: 'masters_one',
            position_x: 820,
            position_y: 280,
            representative_ip: null,
            network_address: '172.16.0.0',
            subnet_mask: '255.255.0.0',
            metadata_json: {},
        },
    ],
    links: [
        {
            client_id: 'link-pc-switch',
            interface_a_client_id: 'interface-pc-a-eth0',
            interface_b_client_id: 'interface-switch-1-port1',
            network_cloud_client_id: null,
        },
        {
            client_id: 'link-switch-router',
            interface_a_client_id: 'interface-switch-1-port2',
            interface_b_client_id: 'interface-router-1-lan0',
            network_cloud_client_id: null,
        },
        {
            client_id: 'link-router-internet',
            interface_a_client_id: 'interface-router-1-wan0',
            interface_b_client_id: null,
            network_cloud_client_id: 'cloud-internet',
        },
        {
            client_id: 'link-router-masters-one',
            interface_a_client_id: 'interface-router-1-wan1',
            interface_b_client_id: null,
            network_cloud_client_id: 'cloud-masters-one',
        },
    ],
});

const buildDeviceLabel = (device: TopologyDevice): string => {
    const lines = [device.name, device.type.toUpperCase()];

    for (const iface of device.interfaces) {
        const interfaceRole = String(iface.metadata_json?.role ?? '');
        const roleSuffix =
            interfaceRole === 'svi'
                ? ` vlan${String(iface.metadata_json?.vlan_id ?? '1')}`
                : interfaceRole === 'switchport'
                  ? ` vlan${String(iface.metadata_json?.access_vlan ?? '1')}`
                  : '';
        lines.push(
            iface.ip_address && iface.subnet_mask
                ? `${iface.name}${roleSuffix} ${iface.ip_address}/${iface.subnet_mask}`
                : `${iface.name}${roleSuffix} unnumbered`,
        );
    }

    if (device.default_gateway) {
        lines.push(`GW ${device.default_gateway}`);
    }

    if (device.type === 'ap') {
        const ssidProfiles = Array.isArray(device.metadata_json?.ssid_profiles)
            ? device.metadata_json.ssid_profiles
            : [];

        for (const profile of ssidProfiles as Array<Record<string, unknown>>) {
            lines.push(
                `SSID ${String(profile.name ?? 'SSID')} vlan${String(profile.vlan_id ?? 1)}`,
            );
        }
    }

    return lines.join('\n');
};

const isL2Switch = (device: TopologyDevice): boolean => device.type === 'l2_switch';

const isL3Switch = (device: TopologyDevice): boolean => device.type === 'l3_switch';

const isSwitch = (device: TopologyDevice): boolean => isL2Switch(device) || isL3Switch(device);

const supportsStaticRouting = (device: TopologyDevice): boolean =>
    isL3Switch(device) || device.type === 'router' || device.type === 'firewall';

const supportsHostDefaultGateway = (device: TopologyDevice): boolean => device.type === 'pc';

const switchPortCount = (device: TopologyDevice): number =>
    Number(device.metadata_json?.port_count ?? device.interfaces.length ?? 8);

const createSwitchInterfaces = (deviceId: string, portCount: number) =>
    Array.from({ length: portCount }, (_, index) => ({
        client_id: nextClientId(`${deviceId}-port${index + 1}`),
        name: `port${index + 1}`,
        ip_address: null,
        subnet_mask: null,
        metadata_json: {
            role: 'switchport',
            access_vlan: 1,
        },
    }));

const resizeSwitchInterfaces = (
    device: TopologyDevice,
    portCount: number,
): TopologyDevice => {
    const nextInterfaces = device.interfaces.slice(0, portCount).map((iface, index) => ({
        ...iface,
        name: iface.name || `port${index + 1}`,
    }));

    while (nextInterfaces.length < portCount) {
        const index = nextInterfaces.length;
        nextInterfaces.push({
            client_id: nextClientId(`${device.client_id}-port${index + 1}`),
            name: `port${index + 1}`,
            ip_address: null,
            subnet_mask: null,
            metadata_json: {
                role: 'switchport',
                access_vlan: 1,
            },
        });
    }

    return {
        ...device,
        metadata_json: {
            ...device.metadata_json,
            port_count: portCount,
        },
        interfaces: nextInterfaces,
    };
};

const interfaceRoleForDevice = (
    device: TopologyDevice,
    iface: TopologyDevice['interfaces'][number],
): 'switchport' | 'svi' | 'routed' | 'host' =>
    device.type === 'l2_switch'
        ? 'switchport'
        : device.type === 'l3_switch'
          ? ((iface.metadata_json?.role as 'switchport' | 'svi' | 'routed' | undefined) ??
              'switchport')
          : device.type === 'onu' || device.type === 'ap'
            ? 'switchport'
          : device.type === 'pc'
            ? 'host'
            : 'routed';

const deviceTypeLabel = (type: DeviceType | NetworkCloudType): string => {
    switch (type) {
        case 'pc':
            return 'PC';
        case 'l2_switch':
            return 'L2 スイッチ';
        case 'l3_switch':
            return 'L3 スイッチ';
        case 'onu':
            return 'ONU';
        case 'ap':
            return 'AP';
        case 'router':
            return 'ルータ';
        case 'firewall':
            return 'ファイアウォール';
        case 'internet':
            return 'Internet クラウド';
        case 'masters_one':
            return "Master'sONE クラウド";
        case 'wan':
            return 'WAN クラウド';
        default:
            return type;
    }
};

const buildDeviceCategory = (device: TopologyDevice): string => deviceTypeLabel(device.type);

const apSsidProfiles = (device: TopologyDevice): Array<{
    name: string;
    vlan_id: number;
    security: string;
}> =>
    Array.isArray(device.metadata_json?.ssid_profiles)
        ? (device.metadata_json.ssid_profiles as Array<Record<string, unknown>>).map(
              (profile) => ({
                  name: String(profile.name ?? 'SSID'),
                  vlan_id: Number(profile.vlan_id ?? 1),
                  security: String(profile.security ?? 'wpa2_psk'),
              }),
          )
        : [];

const buildCloudLabel = (cloud: TopologyCloud): string => {
    const lines = [cloud.name, cloud.type.toUpperCase()];

    if (cloud.representative_ip) {
        lines.push(cloud.representative_ip);
    }

    if (cloud.network_address && cloud.subnet_mask) {
        lines.push(`${cloud.network_address}/${cloud.subnet_mask}`);
    }

    return lines.join('\n');
};

const buildNodes = (
    project: TopologyProject,
    selectedNodeId: string,
    onSelectNode: (nodeId: string) => void,
    onNodeContextMenu: (
        event: React.MouseEvent<HTMLDivElement>,
        nodeId: string,
    ) => void,
): Node[] => [
    ...project.devices.map((device) => ({
        id: device.client_id,
        position: { x: device.position_x, y: device.position_y },
        selected: device.client_id === selectedNodeId,
        data: {
            title: device.name,
            category: buildDeviceCategory(device),
            details: buildDeviceLabel(device).split('\n').slice(2),
            kind: device.type,
            onSelect: () => onSelectNode(device.client_id),
            onContextMenu: (event: React.MouseEvent<HTMLDivElement>) =>
                onNodeContextMenu(event, device.client_id),
        },
        type: 'topologyNode',
    })),
    ...project.network_clouds.map((cloud) => ({
        id: cloud.client_id,
        position: { x: cloud.position_x, y: cloud.position_y },
        selected: cloud.client_id === selectedNodeId,
        data: {
            title: cloud.name,
            category: cloud.type.toUpperCase(),
            details: buildCloudLabel(cloud).split('\n').slice(2),
            kind: cloud.type,
            onSelect: () => onSelectNode(cloud.client_id),
            onContextMenu: (event: React.MouseEvent<HTMLDivElement>) =>
                onNodeContextMenu(event, cloud.client_id),
        },
        type: 'topologyNode',
    })),
];

const buildEdges = (project: TopologyProject): Edge[] => {
    const deviceIdByInterfaceId = new Map<string, string>();

    for (const device of project.devices) {
        for (const iface of device.interfaces) {
            deviceIdByInterfaceId.set(iface.client_id, device.client_id);
        }
    }

    return project.links
        .map((link) => {
            const source = deviceIdByInterfaceId.get(link.interface_a_client_id);
            const target = link.interface_b_client_id
                ? deviceIdByInterfaceId.get(link.interface_b_client_id)
                : link.network_cloud_client_id;

            if (!source || !target) {
                return null;
            }

            return {
                id: link.client_id,
                source,
                target,
                markerEnd: { type: MarkerType.ArrowClosed },
            } satisfies Edge;
        })
        .filter((edge): edge is Edge => edge !== null);
};

const createDeviceTemplate = (
    type: DeviceType,
    position: { x: number; y: number },
): TopologyDevice => {
    const deviceId = nextClientId(`device-${type}`);

    const interfaces =
        type === 'pc'
            ? [
                  {
                      client_id: nextClientId(`${deviceId}-eth0`),
                      name: 'eth0',
                      ip_address: null,
                      subnet_mask: null,
                      metadata_json: {},
                  },
              ]
            : type === 'onu'
              ? [
                    {
                        client_id: nextClientId(`${deviceId}-pon0`),
                        name: 'pon0',
                        ip_address: null,
                        subnet_mask: null,
                        metadata_json: {
                            role: 'switchport',
                            access_vlan: 1,
                        },
                    },
                    {
                        client_id: nextClientId(`${deviceId}-lan1`),
                        name: 'lan1',
                        ip_address: null,
                        subnet_mask: null,
                        metadata_json: {
                            role: 'switchport',
                            access_vlan: 1,
                        },
                    },
                ]
            : type === 'ap'
              ? [
                    {
                        client_id: nextClientId(`${deviceId}-uplink0`),
                        name: 'uplink0',
                        ip_address: null,
                        subnet_mask: null,
                        metadata_json: {
                            role: 'switchport',
                            access_vlan: 1,
                        },
                    },
                ]
            : type === 'l2_switch' || type === 'l3_switch'
              ? createSwitchInterfaces(deviceId, 8)
              : [
                    {
                        client_id: nextClientId(`${deviceId}-lan0`),
                        name: 'lan0',
                        ip_address: null,
                        subnet_mask: null,
                        metadata_json: {},
                    },
                    {
                        client_id: nextClientId(`${deviceId}-wan0`),
                        name: 'wan0',
                        ip_address: null,
                        subnet_mask: null,
                        metadata_json: {},
                    },
                ];

    return {
        client_id: deviceId,
        name: `${type.toUpperCase()}-${deviceId.slice(-4)}`,
        type,
        position_x: position.x,
        position_y: position.y,
        default_gateway: null,
        metadata_json:
            type === 'l2_switch'
                ? { switch_mode: 'l2', port_count: 8 }
                : type === 'l3_switch'
                  ? { switch_mode: 'l3', port_count: 8 }
                  : type === 'ap'
                    ? {
                          ssid_profiles: [
                              {
                                  name: 'CorpWiFi',
                                  vlan_id: 10,
                                  security: 'wpa2_psk',
                              },
                          ],
                      }
                  : {},
        interfaces,
        route_entries: [],
    };
};

const createCloudTemplate = (
    type: NetworkCloudType,
    position: { x: number; y: number },
): TopologyCloud => ({
    client_id: nextClientId(`cloud-${type}`),
    name:
        type === 'internet'
            ? 'Internet クラウド'
            : type === 'masters_one'
              ? "Master'sONE クラウド"
              : 'WAN クラウド',
    type,
    position_x: position.x,
    position_y: position.y,
    representative_ip: null,
    network_address: null,
    subnet_mask: null,
    metadata_json: {},
});

const statusToneForMessage = (message: string): 'error' | 'success' | 'info' => {
    const normalized = message.toLowerCase();

    if (
        normalized.includes('failed') ||
        normalized.includes('cannot') ||
        normalized.includes('no unused') ||
        normalized.includes('not supported') ||
        message.includes('失敗') ||
        message.includes('できません') ||
        message.includes('ありません') ||
        message.includes('未使用')
    ) {
        return 'error';
    }

    if (
        normalized.includes('saved') ||
        normalized.includes('reloaded') ||
        normalized.includes('linked') ||
        normalized.includes('succeeded') ||
        message.includes('保存しました') ||
        message.includes('再読込しました') ||
        message.includes('接続しました') ||
        message.includes('成功')
    ) {
        return 'success';
    }

    return 'info';
};

export default function NetworkEditor() {
    const { props } = usePage<PageProps>();
    const [projectId, setProjectId] = useState<number | null>(null);
    const [project, setProject] = useState<TopologyProject>(initialProject);
    const [selectedNodeId, setSelectedNodeId] = useState<string>('device-router-1');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isProjectListLoading, setIsProjectListLoading] = useState(false);
    const [isOpeningProject, setIsOpeningProject] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [statusMessage, setStatusMessage] = useState('サンプルトポロジーは未保存です');
    const [savedProjects, setSavedProjects] = useState<SavedProjectSummary[]>([]);
    const [selectedSavedProjectId, setSelectedSavedProjectId] = useState<number | null>(null);
    const [pendingLinkInterfaceId, setPendingLinkInterfaceId] = useState<string | null>(null);
    const [pendingLinkTargetNodeId, setPendingLinkTargetNodeId] = useState<string | null>(null);
    const [pendingLinkTargetInterfaceId, setPendingLinkTargetInterfaceId] = useState<string | null>(null);
    const [pingSourceDeviceId, setPingSourceDeviceId] = useState<number | null>(null);
    const [pingDestinationType, setPingDestinationType] = useState<'device' | 'cloud'>('device');
    const [pingDestinationId, setPingDestinationId] = useState<number | null>(null);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
    const [selectedEditorTab, setSelectedEditorTab] = useState<EditorTab>('basic');
    const [selectedInterfaceId, setSelectedInterfaceId] = useState<string | null>(null);
    const nextDevicePosition = {
        x: 80 + (project.devices.length % 4) * 180,
        y: 80 + Math.floor(project.devices.length / 4) * 120,
    };
    const nextCloudPosition = {
        x: 760,
        y: 80 + project.network_clouds.length * 140,
    };

    const selectedDevice =
        project.devices.find((device) => device.client_id === selectedNodeId) ?? null;
    const selectedCloud =
        project.network_clouds.find((cloud) => cloud.client_id === selectedNodeId) ?? null;
    const selectedLabel = selectedDevice?.name ?? selectedCloud?.name ?? '未選択';
    const selectedType = selectedDevice?.type ?? selectedCloud?.type ?? null;
    const selectedInterface =
        selectedDevice?.interfaces.find((iface) => iface.client_id === selectedInterfaceId) ??
        selectedDevice?.interfaces[0] ??
        null;
    const pendingTargetDevice =
        pendingLinkTargetNodeId !== null
            ? project.devices.find((device) => device.client_id === pendingLinkTargetNodeId) ??
              null
            : null;
    const pendingTargetCloud =
        pendingLinkTargetNodeId !== null
            ? project.network_clouds.find((cloud) => cloud.client_id === pendingLinkTargetNodeId) ??
              null
            : null;
    const selectedNodeLinkSummaries = project.links
        .filter((link) => {
            if (selectedDevice) {
                const interfaceIds = new Set(
                    selectedDevice.interfaces.map((iface) => iface.client_id),
                );

                return (
                    interfaceIds.has(link.interface_a_client_id) ||
                    (link.interface_b_client_id !== null &&
                        interfaceIds.has(link.interface_b_client_id))
                );
            }

            if (selectedCloud) {
                return link.network_cloud_client_id === selectedCloud.client_id;
            }

            return false;
        })
        .map((link) => {
            const sourceDevice = project.devices.find((device) =>
                device.interfaces.some(
                    (iface) => iface.client_id === link.interface_a_client_id,
                ),
            );
            const targetDevice =
                link.interface_b_client_id !== null
                    ? project.devices.find((device) =>
                          device.interfaces.some(
                              (iface) => iface.client_id === link.interface_b_client_id,
                          ),
                      )
                    : null;
            const targetCloud =
                link.network_cloud_client_id !== null
                    ? project.network_clouds.find(
                          (cloud) =>
                              cloud.client_id === link.network_cloud_client_id,
                      )
                    : null;

            return {
                client_id: link.client_id,
                label: `${sourceDevice?.name ?? 'Unknown'} -> ${
                    targetDevice?.name ?? targetCloud?.name ?? 'Unknown'
                }`,
            };
        });
    const pingSourceOptions = project.devices.filter(
        (device) => device.type === 'pc' && device.id !== undefined,
    );
    const pingDestinationDeviceOptions = project.devices.filter(
        (device) => device.type === 'pc' && device.id !== undefined,
    );
    const pingDestinationCloudOptions = project.network_clouds.filter(
        (cloud) => cloud.id !== undefined,
    );
    const statusTone = statusToneForMessage(statusMessage);

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setContextMenu(null);
                setIsEditorOpen(false);
                resetLinkMode();
            }
        };

        window.addEventListener('keydown', handleKeydown);

        return () => window.removeEventListener('keydown', handleKeydown);
    }, []);

    useEffect(() => {
        setSelectedEditorTab('basic');
    }, [selectedNodeId]);

    useEffect(() => {
        if (!selectedDevice) {
            setSelectedInterfaceId(null);
            return;
        }

        if (
            selectedInterfaceId === null ||
            !selectedDevice.interfaces.some((iface) => iface.client_id === selectedInterfaceId)
        ) {
            setSelectedInterfaceId(selectedDevice.interfaces[0]?.client_id ?? null);
        }
    }, [selectedDevice, selectedInterfaceId]);

    const applyLoadedProject = (loadedProject: TopologyProject, message: string) => {
        setProject(loadedProject);
        setProjectId(loadedProject.id ?? null);
        setSelectedSavedProjectId(loadedProject.id ?? null);
        setSelectedNodeId(
            loadedProject.devices[0]?.client_id ??
                loadedProject.network_clouds[0]?.client_id ??
                '',
        );
        setPingSourceDeviceId(
            loadedProject.devices.find((device: TopologyDevice) => device.type === 'pc')?.id ??
                null,
        );
        setPingDestinationType(
            loadedProject.network_clouds.length > 0 ? 'cloud' : 'device',
        );
        setPingDestinationId(
            loadedProject.network_clouds[0]?.id ??
                loadedProject.devices.find(
                    (device: TopologyDevice) => device.type === 'pc',
                )?.id ??
                null,
        );
        setSimulationResult(null);
        setContextMenu(null);
        resetLinkMode();
        setIsEditorOpen(false);
        setStatusMessage(message);
    };

    const refreshSavedProjects = async (preferredProjectId?: number | null) => {
        setIsProjectListLoading(true);

        try {
            const response = await fetch('/api/network-projects', {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (!response.ok) {
                return;
            }

            const nextSavedProjects = (data.projects ?? []) as SavedProjectSummary[];
            setSavedProjects(nextSavedProjects);
            setSelectedSavedProjectId((currentSelection) => {
                const candidateIds = [
                    preferredProjectId ?? null,
                    currentSelection,
                    projectId,
                    nextSavedProjects[0]?.id ?? null,
                ];

                for (const candidateId of candidateIds) {
                    if (
                        candidateId !== null &&
                        nextSavedProjects.some((savedProject) => savedProject.id === candidateId)
                    ) {
                        return candidateId;
                    }
                }

                return null;
            });
        } catch {
            // Keep the editor usable even if the list endpoint is temporarily unavailable.
        } finally {
            setIsProjectListLoading(false);
        }
    };

    useEffect(() => {
        void refreshSavedProjects();
    }, []);

    useEffect(() => {
        if (pingSourceOptions.length === 0) {
            if (pingSourceDeviceId !== null) {
                setPingSourceDeviceId(null);
            }

            return;
        }

        if (
            pingSourceDeviceId === null ||
            !pingSourceOptions.some((device) => device.id === pingSourceDeviceId)
        ) {
            setPingSourceDeviceId(pingSourceOptions[0]?.id ?? null);
        }
    }, [pingSourceDeviceId, pingSourceOptions]);

    useEffect(() => {
        if (projectId === null) {
            return;
        }

        if (pingDestinationType === 'cloud') {
            if (pingDestinationCloudOptions.length === 0) {
                if (pingDestinationId !== null) {
                    setPingDestinationId(null);
                }

                return;
            }

            if (
                pingDestinationId === null ||
                !pingDestinationCloudOptions.some((cloud) => cloud.id === pingDestinationId)
            ) {
                setPingDestinationId(pingDestinationCloudOptions[0]?.id ?? null);
            }

            return;
        }

        const availableDevices = pingDestinationDeviceOptions.filter(
            (device) => device.id !== pingSourceDeviceId,
        );

        if (availableDevices.length === 0) {
            if (pingDestinationId !== null) {
                setPingDestinationId(null);
            }

            return;
        }

        if (
            pingDestinationId === null ||
            !availableDevices.some((device) => device.id === pingDestinationId)
        ) {
            setPingDestinationId(availableDevices[0]?.id ?? null);
        }
    }, [
        pingDestinationCloudOptions,
        pingDestinationDeviceOptions,
        pingDestinationId,
        pingDestinationType,
        pingSourceDeviceId,
        projectId,
    ]);

    const resolveFlowPosition = (
        clientX: number,
        clientY: number,
        fallback: FlowPosition,
    ): FlowPosition =>
        flowInstance?.screenToFlowPosition({
            x: clientX,
            y: clientY,
        }) ?? fallback;

    const openContextMenu = (
        clientX: number,
        clientY: number,
        targetNodeId: string | null,
    ) => {
        const fallback =
            targetNodeId === null
                ? nextDevicePosition
                : {
                      x:
                          project.devices.find((device) => device.client_id === targetNodeId)
                              ?.position_x ??
                          project.network_clouds.find((cloud) => cloud.client_id === targetNodeId)
                              ?.position_x ??
                          nextDevicePosition.x,
                      y:
                          project.devices.find((device) => device.client_id === targetNodeId)
                              ?.position_y ??
                          project.network_clouds.find((cloud) => cloud.client_id === targetNodeId)
                              ?.position_y ??
                          nextDevicePosition.y,
                  };

        setContextMenu({
            screenX: clientX,
            screenY: clientY,
            flowPosition: resolveFlowPosition(clientX, clientY, fallback),
            targetNodeId,
        });
    };

    const handleNodeClick = (nodeId: string) => {
        setContextMenu(null);

        if (
            pendingLinkInterfaceId !== null &&
            selectedDevice !== null &&
            nodeId !== selectedDevice.client_id
        ) {
            const targetDevice = project.devices.find(
                (device) => device.client_id === nodeId,
            );
            const targetCloud = project.network_clouds.find(
                (cloud) => cloud.client_id === nodeId,
            );

            if (targetDevice) {
                if (targetDevice.interfaces.length === 0) {
                    setStatusMessage('接続先デバイスに利用可能なインターフェースがありません');
                    return;
                }

                setPendingLinkTargetNodeId(targetDevice.client_id);
                setPendingLinkTargetInterfaceId(targetDevice.interfaces[0]?.client_id ?? null);
                setSelectedNodeId(nodeId);
                setIsEditorOpen(true);
                setStatusMessage(`${targetDevice.name} の接続先インターフェースを選択してください`);
                return;
            }

            if (targetCloud) {
                setPendingLinkTargetNodeId(targetCloud.client_id);
                setPendingLinkTargetInterfaceId(null);
                setSelectedNodeId(nodeId);
                setIsEditorOpen(true);
                setStatusMessage(`${targetCloud.name} への接続を確定してください`);
                return;
            }
        }

        setSelectedNodeId(nodeId);
        setIsEditorOpen(true);
    };

    const handleNodeContextMenu = (
        event: React.MouseEvent<HTMLDivElement>,
        nodeId: string,
    ) => {
        setSelectedNodeId(nodeId);
        openContextMenu(event.clientX, event.clientY, nodeId);
    };

    const nodes = buildNodes(
        project,
        selectedNodeId,
        handleNodeClick,
        handleNodeContextMenu,
    );
    const edges = buildEdges(project);

    const updateSelectedDevice = (
        updater: (device: TopologyDevice) => TopologyDevice,
    ) => {
        setProject((currentProject) => ({
            ...currentProject,
            devices: currentProject.devices.map((device) =>
                device.client_id === selectedNodeId ? updater(device) : device,
            ),
        }));
    };

    const updateSelectedCloud = (
        updater: (cloud: TopologyCloud) => TopologyCloud,
    ) => {
        setProject((currentProject) => ({
            ...currentProject,
            network_clouds: currentProject.network_clouds.map((cloud) =>
                cloud.client_id === selectedNodeId ? updater(cloud) : cloud,
            ),
        }));
    };

    const updateNodePosition = (nodeId: string, position: { x: number; y: number }) => {
        setProject((currentProject) => ({
            ...currentProject,
            devices: currentProject.devices.map((device) =>
                device.client_id === nodeId
                    ? {
                          ...device,
                          position_x: Math.round(position.x),
                          position_y: Math.round(position.y),
                      }
                    : device,
            ),
            network_clouds: currentProject.network_clouds.map((cloud) =>
                cloud.client_id === nodeId
                    ? {
                          ...cloud,
                          position_x: Math.round(position.x),
                          position_y: Math.round(position.y),
                      }
                    : cloud,
            ),
        }));
    };

    const updateRouteEntry = (
        routeEntries: RouteEntry[],
        index: number,
        field: keyof RouteEntry,
        value: string,
    ) =>
        routeEntries.map((routeEntry, routeIndex) =>
            routeIndex === index
                ? {
                      ...routeEntry,
                      [field]: value === '' ? null : value,
                  }
                : routeEntry,
        );

    const saveProject = async () => {
        setIsSaving(true);
        setStatusMessage('トポロジーを保存しています...');

        const endpoint =
            projectId === null
                ? '/api/network-projects'
                : `/api/network-projects/${projectId}`;
        const method = projectId === null ? 'POST' : 'PUT';

        try {
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(project),
            });
            const data = await response.json();

            if (!response.ok) {
                setStatusMessage(data.message ?? 'トポロジーの保存に失敗しました');
                return;
            }

            applyLoadedProject(
                data.project,
                `プロジェクト #${data.project.id} を保存しました`,
            );
            void refreshSavedProjects(data.project.id);
        } catch {
            setStatusMessage('保存 API へ接続できませんでした');
        } finally {
            setIsSaving(false);
        }
    };

    const loadProject = async (
        targetProjectId: number,
        loadingMessage: string,
        successMessage: string,
        onComplete: () => void,
    ) => {
        setStatusMessage(loadingMessage);

        try {
            const response = await fetch(`/api/network-projects/${targetProjectId}`, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (!response.ok) {
                setStatusMessage(data.message ?? 'トポロジーの読込に失敗しました');
                return;
            }

            applyLoadedProject(data.project, successMessage);
            void refreshSavedProjects(data.project.id);
        } catch {
            setStatusMessage('読込 API へ接続できませんでした');
        } finally {
            onComplete();
        }
    };

    const openSelectedProject = async () => {
        if (selectedSavedProjectId === null) {
            setStatusMessage('開くプロジェクトを選択してください');
            return;
        }

        setIsOpeningProject(true);
        await loadProject(
            selectedSavedProjectId,
            `プロジェクト #${selectedSavedProjectId} を読込しています...`,
            `プロジェクト #${selectedSavedProjectId} を開きました`,
            () => setIsOpeningProject(false),
        );
    };

    const reloadProject = async () => {
        if (projectId === null) {
            setStatusMessage('再読込の前に一度保存してください');
            return;
        }

        setIsReloading(true);
        await loadProject(
            projectId,
            `プロジェクト #${projectId} を再読込しています...`,
            `プロジェクト #${projectId} を再読込しました`,
            () => setIsReloading(false),
        );
    };

    const addDevice = (type: DeviceType, position: FlowPosition = nextDevicePosition) => {
        const device = createDeviceTemplate(type, position);

        setProject((currentProject) => ({
            ...currentProject,
            devices: [...currentProject.devices, device],
        }));
        setSelectedNodeId(device.client_id);
        setIsEditorOpen(true);
        setContextMenu(null);
        setStatusMessage(`${device.name} を追加しました`);
    };

    const addCloud = (
        type: NetworkCloudType,
        position: FlowPosition = nextCloudPosition,
    ) => {
        const cloud = createCloudTemplate(type, position);

        setProject((currentProject) => ({
            ...currentProject,
            network_clouds: [...currentProject.network_clouds, cloud],
        }));
        setSelectedNodeId(cloud.client_id);
        setIsEditorOpen(true);
        setContextMenu(null);
        setStatusMessage(`${cloud.name} を追加しました`);
    };

    const runPingSimulation = async () => {
        if (projectId === null) {
            setStatusMessage('シミュレーションの前にプロジェクトを保存してください');
            return;
        }

        if (pingSourceDeviceId === null || pingDestinationId === null) {
            setStatusMessage('Ping の送信元と宛先を選択してください');
            return;
        }

        setIsSimulating(true);
        setStatusMessage('Ping シミュレーションを実行しています...');

        try {
            const response = await fetch(`/api/network-projects/${projectId}/simulate/ping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    source_device_id: pingSourceDeviceId,
                    destination_type: pingDestinationType,
                    destination_id: pingDestinationId,
                }),
            });
            const data = await response.json();

            setSimulationResult(data);
            setStatusMessage(
                data.success
                    ? `${data.destination} への Ping に成功しました`
                    : `Ping に失敗しました: ${data.error_message}`,
            );
        } catch {
            setStatusMessage('シミュレーション API へ接続できませんでした');
        } finally {
            setIsSimulating(false);
        }
    };

    const deleteLink = (linkClientId: string) => {
        setProject((currentProject) => ({
            ...currentProject,
            links: currentProject.links.filter(
                (link) => link.client_id !== linkClientId,
            ),
        }));
        setStatusMessage('リンクを削除しました');
    };

    const resetLinkMode = () => {
        setPendingLinkInterfaceId(null);
        setPendingLinkTargetNodeId(null);
        setPendingLinkTargetInterfaceId(null);
    };

    const removeNode = (nodeId: string) => {
        const deviceToRemove =
            project.devices.find((device) => device.client_id === nodeId) ?? null;
        const cloudToRemove =
            project.network_clouds.find((cloud) => cloud.client_id === nodeId) ?? null;

        if (deviceToRemove) {
            const interfaceIds = new Set(
                deviceToRemove.interfaces.map((iface) => iface.client_id),
            );

            setProject((currentProject) => ({
                ...currentProject,
                devices: currentProject.devices.filter(
                    (device) => device.client_id !== deviceToRemove.client_id,
                ),
                links: currentProject.links.filter(
                    (link) =>
                        !interfaceIds.has(link.interface_a_client_id) &&
                        (link.interface_b_client_id === null ||
                            !interfaceIds.has(link.interface_b_client_id)),
                ),
            }));
            setSelectedNodeId('');
            setIsEditorOpen(false);
            setContextMenu(null);
            resetLinkMode();
            setSimulationResult(null);
            setStatusMessage(`${deviceToRemove.name} を削除しました`);
            return;
        }

        if (cloudToRemove) {
            setProject((currentProject) => ({
                ...currentProject,
                network_clouds: currentProject.network_clouds.filter(
                    (cloud) => cloud.client_id !== cloudToRemove.client_id,
                ),
                links: currentProject.links.filter(
                    (link) =>
                        link.network_cloud_client_id !== cloudToRemove.client_id,
                ),
            }));
            setSelectedNodeId('');
            setIsEditorOpen(false);
            setContextMenu(null);
            resetLinkMode();
            setSimulationResult(null);
            setStatusMessage(`${cloudToRemove.name} を削除しました`);
        }
    };

    const removeSelectedNode = () => {
        if (selectedNodeId !== '') {
            removeNode(selectedNodeId);
        }
    };

    const confirmPendingLink = () => {
        if (
            pendingLinkInterfaceId === null ||
            pendingLinkTargetNodeId === null ||
            selectedDevice === null
        ) {
            return;
        }

        if (pendingTargetDevice) {
            if (pendingLinkTargetInterfaceId === null) {
                setStatusMessage('リンク作成前に接続先インターフェースを選択してください');
                return;
            }

            setProject((currentProject) => ({
                ...currentProject,
                links: [
                    ...currentProject.links,
                    {
                        client_id: nextClientId('link'),
                        interface_a_client_id: pendingLinkInterfaceId,
                        interface_b_client_id: pendingLinkTargetInterfaceId,
                        network_cloud_client_id: null,
                    },
                ],
            }));
            setStatusMessage(`${selectedDevice.name} と ${pendingTargetDevice.name} を接続しました`);
            resetLinkMode();
            return;
        }

        if (pendingTargetCloud) {
            setProject((currentProject) => ({
                ...currentProject,
                links: [
                    ...currentProject.links,
                    {
                        client_id: nextClientId('link'),
                        interface_a_client_id: pendingLinkInterfaceId,
                        interface_b_client_id: null,
                        network_cloud_client_id: pendingTargetCloud.client_id,
                    },
                ],
            }));
            setStatusMessage(`${selectedDevice.name} と ${pendingTargetCloud.name} を接続しました`);
            resetLinkMode();
        }
    };

    const isInterfaceConnected = (interfaceId: string): boolean =>
        project.links.some(
            (link) =>
                link.interface_a_client_id === interfaceId ||
                link.interface_b_client_id === interfaceId,
        );

    const findFirstAvailableInterface = (device: TopologyDevice) =>
        device.interfaces.find((iface) => !isInterfaceConnected(iface.client_id)) ?? null;

    const hasDuplicateDeviceLink = (
        sourceInterfaceId: string,
        targetInterfaceId: string,
    ): boolean =>
        project.links.some(
            (link) =>
                (link.interface_a_client_id === sourceInterfaceId &&
                    link.interface_b_client_id === targetInterfaceId) ||
                (link.interface_a_client_id === targetInterfaceId &&
                    link.interface_b_client_id === sourceInterfaceId),
        );

    const hasDuplicateCloudLink = (
        sourceInterfaceId: string,
        cloudClientId: string,
    ): boolean =>
        project.links.some(
            (link) =>
                link.interface_a_client_id === sourceInterfaceId &&
                link.network_cloud_client_id === cloudClientId,
        );

    const connectNodes = (sourceNodeId: string, targetNodeId: string) => {
        if (sourceNodeId === targetNodeId) {
            setStatusMessage('同じノード同士は接続できません');
            return;
        }

        const sourceDeviceNode =
            project.devices.find((device) => device.client_id === sourceNodeId) ?? null;
        const sourceCloudNode =
            project.network_clouds.find((cloud) => cloud.client_id === sourceNodeId) ?? null;
        const targetDeviceNode =
            project.devices.find((device) => device.client_id === targetNodeId) ?? null;
        const targetCloudNode =
            project.network_clouds.find((cloud) => cloud.client_id === targetNodeId) ?? null;

        if (sourceCloudNode && targetCloudNode) {
            setStatusMessage('クラウド同士の接続には対応していません');
            return;
        }

        if (sourceDeviceNode && targetDeviceNode) {
            const sourceInterface = findFirstAvailableInterface(sourceDeviceNode);
            const targetInterface = findFirstAvailableInterface(targetDeviceNode);

            if (sourceInterface === null) {
                setStatusMessage(`${sourceDeviceNode.name} に未使用インターフェースがありません`);
                return;
            }

            if (targetInterface === null) {
                setStatusMessage(`${targetDeviceNode.name} に未使用インターフェースがありません`);
                return;
            }

            if (
                hasDuplicateDeviceLink(
                    sourceInterface.client_id,
                    targetInterface.client_id,
                )
            ) {
                setStatusMessage('このノード同士はすでに接続されています');
                return;
            }

            setProject((currentProject) => ({
                ...currentProject,
                links: [
                    ...currentProject.links,
                    {
                        client_id: nextClientId('link'),
                        interface_a_client_id: sourceInterface.client_id,
                        interface_b_client_id: targetInterface.client_id,
                        network_cloud_client_id: null,
                    },
                ],
            }));
            setStatusMessage(
                `${sourceDeviceNode.name}:${sourceInterface.name} と ${targetDeviceNode.name}:${targetInterface.name} を接続しました`,
            );
            return;
        }

        const deviceNode = sourceDeviceNode ?? targetDeviceNode;
        const cloudNode = sourceCloudNode ?? targetCloudNode;

        if (deviceNode === null || cloudNode === null) {
            setStatusMessage('接続対象ノードを特定できませんでした');
            return;
        }

        const sourceInterface = findFirstAvailableInterface(deviceNode);

        if (sourceInterface === null) {
            setStatusMessage(`${deviceNode.name} にクラウド接続用の未使用インターフェースがありません`);
            return;
        }

        if (hasDuplicateCloudLink(sourceInterface.client_id, cloudNode.client_id)) {
            setStatusMessage(`${deviceNode.name} はすでに ${cloudNode.name} と接続されています`);
            return;
        }

        setProject((currentProject) => ({
            ...currentProject,
            links: [
                ...currentProject.links,
                {
                    client_id: nextClientId('link'),
                    interface_a_client_id: sourceInterface.client_id,
                    interface_b_client_id: null,
                    network_cloud_client_id: cloudNode.client_id,
                },
            ],
        }));
        setStatusMessage(
            `${deviceNode.name}:${sourceInterface.name} と ${cloudNode.name} を接続しました`,
        );
    };

    const handleConnect = (connection: Connection) => {
        if (!connection.source || !connection.target) {
            setStatusMessage('リンク作成に失敗しました: 接続元または接続先を検出できませんでした');
            return;
        }

        connectNodes(connection.source, connection.target);
    };

    return (
        <>
            <Head title="ネットワークエディタ" />

            <main className="app-shell">
                <section className="workspace-grid">
                    <section className="canvas-card">
                        <ProjectToolbar
                            appName={props.appName}
                            selectedTypeLabel={
                                selectedType ? deviceTypeLabel(selectedType) : null
                            }
                            selectedLabel={selectedLabel}
                            statusTone={statusTone}
                            statusMessage={statusMessage}
                            savedProjects={savedProjects}
                            selectedSavedProjectId={selectedSavedProjectId}
                            isSaving={isSaving}
                            isProjectListLoading={isProjectListLoading}
                            isOpeningProject={isOpeningProject}
                            isReloading={isReloading}
                            onSelectSavedProject={setSelectedSavedProjectId}
                            onOpenSelectedProject={openSelectedProject}
                            onSave={saveProject}
                            onReload={reloadProject}
                            onReset={() => {
                                setProjectId(null);
                                setProject(initialProject());
                                setSelectedNodeId('device-router-1');
                                setIsEditorOpen(false);
                                setContextMenu(null);
                                setPingSourceDeviceId(null);
                                setPingDestinationId(null);
                                setSimulationResult(null);
                                resetLinkMode();
                                setSelectedSavedProjectId(savedProjects[0]?.id ?? null);
                                setStatusMessage('サンプルトポロジーに戻しました');
                            }}
                        />

                        <div className="canvas-header">
                            <div>
                                <p className="panel-label">トポロジーキャンバス</p>
                                <h2>{project.name}</h2>
                            </div>
                            <p className="canvas-hint">
                                左クリックで編集モーダル、右クリックで追加・削除。ドラッグで配置を調整します。
                            </p>
                        </div>

                        <div
                            className="canvas-frame"
                            onClick={() => setContextMenu(null)}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                openContextMenu(event.clientX, event.clientY, null);
                            }}
                        >
                            <ReactFlow
                                fitView
                                minZoom={0.2}
                                maxZoom={4}
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                onConnect={handleConnect}
                                onInit={setFlowInstance}
                                onNodeClick={(_, node) => handleNodeClick(node.id)}
                                onPaneClick={() => {
                                    setSelectedNodeId('');
                                    setIsEditorOpen(false);
                                    resetLinkMode();
                                    setContextMenu(null);
                                }}
                                onNodeDrag={(_, node) =>
                                    updateNodePosition(node.id, node.position)
                                }
                                onNodeDragStop={(_, node) =>
                                    updateNodePosition(node.id, node.position)
                                }
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

                    <aside className="sidebar-card">
                        <PingPanel
                            projectId={projectId}
                            pingSourceDeviceId={pingSourceDeviceId}
                            pingDestinationType={pingDestinationType}
                            pingDestinationId={pingDestinationId}
                            pingSourceOptions={pingSourceOptions}
                            pingDestinationDeviceOptions={pingDestinationDeviceOptions}
                            pingDestinationCloudOptions={pingDestinationCloudOptions}
                            isSimulating={isSimulating}
                            simulationResult={simulationResult}
                            onPingSourceDeviceIdChange={setPingSourceDeviceId}
                            onPingDestinationTypeChange={(nextType) => {
                                setPingDestinationType(nextType);
                                setPingDestinationId(
                                    nextType === 'cloud'
                                        ? (pingDestinationCloudOptions[0]?.id ?? null)
                                        : (pingDestinationDeviceOptions.find(
                                              (device) => device.id !== pingSourceDeviceId,
                                          )?.id ?? null),
                                );
                            }}
                            onPingDestinationIdChange={setPingDestinationId}
                            onRunPingSimulation={runPingSimulation}
                        />

                    </aside>
                </section>

                {contextMenu && (
                    <TopologyContextMenu
                        contextMenu={contextMenu}
                        canAddInterface={
                            selectedDevice?.client_id === contextMenu.targetNodeId &&
                            !isSwitch(selectedDevice)
                        }
                        onAddDevice={addDevice}
                        onAddCloud={addCloud}
                        onEditNode={(nodeId) => {
                            setSelectedNodeId(nodeId);
                            setIsEditorOpen(true);
                            setContextMenu(null);
                        }}
                        onAddInterface={() => {
                            updateSelectedDevice((device) =>
                                device.type === 'l2_switch' ||
                                device.type === 'l3_switch'
                                    ? resizeSwitchInterfaces(
                                          device,
                                          switchPortCount(device) + 1,
                                      )
                                    : {
                                          ...device,
                                          interfaces: [
                                              ...device.interfaces,
                                              {
                                                  client_id: nextClientId(`${device.client_id}-iface`),
                                                  name: `if${device.interfaces.length}`,
                                                  ip_address: null,
                                                  subnet_mask: null,
                                                  metadata_json: {},
                                              },
                                          ],
                                      },
                            );
                            setIsEditorOpen(true);
                            setContextMenu(null);
                        }}
                        onDeleteNode={removeNode}
                    />
                )}

                {isEditorOpen && (selectedDevice || selectedCloud) && (
                    <div
                        className="modal-backdrop"
                        onClick={() => {
                            setIsEditorOpen(false);
                            setContextMenu(null);
                        }}
                    >
                        <section
                            className="node-modal"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="node-modal-header">
                                <div>
                                    <p className="panel-label">ノード編集</p>
                                    <h2>{selectedLabel}</h2>
                                </div>
                                <div className="node-modal-actions">
                                    {selectedType && (
                                        <span className="selected-summary-badge">
                                            {deviceTypeLabel(selectedType)}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="action-button"
                                        onClick={() => setIsEditorOpen(false)}
                                    >
                                        閉じる
                                    </button>
                                </div>
                            </div>

                            {pendingTargetDevice && (
                                <div className="pending-link-card">
                                    <span className="detail-heading">接続準備中</span>
                                    <p className="selected-summary-text">
                                        接続先: <strong>{pendingTargetDevice.name}</strong>
                                    </p>
                                    <label className="field-group">
                                        <span>接続先インターフェース</span>
                                        <select
                                            className="editor-input"
                                            value={pendingLinkTargetInterfaceId ?? ''}
                                            onChange={(event) =>
                                                setPendingLinkTargetInterfaceId(
                                                    event.target.value || null,
                                                )
                                            }
                                        >
                                            {pendingTargetDevice.interfaces.map((iface) => (
                                                <option key={iface.client_id} value={iface.client_id}>
                                                    {iface.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <div className="modal-inline-actions">
                                        <button
                                            type="button"
                                            className="action-button primary"
                                            onClick={confirmPendingLink}
                                        >
                                            接続を確定
                                        </button>
                                        <button
                                            type="button"
                                            className="action-button"
                                            onClick={() => {
                                                resetLinkMode();
                                                setStatusMessage('接続モードを解除しました');
                                            }}
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            )}

                            {pendingTargetCloud && (
                                <div className="pending-link-card">
                                    <span className="detail-heading">接続準備中</span>
                                    <p className="selected-summary-text">
                                        接続先クラウド: <strong>{pendingTargetCloud.name}</strong>
                                    </p>
                                    <div className="modal-inline-actions">
                                        <button
                                            type="button"
                                            className="action-button primary"
                                            onClick={confirmPendingLink}
                                        >
                                            接続を確定
                                        </button>
                                        <button
                                            type="button"
                                            className="action-button"
                                            onClick={() => {
                                                resetLinkMode();
                                                setStatusMessage('接続モードを解除しました');
                                            }}
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="editor-tabs" role="tablist" aria-label="ノード編集タブ">
                                <button
                                    type="button"
                                    className={`editor-tab ${selectedEditorTab === 'basic' ? 'is-active' : ''}`}
                                    onClick={() => setSelectedEditorTab('basic')}
                                >
                                    基本設定
                                </button>
                                {selectedDevice && (
                                    <button
                                        type="button"
                                        className={`editor-tab ${selectedEditorTab === 'interfaces' ? 'is-active' : ''}`}
                                        onClick={() => setSelectedEditorTab('interfaces')}
                                    >
                                        インターフェース
                                    </button>
                                )}
                                {selectedDevice && supportsStaticRouting(selectedDevice) && (
                                    <button
                                        type="button"
                                        className={`editor-tab ${selectedEditorTab === 'routing' ? 'is-active' : ''}`}
                                        onClick={() => setSelectedEditorTab('routing')}
                                    >
                                        ルーティング
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={`editor-tab ${selectedEditorTab === 'links' ? 'is-active' : ''}`}
                                    onClick={() => setSelectedEditorTab('links')}
                                >
                                    接続
                                </button>
                            </div>

                            {selectedDevice && (
                                <div className="field-stack">
                                    <div className="editor-banner">
                                        <strong>{selectedDevice.name}</strong>
                                        <span>{buildDeviceCategory(selectedDevice)}</span>
                                    </div>
                                    {selectedEditorTab === 'basic' && (
                                        <div className="modal-form-grid">
                                            <label className="field-group">
                                                <span>機器名</span>
                                                <input
                                                    className="editor-input"
                                                    value={selectedDevice.name}
                                                    onChange={(event) =>
                                                        updateSelectedDevice((device) => ({
                                                            ...device,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>

                                            {supportsHostDefaultGateway(selectedDevice) && (
                                                <label className="field-group">
                                                    <span>デフォルトゲートウェイ</span>
                                                    <input
                                                        className="editor-input"
                                                        value={selectedDevice.default_gateway ?? ''}
                                                        onChange={(event) =>
                                                            updateSelectedDevice((device) => ({
                                                                ...device,
                                                                default_gateway:
                                                                    event.target.value || null,
                                                            }))
                                                        }
                                                    />
                                                </label>
                                            )}

                                            {(selectedDevice.type === 'l2_switch' ||
                                                selectedDevice.type === 'l3_switch') && (
                                                <label className="field-group">
                                                    <span>ポート数</span>
                                                    <select
                                                        className="editor-input"
                                                        value={String(switchPortCount(selectedDevice))}
                                                        onChange={(event) =>
                                                            updateSelectedDevice((device) =>
                                                                resizeSwitchInterfaces(
                                                                    device,
                                                                    Number(event.target.value),
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        {SWITCH_PORT_COUNT_OPTIONS.map((portCount) => (
                                                            <option key={portCount} value={portCount}>
                                                                {portCount} ポート
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            )}

                                            {selectedDevice.type === 'ap' && (
                                                <div className="detail-section">
                                                    <div className="detail-heading-row">
                                                        <span className="detail-heading">SSID</span>
                                                        <button
                                                            type="button"
                                                            className="mini-button"
                                                            onClick={() =>
                                                                updateSelectedDevice((device) => ({
                                                                    ...device,
                                                                    metadata_json: {
                                                                        ...device.metadata_json,
                                                                        ssid_profiles: [
                                                                            ...apSsidProfiles(device),
                                                                            {
                                                                                name: `SSID-${apSsidProfiles(device).length + 1}`,
                                                                                vlan_id: 1,
                                                                                security: 'wpa2_psk',
                                                                            },
                                                                        ],
                                                                    },
                                                                }))
                                                            }
                                                        >
                                                            追加
                                                        </button>
                                                    </div>
                                                    {apSsidProfiles(selectedDevice).map((profile, index) => (
                                                        <div
                                                            key={`${selectedDevice.client_id}-ssid-${index}`}
                                                            className="detail-card"
                                                        >
                                                            <div className="modal-form-grid">
                                                                <label className="field-group">
                                                                    <span>SSID 名</span>
                                                                    <input
                                                                        className="editor-input"
                                                                        value={profile.name}
                                                                        onChange={(event) =>
                                                                            updateSelectedDevice((device) => ({
                                                                                ...device,
                                                                                metadata_json: {
                                                                                    ...device.metadata_json,
                                                                                    ssid_profiles: apSsidProfiles(device).map(
                                                                                        (currentProfile, profileIndex) =>
                                                                                            profileIndex === index
                                                                                                ? {
                                                                                                      ...currentProfile,
                                                                                                      name: event.target.value,
                                                                                                  }
                                                                                                : currentProfile,
                                                                                    ),
                                                                                },
                                                                            }))
                                                                        }
                                                                    />
                                                                </label>
                                                                <label className="field-group">
                                                                    <span>VLAN</span>
                                                                    <input
                                                                        className="editor-input"
                                                                        value={String(profile.vlan_id)}
                                                                        onChange={(event) =>
                                                                            updateSelectedDevice((device) => ({
                                                                                ...device,
                                                                                metadata_json: {
                                                                                    ...device.metadata_json,
                                                                                    ssid_profiles: apSsidProfiles(device).map(
                                                                                        (currentProfile, profileIndex) =>
                                                                                            profileIndex === index
                                                                                                ? {
                                                                                                      ...currentProfile,
                                                                                                      vlan_id: Number(
                                                                                                          event.target.value || 1,
                                                                                                      ),
                                                                                                  }
                                                                                                : currentProfile,
                                                                                    ),
                                                                                },
                                                                            }))
                                                                        }
                                                                    />
                                                                </label>
                                                                <label className="field-group">
                                                                    <span>認証</span>
                                                                    <select
                                                                        className="editor-input"
                                                                        value={profile.security}
                                                                        onChange={(event) =>
                                                                            updateSelectedDevice((device) => ({
                                                                                ...device,
                                                                                metadata_json: {
                                                                                    ...device.metadata_json,
                                                                                    ssid_profiles: apSsidProfiles(device).map(
                                                                                        (currentProfile, profileIndex) =>
                                                                                            profileIndex === index
                                                                                                ? {
                                                                                                      ...currentProfile,
                                                                                                      security: event.target.value,
                                                                                                  }
                                                                                                : currentProfile,
                                                                                    ),
                                                                                },
                                                                            }))
                                                                        }
                                                                    >
                                                                        <option value="open">Open</option>
                                                                        <option value="wpa2_psk">WPA2-PSK</option>
                                                                        <option value="wpa3_psk">WPA3-PSK</option>
                                                                    </select>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedEditorTab === 'interfaces' && (
                                        <div className="interface-editor-layout">
                                            <div className="detail-section">
                                                <div className="detail-heading-row">
                                                    <span className="detail-heading">インターフェース</span>
                                                    {!isSwitch(selectedDevice) && (
                                                        <button
                                                            type="button"
                                                            className="mini-button"
                                                            onClick={() =>
                                                                updateSelectedDevice((device) => ({
                                                                    ...device,
                                                                    interfaces: [
                                                                        ...device.interfaces,
                                                                        {
                                                                            client_id: nextClientId(`${device.client_id}-iface`),
                                                                            name: `if${device.interfaces.length}`,
                                                                            ip_address: null,
                                                                            subnet_mask: null,
                                                                            metadata_json: {},
                                                                        },
                                                                    ],
                                                                }))
                                                            }
                                                        >
                                                            追加
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="interface-list">
                                                    {selectedDevice.interfaces.map((iface) => {
                                                        const interfaceRole = interfaceRoleForDevice(
                                                            selectedDevice,
                                                            iface,
                                                        );
                                                        const linkStatus =
                                                            interfaceRole === 'svi'
                                                                ? '論理インターフェース'
                                                                : project.links.some(
                                                                      (link) =>
                                                                          link.interface_a_client_id === iface.client_id ||
                                                                          link.interface_b_client_id === iface.client_id,
                                                                  )
                                                                  ? '接続中'
                                                                  : '未使用';

                                                        return (
                                                            <button
                                                                key={iface.client_id}
                                                                type="button"
                                                                className={`interface-list-item ${selectedInterface?.client_id === iface.client_id ? 'is-active' : ''}`}
                                                                onClick={() => setSelectedInterfaceId(iface.client_id)}
                                                            >
                                                                <strong>{iface.name}</strong>
                                                                <span>{linkStatus}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {selectedInterface && (
                                                <div className="detail-card interface-editor-panel">
                                                    {(() => {
                                                        const iface = selectedInterface;
                                                        const index = selectedDevice.interfaces.findIndex(
                                                            (deviceInterface) =>
                                                                deviceInterface.client_id === iface.client_id,
                                                        );
                                                        const interfaceRole = interfaceRoleForDevice(
                                                            selectedDevice,
                                                            iface,
                                                        );

                                                        return (
                                                            <>
                                                                <div className="inline-link-row">
                                                                    <span>{iface.name}</span>
                                                                    <span className="hop-meta">
                                                                        {interfaceRole}
                                                                    </span>
                                                                </div>
                                                                <div className="modal-form-grid">
                                                                    <label className="field-group">
                                                                        <span>名称</span>
                                                                        <input
                                                                            className="editor-input"
                                                                            value={iface.name}
                                                                            onChange={(event) =>
                                                                                updateSelectedDevice((device) => ({
                                                                                    ...device,
                                                                                    interfaces: device.interfaces.map(
                                                                                        (deviceInterface, interfaceIndex) =>
                                                                                            interfaceIndex === index
                                                                                                ? {
                                                                                                      ...deviceInterface,
                                                                                                      name: event.target.value,
                                                                                                  }
                                                                                                : deviceInterface,
                                                                                    ),
                                                                                }))
                                                                            }
                                                                        />
                                                                    </label>
                                                                    {(selectedDevice.type === 'l2_switch' ||
                                                                        selectedDevice.type === 'l3_switch') && (
                                                                        <label className="field-group">
                                                                            <span>インターフェース種別</span>
                                                                            <select
                                                                                className="editor-input"
                                                                                value={interfaceRole}
                                                                                disabled={selectedDevice.type === 'l2_switch'}
                                                                                onChange={(event) =>
                                                                                    updateSelectedDevice((device) => ({
                                                                                        ...device,
                                                                                        interfaces: device.interfaces.map(
                                                                                            (deviceInterface, interfaceIndex) =>
                                                                                                interfaceIndex === index
                                                                                                    ? {
                                                                                                          ...deviceInterface,
                                                                                                          metadata_json:
                                                                                                              event.target.value === 'svi'
                                                                                                                  ? {
                                                                                                                        role: 'svi',
                                                                                                                        vlan_id: Number(
                                                                                                                            deviceInterface.metadata_json?.access_vlan ??
                                                                                                                                deviceInterface.metadata_json?.vlan_id ??
                                                                                                                                1,
                                                                                                                        ),
                                                                                                                    }
                                                                                                                  : event.target.value === 'routed'
                                                                                                                    ? { role: 'routed' }
                                                                                                                    : {
                                                                                                                          role: 'switchport',
                                                                                                                          access_vlan: Number(
                                                                                                                              deviceInterface.metadata_json?.access_vlan ??
                                                                                                                                  deviceInterface.metadata_json?.vlan_id ??
                                                                                                                                  1,
                                                                                                                          ),
                                                                                                                      },
                                                                                                      }
                                                                                                    : deviceInterface,
                                                                                        ),
                                                                                    }))
                                                                                }
                                                                            >
                                                                                <option value="switchport">Switchport</option>
                                                                                <option value="svi">SVI</option>
                                                                                <option value="routed">Routed</option>
                                                                            </select>
                                                                        </label>
                                                                    )}
                                                                    <label className="field-group">
                                                                        <span>IP アドレス</span>
                                                                        <input
                                                                            className="editor-input"
                                                                            value={iface.ip_address ?? ''}
                                                                            onChange={(event) =>
                                                                                updateSelectedDevice((device) => ({
                                                                                    ...device,
                                                                                    interfaces: device.interfaces.map(
                                                                                        (deviceInterface, interfaceIndex) =>
                                                                                            interfaceIndex === index
                                                                                                ? {
                                                                                                      ...deviceInterface,
                                                                                                      ip_address: event.target.value || null,
                                                                                                  }
                                                                                                : deviceInterface,
                                                                                    ),
                                                                                }))
                                                                            }
                                                                        />
                                                                    </label>
                                                                    <label className="field-group">
                                                                        <span>サブネットマスク</span>
                                                                        <input
                                                                            className="editor-input"
                                                                            value={iface.subnet_mask ?? ''}
                                                                            onChange={(event) =>
                                                                                updateSelectedDevice((device) => ({
                                                                                    ...device,
                                                                                    interfaces: device.interfaces.map(
                                                                                        (deviceInterface, interfaceIndex) =>
                                                                                            interfaceIndex === index
                                                                                                ? {
                                                                                                      ...deviceInterface,
                                                                                                      subnet_mask: event.target.value || null,
                                                                                                  }
                                                                                                : deviceInterface,
                                                                                    ),
                                                                                }))
                                                                            }
                                                                        />
                                                                    </label>
                                                                    {(interfaceRole === 'switchport' || interfaceRole === 'svi') && (
                                                                        <label className="field-group">
                                                                            <span>{interfaceRole === 'svi' ? 'SVI VLAN' : 'Access VLAN'}</span>
                                                                            <input
                                                                                className="editor-input"
                                                                                value={String(interfaceRole === 'svi' ? iface.metadata_json?.vlan_id ?? 1 : iface.metadata_json?.access_vlan ?? 1)}
                                                                                onChange={(event) =>
                                                                                    updateSelectedDevice((device) => ({
                                                                                        ...device,
                                                                                        interfaces: device.interfaces.map(
                                                                                            (deviceInterface, interfaceIndex) =>
                                                                                                interfaceIndex === index
                                                                                                    ? {
                                                                                                          ...deviceInterface,
                                                                                                          metadata_json:
                                                                                                              interfaceRole === 'svi'
                                                                                                                  ? {
                                                                                                                        ...deviceInterface.metadata_json,
                                                                                                                        role: 'svi',
                                                                                                                        vlan_id: Number(event.target.value || 1),
                                                                                                                    }
                                                                                                                  : {
                                                                                                                        ...deviceInterface.metadata_json,
                                                                                                                        role: 'switchport',
                                                                                                                        access_vlan: Number(event.target.value || 1),
                                                                                                                    },
                                                                                                      }
                                                                                                    : deviceInterface,
                                                                                        ),
                                                                                    }))
                                                                                }
                                                                            />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className={`action-button ${pendingLinkInterfaceId === iface.client_id ? 'primary' : ''}`}
                                                                    disabled={interfaceRole === 'svi'}
                                                                    onClick={() =>
                                                                        interfaceRole === 'svi'
                                                                            ? undefined
                                                                            : pendingLinkInterfaceId === iface.client_id
                                                                              ? resetLinkMode()
                                                                              : (() => {
                                                                                    setPendingLinkInterfaceId(iface.client_id);
                                                                                    setPendingLinkTargetNodeId(null);
                                                                                    setPendingLinkTargetInterfaceId(null);
                                                                                    setStatusMessage(`${iface.name} の接続先ノードを選択してください`);
                                                                                })()
                                                                    }
                                                                >
                                                                    {pendingLinkInterfaceId === iface.client_id
                                                                        ? '接続元として選択中'
                                                                        : interfaceRole === 'svi'
                                                                          ? 'SVI は直接接続できません'
                                                                          : 'このインターフェースから接続'}
                                                                </button>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedEditorTab === 'routing' && supportsStaticRouting(selectedDevice) && (
                                        <div className="detail-section">
                                            <div className="detail-heading-row">
                                                <span className="detail-heading">スタティックルート</span>
                                                <button
                                                    type="button"
                                                    className="mini-button"
                                                    onClick={() =>
                                                        updateSelectedDevice((device) => ({
                                                            ...device,
                                                            route_entries: [
                                                                ...device.route_entries,
                                                                {
                                                                    destination_network: '',
                                                                    subnet_mask: '',
                                                                    next_hop: null,
                                                                    outgoing_interface_client_id: null,
                                                                },
                                                            ],
                                                        }))
                                                    }
                                                >
                                                    追加
                                                </button>
                                            </div>
                                            {selectedDevice.route_entries.length === 0 && (
                                                <p className="selected-summary-text">
                                                    スタティックルートはまだありません。
                                                </p>
                                            )}
                                            {selectedDevice.route_entries.map((routeEntry, index) => (
                                                <div
                                                    key={`${selectedDevice.client_id}-route-${index}`}
                                                    className="detail-card"
                                                >
                                                    <div className="modal-form-grid">
                                                        <label className="field-group">
                                                            <span>宛先ネットワーク</span>
                                                            <input
                                                                className="editor-input"
                                                                value={routeEntry.destination_network}
                                                                onChange={(event) =>
                                                                    updateSelectedDevice((device) => ({
                                                                        ...device,
                                                                        route_entries: updateRouteEntry(
                                                                            device.route_entries,
                                                                            index,
                                                                            'destination_network',
                                                                            event.target.value,
                                                                        ),
                                                                    }))
                                                                }
                                                            />
                                                        </label>
                                                        <label className="field-group">
                                                            <span>マスク</span>
                                                            <input
                                                                className="editor-input"
                                                                value={routeEntry.subnet_mask}
                                                                onChange={(event) =>
                                                                    updateSelectedDevice((device) => ({
                                                                        ...device,
                                                                        route_entries: updateRouteEntry(
                                                                            device.route_entries,
                                                                            index,
                                                                            'subnet_mask',
                                                                            event.target.value,
                                                                        ),
                                                                    }))
                                                                }
                                                            />
                                                        </label>
                                                        <label className="field-group">
                                                            <span>ネクストホップ</span>
                                                            <input
                                                                className="editor-input"
                                                                value={routeEntry.next_hop ?? ''}
                                                                onChange={(event) =>
                                                                    updateSelectedDevice((device) => ({
                                                                        ...device,
                                                                        route_entries: updateRouteEntry(
                                                                            device.route_entries,
                                                                            index,
                                                                            'next_hop',
                                                                            event.target.value,
                                                                        ),
                                                                    }))
                                                                }
                                                            />
                                                        </label>
                                                        <label className="field-group">
                                                            <span>送信インターフェース</span>
                                                            <select
                                                                className="editor-input"
                                                                value={routeEntry.outgoing_interface_client_id ?? ''}
                                                                onChange={(event) =>
                                                                    updateSelectedDevice((device) => ({
                                                                        ...device,
                                                                        route_entries: updateRouteEntry(
                                                                            device.route_entries,
                                                                            index,
                                                                            'outgoing_interface_client_id',
                                                                            event.target.value,
                                                                        ),
                                                                    }))
                                                                }
                                                            >
                                                                <option value="">インターフェースを選択</option>
                                                                {selectedDevice.interfaces.map((iface) => (
                                                                    <option
                                                                        key={iface.client_id}
                                                                        value={iface.client_id}
                                                                    >
                                                                        {iface.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedEditorTab === 'links' && (
                                        <div className="detail-section">
                                            <span className="detail-heading">リンク</span>
                                            {selectedNodeLinkSummaries.length === 0 ? (
                                                <p className="selected-summary-text">
                                                    接続されているリンクはありません。
                                                </p>
                                            ) : (
                                                selectedNodeLinkSummaries.map((link) => (
                                                    <div key={link.client_id} className="inline-link-row">
                                                        <span>{link.label}</span>
                                                        <button
                                                            type="button"
                                                            className="mini-button"
                                                            onClick={() => deleteLink(link.client_id)}
                                                        >
                                                            削除
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedCloud && (
                                <div className="field-stack">
                                    <div className="editor-banner">
                                        <strong>{selectedCloud.name}</strong>
                                        <span>{selectedCloud.type}</span>
                                    </div>
                                    {selectedEditorTab === 'basic' && (
                                        <div className="modal-form-grid">
                                            <label className="field-group">
                                                <span>クラウド名</span>
                                                <input
                                                    className="editor-input"
                                                    value={selectedCloud.name}
                                                    onChange={(event) =>
                                                        updateSelectedCloud((cloud) => ({
                                                            ...cloud,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>
                                            <label className="field-group">
                                                <span>代表 IP</span>
                                                <input
                                                    className="editor-input"
                                                    value={selectedCloud.representative_ip ?? ''}
                                                    onChange={(event) =>
                                                        updateSelectedCloud((cloud) => ({
                                                            ...cloud,
                                                            representative_ip:
                                                                event.target.value || null,
                                                        }))
                                                    }
                                                />
                                            </label>
                                            <label className="field-group">
                                                <span>ネットワークアドレス</span>
                                                <input
                                                    className="editor-input"
                                                    value={selectedCloud.network_address ?? ''}
                                                    onChange={(event) =>
                                                        updateSelectedCloud((cloud) => ({
                                                            ...cloud,
                                                            network_address:
                                                                event.target.value || null,
                                                        }))
                                                    }
                                                />
                                            </label>
                                            <label className="field-group">
                                                <span>サブネットマスク</span>
                                                <input
                                                    className="editor-input"
                                                    value={selectedCloud.subnet_mask ?? ''}
                                                    onChange={(event) =>
                                                        updateSelectedCloud((cloud) => ({
                                                            ...cloud,
                                                            subnet_mask:
                                                                event.target.value || null,
                                                        }))
                                                    }
                                                />
                                            </label>
                                        </div>
                                    )}

                                    {selectedEditorTab === 'links' && (
                                        <div className="detail-section">
                                            <span className="detail-heading">リンク</span>
                                            {selectedNodeLinkSummaries.length === 0 ? (
                                                <p className="selected-summary-text">
                                                    接続されているリンクはありません。
                                                </p>
                                            ) : (
                                                selectedNodeLinkSummaries.map((link) => (
                                                    <div key={link.client_id} className="inline-link-row">
                                                        <span>{link.label}</span>
                                                        <button
                                                            type="button"
                                                            className="mini-button"
                                                            onClick={() => deleteLink(link.client_id)}
                                                        >
                                                            削除
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="action-button danger"
                                    onClick={removeSelectedNode}
                                >
                                    ノードを削除
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </>
    );
}
