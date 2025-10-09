interface CalendarLegendProps {
	className?: string;
}

export function CalendarLegend({ className }: CalendarLegendProps) {
	return (
		<div className={className}>
			<div className="space-y-2">
				{/* Reservation Status Legend */}
				<div>
					<div className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold mb-1">
						Direct Bookings:
					</div>
					<div className="flex flex-wrap gap-2 sm:gap-3 text-[9px] sm:text-[10px]">
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
							<span>Confirmed</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
							<span>Tentative</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-sky-500 rounded-sm" />
							<span>Pending</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-violet-500 rounded-sm" />
							<span>Checked In</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-slate-400 rounded-sm" />
							<span>Checked Out</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
							<span>Cancelled</span>
						</div>
					</div>
				</div>

				{/* Channel Bookings Legend */}
				<div>
					<div className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold mb-1">
						Channel Bookings:
					</div>
					<div className="flex flex-wrap gap-2 sm:gap-3 text-[9px] sm:text-[10px]">
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-blue-100 border-2 border-blue-400 rounded-sm" />
							<span>Booking.com</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-pink-100 border-2 border-pink-400 rounded-sm" />
							<span>Airbnb</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-yellow-100 border-2 border-yellow-400 rounded-sm" />
							<span>Expedia</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-purple-100 border-2 border-purple-400 rounded-sm" />
							<span>Beds24</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-teal-100 border-2 border-teal-400 rounded-sm" />
							<span>iCal</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2.5 h-2.5 bg-yellow-100 border-2 border-yellow-600 rounded-sm" />
							<span className="flex items-center gap-0.5">
								Unmapped
								<span className="text-[8px]">⚠️</span>
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
