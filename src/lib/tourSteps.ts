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
	// Navigation buttons for cross-page touring
	navigateNext: (path: string) => ({
		text: "Next",
		classes: "btn btn-primary",
		action: function () {
			// Navigate to the next page, then proceed
			window.location.hash = path;
			setTimeout(() => {
				this.next();
			}, 1000); // Wait for navigation to complete
		},
	}),
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

// Comprehensive tour that covers all application features
export const comprehensiveTourSteps: StepOptions[] = [
	// Welcome and Introduction
	{
		id: "welcome",
		title: "🏨 Welcome to CheckingCheckout!",
		text: `
      <div class="space-y-3">
        <p>Welcome to your complete hospitality ERP system! This comprehensive tour will guide you through all the features available to help you manage your hospitality business.</p>
        <p>We'll visit every section and show you how to use all the tools available to you.</p>
        <div class="bg-blue-50 p-3 rounded-lg">
          <p class="text-sm"><strong>💡 Tip:</strong> You can exit this tour anytime and restart it later from the help menu.</p>
        </div>
      </div>
    `,
		buttons: [tourButtons.skip, tourButtons.next],
		classes: "shepherd-theme-welcome",
	},

	// Dashboard Section
	{
		id: "sidebar",
		title: "📱 Navigation Sidebar",
		text: `
      <div class="space-y-3">
        <p>This sidebar is your main navigation hub. Here you can:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Switch between different locations/properties</li>
          <li>Access all major sections of the system</li>
          <li>View your current permissions and role</li>
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
		title: "🏢 Location Switcher",
		text: `
      <div class="space-y-3">
        <p>If you manage multiple properties, use this switcher to:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>View data for specific locations</li>
          <li>Switch between different properties</li>
          <li>Filter reports and bookings by location</li>
        </ul>
      </div>
    `,
		attachTo: {
			element: '[data-testid="team-switcher"]',
			on: "bottom",
		},
		buttons: [tourButtons.back, tourButtons.next],
	},
	{
		id: "financial-cards",
		title: "💰 Financial Overview",
		text: `
      <div class="space-y-3">
        <p>These cards show your key financial metrics at a glance:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Account balances across all your banking accounts</li>
          <li>Real-time financial status</li>
          <li>Currency information for multi-currency operations</li>
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
        <p class="text-xs text-muted-foreground mt-2">💡 Next, we'll visit the Reservations section</p>
      </div>
    `,
		attachTo: {
			element: '[data-testid="quick-actions"]',
			on: "bottom",
		},
		buttons: [tourButtons.back, {
			text: "Visit Reservations →",
			classes: "btn btn-primary",
			action: function () {
				window.location.href = '/reservations';
				setTimeout(() => {
					this.next();
				}, 1000);
			},
		}],
	},

	// Reservations Section
	{
		id: "reservations-intro",
		title: "📋 Reservations Management",
		text: `
      <div class="space-y-3">
        <p>Welcome to the Reservations section! Here you can:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>View all your bookings in one place</li>
          <li>Create new reservations</li>
          <li>Manage guest information and payments</li>
          <li>Track booking statuses and check-ins</li>
        </ul>
      </div>
    `,
		buttons: [tourButtons.back, tourButtons.next],
	},
	{
		id: "add-reservation",
		title: "➕ Adding New Reservations",
		text: `
      <div class="space-y-3">
        <p>Click this button to create new reservations:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Enter guest details and booking information</li>
          <li>Select rooms and set pricing</li>
          <li>Manage payments and deposits</li>
        </ul>
      </div>
    `,
		attachTo: {
			element: '[data-testid="add-reservation-btn"]',
			on: "bottom",
		},
		buttons: [tourButtons.back, tourButtons.next],
	},
	{
		id: "reservations-table",
		title: "📊 Reservations Overview",
		text: `
      <div class="space-y-3">
        <p>This table shows all your reservations with:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Guest names and contact information</li>
          <li>Check-in and check-out dates</li>
          <li>Room assignments and booking status</li>
          <li>Payment status and amounts</li>
        </ul>
        <p class="text-xs text-muted-foreground mt-2">💡 Next, let's visit the Calendar view</p>
      </div>
    `,
		attachTo: {
			element: '[data-testid="reservations-table"]',
			on: "top",
		},
		buttons: [tourButtons.back, {
			text: "Visit Calendar →",
			classes: "btn btn-primary",
			action: function () {
				window.location.href = '/calendar';
				setTimeout(() => {
					this.next();
				}, 1000);
			},
		}],
	},

	// Calendar Section
	{
		id: "calendar-intro",
		title: "📅 Calendar Management",
		text: `
      <div class="space-y-3">
        <p>The Calendar view provides:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Visual timeline of all bookings</li>
          <li>Room availability at a glance</li>
          <li>Easy drag-and-drop booking management</li>
          <li>Integration with external booking channels</li>
        </ul>
        <p class="text-xs text-muted-foreground mt-2">💡 Next, let's explore Financial Reports</p>
      </div>
    `,
		buttons: [tourButtons.back, {
			text: "Visit Reports →",
			classes: "btn btn-primary",
			action: function () {
				window.location.href = '/reports';
				setTimeout(() => {
					this.next();
				}, 1000);
			},
		}],
	},

	// Reports Section
	{
		id: "reports-intro",
		title: "📈 Financial Reports",
		text: `
      <div class="space-y-3">
        <p>Generate comprehensive business reports:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Income and expense analysis</li>
          <li>Profit and loss statements</li>
          <li>Commission tracking</li>
          <li>Account balance reports</li>
        </ul>
      </div>
    `,
		buttons: [tourButtons.back, tourButtons.next],
	},
	{
		id: "report-filters",
		title: "📅 Report Filtering",
		text: `
      <div class="space-y-3">
        <p>Use these controls to customize your reports:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Filter by date ranges</li>
          <li>Export reports to CSV</li>
          <li>Refresh data for real-time updates</li>
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
		id: "financial-summary-cards",
		title: "📊 Financial Summary",
		text: `
      <div class="space-y-3">
        <p>These cards provide quick financial insights:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Total income from all sources</li>
          <li>Total expenses and operating costs</li>
          <li>Net profit margins and performance</li>
        </ul>
        <p class="text-xs text-muted-foreground mt-2">💡 Next, let's visit Master Files</p>
      </div>
    `,
		attachTo: {
			element: '[data-testid="financial-summary-cards"]',
			on: "top",
		},
		buttons: [tourButtons.back, {
			text: "Visit Master Files →",
			classes: "btn btn-primary",
			action: function () {
				window.location.href = '/master-files';
				setTimeout(() => {
					this.next();
				}, 1000);
			},
		}],
	},

	// Master Files Section
	{
		id: "master-files-intro",
		title: "⚙️ Master Files Configuration",
		text: `
      <div class="space-y-3">
        <p>Master Files is where you configure your business:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Property and location settings</li>
          <li>Room types and amenities</li>
          <li>Agent and guide information</li>
          <li>Commission structures</li>
        </ul>
        <p class="text-xs text-muted-foreground mt-2">💡 Next, let's check Settings</p>
      </div>
    `,
		buttons: [tourButtons.back, {
			text: "Visit Settings →",
			classes: "btn btn-primary",
			action: function () {
				window.location.href = '/settings';
				setTimeout(() => {
					this.next();
				}, 1000);
			},
		}],
	},

	// Settings Section
	{
		id: "settings-intro",
		title: "🔧 System Settings",
		text: `
      <div class="space-y-3">
        <p>Manage your system preferences:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>User accounts and permissions</li>
          <li>System configurations</li>
          <li>Account preferences</li>
          <li>Security settings</li>
        </ul>
        <p class="text-xs text-muted-foreground mt-2">💡 Finally, let's explore Booking Channels</p>
      </div>
    `,
		buttons: [tourButtons.back, {
			text: "Visit Booking Channels →",
			classes: "btn btn-primary",
			action: function () {
				window.location.href = '/booking-channels';
				setTimeout(() => {
					this.next();
				}, 1000);
			},
		}],
	},

	// Booking Channels Section
	{
		id: "booking-channels-intro",
		title: "🌐 Booking Channels Integration",
		text: `
      <div class="space-y-3">
        <p>Connect with external booking platforms:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Booking.com, Airbnb integration</li>
          <li>Channel manager synchronization</li>
          <li>External booking import/export</li>
          <li>Rate and availability management</li>
        </ul>
      </div>
    `,
		buttons: [tourButtons.back, tourButtons.next],
	},

	// Tour Completion
	{
		id: "tour-complete",
		title: "🎉 Tour Complete!",
		text: `
      <div class="space-y-4">
        <p class="text-lg font-semibold">Congratulations! You've completed the comprehensive tour.</p>
        <p>You now know how to navigate and use all the major features of CheckingCheckout:</p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Dashboard for quick overview and actions</li>
          <li>Reservations for booking management</li>
          <li>Calendar for visual scheduling</li>
          <li>Reports for financial analysis</li>
          <li>Master Files for system configuration</li>
          <li>Settings for user management</li>
          <li>Booking Channels for external integrations</li>
        </ul>
        <div class="bg-green-50 p-3 rounded-lg mt-4">
          <p class="text-sm"><strong>🚀 Ready to get started!</strong> You can restart this tour anytime from the help menu.</p>
        </div>
      </div>
    `,
		buttons: [tourButtons.finish],
		classes: "shepherd-theme-welcome",
	},
];

// Get tour steps by type
export const getTourSteps = (tourType: TourType): StepOptions[] => {
	switch (tourType) {
		case "comprehensive-tour":
			return comprehensiveTourSteps;
		default:
			return [];
	}
};
