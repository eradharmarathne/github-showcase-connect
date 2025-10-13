-- Migration: Fix subscription_status column type
-- Description: Change tenants.subscription_status from TEXT to subscription_status enum type
-- Date: 2025-10-13
-- Fixes: Error "new row for relation \"tenants\" violates check constraint \"tenants_subscription_status_check\""

-- The column was mistakenly created as TEXT type instead of using the subscription_status enum
-- This migration corrects the column type to use the proper enum type

DO $$
BEGIN
    -- Check if column is already the correct type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tenants'
        AND column_name = 'subscription_status'
        AND udt_name = 'text'
    ) THEN
        RAISE NOTICE '🔧 Converting subscription_status column from TEXT to enum type...';
        
        -- Step 1: Drop the default value (can't be cast automatically)
        ALTER TABLE tenants ALTER COLUMN subscription_status DROP DEFAULT;
        
        -- Step 2: Convert column type using CAST
        ALTER TABLE tenants 
        ALTER COLUMN subscription_status TYPE subscription_status 
        USING subscription_status::subscription_status;
        
        -- Step 3: Re-add default value with proper enum cast
        ALTER TABLE tenants 
        ALTER COLUMN subscription_status SET DEFAULT 'trial'::subscription_status;
        
        RAISE NOTICE '✅ subscription_status column type fixed successfully';
    ELSE
        RAISE NOTICE 'ℹ️ subscription_status column already has correct type (subscription_status enum)';
    END IF;
    
    -- Verify the change
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tenants'
        AND column_name = 'subscription_status'
        AND udt_name = 'subscription_status'
    ) THEN
        RAISE NOTICE '✅ Verification passed: column type is subscription_status enum';
    ELSE
        RAISE EXCEPTION '❌ Verification failed: column type is not subscription_status enum';
    END IF;
END$$;
