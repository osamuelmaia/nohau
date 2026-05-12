-- Migration: Add WorkspaceMetaAccount table for multi-account support
-- Allows linking multiple Meta ad accounts (from different BMs) to a single workspace.

CREATE TABLE IF NOT EXISTS "WorkspaceMetaAccount" (
  "id"             TEXT         NOT NULL,
  "workspaceId"    TEXT         NOT NULL,
  "adAccountId"    TEXT         NOT NULL,
  "adAccountName"  TEXT,
  "metaToken"      TEXT         NOT NULL,
  "pageId"         TEXT,
  "label"          TEXT,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "WorkspaceMetaAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceMetaAccount_workspaceId_adAccountId_key" UNIQUE ("workspaceId", "adAccountId"),
  CONSTRAINT "WorkspaceMetaAccount_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
