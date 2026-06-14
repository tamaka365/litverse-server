-- ============================================
-- 文件: 001-create-posts-table.sql
-- 描述: 创建文章表及索引 (PostgreSQL 版)
-- 表: posts
-- 创建时间: 2025-01-15
-- 作者: Pony
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER DEFAULT NULL,
  deleted_at INTEGER DEFAULT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 用户文章索引（查询某个用户的所有文章）
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);

-- 状态索引（查询特定状态的文章）
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status);

-- 发布时间索引（按发布时间排序）
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts (published_at);

-- 复合索引：用户+状态（查询某用户特定状态的文章）
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON posts (user_id, status);

-- 复合索引：状态+发布时间（查询已发布文章并按时间排序）
CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts (status, published_at);
