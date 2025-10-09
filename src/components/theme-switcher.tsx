import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/context/ThemeContext";

type Props = {
	trigger?: ReactNode;
	defaultOpen?: boolean;
	align?: "start" | "center" | "end";
};

const ThemeSwitcher = ({ trigger, defaultOpen, align = "end" }: Props) => {
	const { setTheme, theme } = useTheme();

	const defaultTrigger = (
		<Button variant="ghost" size="icon">
			<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);

	return (
		<DropdownMenu defaultOpen={defaultOpen}>
			<DropdownMenuTrigger asChild>
				{trigger || defaultTrigger}
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align}>
				<DropdownMenuItem
					onClick={() => setTheme("light")}
					className={`cursor-pointer ${theme === "light" ? "bg-accent" : ""}`}
				>
					<Sun className="mr-2 h-4 w-4" />
					<span>Light</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark")}
					className={`cursor-pointer ${theme === "dark" ? "bg-accent" : ""}`}
				>
					<Moon className="mr-2 h-4 w-4" />
					<span>Dark</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("system")}
					className={`cursor-pointer ${theme === "system" ? "bg-accent" : ""}`}
				>
					<Monitor className="mr-2 h-4 w-4" />
					<span>System</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ThemeSwitcher;
