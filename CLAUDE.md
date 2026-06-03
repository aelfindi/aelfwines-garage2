# CLAUDE.md — Aelfwine's Garage

## Visión general del proyecto

Aplicación web responsive (mobile-first) para el seguimiento de mantenimiento ordinario y extraordinario de vehículos. Alojada en **Supabase** (base de datos + auth). Nombre de la app: **Aelfwine's Garage**.

---

## Stack tecnológico

- **Frontend**: React + Vite + TypeScript
- **Estilos**: Tailwind CSS v3
- **Backend / DB**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth (email/password)
- **Routing**: React Router v6
- **State**: Zustand o React Context
- **Fechas**: date-fns
- **Iconos**: Lucide React
- **Notificaciones / Toasts**: react-hot-toast
- **Exportación PDF**: @react-pdf/renderer
- **QR**: qrcode.react
- **Comparador de settings**: componente propio con tabla diff

---

## Diseño y estética

- **Estilo**: Industrial refinado, mecánico pero sofisticado. Fuentes con carácter técnico.
- **Paleta**: Fondos claros / crema / blanco roto. Acentos en naranja mecánico (`#E8682A`) y azul acero (`#2A5F8F`). Texto oscuro sobre fondo claro. **Nunca fondo negro con texto blanco.**
- **Fuentes**: `Barlow Condensed` (display / títulos) + `DM Sans` (cuerpo). Importar desde Google Fonts.
- **Mobile-first**: Diseñado para pantallas de ~390px. Funcional también en desktop.
- **Componentes**: Cards con sombra suave, bordes redondeados moderados (8-12px), separadores con línea fina, bottom navigation bar en móvil.

---

## Estructura de carpetas

```
src/
├── components/
│   ├── layout/          # AppShell, BottomNav, Header
│   ├── vehicles/        # VehicleCard, VehicleForm, VehicleList
│   ├── maintenance/     # MaintenanceItem, MaintenanceForm, MaintenanceLog
│   ├── moto/            # CarburetionSettings, SuspensionSettings,
│   │                    # SettingsHistory, SettingsComparator, SessionNotes
│   ├── export/          # VehiclePDFDocument, ExportButton
│   ├── qr/              # VehicleQRCode, QRModal
│   └── ui/              # Button, Input, Modal, Badge, Spinner, IntervalCalc
├── pages/
│   ├── Home.tsx                    # Lista de vehículos
│   ├── VehicleDetail.tsx
│   ├── AddVehicle.tsx
│   ├── AddMaintenance.tsx
│   ├── MotoSettings.tsx            # Settings actuales + historial + comparador
│   ├── SessionNotes.tsx            # Notas de sesión
│   └── Settings.tsx
├── lib/
│   ├── supabase.ts      # Cliente Supabase
│   ├── pdf.ts           # Lógica de generación PDF
│   └── helpers.ts
├── hooks/
│   ├── useVehicles.ts
│   ├── useMaintenance.ts
│   └── useMotoSettings.ts
├── types/
│   └── index.ts
└── store/
    └── index.ts
```

---

## Esquema de base de datos Supabase

### Tabla `vehicles`
```sql
CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                    -- Nombre/alias del vehículo
  type          TEXT NOT NULL CHECK (type IN ('car', 'moto', 'van', 'truck', 'other')),
  brand         TEXT,
  model         TEXT NOT NULL,
  year          INT,
  license_plate TEXT,
  engine        TEXT,                             -- Motorización ej: "1.6 TDI 115cv"
  oil_type      TEXT,                             -- Tipo de aceite ej: "5W-40 Full Synthetic"
  oil_quantity  NUMERIC(4,2),                     -- Litros ej: 4.5
  maintenance_interval_km   INT,                 -- Intervalo en km
  maintenance_interval_days INT,                 -- Intervalo en días
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

### Tabla `maintenance_logs`
```sql
CREATE TABLE maintenance_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('ordinary', 'extraordinary')),
  category        TEXT NOT NULL,
  -- Categorías ordinario: oil_change, brake_fluid, coolant, air_filter, fuel_filter,
  --                       spark_plugs, timing_belt, gearbox_oil, differential_oil, other
  -- Categorías extraordinario: tires, brake_pads, brake_discs, battery, clutch,
  --                            suspension, exhaust, bodywork, electrical, other
  title           TEXT NOT NULL,
  description     TEXT,
  date            DATE NOT NULL,
  km_at_service   INT,
  hours_at_service NUMERIC(8,2),
  next_service_km  INT,
  next_service_date DATE,
  cost            NUMERIC(10,2),
  workshop        TEXT,
  parts_used      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own logs" ON maintenance_logs FOR ALL USING (auth.uid() = user_id);
```

### Tabla `moto_settings` (solo para motos — configuración activa actual)
```sql
CREATE TABLE moto_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID REFERENCES vehicles(id) ON DELETE CASCADE UNIQUE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Carburación / Inyección
  main_jet            TEXT,
  pilot_jet           TEXT,
  needle_clip         INT,
  air_screw           NUMERIC(4,2),
  fuel_mixture        TEXT,
  -- Horquilla delantera
  fork_preload               INT,
  fork_compression           INT,   -- Compresión (clics)
  fork_rebound               INT,
  fork_oil_level             INT,
  fork_oil_type              TEXT,
  -- Amortiguador trasero
  shock_preload              INT,
  shock_compression_high     INT,   -- Compresión alta velocidad (clics)
  shock_compression_low      INT,   -- Compresión baja velocidad (clics)
  shock_rebound              INT,
  -- Notas
  setting_notes       TEXT,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE moto_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own settings" ON moto_settings FOR ALL USING (auth.uid() = user_id);
```

### Tabla `moto_settings_history` (historial de cambios de setup)
```sql
CREATE TABLE moto_settings_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,   -- Nombre del setup, ej: "Circuito de Jerez - Seco"
  date                DATE NOT NULL,
  condition           TEXT NOT NULL CHECK (condition IN ('track_dry', 'track_wet', 'road', 'offroad', 'rain', 'other')),
  -- Carburación
  main_jet            TEXT,
  pilot_jet           TEXT,
  needle_clip         INT,
  air_screw           NUMERIC(4,2),
  fuel_mixture        TEXT,
  -- Horquilla
  fork_preload               INT,
  fork_compression           INT,   -- Compresión (clics)
  fork_rebound               INT,
  fork_oil_level             INT,
  fork_oil_type              TEXT,
  -- Amortiguador
  shock_preload              INT,
  shock_compression_high     INT,   -- Compresión alta velocidad (clics)
  shock_compression_low      INT,   -- Compresión baja velocidad (clics)
  shock_rebound              INT,
  -- Valoración y notas
  feeling_rating      INT CHECK (feeling_rating BETWEEN 1 AND 5),  -- 1-5 estrellas
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE moto_settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own history" ON moto_settings_history FOR ALL USING (auth.uid() = user_id);
```

### Tabla `session_notes` (notas de sesión / día de pista)
```sql
CREATE TABLE session_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  location        TEXT,                 -- Circuito o lugar
  condition       TEXT NOT NULL CHECK (condition IN ('track_dry', 'track_wet', 'road', 'offroad', 'rain', 'other')),
  km_start        INT,
  km_end          INT,
  setting_id      UUID REFERENCES moto_settings_history(id),  -- Setup usado
  title           TEXT NOT NULL,
  content         TEXT,                 -- Texto libre: sensaciones, problemas, mejoras
  feeling_rating  INT CHECK (feeling_rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sessions" ON session_notes FOR ALL USING (auth.uid() = user_id);
```

---

## Páginas y funcionalidades

### `/` — Home (Lista de vehículos)
- Header con título "Aelfwine's Garage" y logo/icono
- Lista de VehicleCards (scroll vertical)
- Cada card muestra: imagen/icono del tipo, nombre, modelo, año, km actuales, badge del próximo mantenimiento (próximo / al día / vencido)
- FAB (Floating Action Button) naranja para añadir nuevo vehículo
- Swipe-to-delete o botón de eliminar con confirmación modal
- Estado vacío con ilustración si no hay vehículos

### `/vehicles/new` — Añadir vehículo
Formulario por pasos (stepper de 2-3 pasos):

**Paso 1 - Datos básicos**
- Tipo de vehículo (car / moto / van / truck / other) con iconos seleccionables
- Nombre/alias (ej: "Mi 125 azul")
- Marca + Modelo
- Año
- Matrícula (opcional)

**Búsqueda automática de imagen** (se activa al rellenar Marca + Modelo + Año):
- En cuanto los tres campos tienen valor, hacer una llamada a la **API de Google Custom Search** (tipo `searchType=image`) con la query `"{marca} {modelo} {año}"`.
- Mostrar un grid de 6 miniaturas seleccionables debajo del formulario.
- El usuario toca la imagen que prefiere → queda marcada con un borde naranja.
- Opción "Subir mi propia foto" como alternativa (input file → Supabase Storage).
- Si la búsqueda falla o el usuario omite este paso, el vehículo se crea con un icono genérico según su tipo.
- La imagen seleccionada se guarda como URL externa en `vehicles.photo_url`. No se descarga ni almacena en Supabase Storage (a menos que el usuario suba la suya).
- Variables de entorno necesarias:
  ```env
  VITE_GOOGLE_CSE_API_KEY=your_google_api_key
  VITE_GOOGLE_CSE_CX=your_custom_search_engine_id
  ```
- Endpoint: `https://www.googleapis.com/customsearch/v1?key={KEY}&cx={CX}&searchType=image&q={query}&num=6`

**Paso 2 - Datos técnicos**
- Motorización (texto libre, ej: "1.6 TDI 115cv")
- Tipo de aceite (ej: "5W-40 Full Synthetic")
- Cantidad de aceite (litros)
- Intervalo de mantenimiento en km
- Intervalo de mantenimiento en días
- km actuales
- Notas (textarea)

**Paso 3 - Confirmación**
- Resumen de los datos
- Botón "Guardar vehículo"

### `/vehicles/:id` — Detalle del vehículo
- Header con nombre del vehículo, modelo, año
- Tabs o secciones:
  1. **Resumen**: datos técnicos, km actuales, próximos mantenimientos
  2. **Mantenimiento ordinario**: lista cronológica de intervenciones (cambio aceite, líquidos, filtros, etc.)
  3. **Mantenimiento extraordinario**: lista de reparaciones / recambios importantes
  4. **Settings moto** (solo si `type === 'moto'`): carburación + suspensión
- FAB para añadir nueva entrada de mantenimiento

### `/vehicles/:id/maintenance/new` — Añadir mantenimiento
- Toggle ordinario / extraordinario
- Selector de categoría con iconos
- Campos: título, descripción, fecha (date picker), km actuales, coste, taller, piezas usadas
- Para ordinario: fecha próxima revisión y/o km próxima revisión

### `/vehicles/:id/settings` — Settings moto (configuración activa)
- Formulario dividido en secciones colapsables: **Carburación** | **Horquilla** | **Amortiguador**
- Cada campo con su etiqueta y unidad (vueltas, clics, mm, etc.)
- Botón "Guardar como snapshot" → crea entrada en `moto_settings_history` con nombre, fecha y condición
- Botón "Aplicar desde historial" → carga un setup guardado como configuración activa

### `/vehicles/:id/settings/history` — Historial de setups
- Lista de todos los snapshots guardados, ordenados por fecha
- Cada item muestra: label, fecha, condición (icono pista / lluvia / calle), valoración con estrellas
- **Comparador**: seleccionar 2 setups con checkbox → botón "Comparar" abre tabla diff lado a lado que resalta en naranja los campos que difieren
- Acción: eliminar snapshot, duplicar snapshot, editar label

### `/vehicles/:id/sessions` — Notas de sesión
- Lista de sesiones (días de pista, salidas, eventos)
- Cada nota muestra: título, fecha, ubicación, condición, km recorridos, valoración, preview del texto
- Formulario para crear/editar: título, fecha, lugar, condición (selector con iconos), km inicio/fin, textarea libre, valoración 1-5, selector de setup asociado
- Enlace entre sesión y el setup de ese día

### `/vehicles/:id/qr` — Código QR del vehículo
- QR grande centrado en pantalla que enlaza a `/vehicles/:id` (URL pública o deep link)
- Nombre y modelo del vehículo debajo del QR
- Botón "Descargar QR" → genera imagen PNG para imprimir y pegar en el vehículo
- Botón "Compartir" (Web Share API en móvil)

### `/vehicles/:id/export` — Exportar a PDF
- Previsualización de lo que se incluirá en el PDF:
  - ✅ Ficha técnica del vehículo
  - ✅ Historial mantenimiento ordinario
  - ✅ Historial mantenimiento extraordinario
  - ✅ Setups de suspensión/carburación (solo motos)
  - ✅ Notas de sesión (solo motos)
- Filtro de fecha: exportar todo o rango de fechas
- Botón "Generar PDF" → descarga directa

---

## Componentes UI clave

### `VehicleCard`
```
┌─────────────────────────────────────┐
│ 🏍️  Mi 125 azul              [···]  │
│     Honda CB125F · 2021             │
│     ──────────────────────────────  │
│     47.230 km          ⚠️ Revisar   │
└─────────────────────────────────────┘
```

### `MaintenanceItem`
```
┌─────────────────────────────────────┐
│ 🔧 Cambio de aceite    12/04/2025   │
│    5W-40 · 4.5L                     │
│    47.000 km · 85€                  │
│    Próx: 52.000 km                  │
└─────────────────────────────────────┘
```

### `StatusBadge`
- 🟢 Verde: al día
- 🟡 Amarillo: próximo (dentro del intervalo)
- 🔴 Rojo: vencido (superado el intervalo)

### `SettingsComparator`
Tabla de dos columnas (Setup A | Setup B) que muestra todos los parámetros en filas. Las celdas con valores distintos se resaltan con fondo naranja suave. Ejemplo:

```
┌──────────────────┬───────────────┬───────────────┐
│ Parámetro        │ Jerez (Seco)  │ Aragón (Lluv) │
├──────────────────┼───────────────┼───────────────┤
│ Main jet         │ 118           │ 118           │
│ Pilot jet        │ 38            │ 35            │  ← resaltado
│ Aguja (clip)     │ 3             │ 4             │  ← resaltado
│ Precarga hork.   │ 8 clics       │ 8 clics       │
│ Compresión hork. │ 12 clics      │ 10 clics      │  ← resaltado
└──────────────────┴───────────────┴───────────────┘
```

### `IntervalCalculator` (widget flotante o inline)
Muestra en tiempo real:
- Km desde el último servicio: `current_km - last_service_km`
- Días desde el último servicio
- Km restantes para el próximo: `interval_km - km_since_service`
- Días restantes para el próximo
- Barra de progreso visual (verde → amarillo → rojo)

### `ConditionBadge` (condiciones de pista/calle)
| key | Etiqueta | Icono |
|-----|----------|-------|
| `track_dry` | Pista seca | 🏁 |
| `track_wet` | Pista mojada | 🏁🌧️ |
| `road` | Carretera | 🛣️ |
| `offroad` | Offroad | 🌲 |
| `rain` | Lluvia | 🌧️ |
| `other` | Otro | 📍 |

---

## Estructura del PDF exportado

Usar `@react-pdf/renderer`. El documento tiene las siguientes secciones:

```
AELFWINE'S GARAGE — Ficha de vehículo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Datos del vehículo]
Nombre: Mi 125 azul
Marca/Modelo: Honda CB125F
Año: 2021 | Matrícula: B-1234-XY
Motor: 125cc monocilíndrico
Aceite: 5W-40 · 1.2L
Intervalo: cada 3.000 km o 6 meses
km actuales: 47.230

[Mantenimiento ordinario]
─────────────────────────────────────
Fecha       Tipo              km      Coste
12/04/2025  Cambio aceite   47.000    85€
15/01/2025  Líq. frenos     44.500    30€
...

[Mantenimiento extraordinario]
─────────────────────────────────────
Fecha       Tipo              km      Coste
03/03/2025  Pastillas freno 46.000   120€
...

[Setups de suspensión / carburación]  ← solo motos
─────────────────────────────────────
Setup: "Circuito de Jerez - Seco" | 15/06/2024 | ⭐⭐⭐⭐
  Carburación: Main 118 | Pilot 38 | Aguja clip 3 | Aire 2.5v
  Horquilla: Precarga 8 | Comp 12 | Ext 10
  Amortiguador: Precarga 4 | Comp 8 | Ext 6
  Notas: Buena tracción en seco, un punto más de precarga trasera...

[Notas de sesión]  ← solo motos
─────────────────────────────────────
15/06/2024 — Circuito de Jerez 🏁 — ⭐⭐⭐⭐
  47.000 → 47.350 km (350 km)
  Setup: "Jerez - Seco"
  Gran día, temperatura alta, asfalto con grip...

─────────────────────────────────────
Generado por Aelfwine's Garage · 03/06/2026
```

---

## Lógica de negocio

### Cálculo de estado de mantenimiento
```typescript
function getMaintenanceStatus(vehicle: Vehicle, lastLog: MaintenanceLog | null): 'ok' | 'due_soon' | 'overdue' {
  if (!lastLog) return 'overdue';
  
  const kmSinceService = vehicle.current_km - (lastLog.km_at_service ?? 0);
  const daysSinceService = differenceInDays(new Date(), new Date(lastLog.date));
  
  const kmThreshold = vehicle.maintenance_interval_km ?? Infinity;
  const daysThreshold = vehicle.maintenance_interval_days ?? Infinity;
  
  if (kmSinceService >= kmThreshold || daysSinceService >= daysThreshold) return 'overdue';
  if (kmSinceService >= kmThreshold * 0.85 || daysSinceService >= daysThreshold * 0.85) return 'due_soon';
  return 'ok';
}
```

---

## Categorías predefinidas

### Mantenimiento ordinario
| key | Etiqueta ES | Icono |
|-----|-------------|-------|
| `oil_change` | Cambio de aceite | 🛢️ |
| `brake_fluid` | Líquido de frenos | 🔴 |
| `coolant` | Líquido refrigerante | 🌡️ |
| `air_filter` | Filtro de aire | 💨 |
| `fuel_filter` | Filtro de combustible | ⛽ |
| `spark_plugs` | Bujías | ⚡ |
| `timing_belt` | Correa de distribución | ⚙️ |
| `gearbox_oil` | Aceite de caja | 🔩 |
| `other` | Otro | 🔧 |

### Mantenimiento extraordinario
| key | Etiqueta ES | Icono |
|-----|-------------|-------|
| `tires` | Neumáticos | 🔵 |
| `brake_pads` | Pastillas de freno | 🟤 |
| `brake_discs` | Discos de freno | ⭕ |
| `battery` | Batería | 🔋 |
| `clutch` | Embrague | ⚙️ |
| `suspension` | Suspensión | 🔧 |
| `exhaust` | Escape | 💨 |
| `bodywork` | Carrocería | 🚗 |
| `electrical` | Sistema eléctrico | ⚡ |
| `other` | Otro | 🛠️ |

---

## Variables de entorno

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Comandos de desarrollo

```bash
npm create vite@latest aelfwines-garage -- --template react-ts
cd aelfwines-garage
npm install @supabase/supabase-js react-router-dom zustand date-fns lucide-react react-hot-toast
npm install @react-pdf/renderer qrcode.react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev
```

---

## Configuración de Tailwind

Añadir en `tailwind.config.js`:
```js
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

## Notas de implementación

1. **RLS activado** en todas las tablas. Cada usuario ve solo sus propios datos.
2. **Sin auth en MVP**: se puede empezar con un `user_id` fijo en desarrollo y añadir Supabase Auth después.
3. **Imágenes de vehículos**: usar Supabase Storage, bucket `vehicle-photos`.
4. **Offline / PWA**: añadir `vite-plugin-pwa` para uso desde móvil sin conexión (fase 2).
5. **i18n**: app en español por defecto. Preparar estructura para múltiples idiomas en fase 2.
6. **Accesibilidad**: usar `aria-label` en todos los botones de icono, contraste suficiente, tap targets mínimo 44px.
7. **Animaciones**: transiciones de página con fade suave (100-150ms), skeleton loaders en las listas.
8. **QR**: la URL del QR debe apuntar a la versión desplegada de la app. En desarrollo usar `window.location.origin + '/vehicles/' + id`. El QR se genera client-side con `qrcode.react`; la descarga PNG se hace con `canvas.toDataURL()`.
9. **Exportación PDF**: `@react-pdf/renderer` genera el PDF en el browser sin servidor. El componente `VehiclePDFDocument` recibe todos los datos como props. Usar `PDFDownloadLink` para el botón de descarga. Fuente del PDF: Helvetica (built-in) para máxima compatibilidad.
10. **Comparador de setups**: cargar los dos snapshots seleccionados en memoria y comparar campo a campo con una función `diffSettings(a, b)` que devuelve un mapa `{ campo: { a, b, changed: boolean } }`.
11. **Notas de sesión**: el campo `setting_id` es opcional (FK nullable). Si se asocia un setup, mostrar un enlace directo al snapshot desde la nota.
12. **Snapshot de settings**: al guardar un snapshot desde la página de settings activos, copiar todos los campos del `moto_settings` actual a `moto_settings_history` junto con label, fecha y condición elegida por el usuario.
