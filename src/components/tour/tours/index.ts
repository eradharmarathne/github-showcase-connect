import { PageTour } from "../TourProvider";

export const dashboardTour: PageTour = {
	id: "dashboard-tour",
	name: "Dashboard Tour",
	description: "Learn how to use the dashboard and its key features",
	steps: [
		{
			id: "welcome",
			title: "🏨 Welcome to CheckingCheckout Dashboard!",
			content: `
				<div class="space-y-3">
					<p>Welcome to your hospitality management dashboard! This is your central hub for monitoring and managing your business.</p>
					<p>Let's explore the key features that will help you run your property efficiently.</p>
				</div>
			`,
			showSkip: true,
			showNext: true,
		},
		{
			id: "sidebar",
			title: "📱 Navigation Sidebar",
			content: `
				<div class="space-y-3">
					<p>This sidebar is your main navigation tool. Here you can:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Access all major sections of the system</li>
						<li>Switch between different locations/properties</li>
						<li>View your current permissions and role</li>
					</ul>
				</div>
			`,
			targetElement: '[data-testid="app-sidebar"]',
			position: "right",
			showBack: true,
			showNext: true,
		},
		{
			id: "location-switcher",
			title: "🏢 Location Switcher",
			content: `
				<div class="space-y-3">
					<p>If you manage multiple properties, use this switcher to:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>View data for specific locations</li>
						<li>Switch between different properties</li>
						<li>Filter reports and bookings by location</li>
					</ul>
				</div>
			`,
			targetElement: '[data-testid="team-switcher"]',
			position: "bottom",
			showBack: true,
			showNext: true,
		},
		{
			id: "financial-cards",
			title: "💰 Financial Overview",
			content: `
				<div class="space-y-3">
					<p>These cards show your key financial metrics at a glance:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Account balances across all your banking accounts</li>
						<li>Real-time financial status and cash flow</li>
						<li>Currency information for multi-currency operations</li>
					</ul>
					<p class="text-xs text-muted-foreground mt-2">💡 Click on any card to view detailed information</p>
				</div>
			`,
			targetElement: '[data-testid="financial-cards"]',
			position: "top",
			showBack: true,
			showNext: true,
		},
		{
			id: "quick-actions",
			title: "⚡ Quick Actions",
			content: `
				<div class="space-y-3">
					<p>Use these buttons for common daily tasks:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li><strong>New Reservation</strong> - Add a booking quickly</li>
						<li><strong>Add Income</strong> - Record payments received</li>
						<li><strong>Add Expense</strong> - Track business expenses</li>
					</ul>
					<p class="text-xs text-muted-foreground mt-2">💡 These shortcuts save you time for frequent operations</p>
				</div>
			`,
			targetElement: '[data-testid="quick-actions"]',
			position: "top",
			showBack: true,
			showFinish: true,
		},
	],
};

export const reservationsTour: PageTour = {
	id: "reservations-tour",
	name: "Reservations Management",
	description: "Learn how to manage bookings and guest information",
	steps: [
		{
			id: "reservations-intro",
			title: "📋 Reservations Management",
			content: `
				<div class="space-y-3">
					<p>Welcome to the Reservations section! Here you can:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>View all your bookings in one organized table</li>
						<li>Create new reservations with detailed guest information</li>
						<li>Manage payment status and booking confirmations</li>
						<li>Track check-in/check-out status and guest communications</li>
					</ul>
				</div>
			`,
			requiresNavigation: "/reservations",
			showSkip: true,
			showNext: true,
		},
		{
			id: "add-reservation",
			title: "➕ Adding New Reservations",
			content: `
				<div class="space-y-3">
					<p>Click this button to create new reservations:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Enter comprehensive guest details and contact information</li>
						<li>Select available rooms and set custom pricing</li>
						<li>Manage payment schedules and deposit requirements</li>
						<li>Set special requests and booking notes</li>
					</ul>
				</div>
			`,
			targetElement: '[data-testid="add-reservation-btn"]',
			position: "bottom",
			showBack: true,
			showNext: true,
		},
		{
			id: "reservations-table",
			title: "📊 Reservations Overview Table",
			content: `
				<div class="space-y-3">
					<p>This comprehensive table displays all your reservations with:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Guest names, contact information, and booking details</li>
						<li>Check-in and check-out dates with duration</li>
						<li>Room assignments, room types, and current status</li>
						<li>Payment status, amounts due, and payment history</li>
					</ul>
					<p class="text-xs text-muted-foreground mt-2">💡 Click on any row to view full details or make modifications</p>
				</div>
			`,
			targetElement: '[data-testid="reservations-table"]',
			position: "top",
			showBack: true,
			showFinish: true,
		},
	],
};

export const calendarTour: PageTour = {
	id: "calendar-tour",
	name: "Calendar Management",
	description: "Learn how to use the visual calendar for booking management",
	steps: [
		{
			id: "calendar-intro",
			title: "📅 Visual Calendar Management",
			content: `
				<div class="space-y-3">
					<p>The Calendar view provides a visual timeline of your business:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Visual timeline of all bookings across all rooms</li>
						<li>Room availability status at a glance</li>
						<li>Easy drag-and-drop booking management</li>
						<li>Integration with external booking channels</li>
						<li>Quick booking creation directly from the calendar</li>
					</ul>
				</div>
			`,
			requiresNavigation: "/calendar",
			showSkip: true,
			showFinish: true,
		},
	],
};

export const reportsTour: PageTour = {
	id: "reports-tour",
	name: "Financial Reports",
	description: "Understand your financial reports and analytics",
	steps: [
		{
			id: "reports-intro",
			title: "📈 Financial Reports & Analytics",
			content: `
				<div class="space-y-3">
					<p>Generate comprehensive business reports and analytics:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Income and expense analysis with detailed breakdowns</li>
						<li>Profit and loss statements by time period</li>
						<li>Commission tracking for agents and guides</li>
						<li>Account balance reports and cash flow analysis</li>
					</ul>
				</div>
			`,
			requiresNavigation: "/reports",
			showSkip: true,
			showNext: true,
		},
		{
			id: "report-filters",
			title: "📅 Report Filtering & Controls",
			content: `
				<div class="space-y-3">
					<p>Use these powerful controls to customize your reports:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Filter by custom date ranges for specific periods</li>
						<li>Export reports to CSV for external analysis</li>
						<li>Refresh data for real-time updates</li>
						<li>Switch between different report types and views</li>
					</ul>
					<p class="text-xs text-muted-foreground mt-2">💡 Use date filters to analyze specific business periods</p>
				</div>
			`,
			targetElement: '[data-testid="report-filters"]',
			position: "left",
			showBack: true,
			showNext: true,
		},
		{
			id: "financial-summary-cards",
			title: "📊 Financial Summary Dashboard",
			content: `
				<div class="space-y-3">
					<p>These cards provide quick insights into your financial performance:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Total income from all revenue sources</li>
						<li>Total expenses and operating costs breakdown</li>
						<li>Net profit margins and profitability analysis</li>
						<li>Trends and performance indicators</li>
					</ul>
				</div>
			`,
			targetElement: '[data-testid="financial-summary-cards"]',
			position: "top",
			showBack: true,
			showFinish: true,
		},
	],
};

export const masterFilesTour: PageTour = {
	id: "master-files-tour",
	name: "Master Files Configuration",
	description: "Learn how to configure your business settings and master data",
	steps: [
		{
			id: "master-files-intro",
			title: "⚙️ Master Files Configuration",
			content: `
				<div class="space-y-3">
					<p>Master Files is where you configure your business foundation:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Property and location settings management</li>
						<li>Room types, amenities, and pricing configurations</li>
						<li>Tour guide and agent information management</li>
						<li>Commission structures and payment terms</li>
					</ul>
					<p class="text-xs text-muted-foreground mt-2">💡 Set up these configurations before adding reservations</p>
				</div>
			`,
			requiresNavigation: "/master-files",
			showSkip: true,
			showFinish: true,
		},
	],
};

export const settingsTour: PageTour = {
	id: "settings-tour",
	name: "System Settings",
	description: "Configure your account and system preferences",
	steps: [
		{
			id: "settings-intro",
			title: "🔧 System Settings & Configuration",
			content: `
				<div class="space-y-3">
					<p>Manage your system preferences and configurations:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>User accounts and permission management</li>
						<li>System configurations and preferences</li>
						<li>Account settings and profile information</li>
						<li>Security settings and access controls</li>
					</ul>
				</div>
			`,
			requiresNavigation: "/settings",
			showSkip: true,
			showFinish: true,
		},
	],
};

export const accountsTour: PageTour = {
	id: "accounts-tour",
	name: "Financial Accounts",
	description: "Manage your financial accounts and banking information",
	steps: [
		{
			id: "accounts-intro",
			title: "🏦 Financial Accounts Management",
			content: `
				<div class="space-y-3">
					<p>Manage your financial accounts and banking information:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Track multiple bank accounts and cash flows</li>
						<li>Monitor account balances in real-time</li>
						<li>Manage different currencies and exchange rates</li>
						<li>Set up payment methods and financial integrations</li>
					</ul>
				</div>
			`,
			requiresNavigation: "/accounts",
			showSkip: true,
			showFinish: true,
		},
	],
};

export const expenseTour: PageTour = {
	id: "expense-tour",
	name: "Expense Management",
	description: "Learn how to track and manage business expenses",
	steps: [
		{
			id: "expense-intro",
			title: "💸 Expense Management & Tracking",
			content: `
				<div class="space-y-3">
					<p>Efficiently track and manage all your business expenses:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Record various types of business expenses</li>
						<li>Categorize expenses for better reporting</li>
						<li>Upload receipts and supporting documents</li>
						<li>Track expense trends and budgets</li>
					</ul>
				</div>
			`,
			requiresNavigation: "/expense",
			showSkip: true,
			showFinish: true,
		},
	],
};

export const usersTour: PageTour = {
	id: "users-tour",
	name: "User Management",
	description: "Manage team members and user permissions",
	steps: [
		{
			id: "users-intro",
			title: "👥 User Management & Permissions",
			content: `
				<div class="space-y-3">
					<p>Manage your team and user access controls:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Add and manage team member accounts</li>
						<li>Set granular permissions and access levels</li>
						<li>Configure role-based access controls</li>
						<li>Monitor user activity and login history</li>
					</ul>
				</div>
			`,
			requiresNavigation: "/users",
			showSkip: true,
			showFinish: true,
		},
	],
};

export const bookingChannelsTour: PageTour = {
	id: "booking-channels-tour",
	name: "Booking Channels Integration",
	description: "Connect with external booking platforms and channel managers",
	steps: [
		{
			id: "booking-channels-intro",
			title: "🌐 Booking Channels Integration",
			content: `
				<div class="space-y-3">
					<p>Connect with external booking platforms and manage your online presence:</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Booking.com, Airbnb, and other OTA integrations</li>
						<li>Channel manager synchronization and management</li>
						<li>External booking import/export capabilities</li>
						<li>Rate and availability management across platforms</li>
					</ul>
				</div>
			`,
			requiresNavigation: "/booking-channels",
			showSkip: true,
			showFinish: true,
		},
	],
};

// Comprehensive tour that visits all major sections
export const comprehensiveTour: PageTour = {
	id: "comprehensive-tour",
	name: "Complete Application Tour",
	description: "A comprehensive walkthrough of all features and sections",
	steps: [
		{
			id: "welcome",
			title: "🏨 Welcome to CheckingCheckout!",
			content: `
				<div class="space-y-3">
					<p>Welcome to your complete hospitality ERP system! This comprehensive tour will guide you through all the features available to help you manage your hospitality business.</p>
					<p>We'll visit every major section and show you how to use all the tools available to you.</p>
					<div class="bg-blue-50 p-3 rounded-lg">
						<p class="text-sm"><strong>💡 Tip:</strong> You can exit this tour anytime and restart it later from the help menu.</p>
					</div>
				</div>
			`,
			requiresNavigation: "/dashboard",
			showSkip: true,
			showNext: true,
		},
		...dashboardTour.steps.slice(1), // Include dashboard steps (skip welcome)
		...reservationsTour.steps,
		...calendarTour.steps,
		...reportsTour.steps,
		...masterFilesTour.steps,
		...settingsTour.steps,
		...accountsTour.steps,
		...expenseTour.steps,
		...usersTour.steps,
		...bookingChannelsTour.steps,
		{
			id: "tour-complete",
			title: "🎉 Tour Complete!",
			content: `
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
						<li>Accounts for financial tracking</li>
						<li>Expense management for cost control</li>
						<li>User management for team collaboration</li>
						<li>Booking Channels for external integrations</li>
					</ul>
					<div class="bg-green-50 p-3 rounded-lg mt-4">
						<p class="text-sm"><strong>🚀 Ready to get started!</strong> You can restart any tour anytime from the help menu.</p>
					</div>
				</div>
			`,
			showFinish: true,
		},
	],
};
