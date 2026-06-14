-- ============================================
-- 文件: 000-init.sql
-- 描述: 初始化数据库表结构 (PostgreSQL 版)
-- 表: users
-- 创建时间: 2025-01-15
-- 作者: Pony
-- ============================================

-- 创建 unixepoch 函数以保持与 SQLite 语法的向下兼容
CREATE OR REPLACE FUNCTION unixepoch() RETURNS integer AS $$
  SELECT extract(epoch from now())::integer;
$$ LANGUAGE SQL;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  inviter_code INTEGER DEFAULT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER DEFAULT NULL,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_inviter_code ON users (inviter_code);
