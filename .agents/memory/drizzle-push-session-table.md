---
name: Drizzle push vs session table
description: Why drizzle-kit push is unsafe here and how to apply DDL instead
---
Rule: never run interactive `drizzle-kit push` in this project; apply new DDL with direct SQL (e.g. a node script using @neondatabase/serverless running CREATE TABLE IF NOT EXISTS).

**Why:** `drizzle-kit push` prompts interactively (rename vs create) and offers to DROP the `session` table, which is auto-created by connect-pg-simple and not in the Drizzle schema. Accepting would log everyone out and destroy sessions.

**How to apply:** whenever new tables are added to `shared/schema.ts`, create them with explicit SQL instead of push; verify with a table list query afterward.
