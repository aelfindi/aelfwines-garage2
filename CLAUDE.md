# CLAUDE.md — Aelfwine's Garage

## Vision general del proyecto

Aplicacion web responsive (mobile-first) para el seguimiento de mantenimiento ordinario y extraordinario de vehiculos. Alojada en **Supabase** (base de datos + auth) y desplegada en **Vercel**. Nombre de la app: **Aelfwine's Garage**.

---

## Despliegue

- **Repo GitHub**: `https://github.com/aelfindi/aelfwines-garage`
- **Plataforma**: Vercel (auto-deploy desde `main`)
- **Build command Vercel**: `npm run build` (script en package.json llama a `vite build`)
- **Output dir**: `dist`
- **SPA rewrite**: `vercel.json` redirige todas las rutas a `index.html`

---

## Stack tecnologico

- **Frontend**: React 18 + Vite 5 + TypeScript
- **Estilos**: Tailwind CSS v3
- **Backend / DB**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth (email/password)
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

```env
VITE_SUPABASE_URL=https://rnymkxubwmuoprwmnakk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_wpP2fjn58bdpco9X38HBHw_1a_HQVnJ
# Opcionales - solo para busqueda de imagenes de vehiculos
VITE_GOOGLE_CSE_API_KEY=
VITE_GOOGLE_CSE_CX=
```

Estas mismas variables deben estar configuradas en Vercel → Project → Settings → Environment Variables.

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
│   ├── VehicleDetail.tsx           # Tabs: Resumen / Ordinario / Extraordinario / Setup
│   ├── AddVehicle.tsx              # Stepper 3 pasos
│   ├── MotoSettings.tsx            # Settings activos + historial + comparador
│   ├── SessionNotes.tsx            # Notas de sesion (solo motos)
│   └── Settings.tsx                # Login / logout / cuenta
├── lib/
│   ├── supabase.ts      # Cliente Supabase
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
```

---

## Esquema de base de datos Supabase

### Tabla `vehicles`
```sql
CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('car', 'moto', 'van', 'truck', 'other')),
  brand         TEXT,
  model         TEXT NOT NULL,
  year          INT,
  license_plate TEXT,
  engine        TEXT,
  oil_type      TEXT,
  oil_quantity  NUMERIC(4,2),
  maintenance_interval_km    INT,
  maintenance_interval_hours INT,          -- HORAS (no dias)
  current_km    INT DEFAULT 0,
  current_hours NUMERIC(8,2) DEFAULT 0,
  photo_url     TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own vehicles" ON vehicles FOR ALL USING (auth.uid() = user_id);
```

> MIGRACION pendiente si la tabla ya existe con el nombre antiguo:
> `ALTER TABLE vehicles RENAME COLUMN maintenance_interval_days TO maintenance_interval_hours;`

### Tabla `maintenance_logs`
```sql
CREATE TABLE maintenance_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('ordinary', 'extraordinary')),
  category         TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  date             DATE NOT NULL,
  km_at_service    INT,
  hours_at_service NUMERIC(8,2),
  next_service_km  INT,
  next_service_hours NUMERIC(8,2),        -- HORAS para proximo servicio
  next_service_date DATE,
  cost             NUMERIC(10,2),
  workshop         TEXT,
  parts_used       TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own logs" ON maintenance_logs FOR ALL USING (auth.uid() = user_id);
```

> MIGRACION si la tabla ya existe:
> `ALTER TABLE maintenance_logs ADD COLUMN next_service_hours NUMERIC(8,2);`

### Tabla `moto_settings`
```sql
CREATE TABLE moto_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID REFERENCES vehicles(id) ON DELETE CASCADE UNIQUE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  main_jet            TEXT,
  pilot_jet           TEXT,
  needle_clip         INT,
  air_screw           NUMERIC(4,2),
  fuel_mixture        TEXT,
  fork_preload        INT,
  fork_compression    INT,
  fork_rebound        INT,
  fork_oil_level      INT,
  fork_oil_type       TEXT,
  shock_preload       INT,
  shock_compression_high INT,
  shock_compression_low  INT,
  shock_rebound       INT,
  setting_notes       TEXT,
  updated_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE moto_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own settings" ON moto_settings FOR ALL USING (auth.uid() = user_id);
```

### Tabla `moto_settings_history`
```sql
CREATE TABLE moto_settings_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  date                DATE NOT NULL,
  condition           TEXT NOT NULL CHECK (condition IN ('track_dry', 'track_wet', 'road', 'offroad', 'rain', 'other')),
  main_jet            TEXT,
  pilot_jet           TEXT,
  needle_clip         INT,
  air_screw           NUMERIC(4,2),
  fuel_mixture        TEXT,
  fork_preload        INT,
  fork_compression    INT,
  fork_rebound        INT,
  fork_oil_level      INT,
  fork_oil_type       TEXT,
  shock_preload       INT,
  shock_compression_high INT,
  shock_compression_low  INT,
  shock_rebound       INT,
  feeling_rating      INT CHECK (feeling_rating BETWEEN 1 AND 5),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE moto_settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own history" ON moto_settings_history FOR ALL USING (auth.uid() = user_id);
```

### Tabla `session_notes`
```sql
CREATE TABLE session_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  location        TEXT,
  condition       TEXT NOT NULL CHECK (condition IN ('track_dry', 'track_wet', 'road', 'offroad', 'rain', 'other')),
  km_start        INT,
  km_end          INT,
  setting_id      UUID REFERENCES moto_settings_history(id),
  title           TEXT NOT NULL,
  content         TEXT,
  feeling_rating  INT CHECK (feeling_rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sessions" ON session_notes FOR ALL USING (auth.uid() = user_id);
```

### Tabla `vehicle_documents` (manuales y listas de piezas en PDF)
```sql
CREATE TABLE vehicle_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  doc_type     TEXT NOT NULL CHECK (doc_type IN ('manual', 'parts_list')),
  file_size    INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own documents" ON vehicle_documents FOR ALL USING (auth.uid() = user_id);
```

---

## Supabase Storage

### Bucket `vehicle-docs` (PDFs de manuales y piezas)
- Tipo: **Private**
- Crear desde Supabase → Storage → New bucket → nombre: `vehicle-docs`
- Policy (ejecutar en SQL Editor):
```sql
CREATE POLICY "auth users manage own docs" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'vehicle-docs')
WITH CHECK (bucket_id = 'vehicle-docs');
```
- Los archivos se suben a la ruta `{user_id}/{vehicle_id}/{timestamp}.pdf`
- Las URLs se generan como signed URLs (1 hora de validez) en el hook `useVehicleDocuments`

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
- Tab **Ordinario**: log de mantenimiento ordinario
- Tab **Extraordinario**: log de mantenimiento extraordinario
- Tab **Setup** (solo motos): boton hacia MotoSettings

### `/vehicles/:id/settings` — Setup moto
- Tab **Activo**: formulario Carburacion + Suspension, botones "Guardar snapshot" y "Guardar"
- Tab **Historial**: lista de snapshots, comparador (seleccionar 2 → tabla diff)
- Carga el form con `useEffect` + `useRef` para sincronizar cuando los datos llegan de Supabase

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
npm install          # instalar dependencias
npm run dev          # servidor local
npm run build        # build produccion (vite build)
```

---

## Notas de implementacion

1. **Auth**: Supabase email/password. Confirmacion de email **desactivada** en Supabase → Auth → Settings para facilitar el registro.
2. **PDF export**: usar `BlobProvider` de `@react-pdf/renderer` v3, no `PDFDownloadLink` (incompatibilidad de tipos con render props en v3).
3. **MotoSettings form**: se inicializa vacio y se sincroniza con `useEffect` + `useRef(false)` cuando llegan los datos de Supabase, para evitar que el form se resetee en cada render.
4. **Imagenes de vehiculos**: URL externa guardada en `photo_url`. Busqueda via Google CSE solo si estan configuradas las variables `VITE_GOOGLE_CSE_API_KEY` y `VITE_GOOGLE_CSE_CX`.
5. **QR**: URL apunta a `window.location.origin + '/vehicles/' + id`. Descarga PNG via `canvas.toDataURL()`.
6. **Documentos PDF**: subida a Supabase Storage bucket `vehicle-docs`, ruta `{user_id}/{vehicle_id}/{timestamp}.ext`. URLs como signed URLs de 1h en el hook.
7. **RLS**: activo en todas las tablas. Cada usuario ve solo sus datos.
8. **Offline / PWA**: fase 2 (vite-plugin-pwa).
