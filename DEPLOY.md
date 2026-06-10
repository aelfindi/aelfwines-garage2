# Aelfwine's Garage - Operaciones VPS

Referencia rapida para mantener y desplegar la app en el VPS de produccion.

---

## Acceso

```bash
ssh root@187.33.147.146
su - aelfwine-garage     # cambiar al user del sitio
cd /home/aelfwine-garage/htdocs/garage.aelfwine.info
```

**URL temporal:** `http://187.33.147.146:3002` (hasta tener dominio + HTTPS)

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

## Configurar dominio + HTTPS (cuando compres el dominio)

### 1. DNS
- Apuntar A record de `garage.tudominio.tld` a `187.33.147.146`
- Esperar propagacion (5-30 min). Verifica con `dig garage.tudominio.tld +short` o `nslookup`.

### 2. Editar el sitio en el panel del VPS
Si el panel permite "Edit domain": cambia `garage.aelfwine.info` por el dominio real. Esto suele actualizar:
- `server_name` en nginx
- Nombre del directorio htdocs (cuidado: rompe paths)
- Path de logs

Si NO permite cambiar dominio: crear sitio nuevo, mover codigo y `uploads/`, reconfigurar `.env` y PM2 con el path nuevo.

### 3. Instalar certbot + emitir Let's Encrypt
Si el panel emite el cert: usar la UI del panel.

Si manual (como root):
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d garage.tudominio.tld
```

### 4. Actualizar variables de entorno
Como `aelfwine-garage`:
```bash
cd /home/aelfwine-garage/htdocs/garage.aelfwine.info
sed -i 's|^VITE_API_URL=.*|VITE_API_URL=/api|' .env
sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://garage.tudominio.tld|' server/.env

# Rebuild frontend + restart
./deploy.sh
```

### 5. Cerrar puerto 3002 al publico (ya no se accede directo)
Como root:
```bash
ufw delete allow 3002/tcp
ufw status
```

### 6. Verifica
- `https://garage.tudominio.tld` carga la app
- Login funciona
- En Android: Menu Chrome -> "Instalar app" (aparece el prompt PWA)
- Tras instalar, el icono abre en modo standalone (sin barra Chrome)

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
- Verifica `ADMIN_EMAIL` y `ADMIN_PASSWORD_HASH` en `server/.env`
- Si dudas del hash, regeneralo (ver "Cambiar la password admin")
- Tras editar `.env`, **siempre** `pm2 restart garage-api --update-env` (sin `--update-env` no recarga env vars)

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

- [ ] Comprar dominio definitivo (aelfwine.eu u otro) y configurar HTTPS via Let's Encrypt
- [ ] Generar migraciones Prisma versionadas (actualmente `db push`)
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
| Puerto Express | 3002 |
| nginx config | `/etc/nginx/sites-enabled/garage.aelfwine.info.conf` |
| Logs nginx | `/home/aelfwine-garage/logs/nginx/` |
| SSL cert | `/etc/nginx/ssl-certificates/garage.aelfwine.info.{crt,key}` (self-signed, placeholder) |
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
