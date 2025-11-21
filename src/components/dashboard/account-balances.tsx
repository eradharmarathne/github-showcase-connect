import { DollarSign } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccountBalancesSkeleton } from "@/components/skeleton/account-balances-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";
import { getCurrencySymbol } from "@/utils/currency";

type Account = Tables<"accounts">;

interface AccountBalance {
  id: string;
  name: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  location_access: string[];
}

interface AccountBalancesProps {
  selectedLocation: string;
}

function AccountBalancesComponent({ selectedLocation }: AccountBalancesProps) {
  const [loading, setLoading] = useState(true);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const { tenant } = useAuth();
  const { t } = useTranslation();

  const fetchAccountBalances = useCallback(async () => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get locations for the tenant first to filter by tenant
      const { data: tenantLocations } = await supabase
        .from("locations")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

      const tenantLocationIds = tenantLocations?.map((loc) => loc.id) || [];

      if (tenantLocationIds.length === 0) {
        setAccountBalances([]);
        setLoading(false);
        return;
      }

      // Optimized single query to get all account balances at once
      // This replaces the N+1 query problem with efficient joins and aggregations
      const { data: balanceData, error } = await supabase.rpc(
        "get_account_balances",
        {
          p_tenant_id: tenant.id,
          p_location_ids: tenantLocationIds,
        },
      );

      if (error) {
        // If RPC doesn't exist, fall back to optimized SQL query
        logger.debug("RPC not found, using direct SQL query");

        const { data: directBalanceData, error: directError } = await supabase
          .from("accounts")
          .select(
            `
						id,
						name,
						currency,
						initial_balance,
						current_balance,
						location_access,
						account_income:income!account_id(amount),
						account_expenses:expenses!account_id(amount),
						incoming_transfers:account_transfers!to_account_id(amount, conversion_rate),
						outgoing_transfers:account_transfers!from_account_id(amount)
					`,
          )
          .eq("tenant_id", tenant.id);

        if (directError) {
          throw directError;
        }

        // Process the data to calculate balances
        const processedBalances = (directBalanceData || [])
          .filter((account) =>
            account.location_access.some((locationId) =>
              tenantLocationIds.includes(locationId),
            ),
          )
          .map((account) => {
            const totalIncome = (account.account_income || []).reduce(
              (sum: number, item: any) => sum + (item.amount || 0),
              0,
            );
            const totalExpenses = (account.account_expenses || []).reduce(
              (sum: number, item: any) => sum + (item.amount || 0),
              0,
            );
            const totalIncoming = (account.incoming_transfers || []).reduce(
              (sum: number, item: any) =>
                sum + (item.amount || 0) * (item.conversion_rate || 1),
              0,
            );
            const totalOutgoing = (account.outgoing_transfers || []).reduce(
              (sum: number, item: any) => sum + (item.amount || 0),
              0,
            );

            // Use current_balance from database instead of manual calculation
            // The database automatically calculates this with triggers
            const currentBalance = account.current_balance;

            return {
              id: account.id,
              name: account.name,
              currency: account.currency,
              initial_balance: account.initial_balance,
              current_balance: currentBalance,
              location_access: account.location_access,
            };
          });

        setAccountBalances(processedBalances);
      } else {
        // Filter accounts by location access if using RPC
        const filteredBalances = (balanceData || []).filter(
          (account: AccountBalance) =>
            account.location_access.some((locationId) =>
              tenantLocationIds.includes(locationId),
            ),
        );
        setAccountBalances(filteredBalances);
      }
    } catch (error) {
      logger.error("Error fetching account balances", error);
      setAccountBalances([]);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    fetchAccountBalances();
  }, [fetchAccountBalances]);

  if (loading) {
    return <AccountBalancesSkeleton />;
  }

  return (
    <Card className="bg-card border" data-testid="financial-cards">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="size-5 text-primary" />
          {t("dashboard.accountBalances.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 lg:space-y-4">
        {accountBalances.map((account, index) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">
                {account.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {account.currency} {t("dashboard.accountBalances.account")}
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="font-bold text-lg">
                {getCurrencySymbol(account.currency)}
                {account.current_balance.toLocaleString()}
              </p>
              <Badge variant="outline" className="mt-1">
                {account.currency}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export const AccountBalances = memo(AccountBalancesComponent);
