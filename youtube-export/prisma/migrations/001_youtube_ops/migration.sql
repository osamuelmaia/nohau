-- Migration: YouTube Ops tables

CREATE TABLE IF NOT EXISTS "YoutubeJob" (
  "id"         TEXT         NOT NULL,
  "transcript" TEXT         NOT NULL,
  "profile"    TEXT         NOT NULL,
  "result"     TEXT         NOT NULL,
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "YoutubeJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Settings" (
  "id"            TEXT         NOT NULL DEFAULT 'default',
  "openaiKey"     TEXT,
  "youtubePrompt" TEXT,
  "updatedAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- Seed default settings row
INSERT INTO "Settings" ("id", "updatedAt")
VALUES ('default', NOW())
ON CONFLICT ("id") DO NOTHING;
