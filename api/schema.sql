-- Copyright (C) 2026 stremio-linux fork. GPL-2.0.
-- Portable schema: runs on SQLite and MySQL (no backticks, no AUTOINCREMENT).
CREATE TABLE IF NOT EXISTS branding (
    id INTEGER PRIMARY KEY,
    site_name TEXT NOT NULL DEFAULT 'LinuxStream',
    tagline TEXT NOT NULL DEFAULT 'Freedom to Stream',
    logo_url TEXT NOT NULL DEFAULT '/brand/logo.svg',
    favicon_url TEXT NOT NULL DEFAULT '/favicons/favicon.ico',
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
CREATE TABLE IF NOT EXISTS availability (
    meta_key TEXT PRIMARY KEY,
    available INTEGER NOT NULL DEFAULT 0,
    streams INTEGER NOT NULL DEFAULT 0,
    checked_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS blocked_patterns (
    id INTEGER PRIMARY KEY,
    pattern TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    disabled INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    consumed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS library_items (
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    meta_id TEXT NOT NULL,
    added_at TEXT NOT NULL,
    PRIMARY KEY (user_id, type, meta_id)
);
CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    meta_id TEXT NOT NULL,
    season INTEGER,
    episode INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, type, meta_id)
);
CREATE TABLE IF NOT EXISTS newsletter_emails (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL DEFAULT 'popup',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ads_settings (
    id INTEGER PRIMARY KEY,
    master_enabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tmdb_trending_cache (
    id INTEGER PRIMARY KEY,
    media_type TEXT NOT NULL DEFAULT 'movie',
    tmdb_id INTEGER NOT NULL,
    imdb_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    release_date TEXT NOT NULL DEFAULT '',
    poster_path TEXT NOT NULL DEFAULT '',
    backdrop_path TEXT NOT NULL DEFAULT '',
    popularity REAL NOT NULL DEFAULT 0,
    vote_average REAL NOT NULL DEFAULT 0,
    trending_window TEXT NOT NULL DEFAULT 'day',
    updated_at TEXT NOT NULL DEFAULT '',
    UNIQUE(media_type, tmdb_id, trending_window)
);
CREATE TABLE IF NOT EXISTS sitemaps_cache (
    sitemap_id TEXT PRIMARY KEY,
    xml_content TEXT NOT NULL,
    url_count INTEGER NOT NULL DEFAULT 0,
    source_stats TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT ''
);

