# Tianzi Rike - IT 资产管理系统

基于 Next.js 16 + Prisma 7 + PostgreSQL 16 的企业 IT 资产全生命周期管理系统，支持资产入库、领用、归还、维修、转移、盘点等功能。

## 快速启动

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 AI_API_KEY（DeepSeek API Key）

# 2. 启动服务
docker-compose up -d

# 3. 访问系统
# 打开浏览器访问 http://localhost:3000
```

## 默认账户

创建种子数据后，可使用以下账户登录（密码均为 `password`）：

| 邮箱 | 角色 | 说明 |
|------|------|------|
| admin@itasset.local | IT_ADMIN | IT 管理员 |
| manager@itasset.local | MANAGER | 部门经理 |
| executive@itasset.local | EXECUTIVE | 高管 |
| employee1@itasset.local | EMPLOYEE | 员工甲 |
| employee2@itasset.local | EMPLOYEE | 员工乙 |
| employee3@itasset.local | EMPLOYEE | 员工丙 |

## 本地开发

```bash
# 安装依赖
npm ci

# 配置环境变量后生成 Prisma 客户端
npx prisma generate

# 初始化数据库
npx prisma db push
npx prisma db seed

# 启动开发服务器
npm run dev
```

## 技术栈

- **框架**: Next.js 16
- **ORM**: Prisma 7
- **数据库**: PostgreSQL 16
- **UI**: Base UI + Tailwind CSS 4 + shadcn
- **认证**: JWT (jose) + bcrypt
- **AI**: DeepSeek API
