export interface UserPermissions {
	[key: string]: boolean;
}

export interface User {
	id: string;
	name: string;
	email: string;
	is_tenant_admin: boolean;
	created_at?: string;
	last_sign_in_at?: string;
	phone?: string;
	avatar_url?: string;
	tenant_role?: string;
	is_active?: boolean;
	permissions: {
		[locationName: string]: UserPermissions;
	};
	location_count?: number;
	total_permissions?: number;
}

export interface Location {
	id: string;
	name: string;
}

export interface InvitePermissions {
	access_dashboard: boolean;
	access_income: boolean;
	access_expenses: boolean;
	access_reports: boolean;
	access_calendar: boolean;
	access_bookings: boolean;
	access_rooms: boolean;
	access_master_files: boolean;
	access_accounts: boolean;
	access_users: boolean;
	access_settings: boolean;
	access_booking_channels: boolean;
}

export const permissionTypes = [
	{ key: "access_dashboard", label: "Dashboard Access" },
	{ key: "access_income", label: "Income Management" },
	{ key: "access_expenses", label: "Expense Management" },
	{ key: "access_reports", label: "Reports & Analytics" },
	{ key: "access_calendar", label: "Calendar Access" },
	{ key: "access_bookings", label: "Booking Management" },
	{ key: "access_rooms", label: "Room Management" },
	{ key: "access_master_files", label: "Master Files" },
	{ key: "access_accounts", label: "Account Management" },
	{ key: "access_users", label: "User Management" },
	{ key: "access_settings", label: "Settings Access" },
	{ key: "access_booking_channels", label: "Booking Channels" },
];

export const defaultInvitePermissions: InvitePermissions = {
	access_dashboard: true,
	access_income: false,
	access_expenses: false,
	access_reports: false,
	access_calendar: true,
	access_bookings: true,
	access_rooms: false,
	access_master_files: false,
	access_accounts: false,
	access_users: false,
	access_settings: false,
	access_booking_channels: false,
};
