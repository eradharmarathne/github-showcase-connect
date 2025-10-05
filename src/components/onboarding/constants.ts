import {
	BarChart3,
	Building2,
	Calendar,
	DollarSign,
	Home,
	Hotel,
	Shield,
	Users,
	Zap,
} from "lucide-react";

export const STEPS = [
	{ id: 1, title: "Company Info", description: "Tell us about your business" },
	{ id: 2, title: "Property Details", description: "Describe your properties" },
	{ id: 3, title: "Features", description: "Choose your features" },
	{ id: 4, title: "Select Plan", description: "Choose your subscription plan" },
	{ id: 5, title: "Complete", description: "You're all set!" },
];

export const PROPERTY_TYPES = [
	{
		id: "hotel",
		label: "Hotel",
		icon: Building2,
		description: "Traditional hotel with multiple rooms",
	},
	{
		id: "resort",
		label: "Resort",
		icon: Hotel,
		description: "Resort with amenities and activities",
	},
	{
		id: "villa",
		label: "Villa",
		icon: Home,
		description: "Private villa or vacation rental",
	},
	{
		id: "mixed",
		label: "Mixed",
		icon: Building2,
		description: "Multiple property types",
	},
];

export const FEATURES = [
	{
		id: "bookings",
		label: "Booking Management",
		icon: Calendar,
		description: "Reservation system with calendar",
		essential: true,
	},
	{
		id: "payments",
		label: "Payment Processing",
		icon: DollarSign,
		description: "Secure payment handling",
		essential: true,
	},
	{
		id: "reports",
		label: "Financial Reports",
		icon: BarChart3,
		description: "Revenue and expense analytics",
	},
	{
		id: "multi_property",
		label: "Multi-Property",
		icon: Building2,
		description: "Manage multiple locations",
	},
	{
		id: "guest_management",
		label: "Guest Management",
		icon: Users,
		description: "Guest profiles and history",
	},
	{
		id: "channel_manager",
		label: "Channel Manager",
		icon: Zap,
		description: "OTA integrations (Booking.com, etc.)",
	},
	{
		id: "advanced_security",
		label: "Advanced Security",
		icon: Shield,
		description: "Enhanced security features",
	},
];

export const COUNTRIES = [
	"Afghanistan",
	"Albania",
	"Algeria",
	"Argentina",
	"Armenia",
	"Australia",
	"Austria",
	"Bangladesh",
	"Belgium",
	"Brazil",
	"Canada",
	"China",
	"Denmark",
	"Egypt",
	"Finland",
	"France",
	"Germany",
	"India",
	"Indonesia",
	"Iran",
	"Iraq",
	"Ireland",
	"Italy",
	"Japan",
	"Malaysia",
	"Netherlands",
	"Norway",
	"Pakistan",
	"Philippines",
	"Singapore",
	"South Korea",
	"Spain",
	"Sri Lanka",
	"Sweden",
	"Switzerland",
	"Thailand",
	"United Kingdom",
	"United States",
	"Vietnam",
];

export const PROPERTY_COUNT_OPTIONS = [
	{ value: "1", label: "1 property" },
	{ value: "2-5", label: "2-5 properties" },
	{ value: "6-10", label: "6-10 properties" },
	{ value: "11-20", label: "11-20 properties" },
	{ value: "20+", label: "20+ properties" },
];

export const ROOM_COUNT_OPTIONS = [
	{ value: "1-10", label: "1-10 rooms" },
	{ value: "11-25", label: "11-25 rooms" },
	{ value: "26-50", label: "26-50 rooms" },
	{ value: "51-100", label: "51-100 rooms" },
	{ value: "100+", label: "100+ rooms" },
];
