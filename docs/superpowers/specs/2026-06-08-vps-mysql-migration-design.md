# Migracion VPS + MySQL - Diseno

**Fecha:** 2026-06-08
**Estado:** Aprobado

## Contexto

Aelfwine's Garage es una app React/Vite/TS que actualmente usa Supabase (auth + PostgreSQL + storage) y se despliega en Vercel. El objetivo es migrar a un VPS propio (Cloding, Ubuntu + CloudPanel v2) con MySQL como base de datos, eliminando la dependencia de Supabase.

## Stack resultante

- **Frontend:** React 18 + Vite + TypeScript (sin cambios estructurales)
- **Backend:** Node.js + Express + TypeScript (nuevo)
- **ORM:** Prisma (MySQL)
- **DB:** MySQL via CloudPanel
- **Auth:** JWT + bcrypt, usuario unico
- **Storage:** disco local del VPS (`server/uploads/`)
- **Proceso:** PM2
- **Web server:** Nginx (gestionado por CloudPanel)

## Estructura del proyecto

```
aelfwines-garage/
├── src/                        # Frontend React (cambios solo en hooks y lib)
│   ├── hooks/                  # Reescritos: supabase -> fetch('/api/...')
│   ├── lib/
│   │   ├── supabase.ts         # Eliminado
│   │   └── api.ts              # Nuevo: cliente fetch con JWT header
│   └── ...                     # Resto sin cambios
├── server/                     # Nuevo backend
│   ├── src/
│   │   ├── index.ts            # Entry point Express, puerto 3001
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── vehicles.ts
│   │   │   ├── maintenance.ts
│   │   │   ├── settings.ts
│   │   │   ├── sessions.ts
│   │   │   └── documents.ts
│   │   ├── middleware/
│   │   │   └── auth.ts         # Verifica JWT en todas las rutas /api/*
│   │   └── uploads/            # PDFs en disco (gitignored)
│   ├── prisma/
│   │   ├── schema.prisma       # Schema MySQL equivalente al de Supabase
│   │   └── migrations/         # Auto-generadas
│   ├── package.json
│   └── tsconfig.json
├── dist/                       # Build React - Nginx lo sirve
└── package.json                # Frontend
```

## Autenticacion

- Usuario unico. Sin registro publico.
- Credenciales en `.env` del servidor: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (bcrypt)
- Login: `POST /api/auth/login` devuelve JWT firmado con expiracion 7 dias
- Frontend guarda JWT en `localStorage`
- Middleware `auth.ts` verifica Bearer token en todos los endpoints protegidos
- Sin refresh token - al expirar, el usuario hace login de nuevo
- Cambios en frontend: `supabase.auth.*` reemplazado por llamadas a `/api/auth/login` y manejo de localStorage

## Base de datos

Schema Prisma equivalente al de Supabase (6 tablas):

| Tabla Supabase | Modelo Prisma |
|---|---|
| `vehicles` | `Vehicle` |
| `maintenance_logs` | `MaintenanceLog` |
| `moto_settings` | `MotoSettings` |
| `moto_settings_history` | `MotoSettingsHistory` |
| `session_notes` | `SessionNote` |
| `vehicle_documents` | `VehicleDocument` |

Diferencias tecnicas PostgreSQL -> MySQL/Prisma:
- UUID: `String @id @default(uuid())`
- TIMESTAMPTZ: `DateTime`
- NUMERIC: `Decimal`
- Sin RLS (seguridad via middleware JWT)

`DATABASE_URL` en `.env` del servidor: `mysql://user:pass@localhost:3306/aelfwines_garage`

`.env` completo del servidor:
```env
DATABASE_URL=mysql://user:pass@localhost:3306/aelfwines_garage
JWT_SECRET=<cadena aleatoria larga, ej. openssl rand -hex 64>
ADMIN_EMAIL=fabio@indissoluble.com
ADMIN_PASSWORD_HASH=<bcrypt hash generado con bcrypt.hash('tupassword', 12)>
UPLOADS_DIR=./uploads
PORT=3001
```

Crear la DB desde CloudPanel antes del primer deploy. Aplicar schema con `npx prisma migrate deploy`.

## API Endpoints

Todos protegidos por JWT excepto `/api/auth/login`.

```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/vehicles
POST   /api/vehicles
PATCH  /api/vehicles/:id
DELETE /api/vehicles/:id

GET    /api/vehicles/:id/maintenance?type=ordinary|extraordinary
POST   /api/vehicles/:id/maintenance
PATCH  /api/maintenance/:id
DELETE /api/maintenance/:id

GET    /api/vehicles/:id/settings
PUT    /api/vehicles/:id/settings
POST   /api/vehicles/:id/settings/history
GET    /api/vehicles/:id/settings/history
DELETE /api/settings/history/:id

GET    /api/vehicles/:id/sessions
POST   /api/vehicles/:id/sessions
DELETE /api/sessions/:id

GET    /api/vehicles/:id/documents
POST   /api/vehicles/:id/documents    (multipart/form-data)
DELETE /api/documents/:id
GET    /api/documents/:id/download
```

Los PDFs se guardan en `server/uploads/{vehicleId}/` y se sirven exclusivamente via Express (con auth). Nginx no expone esa carpeta directamente.

## Cambios en el frontend

**Nuevo `src/lib/api.ts`:** wrapper de fetch que lee el JWT de localStorage y añade el header `Authorization: Bearer <token>`. Exporta una funcion `api(path, options?)`.

**Hooks modificados:**

| Fichero | Cambio |
|---|---|
| `useVehicles.ts` | `supabase.from('vehicles')` -> `api('/vehicles')` |
| `useMaintenance.ts` | `supabase.from('maintenance_logs')` -> `api('/vehicles/:id/maintenance')` |
| `useMotoSettings.ts` | llamadas supabase -> `api('/vehicles/:id/settings')` |
| `useVehicleDocuments.ts` | supabase storage -> `api('/vehicles/:id/documents')` |
| `pages/Settings.tsx` | `supabase.auth.*` -> `api('/auth/login')` + localStorage |

**Variable de entorno frontend:**
```env
VITE_API_URL=https://garage.tudominio.com/api
```
Se eliminan `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

**Sin cambios:** components/, types/index.ts, store/index.ts, App.tsx, estilos, PDF export, QR.

## Despliegue en CloudPanel

**Nginx** (ajuste manual en CloudPanel):
```nginx
location / {
    root /home/cloudpanel/htdocs/garage.tudominio.com/dist;
    try_files $uri $uri/ /index.html;
}

location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**PM2:**
```bash
pm2 start dist/index.js --name garage-api
pm2 save && pm2 startup
```

**Flujo de deploy:**
```bash
git pull origin main
npm run build                     # dist/ frontend
cd server && npm run build        # compila backend TS
npx prisma migrate deploy         # aplica migraciones
pm2 restart garage-api
```

**SSL:** Let's Encrypt gestionado automaticamente por CloudPanel.

## Lo que NO cambia

- Toda la logica de UI y componentes React
- Tipos TypeScript (`types/index.ts`)
- Zustand store
- React Router
- Logica de negocio (getMaintenanceStatus, diffSettings, etc.)
- PDF export, QR, estilos Tailwind

## Fuera de alcance

- Migracion de datos existentes de Supabase (se puede hacer con script de seed separado si se necesita)
- PWA / offline support (fase futura)
- Multi-usuario / registro publico
