import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { PermissionRoute } from "@/components/PermissionRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "./i18n";
import BookingChannelsIntegration from "@/pages/BookingChannelsIntegration";
import Reports from "@/pages/Reports";
import { AuthRedirect } from "./components/AuthRedirect";
import { Layout } from "./components/Layout";
import { SmartRedirect } from "./components/SmartRedirect";
import AccessDenied from "./pages/AccessDenied";
import Accounts from "./pages/Accounts";
import Auth from "./pages/Auth";
import BillingError from "./pages/BillingError";
import BillingSubscription from "./pages/BillingSubscription";
import BillingSuccess from "./pages/BillingSuccess";
import Dashboard from "./pages/Dashboard";
import EnhancedCalendar from "./pages/EnhancedCalendar";
import Expense from "./pages/Expense";
import FinancialReports from "./pages/FinancialReports";
import ForgotPassword from "./pages/ForgotPassword";
import MasterFiles from "./pages/MasterFiles";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import PaymentForm from "./pages/PaymentForm";
import ReservationDetails from "./pages/ReservationDetails";
import Reservations from "./pages/Reservations";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

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
