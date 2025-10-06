import { PenTool, RotateCcw, Save } from "lucide-react";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

interface SignatureCaptureProps {
	signature: string;
	onSignatureChange: (signature: string) => void;
	title?: string;
}

export const SignatureCapture = ({
	signature,
	onSignatureChange,
	title = "Guest Signature",
}: SignatureCaptureProps) => {
	const signaturePadRef = useRef<SignatureCanvas>(null);
	const [isOpen, setIsOpen] = useState(false);

	const clearSignature = () => {
		signaturePadRef.current?.clear();
	};

	const saveSignature = () => {
		if (signaturePadRef.current) {
			const signatureData = signaturePadRef.current.toDataURL();
			onSignatureChange(signatureData);
			setIsOpen(false);
		}
	};

	const removeSignature = () => {
		onSignatureChange("");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base md:text-lg lg:text-xl">
					<PenTool className="size-5" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{!signature ? (
					<div className="text-center py-8">
						<Dialog open={isOpen} onOpenChange={setIsOpen}>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PenTool className="size-4 mr-2" />
									Add Signature
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-2xl">
								<DialogHeader>
									<DialogTitle>Capture Signature</DialogTitle>
								</DialogHeader>
								<div className="space-y-4">
									<div className="border-2 border-dashed border-gray-300 rounded-lg">
										<SignatureCanvas
											ref={signaturePadRef}
											canvasProps={{
												width: 600,
												height: 200,
												className: "signature-canvas w-full",
											}}
											backgroundColor="rgb(255, 255, 255)"
										/>
									</div>
									<div className="flex gap-2 justify-end">
										<Button
											type="button"
											variant="outline"
											onClick={clearSignature}
										>
											<RotateCcw className="size-4 mr-2" />
											Clear
										</Button>
										<Button onClick={saveSignature}>
											<Save className="size-4 mr-2" />
											Save Signature
										</Button>
									</div>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				) : (
					<div className="space-y-4">
						<div className="border rounded-lg p-4 bg-background">
							<img
								src={signature}
								alt="Guest Signature"
								className="max-w-full h-auto max-h-32"
							/>
						</div>
						<div className="flex gap-2">
							<Dialog open={isOpen} onOpenChange={setIsOpen}>
								<DialogTrigger asChild>
									<Button variant="outline" size="sm">
										<PenTool className="size-4 mr-2" />
										Edit
									</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-2xl">
									<DialogHeader>
										<DialogTitle>Edit Signature</DialogTitle>
									</DialogHeader>
									<div className="space-y-4">
										<div className="border-2 border-dashed border-gray-300 rounded-lg">
											<SignatureCanvas
												ref={signaturePadRef}
												canvasProps={{
													width: 600,
													height: 200,
													className: "signature-canvas w-full",
												}}
												backgroundColor="rgb(255, 255, 255)"
											/>
										</div>
										<div className="flex gap-2 justify-end">
											<Button
												type="button"
												variant="outline"
												onClick={clearSignature}
											>
												<RotateCcw className="size-4 mr-2" />
												Clear
											</Button>
											<Button onClick={saveSignature}>
												<Save className="size-4 mr-2" />
												Save Signature
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
							<Button variant="destructive" size="sm" onClick={removeSignature}>
								Remove
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
