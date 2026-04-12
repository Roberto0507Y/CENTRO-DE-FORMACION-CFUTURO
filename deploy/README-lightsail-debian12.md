# Despliegue C.FUTURO en AWS Lightsail Debian 12

Esta guia deja frontend y API en el mismo servidor:

- Frontend: Nginx sirve `client/dist`.
- Backend: PM2 ejecuta `dist/server.js` en `127.0.0.1:3000`.
- API publica: Nginx reenvia `/api/*` al backend.
- MySQL: instalado en el mismo VPS.

## 1. Paquetes base

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx git curl build-essential
```

Instala Node.js 22 o superior. Evita el Node viejo del repositorio por defecto de Debian si no cumple la version requerida por Vite.

Instala MySQL 8.x para evitar problemas con `utf8mb4_0900_ai_ci`. Si decides usar MariaDB, cambia la collation del schema a una compatible, por ejemplo `utf8mb4_unicode_ci`, antes de importarlo.

## 2. Base de datos

Entra a MySQL como administrador y crea un usuario de aplicacion:

```sql
CREATE DATABASE IF NOT EXISTS cfuturo CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'cfuturo_app'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON cfuturo.* TO 'cfuturo_app'@'localhost';
FLUSH PRIVILEGES;
```

Carga el schema completo:

```bash
mysql -u root -p < /var/www/cfuturo/db/schema_cfuturo_full.sql
```

Despues de aplicar migraciones, puedes reducir permisos y dejar solo `SELECT, INSERT, UPDATE, DELETE` si ya no haras cambios de estructura desde la app.

## 3. Proyecto

Sube el proyecto a:

```bash
/var/www/cfuturo
```

Instala dependencias y compila:

```bash
cd /var/www/cfuturo
npm ci
npm --prefix client ci
npm run build
VITE_API_URL=/api npm --prefix client run build
```

## 4. Variables de entorno

Copia `deploy/env.production.example` a `/var/www/cfuturo/.env` y llena valores reales:

```bash
cp deploy/env.production.example .env
nano .env
```

No uses `root` como usuario de MySQL para produccion. Usa `cfuturo_app`.

## 5. PM2

```bash
sudo npm install -g pm2
sudo mkdir -p /var/log/cfuturo
sudo chown -R $USER:$USER /var/log/cfuturo
pm2 start deploy/ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd
```

Cuando cambies codigo:

```bash
npm run build
VITE_API_URL=/api npm --prefix client run build
pm2 restart cfuturo-api
```

## 6. Nginx

```bash
sudo cp deploy/nginx.cfuturo.conf /etc/nginx/sites-available/cfuturo
sudo ln -s /etc/nginx/sites-available/cfuturo /etc/nginx/sites-enabled/cfuturo
sudo nginx -t
sudo systemctl reload nginx
```

Cuando tengas dominio, cambia esta linea:

```nginx
server_name _;
```

Por:

```nginx
server_name tudominio.com www.tudominio.com;
```

Y actualiza `.env`:

```env
FRONTEND_URL=https://tudominio.com
CORS_ORIGINS=https://tudominio.com
```

Despues recompila el frontend si cambiaste el origen de API.

## 7. Reglas en Lightsail

Abre en el firewall de Lightsail:

- `22/tcp` solo para SSH.
- `80/tcp` para HTTP.
- `443/tcp` cuando configures HTTPS.

No expongas `3000/tcp` ni `3306/tcp` publicamente. Node y MySQL deben quedarse internos.

## 8. Prueba rapida

```bash
curl http://127.0.0.1:3000/api/health
curl http://SERVER_IP/api/health
pm2 logs cfuturo-api
```

Luego prueba en navegador:

- Crear cuenta e iniciar sesion.
- Crear curso, tarea, material y anuncio.
- Subir comprobante PDF.
- Aprobar/rechazar pago.
- Entregar y calificar tarea.
- Descargar archivo protegido.

## IP temporal de pruebas

Mientras no tengas dominio, usa la IP publica de Lightsail:

```env
FRONTEND_URL=http://44.209.181.200
CORS_ORIGINS=http://44.209.181.200
```

Si MySQL esta en este mismo VPS, deja:

```env
DB_HOST=127.0.0.1
```

La IP privada `172.26.2.123` solo seria necesaria si otro recurso dentro de AWS/Lightsail necesita comunicarse con esta maquina por red privada.
