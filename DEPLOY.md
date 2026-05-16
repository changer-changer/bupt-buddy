# 北邮搭伙平台 - 部署指南

## 方案：Vercel + Supabase（免费）

---

## 一、创建数据库（Supabase）

1. 访问 https://supabase.com，用 GitHub 登录
2. New Project → 填写信息：
   - Project name: `bupt-buddy`
   - Database password: 点 "Generate a password"，**保存好！**
   - Region: **Southeast Asia (Singapore)**（离中国最近）
3. 等待创建完成（约2分钟）
4. Project Settings → Database → Connection string → URI：
   ```
   postgresql://postgres:YOUR_PASSWORD@db.xxxxxx.supabase.co:5432/postgres
   ```
   把 `YOUR_PASSWORD` 换成生成的密码

---

## 二、推送代码到 GitHub

```bash
# 在本地项目目录中
cd /path/to/bupt-buddy

# 添加所有文件
git add .

# 提交
git commit -m "init: bupt buddy mvp"

# 创建 GitHub 仓库（去 github.com 新建，不要初始化 README）
# 然后关联并推送
git remote add origin https://github.com/你的用户名/bupt-buddy.git
git push -u origin main
```

---

## 三、部署到 Vercel

1. 访问 https://vercel.com，用 GitHub 登录
2. 点击 "Add New Project"
3. 导入 `bupt-buddy` 仓库
4. 配置：
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `prisma generate && next build`
   - **Environment Variables**：
     - `DATABASE_URL` = 上面复制的 Supabase URI
     - `NEXTAUTH_SECRET` = 随机字符串（`openssl rand -base64 32`）
     - `NEXTAUTH_URL` = 部署后的 Vercel 域名（先部署一次获取，再回来改）
     - `RESEND_API_KEY` = 你的 Resend API Key（可选，不配就用控制台看验证码）
5. 点击 Deploy

---

## 四、运行数据库迁移

部署成功后，需要在 Vercel 上运行一次数据库迁移：

```bash
# 本地运行（用生产数据库的 URL）
DATABASE_URL="你的SupabaseURI" npx prisma migrate deploy
```

或者 Vercel Dashboard → 你的项目 → Settings → Git → Build Command 改成：
```bash
prisma generate && prisma migrate deploy && next build
```

然后重新部署一次。

---

## 五、配置邮件服务（Resend）

1. 访问 https://resend.com，用 GitHub 登录
2. 添加 Domain：
   - 如果你有域名，添加并验证
   - 如果没有，先用 Resend 提供的测试域名（收件人只能是你的注册邮箱）
3. API Keys → Create API Key → 复制
4. Vercel Dashboard → Settings → Environment Variables → 添加 `RESEND_API_KEY`
5. 重新部署

---

## 六、绑定域名（可选）

Vercel 自带 `.vercel.app` 域名，但如果你想用自定义域名：

1. Vercel Dashboard → Domains → Add
2. 输入你买的域名（如 `bupt-buddy.app`）
3. 按提示去域名服务商添加 DNS 记录
4. 等待 SSL 自动配置

---

## 七、测试部署

1. 访问你的 Vercel 域名
2. 用 `@bupt.edu.cn` 邮箱注册
3. 检查验证码是否收到（如果 Resend 没配，看 Vercel 的 Function Logs）
4. 创建活动、报名，验证完整流程

---

## 国内访问慢的备选方案

如果 Vercel 在国内加载慢（>3秒）：

### 方案 A：Vercel + 国内 CDN
在域名服务商配置 CNAME 到 Vercel，然后接入 **腾讯云 CDN** 或 **阿里云 CDN**。

### 方案 B：Railway（推荐）
1. 访问 https://railway.app
2. 从 GitHub 导入项目
3. 添加 PostgreSQL 插件
4. 环境变量同 Vercel
5. Railway 给免费 5$ 额度/月，足够用

### 方案 C：国内云（阿里云/腾讯云轻量）
- 买一台 2核2G 轻量服务器（约 100元/年）
- 安装 Node.js + PostgreSQL
- PM2 跑 Next.js
- 速度最快，但需要手动维护
