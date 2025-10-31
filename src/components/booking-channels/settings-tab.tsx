import { format } from "date-fns";
import {
	AlertCircle,
	Bed,
	Calendar,
	Key,
	RefreshCw,
	Settings as SettingsIcon,
	Trash2,
} from "lucide-react";
import type { PropertyMapping, SyncStats } from "@/types/booking-channels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface Location {
	id: string;
	name: string;
	is_active: boolean;
}

interface SyncUrl {
	id: string;
	location_id: string;
	ical_url: string;
	source: string;
	last_synced_at: string | null;
	room_id: string | null;
	rooms?: {
		room_number: string;
	} | null;
}

interface Room {
	id: string;
	room_number: string;
	room_type: string;
}

interface SettingsTabProps {
	locations: Location[];
	selectedLocation: string | null;
	propertyMappings: PropertyMapping[];
	propertyInputValues: Record<string, string>;
	setPropertyInputValues: React.Dispatch<
		React.SetStateAction<Record<string, string>>
	>;
	addPropertyMapping: (locationId: string) => Promise<void>;
	syncUrls: SyncUrl[];
	icalInputValues: Record<
		string,
		{ url: string; source: string; room_id: string | null }
	>;
	setIcalInputValues: React.Dispatch<
		React.SetStateAction<
			Record<string, { url: string; source: string; room_id: string | null }>
		>
	>;
	rooms: Room[];
	addIcalSyncUrl: (locationId: string) => Promise<void>;
	deleteSyncUrl: (syncUrlId: string) => Promise<void>;
	manualSyncIcal: (syncUrlId: string) => Promise<void>;
	syncing: boolean;
	setupMode: boolean;
	setSetupMode: React.Dispatch<React.SetStateAction<boolean>>;
	syncStats: SyncStats;
	exchangingToken: boolean;
	exchangeInviteCode: (inviteCode: string) => Promise<void>;
	getSourceColor: (source: string) => string;
}

export function SettingsTab({
	locations,
	selectedLocation,
	propertyMappings,
	propertyInputValues,
	setPropertyInputValues,
	addPropertyMapping,
	syncUrls,
	icalInputValues,
	setIcalInputValues,
	rooms,
	addIcalSyncUrl,
	deleteSyncUrl,
	manualSyncIcal,
	syncing,
	setupMode,
	setSetupMode,
	syncStats,
	exchangingToken,
	exchangeInviteCode,
	getSourceColor,
}: SettingsTabProps) {
	return (
		<div className="space-y-6">
			{/* Property Mapping Section */}
			<div className="space-y-3">
				<div>
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<SettingsIcon className="size-5" />
						Property Mapping
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Map your property name to this location
					</p>
				</div>

				{locations
					.filter((location) => location.id === selectedLocation)
					.map((location) => {
						const mapping = propertyMappings.find(
							(m) => m.locationName === location.name,
						);
						return (
							<div key={location.id} className="space-y-3">
								{mapping && mapping.channelProperties.length > 0 && (
									<div className="space-y-2">
										<Label className="text-sm font-medium">
											Mapped Properties:
										</Label>
										<div className="flex flex-wrap gap-2">
											{mapping.channelProperties.map((property, index) => (
												<Badge
													key={index}
													variant="outline"
													className="text-xs"
												>
													{property}
												</Badge>
											))}
										</div>
									</div>
								)}
								<div className="flex flex-col sm:flex-row gap-2">
									<div className="flex-1">
										<Input
											id={`property-${location.id}`}
											placeholder="Enter property name"
											value={propertyInputValues[location.id] || ""}
											onChange={(e) =>
												setPropertyInputValues((prev) => ({
													...prev,
													[location.id]: e.target.value,
												}))
											}
										/>
									</div>
									<Button
										size="default"
										className="sm:w-auto"
										onClick={() => addPropertyMapping(location.id)}
									>
										Add Mapping
									</Button>
								</div>
							</div>
						);
					})}
			</div>

			{/* iCal Sync Section */}
			<div className="space-y-3">
				<div>
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<Calendar className="size-5" />
						iCal Calendar Sync
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Add external calendar URLs from booking platforms (Booking.com,
						Airbnb, etc.) and map them to specific rooms
					</p>
				</div>

				{locations
					.filter((location) => location.id === selectedLocation)
					.map((location) => {
						const locationSyncUrls = syncUrls.filter(
							(url) => url.location_id === location.id,
						);

						return (
							<div key={location.id} className="space-y-3">
								{/* Add New Sync URL Form */}
								<div className="space-y-2">
									<Label className="text-sm font-medium">
										Add New Calendar URL
									</Label>
									<div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
										<Input
											id={`ical-url-${location.id}`}
											placeholder="https://ical.booking.com/..."
											value={icalInputValues[location.id]?.url || ""}
											onChange={(e) =>
												setIcalInputValues((prev) => ({
													...prev,
													[location.id]: {
														...prev[location.id],
														url: e.target.value,
														source: prev[location.id]?.source || "ical",
														room_id: prev[location.id]?.room_id || null,
													},
												}))
											}
										/>
										<Select
											value={icalInputValues[location.id]?.source || "ical"}
											onValueChange={(value) =>
												setIcalInputValues((prev) => ({
													...prev,
													[location.id]: {
														...prev[location.id],
														source: value,
														url: prev[location.id]?.url || "",
														room_id: prev[location.id]?.room_id || null,
													},
												}))
											}
										>
											<SelectTrigger className="w-[140px]">
												<SelectValue placeholder="Source" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ical">iCal</SelectItem>
												<SelectItem value="booking_com">
													Booking.com
												</SelectItem>
												<SelectItem value="airbnb">Airbnb</SelectItem>
												<SelectItem value="expedia">Expedia</SelectItem>
											</SelectContent>
										</Select>
										<Select
											value={icalInputValues[location.id]?.room_id || ""}
											onValueChange={(value) =>
												setIcalInputValues((prev) => ({
													...prev,
													[location.id]: {
														...prev[location.id],
														room_id: value || null,
														url: prev[location.id]?.url || "",
														source: prev[location.id]?.source || "ical",
													},
												}))
											}
										>
											<SelectTrigger className="w-[160px]">
												<SelectValue placeholder="Select Room" />
											</SelectTrigger>
											<SelectContent>
												{rooms.map((room) => (
													<SelectItem key={room.id} value={room.id}>
														{room.room_number} - {room.room_type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Button
											size="default"
											className="sm:w-auto"
											onClick={() => addIcalSyncUrl(location.id)}
										>
											Add URL
										</Button>
									</div>
								</div>

								{/* Display Existing Sync URLs */}
								{locationSyncUrls.length > 0 && (
									<div className="space-y-2">
										<Label className="text-sm font-medium">
											Active Sync URLs:
										</Label>
										<div className="space-y-2">
											{locationSyncUrls.map((syncUrl) => (
												<div
													key={syncUrl.id}
													className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted rounded-md"
												>
													<div className="flex-1 min-w-0">
														<div className="flex flex-wrap items-center gap-2 mb-1">
															<Badge className={getSourceColor(syncUrl.source)}>
																{syncUrl.source.replace("_", ".")}
															</Badge>
															{syncUrl.rooms && (
																<Badge variant="secondary" className="text-xs">
																	<Bed className="size-3 mr-1" />
																	{syncUrl.rooms.room_number}
																</Badge>
															)}
														</div>
														<div className="text-xs text-muted-foreground truncate">
															{syncUrl.ical_url}
														</div>
														{syncUrl.last_synced_at && (
															<div className="text-xs text-muted-foreground mt-1">
																Last synced:{" "}
																{format(
																	new Date(syncUrl.last_synced_at),
																	"MMM dd, HH:mm",
																)}
															</div>
														)}
													</div>
													<div className="flex gap-2">
														<Button
															size="sm"
															variant="outline"
															onClick={() => manualSyncIcal(syncUrl.id)}
															disabled={syncing}
														>
															<RefreshCw
																className={`size-4 ${syncing ? "animate-spin" : ""}`}
															/>
														</Button>
														<Button
															size="sm"
															variant="destructive"
															onClick={() => deleteSyncUrl(syncUrl.id)}
														>
															<Trash2 className="size-4" />
														</Button>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						);
					})}
			</div>

			{/* API Setup Section */}
			<div className="space-y-3 pt-4 border-t">
				<div>
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<Key className="size-5" />
						API Configuration
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Configure your booking channel API connection
					</p>
				</div>

				{!setupMode ? (
					<div className="text-center py-8">
						<div className="space-y-4">
							<div className="text-muted-foreground">
								API connection is already configured.
								{syncStats.recentSync ? (
									<span className="block mt-2">
										Last successful sync:{" "}
										{format(
											new Date(syncStats.recentSync),
											"MMM dd, yyyy HH:mm",
										)}
									</span>
								) : (
									<span className="block mt-2 text-yellow-600">
										No successful sync yet
									</span>
								)}
							</div>
							<Button variant="outline" onClick={() => setSetupMode(true)}>
								Reconfigure API
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="bg-amber-50 p-4 sm:p-6 rounded-lg border border-amber-200">
							<div className="flex items-start gap-3">
								<AlertCircle className="size-5 text-amber-600 mt-0.5" />
								<div className="space-y-2">
									<h4 className="text-sm md:text-base lg:text-lg font-medium text-amber-800">
										Setup Instructions
									</h4>
									<ol className="text-sm text-amber-700 space-y-1 ml-4 list-decimal">
										<li>Log into your booking channel account</li>
										<li>Go to Settings → Channel Manager → API</li>
										<li>Generate an invite code for this application</li>
										<li>Enter the invite code below to complete setup</li>
									</ol>
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="inviteCode">Channel Invite Code</Label>
							<div className="flex flex-col sm:flex-row gap-2">
								<Input
									id="inviteCode"
									placeholder="Enter your booking channel invite code"
									disabled={exchangingToken}
									className="flex-1"
								/>
								<Button
									onClick={() => {
										const input = document.getElementById(
											"inviteCode",
										) as HTMLInputElement;
										if (input?.value) {
											exchangeInviteCode(input.value);
										}
									}}
									disabled={exchangingToken}
									className="sm:w-auto min-w-[100px]"
								>
									{exchangingToken ? (
										<>
											<RefreshCw className="size-4 mr-2 animate-spin" />
											Setup...
										</>
									) : (
										"Setup"
									)}
								</Button>
							</div>
						</div>

						<Button
							variant="ghost"
							onClick={() => setSetupMode(false)}
							className="w-full"
						>
							Cancel Setup
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
