import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./i18n";
import { Users } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { AuthRedirect } from "./components/auth/auth-redirect";
import AuthProvider from "./context/auth-context";
import { LocationProvider } from "./context/location-context";
import AccessDenied from "./pages/access-denied";
import Accounts from "./pages/accounts";
import Auth from "./pages/auth";
import BillingError from "./pages/billing-error";
import BillingSubscription from "./pages/billing-subscription";
import BillingSuccess from "./pages/billing-success";
import BookingChannelsIntegration from "./pages/booking-channels-integration";
import Dashboard from "./pages/dashboard";
import EnhancedCalendar from "./pages/enhanced-calendar";
import Expense from "./pages/expense";
import FinancialReports from "./pages/financial-reports";
import ForgotPassword from "./pages/forgot-password";
import MasterFiles from "./pages/master-files";
import NotFound from "./pages/not-found";
import Onboarding from "./pages/onboarding";
import PaymentForm from "./pages/payment-form";
import Reports from "./pages/reports";
import ReservationDetails from "./pages/reservation-details";
import Reservations from "./pages/reservations";
import ResetPassword from "./pages/reset-password";
import { Layout } from "./components/layout/layout";
import { PermissionRoute } from "./components/routing/permission-route";
import { SmartRedirect } from "./components/routing/smart-redirect";
import { ProtectedRoute } from "./components/routing/protected-route";
import Settings from "./pages/settings";

const queryClient = new QueryClient();

const App = () => (
	<QueryClientProvider client={queryClient}>
		<ThemeProvider defaultTheme="system" storageKey="checkingcheckout-theme">
			<TooltipProvider>
				<AuthProvider>
					<LocationProvider>
						<Toaster />
						<Sonner />
						<BrowserRouter>
							<Routes>
								<Route path="/" element={<AuthRedirect />} />
								<Route path="/auth" element={<Auth />} />
								<Route
									path="/auth/forgot-password"
									element={<ForgotPassword />}
								/>
								<Route
									path="/auth/reset-password"
									element={<ResetPassword />}
								/>
								<Route
									path="/onboarding"
									element={
										<ProtectedRoute>
											<Onboarding />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/smart-redirect"
									element={
										<ProtectedRoute>
											<SmartRedirect />
										</ProtectedRoute>
									}
								/>
								<Route path="/access-denied" element={<AccessDenied />} />
								<Route
									path="/dashboard"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_dashboard"]}>
												<Dashboard />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/calendar"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_calendar"]}>
												<EnhancedCalendar />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/booking-channels"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_booking_channels"]}>
												<BookingChannelsIntegration />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/master-files"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_master_files"]}>
												<MasterFiles />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/payments/new"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_income"]}>
												<PaymentForm />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/expense"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_expenses"]}>
												<Expense />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/reservations"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_bookings"]}>
												<Reservations />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/reservations/:id"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_bookings"]}>
												<ReservationDetails />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/reports"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_reports"]}>
												<Reports />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/financial-reports"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_reports"]}>
												<FinancialReports />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/accounts"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_accounts"]}>
												<Accounts />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/users"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_users"]}>
												<Users />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/settings"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route
										index
										element={
											<PermissionRoute permission={["access_settings"]}>
												<Settings />
											</PermissionRoute>
										}
									/>
								</Route>
								<Route
									path="/billing"
									element={
										<ProtectedRoute>
											<Layout />
										</ProtectedRoute>
									}
								>
									<Route index element={<BillingSubscription />} />
								</Route>
								<Route
									path="/billing/success"
									element={
										<ProtectedRoute>
											<BillingSuccess />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/billing/error"
									element={
										<ProtectedRoute>
											<BillingError />
										</ProtectedRoute>
									}
								/>
								<Route path="*" element={<NotFound />} />
							</Routes>
						</BrowserRouter>
					</LocationProvider>
				</AuthProvider>
			</TooltipProvider>
		</ThemeProvider>
	</QueryClientProvider>
);

export default App;
