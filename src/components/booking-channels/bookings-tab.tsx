import { Bed, Eye, MapPin, RefreshCw, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	calculateNights,
	formatDate,
	formatPrice,
	getEmail,
	getGuestName,
	getPaymentInfo,
	getSourceColor,
	getStatusColor,
} from "@/lib/booking-channels/helpers";
import type { ExternalBooking } from "@/types/booking-channels";

interface Room {
	id: string;
	room_number: string;
	room_type: string;
}

interface BookingsTabProps {
	bookings: ExternalBooking[];
	rooms: Room[];
	syncing: boolean;
	onSync: () => void;
	onBookingClick: (booking: ExternalBooking) => void;
	onRoomMappingUpdate: (bookingId: string, roomId: string) => Promise<void>;
}

export function BookingsTab({
	bookings,
	rooms,
	syncing,
	onSync,
	onBookingClick,
	onRoomMappingUpdate,
}: BookingsTabProps) {
	const { t } = useTranslation();
	const [mappingRoomId, setMappingRoomId] = useState<string | null>(null);

	const handleRoomMapping = async (bookingId: string, roomId: string) => {
		await onRoomMappingUpdate(bookingId, roomId);
		setMappingRoomId(null);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("bookingChannels.bookingsTable.title")}</CardTitle>
				<CardDescription>
					{t("bookingChannels.bookingsTable.description")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.property")}
								</TableHead>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.location")}
								</TableHead>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.guest")}
								</TableHead>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.dates")}
								</TableHead>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.guests")}
								</TableHead>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.amount")}
								</TableHead>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.source")}
								</TableHead>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.status")}
								</TableHead>
								<TableHead>
									{t("bookingChannels.bookingsTable.headers.actions")}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{bookings.map((booking) => (
								<TableRow key={booking.id} className="hover:bg-muted/50">
									<TableCell className="font-medium">
										<div className="space-y-1">
											{!booking.room_id && mappingRoomId === booking.id ? (
												<div className="flex items-center gap-2">
													<Select
														onValueChange={(value) =>
															handleRoomMapping(booking.id, value)
														}
													>
														<SelectTrigger className="w-full h-8 text-xs">
															<SelectValue
																placeholder={t(
																	"bookingChannels.bookingsTable.selectRoom",
																)}
															/>
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
														variant="ghost"
														size="sm"
														className="h-8 px-2"
														onClick={() => setMappingRoomId(null)}
													>
														{t("bookingChannels.bookingsTable.cancel")}
													</Button>
												</div>
											) : (
												<div>
													<div className="text-sm font-medium flex items-center gap-2">
														{booking.room_id && booking.room ? (
															<>
																{booking.room.room_number} -{" "}
																{booking.room.room_type}
															</>
														) : (
															<>
																{booking.room_name ||
																	t(
																		"bookingChannels.bookingsTable.unknownProperty",
																	)}
																{rooms.length > 0 && (
																	<Button
																		variant="outline"
																		size="sm"
																		className="h-6 text-xs px-2"
																		onClick={() => setMappingRoomId(booking.id)}
																	>
																		<Bed className="size-3 mr-1" />
																		{t("bookingChannels.bookingsTable.mapRoom")}
																	</Button>
																)}
															</>
														)}
													</div>
													<div className="text-xs text-muted-foreground">
														ID: {booking.external_id}
													</div>
												</div>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<MapPin className="size-4 text-muted-foreground" />
											<span className="text-sm">
												{booking.mappedLocation?.name || "Unmapped"}
											</span>
											{!booking.mappedLocation && (
												<Badge variant="secondary" className="text-xs">
													Needs Mapping
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<div className="font-medium text-sm">
												{getGuestName(booking)}
											</div>
											{getEmail(booking) && (
												<div className="text-xs text-muted-foreground">
													{getEmail(booking)}
												</div>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<div className="text-sm">
												{formatDate(booking.check_in)} -{" "}
												{formatDate(booking.check_out)}
											</div>
											<div className="text-xs text-muted-foreground">
												{calculateNights(booking.check_in, booking.check_out)}{" "}
												nights
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Users className="size-4 text-muted-foreground" />
											<span className="text-sm">
												{booking.adults + booking.children}
												<span className="text-xs text-muted-foreground ml-1">
													({booking.adults}A + {booking.children}C)
												</span>
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<div className="font-medium text-sm">
												{formatPrice(booking)}
											</div>
											{getPaymentInfo(booking) && (
												<div className="text-xs text-green-600">
													Payout: {getPaymentInfo(booking)?.payout} LKR
												</div>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Badge className={getSourceColor(booking.source)}>
											{booking.source.replace("_", ".")}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge className={getStatusColor(booking.status)}>
											{booking.status.replace("_", " ")}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onBookingClick(booking)}
										>
											<Eye className="size-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{bookings.length === 0 && (
						<div className="text-center py-8">
							<p className="text-muted-foreground">
								{t("bookingChannels.bookingsTable.noBookings")}
							</p>
							<Button
								onClick={onSync}
								variant="outline"
								className="mt-4"
								disabled={syncing}
							>
								{syncing ? (
									<>
										<RefreshCw className="size-4 mr-2 animate-spin" />
										{t("bookingChannels.header.syncing")}
									</>
								) : (
									<>
										<RefreshCw className="size-4 mr-2" />
										{t("bookingChannels.header.syncNow")}
									</>
								)}
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
