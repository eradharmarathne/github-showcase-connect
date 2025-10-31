export interface ExternalBooking {
	id: string;
	external_id: string;
	property_id: string;
	source: string;
	guest_name: string;
	check_in: string;
	check_out: string;
	status: string;
	total_amount: number;
	currency: string;
	adults: number;
	children: number;
	room_name?: string;
	room_id?: string | null;
	location_id?: string;
	location?: {
		name: string;
	};
	room?: {
		id: string;
		room_number: string;
		room_type: string;
	} | null;
	last_synced_at: string;
	raw_data?: any;
	mappedLocation?: BookingLocation | null;
}

export interface BookingLocation {
	id: string;
	name: string;
	is_active: boolean;
}

export interface PropertyMapping {
	locationId: string;
	locationName: string;
	channelProperties: string[];
}

export interface SyncStats {
	totalBookings: number;
	recentSync: string | null;
	sourceBreakdown: Record<string, number>;
	statusBreakdown: Record<string, number>;
}

export interface SyncUrl {
	id: string;
	tenant_id: string;
	location_id: string;
	room_id: string | null;
	ical_url: string;
	source: string;
	is_active: boolean;
	created_at: string;
	room?: {
		id: string;
		room_number: string;
		room_type: string;
	};
}

export interface Room {
	id: string;
	room_number: string;
	room_type: string;
}
