# VPS + MySQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Aelfwine's Garage from Supabase + Vercel to a self-hosted Express + Prisma + MySQL stack on a Cloding VPS with CloudPanel v2.

**Architecture:** New `server/` directory adds a Node.js/Express API on port 3001. Frontend hooks are rewritten to call `/api/*` via a JWT-authenticated fetch wrapper instead of the Supabase client. Nginx (CloudPanel) proxies `/api` to Express and serves the React build statically.

**Tech Stack:** Node.js 18, Express 4, Prisma 5, MySQL (CloudPanel), bcryptjs, jsonwebtoken, multer, TypeScript, Jest + supertest.

---

## File Map

**New files (server):**
- `server/package.json`
- `server/tsconfig.json`
- `server/jest.config.js`
- `server/.env.example`
- `server/prisma/schema.prisma`
- `server/src/db.ts`
- `server/src/index.ts`
- `server/src/middleware/auth.ts`
- `server/src/middleware/__tests__/auth.test.ts`
- `server/src/routes/auth.ts`
- `server/src/routes/vehicles.ts`
- `server/src/routes/maintenance.ts`
- `server/src/routes/settings.ts`
- `server/src/routes/sessions.ts`
- `server/src/routes/documents.ts`

**Modified files (frontend):**
- `src/lib/api.ts` — new, replaces `supabase.ts`
- `src/lib/supabase.ts` — deleted
- `src/hooks/useVehicles.ts` — rewritten
- `src/hooks/useMaintenance.ts` — rewritten
- `src/hooks/useMotoSettings.ts` — rewritten
- `src/hooks/useVehicleDocuments.ts` — rewritten
- `src/pages/Settings.tsx` — rewritten
- `src/App.tsx` — add RequireAuth wrapper
- `.env` — remove Supabase vars, add VITE_API_URL

---

## Task 1: Server scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/jest.config.js`
- Create: `server/.env.example`
- Create: `server/src/db.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "aelfwines-garage-server",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --forceExit"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.13",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/multer": "^1.4.12",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `server/jest.config.js`**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
}
```

- [ ] **Step 4: Create `server/.env.example`**

```env
DATABASE_URL=mysql://user:password@localhost:3306/aelfwines_garage
JWT_SECRET=change-this-to-a-long-random-string
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD_HASH=bcrypt-hash-of-your-password
UPLOADS_DIR=./uploads
PORT=3001
CORS_ORIGIN=https://garage.tudominio.com
```

- [ ] **Step 5: Create `server/src/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 6: Create `server/src/index.ts`** (skeleton — routes added in later tasks)

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
}
```

- [ ] **Step 7: Install dependencies**

```bash
cd server && npm install
```

Expected: package-lock.json created, no errors.

- [ ] **Step 8: Verify server starts**

```bash
cd server && cp .env.example .env
# Edit server/.env with your actual values before running
npm run dev
```

Expected: `Server on :3001` in console. Curl: `curl http://localhost:3001/api/health` returns `{"ok":true}`.

- [ ] **Step 9: Commit**

```bash
git add server/
git commit -m "feat: server scaffold - Express + Prisma setup"
```

---

## Task 2: Prisma schema + MySQL migration

**Files:**
- Create: `server/prisma/schema.prisma`

**Prerequisite:** Create database `aelfwines_garage` and a MySQL user in CloudPanel before running migrations.

- [ ] **Step 1: Create `server/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Vehicle {
  id                       String    @id @default(uuid())
  userId                   String    @map("user_id")
  name                     String
  type                     String
  brand                    String?
  model                    String
  year                     Int?
  licensePlate             String?   @map("license_plate")
  engine                   String?
  oilType                  String?   @map("oil_type")
  oilQuantity              Decimal?  @map("oil_quantity") @db.Decimal(4, 2)
  maintenanceIntervalKm    Int?      @map("maintenance_interval_km")
  maintenanceIntervalHours Int?      @map("maintenance_interval_hours")
  currentKm                Int       @default(0) @map("current_km")
  currentHours             Decimal   @default(0) @map("current_hours") @db.Decimal(8, 2)
  photoUrl                 String?   @map("photo_url")
  notes                    String?   @db.Text
  createdAt                DateTime  @default(now()) @map("created_at")
  updatedAt                DateTime  @updatedAt @map("updated_at")

  maintenanceLogs     MaintenanceLog[]
  motoSettings        MotoSettings?
  motoSettingsHistory MotoSettingsHistory[]
  sessionNotes        SessionNote[]
  documents           VehicleDocument[]

  @@map("vehicles")
}

model MaintenanceLog {
  id               String    @id @default(uuid())
  vehicleId        String    @map("vehicle_id")
  userId           String    @map("user_id")
  type             String
  category         String
  title            String
  description      String?   @db.Text
  date             DateTime  @db.Date
  kmAtService      Int?      @map("km_at_service")
  hoursAtService   Decimal?  @map("hours_at_service") @db.Decimal(8, 2)
  nextServiceKm    Int?      @map("next_service_km")
  nextServiceHours Decimal?  @map("next_service_hours") @db.Decimal(8, 2)
  nextServiceDate  DateTime? @map("next_service_date") @db.Date
  cost             Decimal?  @db.Decimal(10, 2)
  workshop         String?
  partsUsed        String?   @map("parts_used") @db.Text
  createdAt        DateTime  @default(now()) @map("created_at")

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@map("maintenance_logs")
}

model MotoSettings {
  id                   String   @id @default(uuid())
  vehicleId            String   @unique @map("vehicle_id")
  userId               String   @map("user_id")
  mainJet              String?  @map("main_jet")
  pilotJet             String?  @map("pilot_jet")
  needleClip           Int?     @map("needle_clip")
  airScrew             Decimal? @map("air_screw") @db.Decimal(4, 2)
  fuelMixture          String?  @map("fuel_mixture")
  forkPreload          Int?     @map("fork_preload")
  forkCompression      Int?     @map("fork_compression")
  forkRebound          Int?     @map("fork_rebound")
  forkOilLevel         Int?     @map("fork_oil_level")
  forkOilType          String?  @map("fork_oil_type")
  shockPreload         Int?     @map("shock_preload")
  shockCompressionHigh Int?     @map("shock_compression_high")
  shockCompressionLow  Int?     @map("shock_compression_low")
  shockRebound         Int?     @map("shock_rebound")
  settingNotes         String?  @map("setting_notes") @db.Text
  updatedAt            DateTime @updatedAt @map("updated_at")

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@map("moto_settings")
}

model MotoSettingsHistory {
  id                   String    @id @default(uuid())
  vehicleId            String    @map("vehicle_id")
  userId               String    @map("user_id")
  label                String
  date                 DateTime  @db.Date
  condition            String
  mainJet              String?   @map("main_jet")
  pilotJet             String?   @map("pilot_jet")
  needleClip           Int?      @map("needle_clip")
  airScrew             Decimal?  @map("air_screw") @db.Decimal(4, 2)
  fuelMixture          String?   @map("fuel_mixture")
  forkPreload          Int?      @map("fork_preload")
  forkCompression      Int?      @map("fork_compression")
  forkRebound          Int?      @map("fork_rebound")
  forkOilLevel         Int?      @map("fork_oil_level")
  forkOilType          String?   @map("fork_oil_type")
  shockPreload         Int?      @map("shock_preload")
  shockCompressionHigh Int?      @map("shock_compression_high")
  shockCompressionLow  Int?      @map("shock_compression_low")
  shockRebound         Int?      @map("shock_rebound")
  feelingRating        Int?      @map("feeling_rating")
  notes                String?   @db.Text
  createdAt            DateTime  @default(now()) @map("created_at")

  vehicle      Vehicle       @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  sessionNotes SessionNote[]

  @@map("moto_settings_history")
}

model SessionNote {
  id            String    @id @default(uuid())
  vehicleId     String    @map("vehicle_id")
  userId        String    @map("user_id")
  date          DateTime  @db.Date
  location      String?
  condition     String
  kmStart       Int?      @map("km_start")
  kmEnd         Int?      @map("km_end")
  settingId     String?   @map("setting_id")
  title         String
  content       String?   @db.Text
  feelingRating Int?      @map("feeling_rating")
  createdAt     DateTime  @default(now()) @map("created_at")

  vehicle Vehicle              @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  setting MotoSettingsHistory? @relation(fields: [settingId], references: [id])

  @@map("session_notes")
}

model VehicleDocument {
  id          String   @id @default(uuid())
  vehicleId   String   @map("vehicle_id")
  userId      String   @map("user_id")
  name        String
  storagePath String   @map("storage_path")
  docType     String   @map("doc_type")
  fileSize    Int?     @map("file_size")
  createdAt   DateTime @default(now()) @map("created_at")

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@map("vehicle_documents")
}
```

- [ ] **Step 2: Set DATABASE_URL in `server/.env`**

Edit `server/.env` and set:
```
DATABASE_URL=mysql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:3306/aelfwines_garage
```

- [ ] **Step 3: Run first migration**

```bash
cd server && npx prisma migrate dev --name init
```

Expected: Migration applied, all 6 tables created in MySQL. Prisma client generated.

- [ ] **Step 4: Verify tables exist**

In CloudPanel → MySQL → PhpMyAdmin (or via CLI):
```sql
SHOW TABLES FROM aelfwines_garage;
```

Expected: `maintenance_logs`, `moto_settings`, `moto_settings_history`, `session_notes`, `vehicle_documents`, `vehicles`.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/
git commit -m "feat: Prisma schema - 6 models mapped to MySQL"
```

---

## Task 3: Auth middleware + test

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/middleware/__tests__/auth.test.ts`:

```typescript
import jwt from 'jsonwebtoken'
import request from 'supertest'
import express from 'express'
import { requireAuth } from '../auth'

process.env.JWT_SECRET = 'test-secret'

const testApp = express()
testApp.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }))

describe('requireAuth middleware', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(testApp).get('/protected')
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-valid-jwt')
    expect(res.status).toBe(401)
  })

  it('returns 200 with valid JWT', async () => {
    const token = jwt.sign({ userId: 'admin' }, 'test-secret', { expiresIn: '1h' })
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns 401 with expired token', async () => {
    const token = jwt.sign({ userId: 'admin' }, 'test-secret', { expiresIn: '-1s' })
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('returns 200 with valid token in query param (for file downloads)', async () => {
    const token = jwt.sign({ userId: 'admin' }, 'test-secret', { expiresIn: '1h' })
    const res = await request(testApp).get(`/protected?token=${token}`)
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npm test
```

Expected: FAIL with `Cannot find module '../auth'`.

- [ ] **Step 3: Implement `server/src/middleware/auth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : (req.query.token as string | undefined)

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npm test
```

Expected: 5 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/
git commit -m "feat: JWT auth middleware with query-token fallback"
```

---

## Task 4: Auth route

**Files:**
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/routes/auth.ts`**

```typescript
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' })
    return
  }

  if (email !== process.env.ADMIN_EMAIL) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH!)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = jwt.sign({ userId: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '7d' })
  res.json({ token })
})

export default router
```

- [ ] **Step 2: Update `server/src/index.ts` to include auth route**

Replace the full content of `server/src/index.ts`:

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import { requireAuth } from './middleware/auth'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)

// Protected placeholder — will be replaced as routes are added in Tasks 5-9
app.use('/api', requireAuth, (_req, res) => res.status(404).json({ error: 'Not found' }))

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
}
```

- [ ] **Step 3: Generate a bcrypt password hash for your admin password**

Run this one-time script in `server/`:
```bash
node -e "const b=require('bcryptjs'); b.hash('YOUR_ACTUAL_PASSWORD', 12).then(h => console.log(h))"
```

Copy the output hash and set it in `server/.env` as `ADMIN_PASSWORD_HASH`.

- [ ] **Step 4: Set JWT_SECRET in `server/.env`**

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Set in `server/.env` as `JWT_SECRET=<generated value>`.

- [ ] **Step 5: Test login manually**

```bash
cd server && npm run dev
# In another terminal:
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

Expected: `{"token":"eyJ..."}` — a JWT string.

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: auth login route - bcrypt + JWT"
```

---

## Task 5: Vehicles route

**Files:**
- Create: `server/src/routes/vehicles.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/routes/vehicles.ts`**

```typescript
import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

function toRes(v: any) {
  return {
    id: v.id,
    user_id: v.userId,
    name: v.name,
    type: v.type,
    brand: v.brand,
    model: v.model,
    year: v.year,
    license_plate: v.licensePlate,
    engine: v.engine,
    oil_type: v.oilType,
    oil_quantity: v.oilQuantity !== null ? Number(v.oilQuantity) : null,
    maintenance_interval_km: v.maintenanceIntervalKm,
    maintenance_interval_hours: v.maintenanceIntervalHours,
    current_km: v.currentKm,
    current_hours: Number(v.currentHours),
    photo_url: v.photoUrl,
    notes: v.notes,
    created_at: v.createdAt.toISOString(),
    updated_at: v.updatedAt.toISOString(),
  }
}

// Maps only the fields present in body from snake_case to Prisma camelCase
function toData(body: Record<string, unknown>) {
  const map: Record<string, string> = {
    name: 'name', type: 'type', brand: 'brand', model: 'model',
    year: 'year', license_plate: 'licensePlate', engine: 'engine',
    oil_type: 'oilType', oil_quantity: 'oilQuantity',
    maintenance_interval_km: 'maintenanceIntervalKm',
    maintenance_interval_hours: 'maintenanceIntervalHours',
    current_km: 'currentKm', current_hours: 'currentHours',
    photo_url: 'photoUrl', notes: 'notes',
  }
  const data: Record<string, unknown> = {}
  for (const [snake, camel] of Object.entries(map)) {
    if (snake in body) data[camel] = body[snake] ?? null
  }
  return data
}

router.get('/', async (_req, res) => {
  try {
    const items = await prisma.vehicle.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(items.map(toRes))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const item = await prisma.vehicle.create({
      data: { ...toData(req.body), userId: 'admin' } as any,
    })
    res.status(201).json(toRes(item))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const item = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: toData(req.body) as any,
    })
    res.json(toRes(item))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
```

- [ ] **Step 2: Update `server/src/index.ts` to add vehicles route**

Replace the full content of `server/src/index.ts`:

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import vehiclesRouter from './routes/vehicles'
import { requireAuth } from './middleware/auth'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/vehicles', requireAuth, vehiclesRouter)

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
}
```

- [ ] **Step 3: Test vehicles CRUD**

Get token first:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")
```

Create a vehicle:
```bash
curl -X POST http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mi Moto","type":"moto","model":"YZF-R6","brand":"Yamaha","current_km":15000,"current_hours":0}'
```

Expected: `{"id":"...","name":"Mi Moto","type":"moto",...}`.

List vehicles:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/vehicles
```

Expected: JSON array with the created vehicle.

- [ ] **Step 4: Commit**

```bash
git add server/src/
git commit -m "feat: vehicles CRUD route"
```

---

## Task 6: Maintenance route

**Files:**
- Create: `server/src/routes/maintenance.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/routes/maintenance.ts`**

```typescript
import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

function toRes(l: any) {
  return {
    id: l.id,
    vehicle_id: l.vehicleId,
    user_id: l.userId,
    type: l.type,
    category: l.category,
    title: l.title,
    description: l.description,
    date: l.date instanceof Date ? l.date.toISOString().split('T')[0] : l.date,
    km_at_service: l.kmAtService,
    hours_at_service: l.hoursAtService !== null ? Number(l.hoursAtService) : null,
    next_service_km: l.nextServiceKm,
    next_service_hours: l.nextServiceHours !== null ? Number(l.nextServiceHours) : null,
    next_service_date: l.nextServiceDate instanceof Date
      ? l.nextServiceDate.toISOString().split('T')[0]
      : l.nextServiceDate,
    cost: l.cost !== null ? Number(l.cost) : null,
    workshop: l.workshop,
    parts_used: l.partsUsed,
    created_at: l.createdAt.toISOString(),
  }
}

function toData(body: Record<string, unknown>) {
  const d: Record<string, unknown> = {}
  const map: Record<string, string> = {
    type: 'type', category: 'category', title: 'title', description: 'description',
    km_at_service: 'kmAtService', hours_at_service: 'hoursAtService',
    next_service_km: 'nextServiceKm', next_service_hours: 'nextServiceHours',
    cost: 'cost', workshop: 'workshop', parts_used: 'partsUsed',
  }
  for (const [snake, camel] of Object.entries(map)) {
    if (snake in body) d[camel] = body[snake] ?? null
  }
  if ('date' in body) d.date = new Date(body.date as string)
  if ('next_service_date' in body)
    d.nextServiceDate = body.next_service_date ? new Date(body.next_service_date as string) : null
  return d
}

// GET /api/maintenance/last-ordinary — last ordinary log per vehicle (for Home status badges)
// IMPORTANT: Register this BEFORE /:id routes to avoid param conflict
router.get('/maintenance/last-ordinary', async (_req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      where: { type: 'ordinary' },
      orderBy: { date: 'desc' },
      distinct: ['vehicleId'],
    })
    res.json(logs.map(toRes))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/vehicles/:vehicleId/maintenance
router.get('/vehicles/:vehicleId/maintenance', async (req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'desc' },
    })
    res.json(logs.map(toRes))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/vehicles/:vehicleId/maintenance
router.post('/vehicles/:vehicleId/maintenance', async (req, res) => {
  try {
    const log = await prisma.maintenanceLog.create({
      data: { ...toData(req.body), vehicleId: req.params.vehicleId, userId: 'admin' } as any,
    })
    res.status(201).json(toRes(log))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/maintenance/:id
router.patch('/maintenance/:id', async (req, res) => {
  try {
    const log = await prisma.maintenanceLog.update({
      where: { id: req.params.id },
      data: toData(req.body) as any,
    })
    res.json(toRes(log))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/maintenance/:id
router.delete('/maintenance/:id', async (req, res) => {
  try {
    await prisma.maintenanceLog.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
```

- [ ] **Step 2: Update `server/src/index.ts` to add maintenance route**

Replace the full content of `server/src/index.ts`:

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import vehiclesRouter from './routes/vehicles'
import maintenanceRouter from './routes/maintenance'
import { requireAuth } from './middleware/auth'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/vehicles', requireAuth, vehiclesRouter)
app.use('/api', requireAuth, maintenanceRouter)

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
}
```

- [ ] **Step 3: Test maintenance endpoint**

```bash
# Create a maintenance log (use a real vehicle ID from Task 5)
curl -X POST http://localhost:3001/api/vehicles/VEHICLE_ID/maintenance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"ordinary","category":"oil_change","title":"Cambio aceite","date":"2026-06-08","km_at_service":15000}'
```

Expected: `{"id":"...","type":"ordinary","category":"oil_change",...}`.

- [ ] **Step 4: Commit**

```bash
git add server/src/
git commit -m "feat: maintenance CRUD + last-ordinary endpoint"
```

---

## Task 7: Moto Settings route

**Files:**
- Create: `server/src/routes/settings.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/routes/settings.ts`**

```typescript
import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

const SETTINGS_FIELDS = [
  'main_jet', 'pilot_jet', 'needle_clip', 'air_screw', 'fuel_mixture',
  'fork_preload', 'fork_compression', 'fork_rebound', 'fork_oil_level', 'fork_oil_type',
  'shock_preload', 'shock_compression_high', 'shock_compression_low', 'shock_rebound',
  'setting_notes',
]

const SETTINGS_MAP: Record<string, string> = {
  main_jet: 'mainJet', pilot_jet: 'pilotJet', needle_clip: 'needleClip',
  air_screw: 'airScrew', fuel_mixture: 'fuelMixture', fork_preload: 'forkPreload',
  fork_compression: 'forkCompression', fork_rebound: 'forkRebound',
  fork_oil_level: 'forkOilLevel', fork_oil_type: 'forkOilType',
  shock_preload: 'shockPreload', shock_compression_high: 'shockCompressionHigh',
  shock_compression_low: 'shockCompressionLow', shock_rebound: 'shockRebound',
  setting_notes: 'settingNotes',
}

function settingsToData(body: Record<string, unknown>) {
  const d: Record<string, unknown> = {}
  for (const snake of SETTINGS_FIELDS) {
    if (snake in body) d[SETTINGS_MAP[snake]] = body[snake] ?? null
  }
  return d
}

function settingsToRes(s: any) {
  return {
    id: s.id, vehicle_id: s.vehicleId, user_id: s.userId,
    main_jet: s.mainJet, pilot_jet: s.pilotJet, needle_clip: s.needleClip,
    air_screw: s.airScrew !== null ? Number(s.airScrew) : null,
    fuel_mixture: s.fuelMixture, fork_preload: s.forkPreload,
    fork_compression: s.forkCompression, fork_rebound: s.forkRebound,
    fork_oil_level: s.forkOilLevel, fork_oil_type: s.forkOilType,
    shock_preload: s.shockPreload, shock_compression_high: s.shockCompressionHigh,
    shock_compression_low: s.shockCompressionLow, shock_rebound: s.shockRebound,
    setting_notes: s.settingNotes,
    updated_at: s.updatedAt.toISOString(),
  }
}

const HISTORY_MAP: Record<string, string> = {
  ...SETTINGS_MAP,
  label: 'label', condition: 'condition', feeling_rating: 'feelingRating', notes: 'notes',
}

function historyToData(body: Record<string, unknown>) {
  const d: Record<string, unknown> = {}
  for (const [snake, camel] of Object.entries(HISTORY_MAP)) {
    if (snake in body) d[camel] = body[snake] ?? null
  }
  if ('date' in body) d.date = new Date(body.date as string)
  return d
}

function historyToRes(h: any) {
  return {
    id: h.id, vehicle_id: h.vehicleId, user_id: h.userId,
    label: h.label, date: h.date instanceof Date ? h.date.toISOString().split('T')[0] : h.date,
    condition: h.condition,
    main_jet: h.mainJet, pilot_jet: h.pilotJet, needle_clip: h.needleClip,
    air_screw: h.airScrew !== null ? Number(h.airScrew) : null,
    fuel_mixture: h.fuelMixture, fork_preload: h.forkPreload,
    fork_compression: h.forkCompression, fork_rebound: h.forkRebound,
    fork_oil_level: h.forkOilLevel, fork_oil_type: h.forkOilType,
    shock_preload: h.shockPreload, shock_compression_high: h.shockCompressionHigh,
    shock_compression_low: h.shockCompressionLow, shock_rebound: h.shockRebound,
    feeling_rating: h.feelingRating, notes: h.notes,
    created_at: h.createdAt.toISOString(),
  }
}

// GET /api/vehicles/:vehicleId/settings
router.get('/vehicles/:vehicleId/settings', async (req, res) => {
  try {
    const s = await prisma.motoSettings.findUnique({ where: { vehicleId: req.params.vehicleId } })
    if (!s) { res.status(404).json({ error: 'Not found' }); return }
    res.json(settingsToRes(s))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/vehicles/:vehicleId/settings (upsert)
router.put('/vehicles/:vehicleId/settings', async (req, res) => {
  const { vehicleId } = req.params
  const data = settingsToData(req.body)
  try {
    const s = await prisma.motoSettings.upsert({
      where: { vehicleId },
      create: { ...data, vehicleId, userId: 'admin' } as any,
      update: data as any,
    })
    res.json(settingsToRes(s))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/vehicles/:vehicleId/settings/history
router.get('/vehicles/:vehicleId/settings/history', async (req, res) => {
  try {
    const items = await prisma.motoSettingsHistory.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'desc' },
    })
    res.json(items.map(historyToRes))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/vehicles/:vehicleId/settings/history
router.post('/vehicles/:vehicleId/settings/history', async (req, res) => {
  try {
    const item = await prisma.motoSettingsHistory.create({
      data: { ...historyToData(req.body), vehicleId: req.params.vehicleId, userId: 'admin' } as any,
    })
    res.status(201).json(historyToRes(item))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/settings/history/:id
router.delete('/settings/history/:id', async (req, res) => {
  try {
    await prisma.motoSettingsHistory.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
```

- [ ] **Step 2: Update `server/src/index.ts` to add settings route**

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import vehiclesRouter from './routes/vehicles'
import maintenanceRouter from './routes/maintenance'
import settingsRouter from './routes/settings'
import { requireAuth } from './middleware/auth'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/vehicles', requireAuth, vehiclesRouter)
app.use('/api', requireAuth, maintenanceRouter)
app.use('/api', requireAuth, settingsRouter)

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: moto settings + history routes"
```

---

## Task 8: Session Notes route

**Files:**
- Create: `server/src/routes/sessions.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/routes/sessions.ts`**

```typescript
import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

function toRes(s: any) {
  return {
    id: s.id, vehicle_id: s.vehicleId, user_id: s.userId,
    date: s.date instanceof Date ? s.date.toISOString().split('T')[0] : s.date,
    location: s.location, condition: s.condition,
    km_start: s.kmStart, km_end: s.kmEnd, setting_id: s.settingId,
    title: s.title, content: s.content,
    feeling_rating: s.feelingRating,
    created_at: s.createdAt.toISOString(),
  }
}

function toData(body: Record<string, unknown>) {
  const map: Record<string, string> = {
    location: 'location', condition: 'condition',
    km_start: 'kmStart', km_end: 'kmEnd', setting_id: 'settingId',
    title: 'title', content: 'content', feeling_rating: 'feelingRating',
  }
  const d: Record<string, unknown> = {}
  for (const [snake, camel] of Object.entries(map)) {
    if (snake in body) d[camel] = body[snake] ?? null
  }
  if ('date' in body) d.date = new Date(body.date as string)
  return d
}

// GET /api/vehicles/:vehicleId/sessions
router.get('/vehicles/:vehicleId/sessions', async (req, res) => {
  try {
    const items = await prisma.sessionNote.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'desc' },
    })
    res.json(items.map(toRes))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/vehicles/:vehicleId/sessions
router.post('/vehicles/:vehicleId/sessions', async (req, res) => {
  try {
    const item = await prisma.sessionNote.create({
      data: { ...toData(req.body), vehicleId: req.params.vehicleId, userId: 'admin' } as any,
    })
    res.status(201).json(toRes(item))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  try {
    await prisma.sessionNote.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
```

- [ ] **Step 2: Update `server/src/index.ts`**

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import vehiclesRouter from './routes/vehicles'
import maintenanceRouter from './routes/maintenance'
import settingsRouter from './routes/settings'
import sessionsRouter from './routes/sessions'
import { requireAuth } from './middleware/auth'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/vehicles', requireAuth, vehiclesRouter)
app.use('/api', requireAuth, maintenanceRouter)
app.use('/api', requireAuth, settingsRouter)
app.use('/api', requireAuth, sessionsRouter)

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: session notes CRUD route"
```

---

## Task 9: Documents route (file upload)

**Files:**
- Create: `server/src/routes/documents.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/routes/documents.ts`**

```typescript
import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../db'

const router = Router()

const uploadsBase = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads')

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(uploadsBase, req.params.vehicleId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}${ext}`)
  },
})

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

function toRes(d: any, req: any) {
  const apiUrl = process.env.CORS_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3001}`
  const token = (req.query.token as string) ??
    req.headers.authorization?.replace('Bearer ', '') ?? ''
  return {
    id: d.id, vehicle_id: d.vehicleId, user_id: d.userId,
    name: d.name, storage_path: d.storagePath,
    doc_type: d.docType, file_size: d.fileSize,
    created_at: d.createdAt.toISOString(),
    signed_url: `${apiUrl}/api/documents/${d.id}/download?token=${token}`,
  }
}

// GET /api/vehicles/:vehicleId/documents
router.get('/vehicles/:vehicleId/documents', async (req, res) => {
  try {
    const items = await prisma.vehicleDocument.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(items.map((d) => toRes(d, req)))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/vehicles/:vehicleId/documents
router.post('/vehicles/:vehicleId/documents', upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
  try {
    const storagePath = `${req.params.vehicleId}/${req.file.filename}`
    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId: req.params.vehicleId,
        userId: 'admin',
        name: req.body.name ?? req.file.originalname,
        storagePath,
        docType: req.body.doc_type ?? 'manual',
        fileSize: req.file.size,
      },
    })
    res.status(201).json(toRes(doc, req))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/documents/:id
router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await prisma.vehicleDocument.findUnique({ where: { id: req.params.id } })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    const filePath = path.join(uploadsBase, doc.storagePath)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await prisma.vehicleDocument.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/documents/:id/download
router.get('/documents/:id/download', async (req, res) => {
  try {
    const doc = await prisma.vehicleDocument.findUnique({ where: { id: req.params.id } })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    const filePath = path.join(uploadsBase, doc.storagePath)
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return }
    res.download(filePath, `${doc.name}${path.extname(doc.storagePath)}`)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
```

- [ ] **Step 2: Update `server/src/index.ts`** (final version with all routes)

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import vehiclesRouter from './routes/vehicles'
import maintenanceRouter from './routes/maintenance'
import settingsRouter from './routes/settings'
import sessionsRouter from './routes/sessions'
import documentsRouter from './routes/documents'
import { requireAuth } from './middleware/auth'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/vehicles', requireAuth, vehiclesRouter)
app.use('/api', requireAuth, maintenanceRouter)
app.use('/api', requireAuth, settingsRouter)
app.use('/api', requireAuth, sessionsRouter)
app.use('/api', requireAuth, documentsRouter)

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
}
```

- [ ] **Step 3: Build the server to verify no TypeScript errors**

```bash
cd server && npm run build
```

Expected: `dist/` directory created, zero TypeScript errors.

- [ ] **Step 4: Run all tests**

```bash
cd server && npm test
```

Expected: 5 tests pass (auth middleware suite).

- [ ] **Step 5: Commit**

```bash
git add server/src/
git commit -m "feat: documents upload/download route - all backend routes complete"
```

---

## Task 10: Frontend — api.ts client

**Files:**
- Create: `src/lib/api.ts`
- Delete: `src/lib/supabase.ts`

- [ ] **Step 1: Create `src/lib/api.ts`**

```typescript
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('garage_token')
  const headers: Record<string, string> = {}

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/settings'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function getToken(): string | null {
  return localStorage.getItem('garage_token')
}

export function setToken(token: string): void {
  localStorage.setItem('garage_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('garage_token')
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Delete `src/lib/supabase.ts`**

```bash
# In the project root (not server/):
rm "src/lib/supabase.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/
git commit -m "feat: api.ts fetch client replaces supabase.ts"
```

---

## Task 11: Frontend — useVehicles hook

**Files:**
- Modify: `src/hooks/useVehicles.ts`

- [ ] **Step 1: Replace the full content of `src/hooks/useVehicles.ts`**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { useAppStore } from '../store'
import type { Vehicle, MaintenanceLog } from '../types'

export function useVehicles() {
  const { vehicles, setVehicles, removeVehicle, setMaintenanceLogs } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const vehicleData = await api<Vehicle[]>('/vehicles')
      setVehicles(vehicleData)

      // Pre-load last ordinary log per vehicle for Home status badges
      const logData = await api<MaintenanceLog[]>('/maintenance/last-ordinary')
      const currentLogs = useAppStore.getState().maintenanceLogs
      const seen = new Set<string>()
      for (const log of logData) {
        if (!seen.has(log.vehicle_id)) {
          seen.add(log.vehicle_id)
          if (!currentLogs[log.vehicle_id] || currentLogs[log.vehicle_id].length === 0) {
            setMaintenanceLogs(log.vehicle_id, [log])
          }
        }
      }
      for (const v of vehicleData) {
        if (!seen.has(v.id) && (!currentLogs[v.id] || currentLogs[v.id].length === 0)) {
          setMaintenanceLogs(v.id, [])
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [setVehicles, setMaintenanceLogs])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const createVehicle = async (payload: Partial<Vehicle>): Promise<Vehicle> => {
    const data = await api<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setVehicles([data, ...vehicles])
    return data
  }

  const updateVehicle = async (id: string, payload: Partial<Vehicle>): Promise<Vehicle> => {
    const data = await api<Vehicle>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    setVehicles(vehicles.map((v) => (v.id === id ? data : v)))
    return data
  }

  const deleteVehicle = async (id: string): Promise<void> => {
    await api(`/vehicles/${id}`, { method: 'DELETE' })
    removeVehicle(id)
  }

  return { vehicles, loading, error, fetchVehicles, createVehicle, updateVehicle, deleteVehicle }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useVehicles.ts
git commit -m "feat: useVehicles - supabase -> api fetch"
```

---

## Task 12: Frontend — useMaintenance hook

**Files:**
- Modify: `src/hooks/useMaintenance.ts`

- [ ] **Step 1: Replace the full content of `src/hooks/useMaintenance.ts`**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { useAppStore } from '../store'
import type { MaintenanceLog } from '../types'

export function useMaintenance(vehicleId: string) {
  const { maintenanceLogs, setMaintenanceLogs } = useAppStore()
  const logs = maintenanceLogs[vehicleId] ?? []
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    try {
      const data = await api<MaintenanceLog[]>(`/vehicles/${vehicleId}/maintenance`)
      setMaintenanceLogs(vehicleId, data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [vehicleId, setMaintenanceLogs])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const createLog = async (payload: Partial<MaintenanceLog>): Promise<MaintenanceLog> => {
    const data = await api<MaintenanceLog>(`/vehicles/${vehicleId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setMaintenanceLogs(vehicleId, [data, ...logs])
    return data
  }

  const updateLog = async (id: string, payload: Partial<MaintenanceLog>): Promise<MaintenanceLog> => {
    const data = await api<MaintenanceLog>(`/maintenance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    setMaintenanceLogs(vehicleId, logs.map((l) => (l.id === id ? data : l)))
    return data
  }

  const deleteLog = async (id: string): Promise<void> => {
    await api(`/maintenance/${id}`, { method: 'DELETE' })
    setMaintenanceLogs(vehicleId, logs.filter((l) => l.id !== id))
  }

  const ordinaryLogs = logs.filter((l) => l.type === 'ordinary')
  const extraordinaryLogs = logs.filter((l) => l.type === 'extraordinary')
  const lastOrdinary = ordinaryLogs[0] ?? null

  return { logs, ordinaryLogs, extraordinaryLogs, lastOrdinary, loading, error, fetchLogs, createLog, updateLog, deleteLog }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMaintenance.ts
git commit -m "feat: useMaintenance - supabase -> api fetch"
```

---

## Task 13: Frontend — useMotoSettings hook

**Files:**
- Modify: `src/hooks/useMotoSettings.ts`

- [ ] **Step 1: Replace the full content of `src/hooks/useMotoSettings.ts`**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { useAppStore } from '../store'
import type { MotoSettings, MotoSettingsHistory, SessionNote, Condition } from '../types'

export function useMotoSettings(vehicleId: string) {
  const { motoSettings, motoHistory, sessionNotes, setMotoSettings, setMotoHistory, setSessionNotes } = useAppStore()
  const settings = motoSettings[vehicleId] ?? null
  const history = motoHistory[vehicleId] ?? []
  const sessions = sessionNotes[vehicleId] ?? []
  const [loading, setLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    try {
      const [s, h, n] = await Promise.allSettled([
        api<MotoSettings>(`/vehicles/${vehicleId}/settings`),
        api<MotoSettingsHistory[]>(`/vehicles/${vehicleId}/settings/history`),
        api<SessionNote[]>(`/vehicles/${vehicleId}/sessions`),
      ])
      if (s.status === 'fulfilled') setMotoSettings(vehicleId, s.value)
      if (h.status === 'fulfilled') setMotoHistory(vehicleId, h.value)
      if (n.status === 'fulfilled') setSessionNotes(vehicleId, n.value)
    } finally {
      setLoading(false)
    }
  }, [vehicleId, setMotoSettings, setMotoHistory, setSessionNotes])

  useEffect(() => { fetchAll() }, [fetchAll])

  const saveSettings = async (payload: Partial<MotoSettings>): Promise<void> => {
    const data = await api<MotoSettings>(`/vehicles/${vehicleId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    setMotoSettings(vehicleId, data)
  }

  const saveSnapshotOf = async (
    values: Partial<MotoSettings>,
    label: string,
    condition: Condition = 'road',
    rating = 3,
    notes = ''
  ): Promise<MotoSettingsHistory> => {
    const payload = {
      label, condition, date: new Date().toISOString().split('T')[0],
      feeling_rating: rating, notes,
      main_jet: values.main_jet ?? null, pilot_jet: values.pilot_jet ?? null,
      needle_clip: values.needle_clip ?? null, air_screw: values.air_screw ?? null,
      fuel_mixture: values.fuel_mixture ?? null, fork_preload: values.fork_preload ?? null,
      fork_compression: values.fork_compression ?? null, fork_rebound: values.fork_rebound ?? null,
      fork_oil_level: values.fork_oil_level ?? null, fork_oil_type: values.fork_oil_type ?? null,
      shock_preload: values.shock_preload ?? null,
      shock_compression_high: values.shock_compression_high ?? null,
      shock_compression_low: values.shock_compression_low ?? null,
      shock_rebound: values.shock_rebound ?? null,
    }
    const data = await api<MotoSettingsHistory>(`/vehicles/${vehicleId}/settings/history`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setMotoHistory(vehicleId, [data, ...history])
    return data
  }

  const saveSnapshot = async (label: string, condition: Condition, rating: number, notes: string): Promise<MotoSettingsHistory> => {
    if (!settings) throw new Error('No settings to snapshot')
    return saveSnapshotOf(settings, label, condition, rating, notes)
  }

  const deleteSnapshot = async (id: string): Promise<void> => {
    await api(`/settings/history/${id}`, { method: 'DELETE' })
    setMotoHistory(vehicleId, history.filter((h) => h.id !== id))
  }

  const createSession = async (payload: Partial<SessionNote>): Promise<SessionNote> => {
    const data = await api<SessionNote>(`/vehicles/${vehicleId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSessionNotes(vehicleId, [data, ...sessions])
    return data
  }

  const deleteSession = async (id: string): Promise<void> => {
    await api(`/sessions/${id}`, { method: 'DELETE' })
    setSessionNotes(vehicleId, sessions.filter((s) => s.id !== id))
  }

  return {
    settings, history, sessions, loading, error,
    saveSettings, saveSnapshot, saveSnapshotOf, deleteSnapshot, createSession, deleteSession,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMotoSettings.ts
git commit -m "feat: useMotoSettings - supabase -> api fetch"
```

---

## Task 14: Frontend — useVehicleDocuments hook

**Files:**
- Modify: `src/hooks/useVehicleDocuments.ts`

- [ ] **Step 1: Replace the full content of `src/hooks/useVehicleDocuments.ts`**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import type { VehicleDocument, VehicleDocType } from '../types'

export function useVehicleDocuments(vehicleId: string) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<VehicleDocument[]>(`/vehicles/${vehicleId}/documents`)
      setDocuments(data)
    } catch {
      // keep existing state on error
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const uploadDocument = async (file: File, name: string, docType: VehicleDocType): Promise<void> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    formData.append('doc_type', docType)

    const doc = await api<VehicleDocument>(`/vehicles/${vehicleId}/documents`, {
      method: 'POST',
      body: formData,
    })
    setDocuments((prev) => [doc, ...prev])
  }

  const deleteDocument = async (doc: VehicleDocument): Promise<void> => {
    await api(`/documents/${doc.id}`, { method: 'DELETE' })
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  return { documents, loading, uploadDocument, deleteDocument, refetch: fetchDocuments }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useVehicleDocuments.ts
git commit -m "feat: useVehicleDocuments - supabase storage -> api upload"
```

---

## Task 15: Frontend — Settings page + App auth guard

**Files:**
- Modify: `src/pages/Settings.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the full content of `src/pages/Settings.tsx`**

```tsx
import { useState } from 'react'
import { api, setToken, clearToken, isAuthenticated } from '../lib/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export function Settings() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const authenticated = isAuthenticated()

  const handleLogin = async () => {
    setLoading(true)
    try {
      const { token } = await api<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(token)
      toast.success('Sesion iniciada')
      window.location.href = '/'
    } catch {
      toast.error('Email o contrasena incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearToken()
    toast.success('Sesion cerrada')
    window.location.href = '/settings'
  }

  return (
    <>
      <Header title="Ajustes" />
      <div className="px-4 py-5 space-y-6">
        <div className="bg-white rounded-xl border border-garage-sand p-4 space-y-4">
          <h3 className="font-display font-semibold text-base">Cuenta</h3>

          {authenticated ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Sesion activa</p>
              <Button variant="ghost" className="w-full" onClick={handleLogout}>
                Cerrar sesion
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-garage-sand text-sm font-body focus:outline-none focus:ring-2 focus:ring-garage-orange min-h-[44px]"
                type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-garage-sand text-sm font-body focus:outline-none focus:ring-2 focus:ring-garage-orange min-h-[44px]"
                type="password" placeholder="Contrasena" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button className="w-full" loading={loading} onClick={handleLogin}>
                Iniciar sesion
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-garage-sand p-4">
          <h3 className="font-display font-semibold text-base mb-2">Acerca de</h3>
          <p className="text-sm text-gray-600">Aelfwine's Garage v0.1.0</p>
          <p className="text-xs text-gray-400 mt-1">Seguimiento de mantenimiento de vehiculos</p>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Replace the full content of `src/App.tsx`**

```tsx
import { type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'
import { AddVehicle } from './pages/AddVehicle'
import { VehicleDetail } from './pages/VehicleDetail'
import { MotoSettings } from './pages/MotoSettings'
import { SessionNotes } from './pages/SessionNotes'
import { VehicleQR } from './pages/VehicleQR'
import { VehicleExport } from './pages/VehicleExport'
import { Settings } from './pages/Settings'
import { isAuthenticated } from './lib/api'

function RequireAuth({ children }: { children: ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/settings" replace />
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '12px' },
          success: { iconTheme: { primary: '#E8682A', secondary: '#fff' } },
        }}
      />
      <AppShell>
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/vehicles/new" element={<RequireAuth><AddVehicle /></RequireAuth>} />
          <Route path="/vehicles/:id" element={<RequireAuth><VehicleDetail /></RequireAuth>} />
          <Route path="/vehicles/:id/settings" element={<RequireAuth><MotoSettings /></RequireAuth>} />
          <Route path="/vehicles/:id/sessions" element={<RequireAuth><SessionNotes /></RequireAuth>} />
          <Route path="/vehicles/:id/qr" element={<RequireAuth><VehicleQR /></RequireAuth>} />
          <Route path="/vehicles/:id/export" element={<RequireAuth><VehicleExport /></RequireAuth>} />
        </Routes>
      </AppShell>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Settings.tsx src/App.tsx
git commit -m "feat: Settings login with JWT + RequireAuth route guard"
```

---

## Task 16: Frontend env + verify build

**Files:**
- Modify: `.env` (and `.env.example` if it exists)

- [ ] **Step 1: Update frontend `.env`**

Remove Supabase variables and add API URL. The `.env` in the project root should contain:

```env
VITE_API_URL=http://localhost:3001/api
```

For production (on the VPS), change to:
```env
VITE_API_URL=https://garage.tudominio.com/api
```

- [ ] **Step 2: Remove `@supabase/supabase-js` from frontend dependencies**

```bash
# In project root (not server/):
npm uninstall @supabase/supabase-js
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
# In project root:
npm run build
```

Expected: `dist/` folder created, zero TypeScript errors, zero import errors.

- [ ] **Step 4: Start both server and frontend dev**

Terminal 1 (backend):
```bash
cd server && npm run dev
```

Terminal 2 (frontend):
```bash
npm run dev
```

Open `http://localhost:5173`. Expected: redirects to `/settings`. Log in with your credentials. Expected: redirected to `/` and vehicles list loads (empty initially).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env
git commit -m "feat: remove supabase dep, add VITE_API_URL - frontend complete"
```

---

## Task 17: VPS deployment

**Prerequisites:** VPS has CloudPanel v2, Ubuntu, Node.js 18+, PM2 installed globally (`npm i -g pm2`).

- [ ] **Step 1: Create MySQL database and user in CloudPanel**

In CloudPanel → Databases → Add Database:
- Database name: `aelfwines_garage`
- Username: `garage_user`
- Password: generate strong password
- Host: `localhost`

- [ ] **Step 2: Create `server/.env` on the VPS**

SSH into the VPS and in the `server/` directory:

```bash
cp server/.env.example server/.env
nano server/.env
```

Fill in:
```env
DATABASE_URL=mysql://garage_user:YOUR_DB_PASSWORD@localhost:3306/aelfwines_garage
JWT_SECRET=<output of: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
ADMIN_EMAIL=fabio@indissoluble.com
ADMIN_PASSWORD_HASH=<output of: node -e "const b=require('bcryptjs'); b.hash('YOUR_PASSWORD',12).then(console.log)">
UPLOADS_DIR=/home/cloudpanel/htdocs/garage.tudominio.com/server/uploads
PORT=3001
CORS_ORIGIN=https://garage.tudominio.com
```

- [ ] **Step 3: Deploy and run migrations**

```bash
# In project root on VPS:
git pull origin main
npm install && npm run build

cd server
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

- [ ] **Step 4: Start backend with PM2**

```bash
cd server
pm2 start dist/index.js --name garage-api
pm2 save
pm2 startup
# Run the command that pm2 startup prints
```

Verify: `pm2 status` shows `garage-api` as `online`.

- [ ] **Step 5: Create site in CloudPanel**

In CloudPanel → Sites → Add Site:
- Domain: `garage.tudominio.com`
- Site type: Static (we serve the React build directly)
- Document root: `/home/cloudpanel/htdocs/garage.tudominio.com/dist`

Then copy the built React files:
```bash
cp -r dist/* /home/cloudpanel/htdocs/garage.tudominio.com/dist/
```

- [ ] **Step 6: Configure Nginx in CloudPanel**

In CloudPanel → Sites → garage.tudominio.com → Vhost:

Add inside the `server {}` block, before the closing `}`:

```nginx
# SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}

# Proxy API to Express
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 25M;
}
```

Reload Nginx: CloudPanel → Nginx → Reload.

- [ ] **Step 7: Enable SSL**

In CloudPanel → SSL/TLS → Let's Encrypt for `garage.tudominio.com`.

- [ ] **Step 8: Verify production**

Open `https://garage.tudominio.com`. Expected:
- Redirects to `/settings` if not logged in
- Login works with your credentials
- Can create a vehicle
- `https://garage.tudominio.com/api/health` returns `{"ok":true}`

- [ ] **Step 9: Set up deploy script for future updates**

Create `deploy.sh` in project root:

```bash
#!/bin/bash
set -e
git pull origin main
npm install
npm run build
cd server
npm install
npx prisma migrate deploy
npm run build
pm2 restart garage-api
echo "Deploy complete"
```

```bash
chmod +x deploy.sh
git add deploy.sh
git commit -m "chore: deploy script"
```

---

## Self-Review Notes

- All 6 Supabase tables have Prisma equivalents with `@@map` annotations matching exact MySQL column names
- `GET /api/maintenance/last-ordinary` is an additional endpoint not in the original spec — required for Home page status badges (the spec was incomplete on this point)
- `signed_url` for documents is constructed by the backend using the JWT token passed in the Authorization header or `?token=` query param — the download link works as a direct browser `<a>` tag without modifying `DocumentsSection.tsx`
- `useMotoSettings.fetchAll` uses `Promise.allSettled` instead of `Promise.all` so a missing settings record (404) does not block loading history or sessions
- `RequireAuth` in App.tsx checks token expiry client-side — if the token is expired, the user is redirected to `/settings` on next navigation or page reload
- `CORS_ORIGIN` in server `.env` should match the frontend domain exactly in production
