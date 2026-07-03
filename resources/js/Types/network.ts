export type TopologyInterface = {
    client_id: string;
    name: string;
    ip_address: string | null;
    subnet_mask: string | null;
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
    type: string;
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
    type: string;
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
