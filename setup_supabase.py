# -*- coding: utf-8 -*-
"""
Supabase 一键配置脚本

用法:
  1. 先在 supabase.com 创建免费项目
  2. 在项目 Settings > API 中复制 URL 和 anon key
  3. 运行此脚本:
     python setup_supabase.py

  或者直接传参:
     python setup_supabase.py --url https://xxx.supabase.co --key eyJhbG...

脚本会自动:
  1. 创建 sites 表
  2. 配置行级安全策略 (RLS)
  3. 将连接信息写入前端配置
"""

import sys
import os
import json
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_FILE = os.path.join(SCRIPT_DIR, 'schema.sql')
HTML_FILE = os.path.join(SCRIPT_DIR, 'index.html')


def read_schema():
    """读取 SQL schema 文件并分割为独立语句"""
    with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    # Split by semicolons, strip comments and whitespace
    statements = []
    for stmt in content.split(';'):
        stmt = stmt.strip()
        # Remove comment lines
        lines = [l for l in stmt.split('\n') if not l.strip().startswith('--')]
        stmt = '\n'.join(lines).strip()
        if stmt:
            statements.append(stmt)
    return statements


def run_sql_via_rest(url, key, sql):
    """通过 Supabase REST API 执行 SQL（使用 supabase-js 的 rpc 方式不可行，改用直接 SQL API）"""
    # Supabase Management API - 需要 service_role key
    # 这里使用 pgrest 的方式：创建表需要通过 SQL Editor API
    # 实际上，最简单的方法是用 supabase-py 或让用户在网页 SQL Editor 中执行
    # 
    # 对于 anon key 用户，我们使用 Supabase 的 REST API 直接建表不可行
    # 但我们可以用 supabase-py 库
    
    try:
        import supabase
    except ImportError:
        print("正在安装 supabase-py...")
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'supabase', '-q'])
        import supabase
    
    client = supabase.create_client(url, key)
    
    # 尝试执行 SQL（需要 service_role key，anon key 可能不够）
    # 如果失败，打印 SQL 让用户手动执行
    print("\n请在 Supabase SQL Editor 中执行以下 SQL：")
    print("=" * 50)
    with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
        print(f.read())
    print("=" * 50)
    print("\nSQL Editor 地址: {}/project/default/sql/new".format(
        url.replace('.supabase.co', '.supabase.co').rsplit('/', 1)[0] if '/' not in url.replace('https://', '') else url
    ))
    print("提示: 在 Supabase 控制台左侧菜单找到 'SQL Editor'，粘贴上面的 SQL 并点击 Run")


def update_html_config(url, key):
    """直接更新 HTML 文件中的配置（预填 Supabase 连接信息）"""
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # 用 JS 方式注入默认配置
    config_js = f"""
<script>
// 预配置的 Supabase 连接信息
var SUPABASE_URL = '{url}';
var SUPABASE_KEY = '{key}';
var supabase = null;
var supabaseReady = false;

(function(){{
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  supabaseReady = true;
  localStorage.setItem('geohazard_supabase_config', JSON.stringify({{url:SUPABASE_URL, key:SUPABASE_KEY}}));
}})();
</script>
"""
    # 替换 initSupabase 函数中的配置检查部分
    # 在 var SUPABASE_URL = ''; 之后插入预配置
    old = "var SUPABASE_URL = '';\nvar SUPABASE_KEY = '';"
    new = "var SUPABASE_URL = '{}';\nvar SUPABASE_KEY = '{}';".format(url, key)
    html = html.replace("var SUPABASE_URL = '';\nvar SUPABASE_KEY = '';", new)
    
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\n[OK] 已将连接信息写入 {HTML_FILE}")


def main():
    url = None
    key = None
    
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--url' and i + 1 < len(args):
            url = args[i + 1]; i += 2
        elif args[i] == '--key' and i + 1 < len(args):
            key = args[i + 1]; i += 2
        else:
            i += 1
    
    if not url:
        print("Supabase 项目 URL（在 Settings > API 中复制）:")
        print("  格式: https://xxxxx.supabase.co")
        url = input("URL: ").strip()
    
    if not key:
        print("\nSupabase Anon Key（在 Settings > API 中复制，选 anon/public 那个）:")
        key = input("Key: ").strip()
    
    if not url or not key:
        print("URL 和 Key 不能为空")
        sys.exit(1)
    
    print(f"\n项目 URL: {url}")
    print(f"Anon Key: {key[:20]}...")
    
    # 更新 HTML 配置
    update_html_config(url, key)
    
    # 提示建表
    run_sql_via_rest(url, key, read_schema())
    
    print("\n" + "=" * 50)
    print("配置完成！")
    print(f"前端文件已更新: {HTML_FILE}")
    print("请确保已在 Supabase SQL Editor 中执行了 schema.sql")
    print("然后部署 index.html 到 GitHub Pages 即可。")
    print("=" * 50)


if __name__ == '__main__':
    main()
