# Aelfwine's Garage - Operaciones VPS

Referencia rapida para mantener y desplegar la app en el VPS de produccion.

---

## Acceso

```bash
ssh root@187.33.147.146
su - aelfwine-garage     # cambiar al user del sitio
cd /home/aelfwine-garage/htdocs/garage.aelfwine.info
```

**URL produccion:** `https://garage.aelfwine.eu` (dominio + HTTPS reales, ver seccion "Dominio + HTTPS" mas abajo). El puerto 3002 esta cerrado al exterior por firewall — solo accesible via `127.0.0.1` para el reverse-proxy de nginx.

---

## Deploy desde GitHub

Despues de pushear a `main`, en el VPS como `aelfwine-garage`:

```bash
cd /home/aelfwine-garage/htdocs/garage.aelfwine.info
./deploy.sh
```

El script hace:
1. `git pull origin main`
2. `npm install` + `npm run build` (frontend Vite)
3. `cd server`, `npm install`, `npx prisma generate`
4. Migraciones (si existen en `prisma/migrations/`)
5. `npm run build` del server
6. `pm2 restart garage-api` (o start si no existia)

---

## Monitorizar la app

```bash
pm2 list                              # estado general
pm2 logs garage-api                   # logs en vivo (Ctrl+C para salir)
pm2 logs garage-api --lines 100       # ultimas 100 lineas
pm2 monit                             # dashboard interactivo
curl -i http://127.0.0.1:3002/api/health   # healthcheck
```

Logs persistentes:
- `/home/aelfwine-garage/.pm2/logs/garage-api-out.log`
- `/home/aelfwine-garage/.pm2/logs/garage-api-error.log`

---

## Restart / Stop / Start

```bash
pm2 restart garage-api                # tras cambio de .env: --update-env
pm2 restart garage-api --update-env

pm2 stop garage-api                   # parar (queda en PM2 pero detenido)
pm2 start garage-api                  # arrancar

pm2 delete garage-api                 # borrar de PM2 (rara vez necesario)
pm2 start dist/index.js --name garage-api --update-env   # recrear (desde server/)
```

---

## Cambiar la password admin

Como `aelfwine-garage`:

```bash
cd /home/aelfwine-garage/htdocs/garage.aelfwine.info/server

# 1. Pon la password nueva en un archivo temporal
nano /tmp/newpass     # escribe la password, Ctrl+O, Enter, Ctrl+X

# 2. Genera el hash bcrypt
node -e "
const bcrypt = require('bcryptjs');
const fs = require('fs');
const pwd = fs.readFileSync('/tmp/newpass', 'utf8').replace(/\n$/, '');
console.log('Longitud:', pwd.length);
const hash = bcrypt.hashSync(pwd, 10);
console.log('HASH:', hash);
console.log('VERIFY:', bcrypt.compareSync(pwd, hash));
"

# 3. Copia el HASH y mete en .env
sed -i 's|^ADMIN_PASSWORD_HASH=.*|ADMIN_PASSWORD_HASH=PEGA_EL_HASH_AQUI|' .env
grep ADMIN_PASSWORD_HASH .env

# 4. Borra el archivo temporal
shred -u /tmp/newpass

# 5. Restart
pm2 restart garage-api --update-env
```

Guarda la password en tu gestor (1Password, Bitwarden, etc).

---

## Añadir un nuevo usuario

Desde `aelfwines-garage2` cada usuario tiene su propia cuenta con datos aislados (tabla `users` en Prisma). Para crear una cuenta nueva (p. ej. un beta tester) o resetear la password de una existente, como `aelfwine-garage`:

```bash
cd /home/aelfwine-garage/htdocs/garage.aelfwine.info/server
npm run create-user -- friend@example.com "una-password-fuerte"
```

Es un upsert por email: si la cuenta no existe la crea, si existe le cambia la password. No hay UI de registro — las cuentas se crean siempre asi, desde el VPS.

`ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` en `server/.env` ya no los lee `/api/auth/login` (que ahora consulta la tabla `users`) — quedaron solo como bootstrap, usados una vez por `scripts/backfill-admin-user.ts` durante la migracion a multi-usuario.

---

## Backups de la base de datos

Backup manual:
```bash
mysqldump -u garageUser -p'HqFnjful3ZFb0zZGsTxw' -h 127.0.0.1 aelfwinesGarage \
  > /home/aelfwine-garage/backups/garage_$(date +%Y%m%d_%H%M).sql
```

Restaurar:
```bash
mysql -u garageUser -p'HqFnjful3ZFb0zZGsTxw' -h 127.0.0.1 aelfwinesGarage \
  < /home/aelfwine-garage/backups/garage_YYYYMMDD_HHMM.sql
```

Backup automatico (cron del user aelfwine-garage):
```bash
crontab -e
# Añadir esta linea (backup diario a las 3:00):
0 3 * * * mysqldump -u garageUser -p'HqFnjful3ZFb0zZGsTxw' -h 127.0.0.1 aelfwinesGarage > /home/aelfwine-garage/backups/garage_$(date +\%Y\%m\%d).sql && find /home/aelfwine-garage/backups -name "garage_*.sql" -mtime +14 -delete
```

Los uploads (PDFs) tambien hay que backupearlos:
```bash
tar czf /home/aelfwine-garage/backups/uploads_$(date +%Y%m%d).tar.gz \
  -C /home/aelfwine-garage/htdocs/garage.aelfwine.info/server uploads/
```

---

## Dominio + HTTPS

`garage.aelfwine.eu` es el dominio real de produccion (comprado en cdmon el 2026-08-18). `garage.aelfwine.info` (el dominio anterior) **nunca quedo apuntado correctamente** — su DNS resolvia a una IP que no es este VPS — y su vhost/carpeta siguen existiendo solo porque ahi vive el codigo de la app (`/home/aelfwine-garage/htdocs/garage.aelfwine.info/`), no porque ese dominio funcione.

El sitio del dominio nuevo se hizo como un **reverse-proxy separado en CloudPanel**, sin mover nada del codigo/PM2 existente — sigue corriendo el mismo Express en `127.0.0.1:3002`, solo se le agrego un vhost+cert nuevo delante.

### 1. DNS (en el panel del registrador, ej. cdmon)
- A record: `garage` -> `187.33.147.146`
- Verificar propagacion: `dig garage.aelfwine.eu +short` (debe devolver la IP del VPS)

### 2. Crear el sitio en CloudPanel (como root, via `clpctl`)
```bash
clpctl site:add:reverse-proxy --domainName=garage.aelfwine.eu --reverseProxyUrl='http://127.0.0.1:3002' --siteUser=garage-eu --siteUserPassword="$(openssl rand -base64 24)"
```
Esto crea el vhost de nginx + un usuario Linux nuevo que no se usa para nada (solo requisito interno de CloudPanel). El `clpctl` no tiene comando para "agregar dominio alias" a un sitio existente — por eso se crea un sitio nuevo en vez de editar `garage.aelfwine.info`.

### 3. Certificado Let's Encrypt (como root)
```bash
clpctl lets-encrypt:install:certificate --domainName=garage.aelfwine.eu
```

### 4. Actualizar variables de entorno y redeploy
Como `aelfwine-garage`:
```bash
cd /home/aelfwine-garage/htdocs/garage.aelfwine.info
sed -i 's|^VITE_API_URL=.*|VITE_API_URL=https://garage.aelfwine.eu/api|' .env
sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://garage.aelfwine.eu|' server/.env
./deploy.sh
```

### 5. Cerrar puerto 3002 al publico
Como root — **ojo, dejar intacta la regla del puerto `3000`, es de `petits-exploradors`**:
```bash
ufw delete allow 3002/tcp
ufw status
```
El proxy interno sigue hablando por `127.0.0.1:3002`, eso no lo bloquea el firewall (solo filtra trafico externo).

### 6. Verificar
- `curl https://garage.aelfwine.eu/api/health` -> `{"ok":true}`
- Login funciona (probar con `curl` como en "Anadir un nuevo usuario", y tambien en el navegador — un intento inmediatamente despues del deploy puede fallar por cache del navegador, forzar `Ctrl+Shift+R`)
- Probar acceso directo a `http://187.33.147.146:3002` **desde fuera del VPS** (no desde la propia VPS — el trafico a la propia IP publica no pasa por las mismas reglas de `ufw`) — debe colgarse/fallar
- En Android: Menu Chrome -> "Instalar app" (prompt PWA)

---

## Anadir migraciones Prisma (cuando este listo)

Actualmente la DB esta gestionada por `prisma db push` (sin historial). Para tener migraciones versionadas:

**En local** (con MySQL local o tunel SSH al VPS):
```bash
cd server
DATABASE_URL=mysql://USER:PASS@HOST:3306/aelfwinesGarage \
  npx prisma migrate dev --name baseline
git add prisma/migrations/
git commit -m "chore(prisma): baseline migrations"
git push origin main
```

A partir de ahi `deploy.sh` aplicara las migraciones automaticamente con `prisma migrate deploy`.

---

## Troubleshooting

### "deploy.sh: Permission denied"
```bash
chmod +x deploy.sh
# Si tras un pull pierde el bit: ya esta marcado en el index de git, pero si vuelve a pasar:
git update-index --chmod=+x deploy.sh   # solo en local, commitea y pushea
```

### "Your local changes to ... would be overwritten by merge"
Suele ser `deploy.sh` con bit ejecutable cambiado, o `.env`/`dist/` con cambios. Descarta cambios locales:
```bash
git status
git checkout NOMBRE_ARCHIVO       # descarta cambios de ese archivo
git stash                          # descarta todo (recuperable con git stash pop)
./deploy.sh
```

### "P3005: The database schema is not empty"
Falla `prisma migrate deploy` porque no hay carpeta `prisma/migrations/`. Ya cubierto: `deploy.sh` salta migrate cuando no hay migraciones. Para reactivarlas, ver seccion "Anadir migraciones Prisma" arriba.

### App devuelve 502 / "Bad Gateway" tras deploy
PM2 puede haber muerto durante el restart. Verifica:
```bash
pm2 list
pm2 logs garage-api --lines 50    # ver error
pm2 restart garage-api --update-env
```

Si sigue caido, mira si el build del server salio bien:
```bash
ls -la server/dist/index.js
```

### Login devuelve "Invalid credentials"
- El login consulta la tabla `users` (Prisma), **no** `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` (esas variables son solo bootstrap, ver "Anadir un nuevo usuario")
- Resetea la password de la cuenta con `npm run create-user -- email password-nueva` (es un upsert, tambien sirve para esto)
- Tras editar `.env` a mano por otro motivo, **siempre** `pm2 restart garage-api --update-env` (sin `--update-env` no recarga env vars)

### MySQL: "Access denied for user"
Verifica grants:
```bash
sudo mysql -e "SHOW GRANTS FOR 'garageUser'@'%';"
```
Si falta: 
```bash
sudo mysql -e "GRANT ALL PRIVILEGES ON \`aelfwinesGarage\`.* TO 'garageUser'@'%'; FLUSH PRIVILEGES;"
```

### Disco lleno
```bash
df -h /
du -sh /home/aelfwine-garage/* | sort -h | tail
du -sh /home/aelfwine-garage/htdocs/garage.aelfwine.info/server/uploads/
```
Logs PM2 grandes:
```bash
pm2 flush garage-api    # vacia logs PM2
```

---

## Tareas pendientes / mejoras futuras

- [x] Comprar dominio definitivo y configurar HTTPS via Let's Encrypt — `garage.aelfwine.eu`, 2026-08-18
- [ ] Generar migraciones Prisma versionadas (actualmente `db push`)
- [ ] Decidir que hacer con el sitio/vhost viejo `garage.aelfwine.info` (dominio nunca funciono, pero el codigo vive en esa carpeta — no borrar sin migrar el path primero)
- [ ] Backup automatico DB + uploads via cron
- [ ] Rotar `service_role_key` de Supabase (expuesta en chat del 2026-06-09 durante migracion)
- [ ] Service worker + iconos PNG 192/512 para PWA install completo (necesita HTTPS antes)
- [ ] Code splitting del bundle frontend (warning de Vite, 1.6 MB)

---

## Datos de configuracion

| Recurso | Valor |
|---------|-------|
| VPS IP | `187.33.147.146` |
| OS | Ubuntu 24.04 LTS |
| User unix | `aelfwine-garage` (uid 1004) |
| Path codigo | `/home/aelfwine-garage/htdocs/garage.aelfwine.info/` |
| Path uploads | `.../server/uploads/` |
| PM2 daemon | `/home/aelfwine-garage/.pm2/` |
| Servicio systemd | `pm2-aelfwine-garage` (arranca en reboot) |
| PM2 proceso | `garage-api` |
| Puerto Express | 3002 (solo `127.0.0.1`, cerrado al exterior via `ufw`) |
| Dominio produccion | `garage.aelfwine.eu` (comprado en cdmon) |
| nginx config (dominio real) | `/etc/nginx/sites-enabled/garage.aelfwine.eu.conf` — sitio CloudPanel tipo reverse-proxy, siteUser `garage-eu` |
| nginx config (legacy, no funcional) | `/etc/nginx/sites-enabled/garage.aelfwine.info.conf` — el dominio nunca resolvio a este VPS, la carpeta se mantiene solo porque ahi vive el codigo |
| SSL cert | Let's Encrypt real para `garage.aelfwine.eu` (via `clpctl lets-encrypt:install:certificate`) |
| DB host | `127.0.0.1:3306` (MariaDB 10.11) |
| DB nombre | `aelfwinesGarage` |
| DB user | `garageUser@'%'` |
| Repo | `https://github.com/aelfindi/aelfwines-garage2` |

---

## Aislamiento del VPS

El mismo VPS hospeda otro proyecto: `petits-exploradors`. **No tocar nada de petits**:
- `/home/petitsexploradors-*` (o similar)
- `/etc/nginx/sites-enabled/petitsexploradors.aelfwine.info.conf`
- Su propio PM2 daemon (otro user unix)

Aelfwine's Garage usa user, paths, puerto y DB completamente separados.
