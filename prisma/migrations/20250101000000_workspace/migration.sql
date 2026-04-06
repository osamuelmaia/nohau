-- Rename Settings to Workspace
ALTER TABLE "Settings" RENAME TO "Workspace";

-- Add new columns with defaults (SQLite compatible)
ALTER TABLE "Workspace" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Dashboard Principal';
ALTER TABLE "Workspace" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update the existing default row
UPDATE "Workspace" SET "name" = 'Dashboard Principal' WHERE "id" = 'default';
