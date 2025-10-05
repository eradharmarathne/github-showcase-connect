import { CheckCircle2, Loader2, Phone, Shield } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

interface PhoneVerificationProps {
	phone?: string | null;
	isVerified?: boolean;
	onVerificationSuccess?: () => void;
	showAsCard?: boolean; // New prop to control Card wrapper
}

export function PhoneVerification({
	phone,
	isVerified = false,
	onVerificationSuccess,
	showAsCard = true,
}: PhoneVerificationProps) {
	const [phoneNumber, setPhoneNumber] = useState(phone || "");
	const [otpCode, setOtpCode] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [otpSent, setOtpSent] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const { toast } = useToast();
	const { profile } = useProfile();

	const formatPhoneNumber = (phone: string) => {
		// Remove all non-digits
		const cleaned = phone.replace(/\D/g, "");

		// If starts with 94, it's already in international format
		if (cleaned.startsWith("94")) {
			return `+${cleaned}`;
		}

		// If starts with 0, replace with +94
		if (cleaned.startsWith("0")) {
			return `+94${cleaned.substring(1)}`;
		}

		// If 9 digits, assume it's Sri Lankan without leading 0
		if (cleaned.length === 9) {
			return `+94${cleaned}`;
		}

		return `+${cleaned}`;
	};

	const validatePhoneNumber = (phone: string) => {
		const cleaned = phone.replace(/\D/g, "");
		// Sri Lankan mobile numbers: +94XXXXXXXXX (10 digits after +94)
		return cleaned.length >= 10 && cleaned.length <= 15;
	};

	const sendOTP = async () => {
		if (!phoneNumber.trim()) {
			toast({
				variant: "destructive",
				title: "Phone number required",
				description: "Please enter your phone number to receive OTP",
			});
			return;
		}

		if (!validatePhoneNumber(phoneNumber)) {
			toast({
				variant: "destructive",
				title: "Invalid phone number",
				description: "Please enter a valid phone number",
			});
			return;
		}

		setIsLoading(true);

		try {
			const formattedPhone = formatPhoneNumber(phoneNumber);

			const { data, error } = await supabase.functions.invoke(
				"send-phone-otp",
				{
					body: { phoneNumber: formattedPhone },
				},
			);

			if (error) {
				throw error;
			}

			if (data.success) {
				setOtpSent(true);
				setPhoneNumber(formattedPhone);
				toast({
					title: "OTP sent successfully",
					description: `Verification code sent to ${formattedPhone}`,
				});
			} else {
				throw new Error(data.error || "Failed to send OTP");
			}
		} catch (error: any) {
			toast({
				variant: "destructive",
				title: "Failed to send OTP",
				description: error.message || "Please try again",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const verifyOTP = async () => {
		if (!otpCode.trim()) {
			toast({
				variant: "destructive",
				title: "OTP required",
				description: "Please enter the verification code",
			});
			return;
		}

		if (otpCode.length !== 6) {
			toast({
				variant: "destructive",
				title: "Invalid OTP",
				description: "Verification code must be 6 digits",
			});
			return;
		}

		setIsVerifying(true);

		try {
			const { data, error } = await supabase.functions.invoke(
				"verify-phone-otp",
				{
					body: {
						phoneNumber: phoneNumber,
						code: otpCode,
					},
				},
			);

			if (error) {
				throw error;
			}

			if (data.success) {
				toast({
					title: "Phone verified successfully",
					description: "Your phone number has been verified",
				});
				setOtpSent(false);
				setOtpCode("");
				onVerificationSuccess?.();
			} else {
				throw new Error(data.error || "Invalid verification code");
			}
		} catch (error: any) {
			toast({
				variant: "destructive",
				title: "Verification failed",
				description: error.message || "Please check the code and try again",
			});
		} finally {
			setIsVerifying(false);
		}
	};

	const resetVerification = () => {
		setOtpSent(false);
		setOtpCode("");
		setPhoneNumber(phone || "");
	};

	const verifiedContent = (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<Label>Phone Number</Label>
					<p className="text-sm text-muted-foreground mt-1">{phone}</p>
				</div>
				<Badge
					variant="default"
					className="bg-green-100 text-green-800 border-green-200"
				>
					<Shield className="h-3 w-3 mr-1" />
					Verified
				</Badge>
			</div>
			<p className="text-xs text-muted-foreground">
				Your phone number has been verified and can be used for SMS
				notifications.
			</p>
		</div>
	);

	const verificationContent = (
		<div className="space-y-4">
			{!otpSent ? (
				<div className="space-y-4">
					<div>
						<Label htmlFor="phone">Phone Number</Label>
						<Input
							id="phone"
							type="tel"
							placeholder="+94XXXXXXXXX"
							value={phoneNumber}
							onChange={(e) => setPhoneNumber(e.target.value)}
							disabled={isLoading}
						/>
						<p className="text-xs text-muted-foreground mt-1">
							Enter your phone number to receive SMS notifications
						</p>
					</div>
					<Button
						onClick={sendOTP}
						disabled={isLoading || !phoneNumber.trim()}
						className="w-full"
					>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Send Verification Code
					</Button>
				</div>
			) : (
				<div className="space-y-4">
					<div>
						<Label>Phone Number</Label>
						<p className="text-sm text-muted-foreground">{phoneNumber}</p>
					</div>

					<div>
						<Label htmlFor="otp">Verification Code</Label>
						<Input
							id="otp"
							type="text"
							placeholder="Enter 6-digit code"
							value={otpCode}
							onChange={(e) =>
								setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
							}
							disabled={isVerifying}
							maxLength={6}
						/>
						<p className="text-xs text-muted-foreground mt-1">
							Enter the 6-digit code sent to your phone
						</p>
					</div>

					<div className="flex gap-2">
						<Button
							onClick={verifyOTP}
							disabled={isVerifying || otpCode.length !== 6}
							className="flex-1"
						>
							{isVerifying && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Verify Code
						</Button>
						<Button
							variant="outline"
							onClick={resetVerification}
							disabled={isVerifying}
						>
							Change Number
						</Button>
					</div>

					<Button
						variant="ghost"
						onClick={sendOTP}
						disabled={isLoading}
						className="w-full text-sm"
					>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Resend Code
					</Button>
				</div>
			)}
		</div>
	);

	if (!showAsCard) {
		// Return content without Card wrapper for dialog usage
		return isVerified ? verifiedContent : verificationContent;
	}

	// Return with Card wrapper for standalone usage
	if (isVerified) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircle2 className="h-5 w-5 text-green-600" />
						Phone Verification
					</CardTitle>
				</CardHeader>
				<CardContent>
					{verifiedContent}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Phone className="h-5 w-5" />
					Phone Verification
				</CardTitle>
			</CardHeader>
			<CardContent>
				{verificationContent}
			</CardContent>
		</Card>
	);
}
