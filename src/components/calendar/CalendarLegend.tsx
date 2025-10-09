interface CalendarLegendProps {
	className?: string;
}

export function CalendarLegend({ className }: CalendarLegendProps) {
	return (
		<div className={className}>
			<div className="flex flex-wrap gap-2 sm:gap-3 text-[9px] sm:text-[10px]">
				<div className="flex items-center gap-1">
					<div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
					<span>Confirmed</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></div>
					<span>Tentative</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-2.5 h-2.5 bg-sky-500 rounded-sm"></div>
					<span>Pending</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-2.5 h-2.5 bg-violet-500 rounded-sm"></div>
					<span>Checked In</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-2.5 h-2.5 bg-slate-400 rounded-sm"></div>
					<span>Checked Out</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></div>
					<span>Cancelled</span>
				</div>
			</div>
		</div>
	);
}
