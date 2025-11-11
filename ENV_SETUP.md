# Environment Setup Guide

## Quick Setup

### Option 1: Interactive Setup (Recommended)

```bash
npm run setup:env
# or
./scripts/setup-env.sh
```

This will guide you through setting up your `.env` file.

### Option 2: Manual Setup

1. **Create `.env` file:**
   ```bash
   touch .env
   ```

2. **Add DATABASE_URL:**
   ```bash
   echo "DATABASE_URL=your_database_connection_string" >> .env
   ```

3. **Add other variables as needed:**
   ```bash
   echo "NODE_ENV=production" >> .env
   echo "PORT=5000" >> .env
   ```

## Required Environment Variables

### DATABASE_URL (Required)

PostgreSQL connection string format:
```
postgresql://username:password@host:port/database?sslmode=require
```

**Examples:**

Neon:
```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

Supabase:
```
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

Self-hosted:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## Optional Environment Variables

### OPENAI_API_KEY
For AI-powered features (optional):
```
OPENAI_API_KEY=sk-...
```

### PORT
Server port (defaults to 5000):
```
PORT=5000
```

### NODE_ENV
Environment mode:
```
NODE_ENV=production
```

### SESSION_SECRET
For production session security:
```
SESSION_SECRET=generate-a-secure-random-string-here
```

## Verify Setup

After setting up your `.env` file, verify it:

```bash
npm run predeploy
# or
./scripts/pre-deploy-check.sh
```

This will check:
- ✅ DATABASE_URL is set
- ✅ Database connection works
- ✅ All dependencies installed
- ✅ TypeScript compilation
- ✅ Build status

## Next Steps

Once environment is set up:

1. **Deploy:**
   ```bash
   npm run deploy
   # or
   ./scripts/deploy.sh
   ```

2. **Start Development:**
   ```bash
   npm run dev
   ```

3. **Start Production:**
   ```bash
   npm start
   ```

## Security Notes

⚠️ **Never commit `.env` file to version control!**

The `.env` file is already in `.gitignore` to prevent accidental commits.

For production:
- Use secure environment variable management
- Rotate secrets regularly
- Use different databases for dev/staging/prod
- Enable SSL/TLS for database connections

