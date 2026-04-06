-- Migration: rename Settings → Workspace, add name + createdAt columns
-- Safe/idempotent: uses DO $$ blocks to skip if already applied

-- Step 1: Rename Settings to Workspace (skip if already renamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Settings'
  ) THEN
    ALTER TABLE "Settings" RENAME TO "Workspace";
  END IF;
END $$;

-- Step 2: Add "name" column if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Workspace' AND column_name = 'name'
  ) THEN
    ALTER TABLE "Workspace" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Dashboard Principal';
  END IF;
END $$;

-- Step 3: Add "createdAt" column if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Workspace' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "Workspace" ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Step 4: Seed name for the existing default row
UPDATE "Workspace" SET "name" = 'Dashboard Principal'
WHERE "id" = 'default' AND ("name" = '' OR "name" = 'Dashboard Principal');
