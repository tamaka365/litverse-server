-- ============================================
-- 文件: 003-create-settings-table.sql
-- 描述: 创建系统全局配置表，用于存储动态配置项 (PostgreSQL 版)
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
