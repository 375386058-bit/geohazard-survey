-- 地质灾害调查表 - Supabase 数据库建表 SQL
-- 在 Supabase SQL Editor 中执行此脚本

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 允许公开读取（anon key 可访问）
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人读取" ON sites
  FOR SELECT USING (true);

CREATE POLICY "允许所有人插入" ON sites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许所有人更新" ON sites
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "允许所有人删除" ON sites
  FOR DELETE USING (true);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sites_updated_at ON sites (updated_at DESC);
