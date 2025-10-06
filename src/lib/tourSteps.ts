import Shepherd from "shepherd.js";
import { TourType } from "@/context/TourContext";

// Import Shepherd.js CSS
import "shepherd.js/dist/css/shepherd.css";

// Define step options type
type StepOptions = {
	id: string;
	title?: string;
	text?: string;
	attachTo?: {
		element: string;
		on: "top" | "bottom" | "left" | "right";
	};
	buttons?: Array<{
		text: string;
		classes?: string;
		action: () => any;
	}>;
	classes?: string;
	when?: {
		show?: () => void;
		hide?: () => void;
	};
};

// Custom tour theme styles
export const tourTheme = {
	classes: "shadow-lg border border-primary/20 rounded-lg",
	classPrefix: "shepherd-",
	scrollTo: { behavior: "smooth", block: "center" },
	useModalOverlay: true,
	modalOverlayOpeningPadding: 4,
	modalOverlayOpeningRadius: 8,
	defaultStepOptions: {
		cancelIcon: {
			enabled: true,
		},
		scrollTo: { behavior: "smooth", block: "center" },
		when: {
			show() {
				document.body.style.overflow = "hidden";
				// Close any open modals or popups that might interfere
				const modals = document.querySelectorAll('[role="dialog"], .popover, .dropdown-menu');
				modals.forEach(modal => {
					if (modal instanceof HTMLElement && modal.style.display !== 'none') {
						modal.style.display = 'none';
					}
				});
			},
			hide() {
				document.body.style.overflow = "auto";
			},
		},
	},
} as const;

// Common button configurations
export const tourButtons = {
	next: {
		text: "Next",
		classes: "btn btn-primary",
		action: function () {
			return this.next();
		},
	},
	back: {
		text: "Back",
		classes: "btn btn-secondary",
		action: function () {
			return this.back();
		},
	},
	skip: {
		text: "Skip Tour",
		classes: "btn btn-ghost",
		action: function () {
			return this.cancel();
		},
	},
	finish: {
		text: "Finish",
		classes: "btn btn-primary",
		action: function () {
			return this.complete();
		},
	},
};

// Dashboard tour steps
export const dashboardTourSteps: StepOptions[] = [
	{
		id: "welcome",
		title: "🏨 Welcome to CheckingCheckout!",
		text: `
      <div class="space-y-3">
        <p>Welcome to your hospitality ERP dashboard! Let's take a quick tour to get you started.</p>
        <p>This tour will show you the main features and how to navigate the system.</p>
      </div>
    `,
		buttons: [tourButtons.skip, tourButtons.next],
		classes: "shepherd-theme-welcome",
	},
	{
		id: "sidebar",
		title: "📱 Navigation Sidebar",
		text: `
      <div class="space-y-3">
        <p>This is your main navigation sidebar. Here you can access:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li><strong>Dashboard</strong> - Overview of your business</li>
          <li><strong>Calendar</strong> - Manage bookings and availability</li>
          <li><strong>Reservations</strong> - Handle guest bookings</li>
          <li><strong>Financial Reports</strong> - Income and expense tracking</li>
        </ul>
      </div>
    `,
		attachTo: {
			element: '[data-testid="app-sidebar"]',
			on: "right",
		},
		buttons: [tourButtons.back, tourButtons.next],
	},
	{
		id: "location-switcher",
		title: "📍 Location Switcher",
		text: `
      <div class="space-y-3">
        <p>If you manage multiple properties, use this switcher to change between locations.</p>
        <p>Each location has its own set of rooms, bookings, and financial data.</p>
      </div>
    `,
		attachTo: {
			element: '[data-testid="team-switcher"]',
			on: "bottom",
		},
		buttons: [tourButtons.back, tourButtons.next],
	},
	{
		id: "dashboard-cards",
		title: "📊 Financial Overview",
		text: `
      <div class="space-y-3">
        <p>These cards show your key financial metrics at a glance:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Total revenue and booking payments</li>
          <li>Expenses and profit margins</li>
          <li>Real-time financial health indicators</li>
        </ul>
      </div>
    `,
		attachTo: {
			element: '[data-testid="financial-cards"]',
			on: "top",
		},
		buttons: [tourButtons.back, tourButtons.next],
	},
	{
		id: "quick-actions",
		title: "⚡ Quick Actions",
		text: `
      <div class="space-y-3">
        <p>Use these buttons for common daily tasks:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li><strong>New Reservation</strong> - Add a booking quickly</li>
          <li><strong>Add Income</strong> - Record payments received</li>
          <li><strong>Add Expense</strong> - Track business expenses</li>
        </ul>
      </div>
    `,
		attachTo: {
			element: '[data-testid="quick-actions"]',
			on: "bottom",
		},
		buttons: [tourButtons.back, tourButtons.finish],
	},
];

// Reservations tour steps
export const reservationsTourSteps: StepOptions[] = [
	{
		id: "reservations-intro",
		title: "🛏️ Reservations Management",
		text: `
      <div class="space-y-3">
        <p>This is your reservations hub where you can:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>View all bookings across your properties</li>
          <li>Create new reservations</li>
          <li>Manage guest information and payments</li>
          <li>Track booking statuses and commissions</li>
        </ul>
      </div>
    `,
		buttons: [tourButtons.skip, tourButtons.next],
	},
	{
		id: "add-reservation",
		title: "➕ Create New Reservation",
		text: `
      <div class="space-y-3">
        <p>Click this button to create a new reservation.</p>
        <p>You can add guest details, select rooms, set dates, and configure pricing all in one place.</p>
      </div>
    `,
		attachTo: {
			element: '[data-testid="add-reservation-btn"]',
			on: "left",
		},
		buttons: [tourButtons.back, tourButtons.next],
	},
	{
		id: "reservations-table",
		title: "📋 Reservations Table",
		text: `
      <div class="space-y-3">
        <p>This table shows all your reservations with key information:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Guest names and contact details</li>
          <li>Check-in and check-out dates</li>
          <li>Room assignments and rates</li>
          <li>Payment status and amounts</li>
        </ul>
        <p>Click on any row to view full details or make changes.</p>
      </div>
    `,
		attachTo: {
			element: '[data-testid="reservations-table"]',
			on: "top",
		},
		buttons: [tourButtons.back, tourButtons.finish],
	},
];

// Financial Reports tour steps
export const financialReportsTourSteps: StepOptions[] = [
	{
		id: "financial-intro",
		title: "💰 Financial Reports",
		text: `
      <div class="space-y-3">
        <p>Track your business performance with comprehensive financial reports.</p>
        <p>Monitor income, expenses, and profitability across all your properties.</p>
      </div>
    `,
		buttons: [tourButtons.skip, tourButtons.next],
	},
	{
		id: "date-filters",
		title: "📅 Date Range Filters",
		text: `
      <div class="space-y-3">
        <p>Use these controls to filter reports by date range:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Select specific date ranges</li>
          <li>Choose quick presets (this month, last month, etc.)</li>
          <li>Compare different time periods</li>
        </ul>
        <p class="text-xs text-muted-foreground mt-2">💡 Click "Next" below to continue the tour</p>
      </div>
    `,
		attachTo: {
			element: '[data-testid="report-filters"]',
			on: "left",
		},
		buttons: [tourButtons.back, tourButtons.next],
		when: {
			show() {
				// Temporarily disable filter buttons during this step
				const filterButtons = document.querySelectorAll('[data-testid="report-filters"] button');
				filterButtons.forEach(btn => {
					if (btn instanceof HTMLElement) {
						btn.style.pointerEvents = 'none';
						btn.style.opacity = '0.7';
					}
				});
			},
			hide() {
				// Re-enable filter buttons when leaving this step
				const filterButtons = document.querySelectorAll('[data-testid="report-filters"] button');
				filterButtons.forEach(btn => {
					if (btn instanceof HTMLElement) {
						btn.style.pointerEvents = 'auto';
						btn.style.opacity = '1';
					}
				});
			},
		},
	},
	{
		id: "financial-summary",
		title: "📈 Financial Summary Cards",
		text: `
      <div class="space-y-3">
        <p>These cards provide a quick overview of your financial performance:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li><strong>Total Income</strong> - All revenue from bookings</li>
          <li><strong>Total Expenses</strong> - Business operating costs</li>
          <li><strong>Net Profit</strong> - Your bottom-line profitability</li>
        </ul>
      </div>
    `,
		attachTo: {
			element: '[data-testid="financial-summary-cards"]',
			on: "top",
		},
		buttons: [tourButtons.back, tourButtons.finish],
	},
];

// First-time user tour (comprehensive)
export const firstTimeUserTourSteps: StepOptions[] = [
	{
		id: "welcome-new-user",
		title: "🎉 Welcome to CheckingCheckout!",
		text: `
      <div class="space-y-4">
        <p class="text-lg font-semibold">Congratulations on setting up your account!</p>
        <p>Let's take a quick tour to help you get started with your hospitality business management.</p>
        <div class="bg-blue-50 p-3 rounded-lg">
          <p class="text-sm"><strong>💡 Tip:</strong> You can restart this tour anytime from the help menu.</p>
        </div>
      </div>
    `,
		buttons: [tourButtons.skip, tourButtons.next],
		classes: "shepherd-theme-welcome shepherd-large",
	},
	...dashboardTourSteps.slice(1), // Include dashboard steps
	{
		id: "setup-next-steps",
		title: "🚀 Next Steps",
		text: `
      <div class="space-y-4">
        <p>Great! You've completed the basic tour. Here's what to do next:</p>
        <ol class="list-decimal list-inside space-y-2 text-sm">
          <li><strong>Set up your rooms</strong> - Go to Master Files → Rooms</li>
          <li><strong>Configure your rates</strong> - Set pricing for different room types</li>
          <li><strong>Create your first booking</strong> - Use the Calendar or Reservations page</li>
          <li><strong>Set up payment accounts</strong> - Configure your financial accounts</li>
        </ol>
        <div class="bg-green-50 p-3 rounded-lg">
          <p class="text-sm"><strong>🎯 Ready to start managing your property!</strong></p>
        </div>
      </div>
    `,
		buttons: [tourButtons.finish],
		classes: "shepherd-theme-success shepherd-large",
	},
];

// Get tour steps by type
export const getTourSteps = (tourType: TourType): StepOptions[] => {
	switch (tourType) {
		case "dashboard":
			return dashboardTourSteps;
		case "reservations":
			return reservationsTourSteps;
		case "financial-reports":
			return financialReportsTourSteps;
		case "first-time-user":
			return firstTimeUserTourSteps;
		case "calendar":
			return [
				{
					id: "calendar-intro",
					title: "📅 Calendar View",
					text: "View and manage your bookings in a visual calendar format. You can see availability, conflicts, and quickly add new reservations.",
					buttons: [tourButtons.finish],
				},
			];
		case "master-files":
			return [
				{
					id: "master-files-intro",
					title: "⚙️ Master Files",
					text: "Configure your property settings, rooms, agents, guides, and other essential data for your business.",
					buttons: [tourButtons.finish],
				},
			];
		case "settings":
			return [
				{
					id: "settings-intro",
					title: "🔧 Settings",
					text: "Manage your account preferences, user permissions, and system configurations.",
					buttons: [tourButtons.finish],
				},
			];
		case "booking-channels":
			return [
				{
					id: "booking-channels-intro",
					title: "🌐 Booking Channels",
					text: "Connect with external booking platforms like Booking.com, Airbnb, and manage channel synchronization.",
					buttons: [tourButtons.finish],
				},
			];
		default:
			return [];
	}
};
