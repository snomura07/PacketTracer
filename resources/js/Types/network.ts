export type DeviceType =
    'pc' | 'l2_switch' | 'l3_switch' | 'onu' | 'ap' | 'router' | 'firewall';

export type NetworkCloudType = 'internet' | 'masters_one' | 'wan';

export type TopologyInterface = {
    client_id: string;
    name: string;
    ip_address: string | null;
    subnet_mask: string | null;
    mac_address: string | null;
    metadata_json: Record<string, unknown>;
};

export type ArpTableEntry = {
    device_name: string;
    interface_name: string;
    ip_address: string;
    mac_address: string;
};

export type RouteEntry = {
    destination_network: string;
    subnet_mask: string;
    next_hop: string | null;
    outgoing_interface_client_id: string | null;
};

export type TopologyDevice = {
    id?: number;
    client_id: string;
    name: string;
    type: DeviceType;
    position_x: number;
    position_y: number;
    default_gateway: string | null;
    metadata_json: Record<string, unknown>;
    interfaces: TopologyInterface[];
    route_entries: RouteEntry[];
};

export type TopologyCloud = {
    id?: number;
    client_id: string;
    name: string;
    type: NetworkCloudType;
    position_x: number;
    position_y: number;
    representative_ip: string | null;
    network_address: string | null;
    subnet_mask: string | null;
    metadata_json: Record<string, unknown>;
};

export type TopologyLink = {
    id?: number;
    client_id: string;
    interface_a_client_id: string;
    interface_b_client_id: string | null;
    network_cloud_client_id: string | null;
};

export type TopologyProject = {
    id?: number;
    name: string;
    description: string | null;
    devices: TopologyDevice[];
    network_clouds: TopologyCloud[];
    links: TopologyLink[];
};

export type SavedProjectSummary = {
    id: number;
    name: string;
    description: string | null;
    devices_count: number;
    network_clouds_count: number;
    links_count: number;
    updated_at: string | null;
};

export type SimulationHop = {
    device_name: string;
    action: string;
    result: string;
    message: string;
};

export type SimulationResult = {
    success: boolean;
    source_device: string | null;
    destination: string | null;
    hops: SimulationHop[];
    error_code: string | null;
    error_message: string | null;
    suggestions: string[];
    arp_table: ArpTableEntry[];
};
