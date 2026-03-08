import { Check, Send, Shield } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
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
						message: `${otpCode}`,
						type: "otp_verification",
					},
				},
			);

			if (error) throw error;

			setOtpSent(true);
			toast({
				title: t("otp.toast.sent.title"),
				description: t("otp.toast.sent.description", { phoneNumber }),
			});
		} catch (error: any) {
			console.error("Error sending OTP:", error);
			toast({
				title: t("common.error"),
				description: error.message || t("otp.toast.sendFailed"),
				variant: "destructive",
			});
		} finally {
			setIsSending(false);
		}
	};

	const verifyOTP = async () => {
		if (!otp || otp.length !== 6) {
			toast({
				title: t("otp.toast.invalid.title"),
				description: t("otp.toast.invalid.description"),
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
					title: t("otp.toast.verified.title"),
					description: t("otp.toast.verified.description"),
				});
			} else {
				throw new Error("Invalid OTP");
			}
		} catch (error: any) {
			toast({
				title: t("otp.toast.verificationFailed.title"),
				description: t("otp.toast.verificationFailed.description"),
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
						{t("otp.title")}
					</DialogTitle>
					<DialogDescription>{t("otp.description")}</DialogDescription>
				</DialogHeader>
				<Card>
					<CardContent className="pt-6 space-y-4">
						<div className="text-center text-xs sm:text-sm text-muted-foreground">
							{t("otp.info.edit")}
							<br />
							{t("otp.info.sentTo")}{" "}
							<span className="font-medium">{phoneNumber}</span>
						</div>

						{!otpSent ? (
							<Button onClick={sendOTP} disabled={isSending} className="w-full">
								{isSending ? (
									t("otp.sending")
								) : (
									<>
										<Send className="size-4 mr-2" />
										{t("otp.send")}
									</>
								)}
							</Button>
						) : (
							<div className="space-y-4">
								<div className="text-center text-xs sm:text-sm text-emerald-600">
									<Check className="size-4 inline mr-1" />
									{t("otp.sentSuccess")}
								</div>

								<div className="space-y-2">
									<label className="text-xs sm:text-sm font-medium">
										{t("otp.enter")}
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
										{t("otp.resend")}
									</Button>
									<Button
										onClick={verifyOTP}
										disabled={isVerifying || otp.length !== 6}
										className="flex-1"
									>
										{isVerifying ? t("otp.verifying") : t("otp.verify")}
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
