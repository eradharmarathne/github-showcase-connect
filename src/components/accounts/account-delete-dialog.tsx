import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	accountName: string;
	onConfirm: () => void;
}

export function AccountDeleteDialog({
	open,
	onOpenChange,
	accountName,
	onConfirm,
}: AccountDeleteDialogProps) {
	const { t } = useTranslation("common");

	const handleConfirm = () => {
		onConfirm();
		onOpenChange(false);
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
							<AlertTriangle className="h-5 w-5 text-destructive" />
						</div>
						<div>
							<AlertDialogTitle className="text-left">
								{t("accounts.deleteDialog.title")}
							</AlertDialogTitle>
						</div>
					</div>
				</AlertDialogHeader>
				<AlertDialogDescription className="text-left">
					{t("accounts.deleteDialog.description", { accountName })}
					<br />
					<br />
					<span className="font-medium text-destructive">
						{t("accounts.deleteDialog.warning")}
					</span>
				</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{t("accounts.deleteDialog.confirm")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
