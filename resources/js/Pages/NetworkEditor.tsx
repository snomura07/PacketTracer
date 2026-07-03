import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    Background,
    Controls,
    MarkerType,
    MiniMap,
    ReactFlow,
    type Edge,
    type Node,
} from 'reactflow';
import type {
    RouteEntry,
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

const initialProject = (): TopologyProject => ({
    name: 'Starter Reachability Lab',
    description: 'PC-A to Internet and Master\'sONE MVP topology',
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
                },
            ],
            route_entries: [],
        },
        {
            client_id: 'device-switch-1',
            name: 'SW-1',
            type: 'switch',
            position_x: 240,
            position_y: 160,
            default_gateway: null,
            metadata_json: {},
            interfaces: [
                {
                    client_id: 'interface-switch-1-port1',
                    name: 'port1',
                    ip_address: null,
                    subnet_mask: null,
                },
                {
                    client_id: 'interface-switch-1-port2',
                    name: 'port2',
                    ip_address: null,
                    subnet_mask: null,
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
                },
                {
                    client_id: 'interface-router-1-wan0',
                    name: 'wan0',
                    ip_address: '203.0.113.2',
                    subnet_mask: '255.255.255.252',
                },
                {
                    client_id: 'interface-router-1-wan1',
                    name: 'wan1',
                    ip_address: '10.0.0.1',
                    subnet_mask: '255.255.255.252',
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
            name: 'Internet Cloud',
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
            name: "Master'sONE Cloud",
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
        lines.push(
            iface.ip_address && iface.subnet_mask
                ? `${iface.name} ${iface.ip_address}/${iface.subnet_mask}`
                : `${iface.name} unnumbered`,
        );
    }

    if (device.default_gateway) {
        lines.push(`GW ${device.default_gateway}`);
    }

    return lines.join('\n');
};

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

const buildNodes = (project: TopologyProject): Node[] => [
    ...project.devices.map((device) => ({
        id: device.client_id,
        position: { x: device.position_x, y: device.position_y },
        data: { label: buildDeviceLabel(device) },
        type: 'default',
    })),
    ...project.network_clouds.map((cloud) => ({
        id: cloud.client_id,
        position: { x: cloud.position_x, y: cloud.position_y },
        data: { label: buildCloudLabel(cloud) },
        type: 'default',
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

export default function NetworkEditor() {
    const { props } = usePage<PageProps>();
    const [projectId, setProjectId] = useState<number | null>(null);
    const [project, setProject] = useState<TopologyProject>(initialProject);
    const [selectedNodeId, setSelectedNodeId] = useState<string>('device-router-1');
    const [isSaving, setIsSaving] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Unsaved sample topology');

    const nodes = buildNodes(project);
    const edges = buildEdges(project);
    const selectedDevice =
        project.devices.find((device) => device.client_id === selectedNodeId) ?? null;
    const selectedCloud =
        project.network_clouds.find((cloud) => cloud.client_id === selectedNodeId) ?? null;

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
        setStatusMessage('Saving topology...');

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
                setStatusMessage(data.message ?? 'Failed to save topology');
                return;
            }

            setProject(data.project);
            setProjectId(data.project.id);
            setSelectedNodeId(
                data.project.devices[0]?.client_id ??
                    data.project.network_clouds[0]?.client_id ??
                    '',
            );
            setStatusMessage(`Saved project #${data.project.id}`);
        } catch {
            setStatusMessage('Failed to reach the save API');
        } finally {
            setIsSaving(false);
        }
    };

    const reloadProject = async () => {
        if (projectId === null) {
            setStatusMessage('Save the project once before reloading it');
            return;
        }

        setIsReloading(true);
        setStatusMessage(`Reloading project #${projectId}...`);

        try {
            const response = await fetch(`/api/network-projects/${projectId}`, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (!response.ok) {
                setStatusMessage(data.message ?? 'Failed to reload topology');
                return;
            }

            setProject(data.project);
            setSelectedNodeId(
                data.project.devices[0]?.client_id ??
                    data.project.network_clouds[0]?.client_id ??
                    '',
            );
            setStatusMessage(`Reloaded project #${data.project.id}`);
        } catch {
            setStatusMessage('Failed to reach the reload API');
        } finally {
            setIsReloading(false);
        }
    };

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
                            React Flow 上でトポロジーを実データとして編集しながら保存できるところまで進めています。
                        </p>
                    </div>

                    <div className="status-card">
                        <p className="status-label">Current milestone</p>
                        <strong>{props.milestone}</strong>
                        <p className="status-note">
                            保存 API と再読込を実装し、トポロジーをプロジェクトとして扱える状態に上げました。
                        </p>
                        <div className="status-strip">
                            <span>{statusMessage}</span>
                            <span>
                                {projectId !== null
                                    ? `Project #${projectId}`
                                    : 'Not saved yet'}
                            </span>
                        </div>
                    </div>
                </section>

                <section className="workspace-grid">
                    <aside className="sidebar-card">
                        <div className="editor-actions">
                            <button
                                type="button"
                                className="action-button primary"
                                onClick={saveProject}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Topology'}
                            </button>
                            <button
                                type="button"
                                className="action-button"
                                onClick={reloadProject}
                                disabled={isReloading}
                            >
                                {isReloading ? 'Reloading...' : 'Reload Saved'}
                            </button>
                            <button
                                type="button"
                                className="action-button"
                                onClick={() => {
                                    setProjectId(null);
                                    setProject(initialProject());
                                    setSelectedNodeId('device-router-1');
                                    setStatusMessage(
                                        'Reset to local sample topology',
                                    );
                                }}
                            >
                                Reset Sample
                            </button>
                        </div>

                        <div className="field-stack">
                            <p className="panel-label">Project</p>
                            <label className="field-group">
                                <span>Name</span>
                                <input
                                    className="editor-input"
                                    value={project.name}
                                    onChange={(event) =>
                                        setProject((currentProject) => ({
                                            ...currentProject,
                                            name: event.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label className="field-group">
                                <span>Description</span>
                                <textarea
                                    className="editor-input editor-textarea"
                                    value={project.description ?? ''}
                                    onChange={(event) =>
                                        setProject((currentProject) => ({
                                            ...currentProject,
                                            description: event.target.value,
                                        }))
                                    }
                                />
                            </label>
                        </div>

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
                            <p className="panel-label">Editor status</p>
                            <ul className="checklist">
                                <li>React Flow drag-and-drop layout</li>
                                <li>Project save API</li>
                                <li>Project reload API</li>
                                <li>Property panel edits</li>
                            </ul>
                        </div>

                        <div className="selected-card">
                            <p className="panel-label">Selected node</p>

                            {selectedDevice && (
                                <div className="field-stack">
                                    <label className="field-group">
                                        <span>Device name</span>
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

                                    <label className="field-group">
                                        <span>Default gateway</span>
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

                                    <div className="detail-section">
                                        <span className="detail-heading">
                                            Interfaces
                                        </span>
                                        {selectedDevice.interfaces.map(
                                            (iface, index) => (
                                                <div
                                                    key={iface.client_id}
                                                    className="detail-card"
                                                >
                                                    <label className="field-group">
                                                        <span>Name</span>
                                                        <input
                                                            className="editor-input"
                                                            value={iface.name}
                                                            onChange={(event) =>
                                                                updateSelectedDevice(
                                                                    (device) => ({
                                                                        ...device,
                                                                        interfaces:
                                                                            device.interfaces.map(
                                                                                (
                                                                                    deviceInterface,
                                                                                    interfaceIndex,
                                                                                ) =>
                                                                                    interfaceIndex ===
                                                                                    index
                                                                                        ? {
                                                                                              ...deviceInterface,
                                                                                              name: event
                                                                                                  .target
                                                                                                  .value,
                                                                                          }
                                                                                        : deviceInterface,
                                                                            ),
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label className="field-group">
                                                        <span>IP address</span>
                                                        <input
                                                            className="editor-input"
                                                            value={
                                                                iface.ip_address ??
                                                                ''
                                                            }
                                                            onChange={(event) =>
                                                                updateSelectedDevice(
                                                                    (device) => ({
                                                                        ...device,
                                                                        interfaces:
                                                                            device.interfaces.map(
                                                                                (
                                                                                    deviceInterface,
                                                                                    interfaceIndex,
                                                                                ) =>
                                                                                    interfaceIndex ===
                                                                                    index
                                                                                        ? {
                                                                                              ...deviceInterface,
                                                                                              ip_address:
                                                                                                  event
                                                                                                      .target
                                                                                                      .value ||
                                                                                                  null,
                                                                                          }
                                                                                        : deviceInterface,
                                                                            ),
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label className="field-group">
                                                        <span>Subnet mask</span>
                                                        <input
                                                            className="editor-input"
                                                            value={
                                                                iface.subnet_mask ??
                                                                ''
                                                            }
                                                            onChange={(event) =>
                                                                updateSelectedDevice(
                                                                    (device) => ({
                                                                        ...device,
                                                                        interfaces:
                                                                            device.interfaces.map(
                                                                                (
                                                                                    deviceInterface,
                                                                                    interfaceIndex,
                                                                                ) =>
                                                                                    interfaceIndex ===
                                                                                    index
                                                                                        ? {
                                                                                              ...deviceInterface,
                                                                                              subnet_mask:
                                                                                                  event
                                                                                                      .target
                                                                                                      .value ||
                                                                                                  null,
                                                                                          }
                                                                                        : deviceInterface,
                                                                            ),
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    {selectedDevice.route_entries.length > 0 && (
                                        <div className="detail-section">
                                            <span className="detail-heading">
                                                Static routes
                                            </span>
                                            {selectedDevice.route_entries.map(
                                                (routeEntry, index) => (
                                                    <div
                                                        key={`${selectedDevice.client_id}-route-${index}`}
                                                        className="detail-card"
                                                    >
                                                        <label className="field-group">
                                                            <span>Destination</span>
                                                            <input
                                                                className="editor-input"
                                                                value={
                                                                    routeEntry.destination_network
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateSelectedDevice(
                                                                        (
                                                                            device,
                                                                        ) => ({
                                                                            ...device,
                                                                            route_entries:
                                                                                updateRouteEntry(
                                                                                    device.route_entries,
                                                                                    index,
                                                                                    'destination_network',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                ),
                                                                        }),
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                        <label className="field-group">
                                                            <span>Mask</span>
                                                            <input
                                                                className="editor-input"
                                                                value={
                                                                    routeEntry.subnet_mask
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateSelectedDevice(
                                                                        (
                                                                            device,
                                                                        ) => ({
                                                                            ...device,
                                                                            route_entries:
                                                                                updateRouteEntry(
                                                                                    device.route_entries,
                                                                                    index,
                                                                                    'subnet_mask',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                ),
                                                                        }),
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                        <label className="field-group">
                                                            <span>Next hop</span>
                                                            <input
                                                                className="editor-input"
                                                                value={
                                                                    routeEntry.next_hop ??
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateSelectedDevice(
                                                                        (
                                                                            device,
                                                                        ) => ({
                                                                            ...device,
                                                                            route_entries:
                                                                                updateRouteEntry(
                                                                                    device.route_entries,
                                                                                    index,
                                                                                    'next_hop',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                ),
                                                                        }),
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                        <label className="field-group">
                                                            <span>
                                                                Outgoing interface
                                                            </span>
                                                            <select
                                                                className="editor-input"
                                                                value={
                                                                    routeEntry.outgoing_interface_client_id ??
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateSelectedDevice(
                                                                        (
                                                                            device,
                                                                        ) => ({
                                                                            ...device,
                                                                            route_entries:
                                                                                updateRouteEntry(
                                                                                    device.route_entries,
                                                                                    index,
                                                                                    'outgoing_interface_client_id',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                ),
                                                                        }),
                                                                    )
                                                                }
                                                            >
                                                                <option value="">
                                                                    None
                                                                </option>
                                                                {selectedDevice.interfaces.map(
                                                                    (iface) => (
                                                                        <option
                                                                            key={
                                                                                iface.client_id
                                                                            }
                                                                            value={
                                                                                iface.client_id
                                                                            }
                                                                        >
                                                                            {
                                                                                iface.name
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </label>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedCloud && (
                                <div className="field-stack">
                                    <label className="field-group">
                                        <span>Cloud name</span>
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
                                        <span>Representative IP</span>
                                        <input
                                            className="editor-input"
                                            value={
                                                selectedCloud.representative_ip ??
                                                ''
                                            }
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
                                        <span>Network address</span>
                                        <input
                                            className="editor-input"
                                            value={
                                                selectedCloud.network_address ??
                                                ''
                                            }
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
                                        <span>Subnet mask</span>
                                        <input
                                            className="editor-input"
                                            value={
                                                selectedCloud.subnet_mask ?? ''
                                            }
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
                        </div>
                    </aside>

                    <section className="canvas-card">
                        <div className="canvas-header">
                            <div>
                                <p className="panel-label">Topology canvas</p>
                                <h2>Editable network graph</h2>
                            </div>
                            <p className="canvas-hint">
                                ノードを選んで左のプロパティを編集できます。配置変更は保存 API に載ります。
                            </p>
                        </div>

                        <div className="canvas-frame">
                            <ReactFlow
                                fitView
                                nodes={nodes}
                                edges={edges}
                                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                                onNodeDragStop={(_, node) =>
                                    setProject((currentProject) => ({
                                        ...currentProject,
                                        devices: currentProject.devices.map(
                                            (device) =>
                                                device.client_id === node.id
                                                    ? {
                                                          ...device,
                                                          position_x: Math.round(
                                                              node.position.x,
                                                          ),
                                                          position_y: Math.round(
                                                              node.position.y,
                                                          ),
                                                      }
                                                    : device,
                                        ),
                                        network_clouds:
                                            currentProject.network_clouds.map(
                                                (cloud) =>
                                                    cloud.client_id === node.id
                                                        ? {
                                                              ...cloud,
                                                              position_x:
                                                                  Math.round(
                                                                      node
                                                                          .position
                                                                          .x,
                                                                  ),
                                                              position_y:
                                                                  Math.round(
                                                                      node
                                                                          .position
                                                                          .y,
                                                                  ),
                                                          }
                                                        : cloud,
                                            ),
                                    }))
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
                </section>
            </main>
        </>
    );
}
