import { Check, Send, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OTPVerificationProps {
	onVerified: () => void;
	phoneNumber?: string;
	locationId?: string; // Add locationId prop for admin notification
	triggerComponent: React.ReactNode;
}

export const OTPVerification = ({
	onVerified,
	phoneNumber,
	locationId,
	triggerComponent,
}: OTPVerificationProps) => {
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(false);
	const [otp, setOtp] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [otpSent, setOtpSent] = useState(false);

	const sendOTP = async () => {
		setIsSending(true);
		try {
			// Generate OTP code
			const otpCode = Math.floor(100000 + Math.random() * 900000);

			// Call Supabase Edge Function to send SMS
			const { data, error } = await supabase.functions.invoke(
				"send-sms-notification",
				{
					body: {
						phoneNumber,
						locationId, // Use the locationId prop
						message: `Your OTP for reservation editing is: ${otpCode}. This code expires in 5 minutes.`,
						type: "otp_verification",
					},
				},
			);

			if (error) throw error;

			setOtpSent(true);
			toast({
				title: "OTP Sent",
				description: `Verification code sent to ${phoneNumber}`,
			});
		} catch (error: any) {
			console.error("Error sending OTP:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to send OTP. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSending(false);
		}
	};

	const verifyOTP = async () => {
		if (!otp || otp.length !== 6) {
			toast({
				title: "Invalid OTP",
				description: "Please enter a valid 6-digit OTP",
				variant: "destructive",
			});
			return;
		}

		setIsVerifying(true);
		try {
			// TODO: Implement actual OTP verification with SMS service
			// For now, accepting any valid 6-digit code
			if (otp.length === 6) {
				onVerified();
				setIsOpen(false);
				setOtp("");
				setOtpSent(false);
				toast({
					title: "Verified",
					description:
						"OTP verified successfully. You can now edit the reservation.",
				});
			} else {
				throw new Error("Invalid OTP");
			}
		} catch (error: any) {
			toast({
				title: "Verification Failed",
				description: "Invalid OTP. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsVerifying(false);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		setOtp("");
		setOtpSent(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild onClick={() => setIsOpen(true)}>
				{triggerComponent}
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Shield className="size-5" />
						OTP Verification Required
					</DialogTitle>
					<DialogDescription>
						Verify your identity to edit this reservation
					</DialogDescription>
				</DialogHeader>
				<Card>
					<CardContent className="pt-6 space-y-4">
						<div className="text-center text-xs sm:text-sm text-muted-foreground">
							To edit this reservation, we need to verify your identity.
							<br />
							An OTP will be sent to:{" "}
							<span className="font-medium">{phoneNumber}</span>
						</div>

						{!otpSent ? (
							<Button onClick={sendOTP} disabled={isSending} className="w-full">
								{isSending ? (
									"Sending..."
								) : (
									<>
										<Send className="size-4 mr-2" />
										Send OTP
									</>
								)}
							</Button>
						) : (
							<div className="space-y-4">
								<div className="text-center text-xs sm:text-sm text-emerald-600">
									<Check className="size-4 inline mr-1" />
									OTP sent successfully!
								</div>

								<div className="space-y-2">
									<label className="text-xs sm:text-sm font-medium">
										Enter 6-digit OTP
									</label>
									<Input
										type="text"
										placeholder="000000"
										value={otp}
										onChange={(e) =>
											setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
										}
										maxLength={6}
										className="text-center text-base sm:text-lg tracking-widest"
									/>
								</div>

								<div className="flex gap-2">
									<Button
										variant="outline"
										onClick={() => setOtpSent(false)}
										className="flex-1"
									>
										Resend OTP
									</Button>
									<Button
										onClick={verifyOTP}
										disabled={isVerifying || otp.length !== 6}
										className="flex-1"
									>
										{isVerifying ? "Verifying..." : "Verify"}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</DialogContent>
		</Dialog>
	);
};
