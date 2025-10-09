import { Copy, Eye, EyeOff } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserCredentialsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	email: string;
	password: string;
	loginUrl: string;
	isResend?: boolean;
}

export const UserCredentialsDialog: React.FC<UserCredentialsDialogProps> = ({
	isOpen,
	onClose,
	email,
	password,
	loginUrl,
	isResend = false,
}) => {
	const [showPassword, setShowPassword] = React.useState(false);

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text);
		toast.success(`${label} copied to clipboard`);
	};

	const copyAllCredentials = () => {
		const credentials = `Email: ${email}\nPassword: ${password}\nLogin URL: ${loginUrl}`;
		navigator.clipboard.writeText(credentials);
		toast.success("All credentials copied to clipboard");
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isResend ? "New User Credentials" : "User Created Successfully"}
					</DialogTitle>
					<DialogDescription>
						{isResend
							? "A new temporary password has been generated for this user."
							: "The user has been created. Please share these credentials with them."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Email</Label>
						<div className="flex gap-2">
							<Input value={email} readOnly className="bg-muted" />
							<Button
								variant="outline"
								size="sm"
								onClick={() => copyToClipboard(email, "Email")}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Temporary Password</Label>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Input
									type={showPassword ? "text" : "password"}
									value={password}
									readOnly
									className="bg-muted pr-10"
								/>
								<Button
									variant="ghost"
									size="sm"
									className="absolute right-0 top-0 h-full px-3"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</Button>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => copyToClipboard(password, "Password")}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Login URL</Label>
						<div className="flex gap-2">
							<Input value={loginUrl} readOnly className="bg-muted" />
							<Button
								variant="outline"
								size="sm"
								onClick={() => copyToClipboard(loginUrl, "Login URL")}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div className="flex gap-2 pt-4">
						<Button onClick={copyAllCredentials} className="flex-1">
							Copy All Credentials
						</Button>
						<Button variant="outline" onClick={onClose} className="flex-1">
							Close
						</Button>
					</div>

					<div className="text-sm text-muted-foreground">
						<strong>Important:</strong> The user should change this temporary
						password after their first login.
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
