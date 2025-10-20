-- Migration: Fix RLS policies for beds24_property_mappings table
-- Date: 2025-10-20
-- Description: Replace problematic RLS policies with proper granular policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "tenant_isolation_policy" ON beds24_property_mappings;
DROP POLICY IF EXISTS "Authenticated can read beds24_property_mappings" ON beds24_property_mappings;
DROP POLICY IF EXISTS "Authenticated can write beds24_property_mappings" ON beds24_property_mappings;

-- Create proper RLS policies for beds24_property_mappings
-- Policy for SELECT: Users can only see their tenant's mappings
CREATE POLICY "Users can view own tenant beds24_property_mappings"
  ON beds24_property_mappings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy for INSERT: Users can only insert for their own tenant
CREATE POLICY "Users can insert own tenant beds24_property_mappings"
  ON beds24_property_mappings
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy for UPDATE: Users can only update their tenant's mappings
CREATE POLICY "Users can update own tenant beds24_property_mappings"
  ON beds24_property_mappings
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy for DELETE: Users can only delete their tenant's mappings
CREATE POLICY "Users can delete own tenant beds24_property_mappings"
  ON beds24_property_mappings
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Verify RLS is enabled
ALTER TABLE beds24_property_mappings ENABLE ROW LEVEL SECURITY;
