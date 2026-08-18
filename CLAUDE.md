# CLAUDE.md — Aelfwine's Garage

## Vision general del proyecto

Aplicacion web responsive (mobile-first) para el seguimiento de mantenimiento ordinario y extraordinario de vehiculos. Self-hosted en un VPS propio (Express + Prisma + MySQL), multi-usuario con datos aislados por cuenta (admin + beta testers). Nombre de la app: **Aelfwine's Garage**.

---

## Despliegue

- **Repo GitHub**: `https://github.com/aelfindi/aelfwines-garage2`
- **URL produccion**: `https://garage.aelfwine.eu` (dominio real, cert Let's Encrypt, desde 2026-08-18)
- **Plataforma**: VPS propio (Ubuntu 24.04, CloudPanel), sin Vercel/Supabase
- **Deploy**: `git pull origin main` en el VPS + `./deploy.sh` (ver `DEPLOY.md` para el runbook completo: acceso SSH, PM2, backups, dominio, troubleshooting)
- **Proceso**: PM2 (`garage-api`), Express en `127.0.0.1:3002` (cerrado al exterior, solo accesible por el reverse-proxy)
- **Web server**: Nginx (gestionado por CloudPanel) sirve `dist/` y proxea `/api` a Express. El sitio de `garage.aelfwine.eu` es un vhost reverse-proxy separado del codigo — este no vive en una carpeta con ese nombre, sigue en `garage.aelfwine.info/` (nombre legacy de un dominio que nunca funciono, ver `DEPLOY.md`)

---

## Stack tecnologico

- **Frontend**: React 18 + Vite 5 + TypeScript
- **Estilos**: Tailwind CSS v3
- **Backend**: Node.js + Express 4 + TypeScript (`server/`)
- **ORM / DB**: Prisma 5 + MySQL/MariaDB (self-hosted, sin RLS — el aislamiento por usuario se aplica a nivel de ruta, no de base de datos)
- **Auth**: JWT + bcrypt, multi-usuario real (tabla `User`: `email` + `passwordHash`). El JWT lleva el `id` del usuario; `middleware/auth.ts` lo adjunta a `req.userId` y cada ruta filtra/verifica ownership con eso. No hay UI de registro — las cuentas se crean desde el VPS con `npm run create-user -- email password` (ver `DEPLOY.md`)
- **Uploads**: disco local del VPS (`server/uploads/`), servidos exclusivamente via Express con rutas firmadas (HMAC) — nunca expuestos directo por Nginx
- **Routing**: React Router v6
- **State**: Zustand
- **Fechas**: date-fns
- **Iconos**: Lucide React
- **Notificaciones**: react-hot-toast
- **Exportacion PDF**: @react-pdf/renderer v3 — usar `BlobProvider` (NO `PDFDownloadLink`, incompatibilidad de tipos en v3)
- **QR**: qrcode.react
- **Comparador de settings**: componente propio con tabla diff

---

## Variables de entorno

Frontend (`.env`):
```env
VITE_API_URL=https://garage.aelfwine.eu/api
# Opcionales - solo para busqueda de imagenes de vehiculos
VITE_GOOGLE_CSE_API_KEY=
VITE_GOOGLE_CSE_CX=
```

Backend (`server/.env`):
```env
DATABASE_URL=mysql://user:pass@127.0.0.1:3306/aelfwinesGarage
JWT_SECRET=<cadena aleatoria larga>
ADMIN_EMAIL=fabio@indissoluble.com
ADMIN_PASSWORD_HASH=<bcrypt hash>
UPLOADS_DIR=./uploads
PORT=3002
CORS_ORIGIN=https://garage.aelfwine.eu
```
`ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` ya **no** los lee `/api/auth/login` (que ahora consulta la tabla `users`) — quedaron solo como bootstrap, usados una vez por `server/scripts/backfill-admin-user.ts` durante la migracion a multi-usuario.

---

## Diseno y estetica

- **Estilo**: Industrial refinado, mecanico pero sofisticado.
- **Paleta**: Fondos claros / crema / blanco roto. Acentos en naranja mecanico (`#E8682A`) y azul acero (`#2A5F8F`). Texto oscuro sobre fondo claro. **Nunca fondo negro con texto blanco.**
- **Fuentes**: `Barlow Condensed` (display / titulos) + `DM Sans` (cuerpo). Google Fonts.
- **Mobile-first**: Disenado para ~390px. Funcional en desktop.
- **Componentes**: Cards con sombra suave, bordes redondeados 8-12px, bottom navigation bar en movil.

### Colores Tailwind personalizados

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      garage: {
        orange: '#E8682A',
        steel:  '#2A5F8F',
        cream:  '#FAF7F2',
        sand:   '#E8E2D9',
        dark:   '#1C1C1E',
      }
    },
    fontFamily: {
      display: ['"Barlow Condensed"', 'sans-serif'],
      body:    ['"DM Sans"', 'sans-serif'],
    }
  }
}
```

---

## Estructura de carpetas

```
src/
├── components/
│   ├── layout/          # AppShell, BottomNav, Header
│   ├── vehicles/        # VehicleCard, DocumentsSection
│   ├── maintenance/     # MaintenanceItem, MaintenanceForm, MaintenanceLog
│   ├── moto/            # CarburetionSettings, SuspensionSettings,
│   │                    # SettingsHistory, SettingsComparator
│   ├── export/          # VehiclePDFDocument, ExportButton
│   ├── qr/              # VehicleQRCode, QRModal
│   └── ui/              # Button, Input, Modal, Badge, Spinner, IntervalCalc
├── pages/
│   ├── Home.tsx                    # Lista de vehiculos agrupada por tipo
│   ├── VehicleDetail.tsx           # Tabs: Resumen / Mantenimiento / Setup
│   ├── AddVehicle.tsx              # Stepper 3 pasos
│   ├── MotoSettings.tsx            # Settings activos + historial + comparador
│   ├── SessionNotes.tsx            # Notas de sesion (solo motos)
│   └── Settings.tsx                # Login / logout / cuenta
├── lib/
│   ├── api.ts           # Cliente fetch: JWT desde localStorage, Authorization header
│   └── helpers.ts       # getMaintenanceStatus, diffSettings, formatKm, categorias
├── hooks/
│   ├── useVehicles.ts
│   ├── useMaintenance.ts
│   ├── useMotoSettings.ts
│   └── useVehicleDocuments.ts
├── types/
│   └── index.ts
└── store/
    └── index.ts         # Zustand: vehicles, maintenanceLogs, user

server/
├── src/
│   ├── index.ts          # Entry point Express, puerto 3002, sirve dist/ + SPA fallback
│   ├── db.ts              # PrismaClient
│   ├── types/express.d.ts # Augmenta Request con `userId?: string`
│   ├── lib/signedUrl.ts   # HMAC signing para URLs de descarga de PDFs
│   ├── middleware/auth.ts # Verifica JWT (header Bearer), adjunta req.userId
│   ├── routes/
│   │   ├── auth.ts        # POST /api/auth/login (contra tabla users)
│   │   ├── vehicles.ts    # CRUD /api/vehicles, filtrado por req.userId
│   │   ├── maintenance.ts # CRUD /api/vehicles/:id/maintenance + facturas (invoice)
│   │   ├── settings.ts    # /api/vehicles/:id/settings + historial
│   │   ├── sessions.ts    # /api/vehicles/:id/sessions
│   │   └── documents.ts   # Upload/descarga manuales y listas de piezas (PDF)
│   └── uploads/           # PDFs en disco (gitignored)
├── scripts/
│   ├── create-user.ts           # Upsert-by-email: crear cuenta o resetear password
│   └── backfill-admin-user.ts   # One-off: migracion a multi-usuario (ya ejecutado)
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## Esquema de base de datos (Prisma / MySQL)

Multi-usuario, sin RLS: el aislamiento se aplica en la capa de rutas (`server/src/routes/*.ts`), no en la base de datos. Ver `server/prisma/schema.prisma` para el esquema completo.

| Modelo Prisma | Tabla MySQL | Notas |
|---|---|---|
| `User` | `users` | `id`, `email` (unico), `passwordHash`, `createdAt`. Sin UI de registro. |
| `Vehicle` | `vehicles` | `userId` es FK real a `User` (`onDelete: Cascade`) — unica tabla con la relacion autoritativa |
| `MaintenanceLog` | `maintenance_logs` | + `workshopInvoicePath` / `partsInvoicePath` (facturas PDF adjuntas) |
| `MotoSettings` | `moto_settings` | igual |
| `MotoSettingsHistory` | `moto_settings_history` | igual |
| `SessionNote` | `session_notes` | igual |
| `VehicleDocument` | `vehicle_documents` | manuales / listas de piezas |

**Ownership**: solo `Vehicle.userId` es la FK autoritativa. Las otras 5 tablas ya relacionan con `Vehicle` via `vehicleId` (todas con `onDelete: Cascade`), asi que las rutas verifican pertenencia uniendo por `vehicle.userId` (ej. `findFirst({where: {id, vehicle: {userId: req.userId}}})`) en vez de anadir FK a `User` en cada tabla. La columna `userId` propia de esas 5 tablas queda como dato denormalizado/legacy (comentario en el schema) — **nunca usarla para autorizar**.

Diferencias tecnicas vs. el esquema Postgres original: `UUID` → `String @id @default(uuid())`, `TIMESTAMPTZ` → `DateTime`, `NUMERIC` → `Decimal`, sin RLS.

---

## Almacenamiento de archivos (uploads)

- PDFs (manuales, listas de piezas, facturas de mantenimiento) en `server/uploads/` en disco del VPS, **no** en Supabase Storage.
- Rutas de descarga protegidas con **URLs firmadas HMAC** (`server/src/lib/signedUrl.ts`), no token crudo en la URL.
- Validacion de `vehicleId` / `id` como UUID antes de tocar filesystem + `assertInsideUploads` (realpath guard) para evitar path traversal, tanto en `documents.ts` como en `maintenance.ts` (rutas de factura).
- Descarga por defecto `inline` para PDFs (con `Content-Security-Policy: sandbox` y `X-Content-Type-Options: nosniff`), `?dl=1` fuerza descarga. Archivos no-PDF siempre se sirven como `attachment`.
- Manuales/piezas: `server/uploads/{vehicleId}/{timestamp}.ext`
- Facturas de mantenimiento: `server/uploads/maintenance/{maintenanceLogId}/{workshop|parts}.pdf`
- Limite de subida: 50MB por archivo (multer).

---

## Tipos de vehiculos (UI)

Solo **Coche** y **Moto** en el formulario de alta. El campo `type` en la BD acepta tambien `van`, `truck`, `other` por si hay datos historicos, pero la UI solo permite crear esos dos.

---

## Paginas implementadas

### `/` — Home
- Vehiculos agrupados por tipo: **Motos** primero, luego **Coches**
- FAB naranja para nuevo vehiculo
- Estado vacio con mensaje

### `/vehicles/new` — Nuevo vehiculo (stepper 3 pasos)
- Paso 1: tipo (solo car/moto), nombre, marca, modelo, ano, matricula, busqueda de imagen via Google CSE (opcional)
- Paso 2: motor, aceite, cantidad, intervalo km, intervalo horas, km actuales, horas totales, notas
- Paso 3: confirmacion y guardar

### `/vehicles/:id` — Detalle
- Header con boton editar (abre modal), Settings (solo motos), QR, Exportar PDF
- Tab **Resumen**: foto/icono, km + horas, badge estado, IntervalCalc, notas, seccion Documentos (PDFs), boton Notas de sesion (solo motos)
- Tab **Mantenimiento**: log unificado (ordinario + extraordinario, ya no son tabs separadas), con adjuntar/ver facturas de taller y de piezas por entrada
- Tab **Setup** (solo motos): boton hacia MotoSettings

### `/vehicles/:id/settings` — Setup moto
- Tab **Activo**: formulario Carburacion + Suspension, botones "Guardar snapshot" y "Guardar"
- Tab **Historial**: lista de snapshots, comparador (seleccionar 2 → tabla diff)
- Carga el form con `useEffect` + `useRef` para sincronizar cuando los datos llegan del backend

### `/vehicles/:id/sessions` — Notas de sesion (solo motos)

### `/vehicles/:id/qr` — Codigo QR

### `/vehicles/:id/export` — Exportar PDF

---

## Logica de negocio

### Estado de mantenimiento
```typescript
function getMaintenanceStatus(vehicle, lastLog) {
  if (!lastLog) return 'overdue'
  const kmSince = vehicle.current_km - (lastLog.km_at_service ?? 0)
  const hoursSince = vehicle.current_hours - (lastLog.hours_at_service ?? 0)
  const kmThreshold = vehicle.maintenance_interval_km ?? Infinity
  const hoursThreshold = vehicle.maintenance_interval_hours ?? Infinity
  if (kmSince >= kmThreshold || hoursSince >= hoursThreshold) return 'overdue'
  if (kmSince >= kmThreshold * 0.85 || hoursSince >= hoursThreshold * 0.85) return 'due_soon'
  return 'ok'
}
```

---

## Categorias predefinidas

### Mantenimiento ordinario
`oil_change` | `brake_fluid` | `coolant` | `air_filter` | `fuel_filter` | `spark_plugs` | `timing_belt` | `gearbox_oil` | `differential_oil` | `other`

### Mantenimiento extraordinario
`tires` | `brake_pads` | `brake_discs` | `battery` | `clutch` | `suspension` | `exhaust` | `bodywork` | `electrical` | `other`

### Condiciones (moto)
`track_dry` | `track_wet` | `road` | `offroad` | `rain` | `other`

---

## Comandos de desarrollo

```bash
npm install          # instalar dependencias (frontend)
npm run dev          # servidor local frontend
npm run build        # build produccion (vite build)

cd server
npm install
npm run dev          # servidor local backend (ts-node-dev)
npm run build        # compila TS -> dist/
npx prisma migrate deploy   # aplica migraciones pendientes
```

---

## Notas de implementacion

1. **Auth**: JWT + bcrypt, multi-usuario. `POST /api/auth/login` consulta la tabla `users` y devuelve un JWT (7 dias, payload `{userId}`) verificado por `middleware/auth.ts` en todas las rutas `/api/*` salvo login — adjunta `req.userId` para que cada ruta filtre/verifique ownership. Frontend guarda el token en `localStorage` (`src/lib/api.ts`), sin cambios respecto al modelo single-user (mismo formulario, mismo flujo).
2. **PDF export**: usar `BlobProvider` de `@react-pdf/renderer` v3, no `PDFDownloadLink` (incompatibilidad de tipos con render props en v3).
3. **MotoSettings form**: se inicializa vacio y se sincroniza con `useEffect` + `useRef(false)` cuando llegan los datos del backend, para evitar que el form se resetee en cada render.
4. **Imagenes de vehiculos**: URL externa guardada en `photo_url`. Busqueda via Google CSE solo si estan configuradas las variables `VITE_GOOGLE_CSE_API_KEY` y `VITE_GOOGLE_CSE_CX`.
5. **QR**: URL apunta a `window.location.origin + '/vehicles/' + id`. Descarga PNG via `canvas.toDataURL()`.
6. **Documentos y facturas PDF**: subida a disco del VPS (`server/uploads/`), servidos via Express con URLs firmadas HMAC (no token crudo en query string), validacion de UUID + realpath guard contra path traversal. Limite 50MB.
7. **Seguridad**: sin RLS; el aislamiento de datos entre usuarios depende enteramente de que cada ruta filtre/verifique por `req.userId` (via `vehicle.userId`, ver seccion de esquema). Al agregar una ruta nueva o un query nuevo, siempre confirmar que tiene ese filtro — no hay red de seguridad a nivel de base de datos. Validar siempre `vehicleId`/`id` como UUID antes de construir paths de filesystem.
8. **Offline / PWA**: fase 2 (vite-plugin-pwa) — pendiente tambien de HTTPS definitivo, ver `DEPLOY.md`.
9. **Operaciones VPS**: ver `DEPLOY.md` para acceso SSH, deploy, backups, troubleshooting y datos de configuracion del servidor. No tocar el proyecto `petits-exploradors` que comparte el mismo VPS.
10. **Anadir usuarios**: no hay registro publico. Cuentas nuevas (beta testers, etc.) se crean desde el VPS con `npm run create-user -- email password` (`server/scripts/create-user.ts`, upsert por email — tambien sirve para resetear password). Ver seccion "Anadir un nuevo usuario" en `DEPLOY.md`.
