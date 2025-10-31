-- Add slug field to tenants table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'slug') THEN
    ALTER TABLE tenants ADD COLUMN slug TEXT;
    
    -- Create unique index
    CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug);
    
    -- Generate slugs from existing names (lowercase, replace spaces with hyphens)
    UPDATE tenants 
    SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
    WHERE slug IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE tenants ALTER COLUMN slug SET NOT NULL;
  END IF;
END $$;

-- Add slug field to locations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'locations' AND column_name = 'slug') THEN
    ALTER TABLE locations ADD COLUMN slug TEXT;
    
    -- Create unique index per tenant
    CREATE UNIQUE INDEX idx_locations_slug_tenant ON locations(tenant_id, slug);
    
    -- Generate slugs from existing names (lowercase, replace spaces with hyphens)
    UPDATE locations 
    SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
    WHERE slug IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE locations ALTER COLUMN slug SET NOT NULL;
  END IF;
END $$;
