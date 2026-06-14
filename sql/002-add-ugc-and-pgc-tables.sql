-- ============================================
-- 文件: 002-add-ugc-and-pgc-tables.sql
-- 描述: 添加用户额外字段、创建 PGC 画廊表、UGC 题库与海报表、点击统计表 (PostgreSQL 版)
-- 创建时间: 2026-06-14
-- 作者: Antigravity
-- ============================================

-- 1. 修改 users 表，添加额外字段
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS openid TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_openid ON users (openid);

-- 2. PGC 环幕画廊作品表
CREATE TABLE IF NOT EXISTS pgc_artworks (
  id SERIAL PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('image', 'video', 'audio')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  media_url TEXT NOT NULL,
  aspect_ratio REAL DEFAULT 1.0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER DEFAULT NULL,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pgc_artworks_type ON pgc_artworks (type);

-- 3. UGC 互动测试题库配置表
CREATE TABLE IF NOT EXISTS ugc_questions (
  id INTEGER PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL, -- 存储 JSONB 格式的选项
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 4. UGC 测试海报生成记录表
CREATE TABLE IF NOT EXISTS ugc_posters (
  poster_id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER DEFAULT NULL,
  answers JSONB NOT NULL, -- 存储 JSONB 格式的权重数组
  result_type INTEGER NOT NULL,
  result_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'banned')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ugc_posters_user_id ON ugc_posters (user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_posters_status ON ugc_posters (status);

-- 5. 点击跳转事件统计表
CREATE TABLE IF NOT EXISTS stats_tracks (
  id SERIAL PRIMARY KEY NOT NULL,
  event TEXT NOT NULL,
  platform TEXT NOT NULL,
  source TEXT NOT NULL,
  user_id INTEGER DEFAULT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stats_tracks_event ON stats_tracks (event);
CREATE INDEX IF NOT EXISTS idx_stats_tracks_created_at ON stats_tracks (created_at);
