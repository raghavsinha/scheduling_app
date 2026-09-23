# Restaurant scheduling app — Recovery batch 01

Foundation only. Handler modules will arrive in batches 02–05.

## Local setup (PowerShell)
```powershell
Copy-Item .env.example .env
docker compose up -d
npm install
npx prisma validate
npx prisma migrate dev --name recovered_baseline
npx prisma generate
npx prisma db seed
npx tsc --noEmit
```

Original historical migrations and package lock were not available; run the initial baseline migration only on an empty/rebuilt database.
