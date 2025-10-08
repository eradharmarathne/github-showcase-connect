-- Fix trigger_update_account_balance to handle NULL account_id gracefully
-- This fixes the "Account not found: <NULL>" error when adding items to guest bill
-- with payment_method='pending' and account_id=NULL

CREATE OR REPLACE FUNCTION public.trigger_update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Handle account_transfers
  IF TG_TABLE_NAME = 'account_transfers' THEN
    IF TG_OP = 'INSERT' THEN
      -- Update both from and to accounts
      PERFORM update_account_balance(NEW.from_account_id);
      PERFORM update_account_balance(NEW.to_account_id);
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Update all affected accounts (old and new)
      PERFORM update_account_balance(OLD.from_account_id);
      PERFORM update_account_balance(OLD.to_account_id);
      IF NEW.from_account_id != OLD.from_account_id THEN
        PERFORM update_account_balance(NEW.from_account_id);
      END IF;
      IF NEW.to_account_id != OLD.to_account_id THEN
        PERFORM update_account_balance(NEW.to_account_id);
      END IF;
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      -- Update both accounts after deletion
      PERFORM update_account_balance(OLD.from_account_id);
      PERFORM update_account_balance(OLD.to_account_id);
      RETURN OLD;
    END IF;
  END IF;

  -- Handle income table
  IF TG_TABLE_NAME = 'income' THEN
    IF TG_OP = 'INSERT' THEN
      -- Only update account balance if account_id is not NULL
      -- This allows "add to bill" items (payment_method='pending', account_id=NULL)
      IF NEW.account_id IS NOT NULL THEN
        PERFORM update_account_balance(NEW.account_id);
      END IF;
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Only update account balance if account_id is not NULL
      IF OLD.account_id IS NOT NULL THEN
        PERFORM update_account_balance(OLD.account_id);
      END IF;
      IF NEW.account_id IS NOT NULL AND NEW.account_id != OLD.account_id THEN
        PERFORM update_account_balance(NEW.account_id);
      END IF;
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      -- Only update account balance if account_id is not NULL
      IF OLD.account_id IS NOT NULL THEN
        PERFORM update_account_balance(OLD.account_id);
      END IF;
      RETURN OLD;
    END IF;
  END IF;

  -- Handle expenses table (expenses always require an account)
  IF TG_TABLE_NAME = 'expenses' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM update_account_balance(NEW.account_id);
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      PERFORM update_account_balance(OLD.account_id);
      IF NEW.account_id != OLD.account_id THEN
        PERFORM update_account_balance(NEW.account_id);
      END IF;
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      PERFORM update_account_balance(OLD.account_id);
      RETURN OLD;
    END IF;
  END IF;

  RETURN NULL;
END;
$function$;
