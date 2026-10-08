-- Copyright (C) 2026 stremio-linux fork. GPL-2.0.
-- Portable schema: runs on SQLite and MySQL (no backticks, no AUTOINCREMENT).
CREATE TABLE IF NOT EXISTS branding (
    id INTEGER PRIMARY KEY,
    site_name TEXT NOT NULL DEFAULT 'LinuxStream',
    tagline TEXT NOT NULL DEFAULT 'Freedom to Stream',
    logo_url TEXT NOT NULL DEFAULT '/brand/logo.svg',
    favicon_url TEXT NOT NULL DEFAULT '/brand/favicon.svg',
    theme TEXT NOT NULL DEFAULT 'gnome-dark',
    accent TEXT NOT NULL DEFAULT '#E95420',
    updated_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS adslots (
    slot_key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    code TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS addons (
    id INTEGER PRIMARY KEY,
    manifest_url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0
);
