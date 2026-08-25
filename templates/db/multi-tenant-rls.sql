-- PostgreSQL Row-Level Security (RLS) Multi-Tenant Reference Architecture
-- Ensures strict data isolation between tenants at the database engine level.

-- 1. Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Organizations / Tenants Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(32) DEFAULT 'free' NOT NULL,
    stripe_customer_id VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'member' NOT NULL, -- 'owner', 'admin', 'member'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(organization_id, email)
);

-- 4. Tenant-Scoped Resource Table (Example: Projects)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index organization_id for fast queries & foreign key index scans
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);

-- 5. Enable Row-Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 6. Helper Function: Get Current Tenant ID from Session Variable
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7. Define RLS Policies for Projects
CREATE POLICY tenant_isolation_projects_select ON projects
    FOR SELECT
    USING (organization_id = current_tenant_id());

CREATE POLICY tenant_isolation_projects_insert ON projects
    FOR INSERT
    WITH CHECK (organization_id = current_tenant_id());

CREATE POLICY tenant_isolation_projects_update ON projects
    FOR UPDATE
    USING (organization_id = current_tenant_id())
    WITH CHECK (organization_id = current_tenant_id());

CREATE POLICY tenant_isolation_projects_delete ON projects
    FOR DELETE
    USING (organization_id = current_tenant_id());

-- 8. Application Usage Pattern (Executed per connection/request):
-- SET LOCAL app.current_tenant_id = 'your-tenant-uuid-here';
-- SELECT * FROM projects; -- Only returns projects belonging to this tenant!
