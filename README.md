# 地质灾害调查表 - 移动端云同步版

野外地质调查在线表单，支持多人手机填写、数据实时同步、一键导出 Excel。

## 技术架构

- **前端**: 纯 HTML/CSS/JS 单页应用，移动端优化
- **后端 API**: Vercel Serverless Functions
- **数据库**: Neon (免费 PostgreSQL)
- **部署**: Vercel (自动从 GitHub 部署)

## 一键部署

### 1. 创建 Neon 数据库（2 分钟）

1. 打开 [neon.tech](https://neon.tech)，用 GitHub 登录
2. 点 **Create project** → 名称随意 → Region 选 **Singapore** → 创建
3. 创建后会显示连接信息，点 **Connection string** 复制（格式: `postgresql://...`）
4. 这个就是 `DATABASE_URL`，后面要用

### 2. 部署到 Vercel（2 分钟）

1. 把本项目推送到你的 GitHub 仓库
2. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录
3. 点 **Add New → Project** → 选择刚推送的仓库
4. 在 **Environment Variables** 中添加:
   - Key: `DATABASE_URL`
   - Value: 粘贴 Neon 的连接字符串
5. 点 **Deploy**
6. 部署完成后得到一个 `https://xxx.vercel.app` 地址

### 3. 使用

把 Vercel 地址通过微信发给所有外业人员，手机浏览器打开即可填写。

- 顶部状态栏显示「云端同步」表示正常
- 离线时也能填写，联网后自动同步
- 点 📊 导出最终 Excel 表格

## 本地开发

```bash
npm install -g vercel
vercel dev
```

## 离线版

如果不需要云同步，直接双击 `index.html` 即可在浏览器中使用（数据存在手机本地）。
