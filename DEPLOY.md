# Publicar PDV: Railway (API + BD) + Vercel (Frontend)

## Arquitectura

```
[Celular/PC] → Vercel (Next.js) → Railway (Express) → PostgreSQL (Railway)
```

---

## Paso 0 — Subir el código a GitHub

El proyecto debe estar en un repositorio de GitHub (Railway y Vercel se conectan desde ahí).

```powershell
cd c:\Users\Administrador\Desktop\pdv
git init
git add .
git commit -m "PDV restaurante - frontend Next.js y backend Express"
```

1. Crea un repo vacío en [github.com/new](https://github.com/new) (sin README).
2. Conecta y sube:

```powershell
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pdv.git
git push -u origin main
```

---

## Paso 1 — Railway: PostgreSQL

1. Entra a [railway.app](https://railway.app) → **New Project**.
2. **Add Service → Database → PostgreSQL**.
3. Abre el servicio PostgreSQL → pestaña **Variables** → copia `DATABASE_URL` (o usa **Connect**).

---

## Paso 2 — Railway: Backend (API)

> **Antes de empezar:** ya debes tener el **Paso 0** (código en GitHub) y el **Paso 1** (PostgreSQL creado en el mismo proyecto Railway).

### 2.1 Crear el servicio del API

1. Entra a [railway.app](https://railway.app) e inicia sesión.
2. Abre el **mismo proyecto** donde creaste PostgreSQL en el Paso 1.
3. Arriba a la derecha, clic en **+ New** (o **Add Service**).
4. Elige **GitHub Repo**.
5. Si es la primera vez, Railway te pedirá **conectar tu cuenta de GitHub** → autoriza el acceso.
6. Busca y selecciona tu repositorio **`pdv`** (el que subiste en el Paso 0).
7. Railway creará un servicio nuevo. Verás dos cajas en el proyecto:
   - Una dice **Postgres** (o PostgreSQL)
   - Otra con el nombre de tu repo (ej. `pdv`)

**Tip:** renombra los servicios para no confundirte:
- Clic en el servicio PostgreSQL → **Settings** → **Service Name** → `postgres`
- Clic en el servicio del repo → **Settings** → **Service Name** → `pdv-api`

---

### 2.2 Decirle a Railway que el código del API está en `backend/`

1. Clic en el servicio **`pdv-api`** (no el de Postgres).
2. Ve a la pestaña **Settings**.
3. Baja hasta **Root Directory** (o **Source** → **Root Directory**).
4. Escribe exactamente:

```
backend
```

5. Clic en **Save** (o el botón de guardar que aparezca).

> Si no pones `backend`, Railway intentará desplegar el frontend (Next.js) y fallará.

---

### 2.3 Conectar la base de datos (variables de entorno)

1. Sigue en el servicio **`pdv-api`**.
2. Ve a la pestaña **Variables**.
3. Clic en **+ New Variable** (o **Raw Editor**) y agrega **una por una**:

| Variable | Qué poner | Ejemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Referencia al Postgres de Railway | `${{postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | Texto largo y aleatorio (mín. 32 caracteres) | `mi-secreto-super-largo-para-produccion-2026` |
| `FRONTEND_URL` | Temporal hasta tener Vercel | `http://localhost:3000` |
| `API_PUBLIC_URL` | Lo llenas en el paso 2.4 (déjalo vacío un momento) | *(pendiente)* |

#### Cómo poner `DATABASE_URL` correctamente

**Opción A — Referencia automática (recomendada):**

1. En **Variables** del servicio `pdv-api`, clic en **+ New Variable**.
2. Nombre: `DATABASE_URL`
3. En el valor, Railway muestra un botón **Add Reference** o un icono `{}`.
4. Elige el servicio **postgres** (tu PostgreSQL).
5. Selecciona la variable **`DATABASE_URL`**.
6. Railway escribirá algo como:

```
${{postgres.DATABASE_URL}}
```

> El nombre `postgres` debe coincidir con el **Service Name** de tu base de datos. Si lo renombraste distinto, usa ese nombre.

**Opción B — Copiar manual:**

1. Abre el servicio **postgres** → pestaña **Variables**.
2. Copia el valor completo de `DATABASE_URL`.
3. Pégalo en el servicio `pdv-api` como variable `DATABASE_URL`.

#### Sobre `AUTH_SECRET`

- Inventa una cadena larga (letras, números, símbolos).
- **Guárdala en un bloc de notas** — la necesitarás igual en Vercel (Paso 3).
- No uses `admin123` ni contraseñas cortas.

4. Después de agregar variables, Railway redeployará solo. Espera a que termine.

---

### 2.4 Crear la URL pública del API

1. En el servicio **`pdv-api`**, ve a **Settings**.
2. Baja a la sección **Networking** (o **Public Networking**).
3. Clic en **Generate Domain** (o **Add Public Domain**).
4. Railway te dará una URL como:

```
https://pdv-api-production-a1b2.up.railway.app
```

5. **Copia esa URL completa** (sin `/` al final).

6. Vuelve a **Variables** del servicio `pdv-api` y agrega o edita:

| Variable | Valor |
|----------|-------|
| `API_PUBLIC_URL` | `https://pdv-api-production-a1b2.up.railway.app` |

*(usa tu URL real, no este ejemplo)*

---

### 2.5 Verificar que el deploy funcionó

1. En el servicio **`pdv-api`**, abre la pestaña **Deployments**.
2. El último deploy debe decir **Success** / **Active** (verde).
3. Clic en el deploy → **View Logs** y revisa que aparezca algo como:

```
Prisma schema loaded...
The database is already in sync...
Admin creado: admin@pdv.local / admin123
PDV API listening on port XXXX
```

4. Abre en el navegador (cambia por tu dominio):

```
https://TU-DOMINIO.up.railway.app/health
```

Debe responder:

```json
{"ok":true}
```

5. Prueba también:

```
https://TU-DOMINIO.up.railway.app/api/health
```

También debe responder `{"ok":true}`.

#### Si el deploy falla

| Error en logs | Qué hacer |
|---------------|-----------|
| `datasource.url property is required` | Falta `DATABASE_URL` en Variables |
| `Authentication failed` (Prisma) | `DATABASE_URL` mal copiada; usa la referencia `${{postgres.DATABASE_URL}}` |
| Build falla en la raíz | **Root Directory** no es `backend` |
| `Application failed to respond` | Revisa logs; suele ser error de BD o variables faltantes |

---

### 2.6 Qué hace Railway al arrancar (automático)

El archivo `backend/railway.toml` ya está configurado:

1. **Build:** `npm install` + `npm run build`
2. **Start:** `npm run db:push` → crea tablas en PostgreSQL
3. **Start:** `npm run db:seed` → crea usuario admin y datos de ejemplo
4. **Start:** `npm start` → levanta el API en el puerto que Railway asigne

No necesitas ejecutar nada manualmente en la consola.

---

### 2.7 Usuario inicial (creado por el seed)

| Campo | Valor |
|-------|-------|
| Email | `admin@pdv.local` |
| Contraseña | `admin123` |

Cámbiala después del primer acceso en producción.

---

### 2.8 Resumen de variables del servicio `pdv-api`

Cuando termines el Paso 2, debes tener **exactamente** esto:

```
DATABASE_URL=${{postgres.DATABASE_URL}}
AUTH_SECRET=tu-secreto-largo-guardado-en-bloc
FRONTEND_URL=http://localhost:3000
API_PUBLIC_URL=https://tu-dominio.up.railway.app
```

> `FRONTEND_URL` la actualizarás en el **Paso 4** cuando tengas la URL de Vercel.

**Guarda la URL del API** — la usarás en Vercel como `NEXT_PUBLIC_API_URL`.

---

## Paso 3 — Vercel: Frontend

1. Entra a [vercel.com](https://vercel.com) → **Add New Project** → importa el repo `pdv`.
2. **Root Directory:** raíz del repo (dejar vacío / `.`).
3. Framework: **Next.js** (detectado automáticamente).

### Variables de entorno en Vercel

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | URL del API en Railway (sin `/` final) |
| `AUTH_SECRET` | **Exactamente el mismo** que en Railway |

4. **Deploy** y copia la URL de producción (ej. `https://pdv.vercel.app`).

---

## Paso 4 — Enlazar front y back (CORS)

Vuelve a **Railway → servicio API → Variables** y actualiza:

| Variable | Valor |
|----------|-------|
| `FRONTEND_URL` | URL de Vercel (ej. `https://pdv.vercel.app`) |

Si usas previews de Vercel, puedes poner varias URLs separadas por coma:

```
https://pdv.vercel.app,https://pdv-git-main-tuusuario.vercel.app
```

Redeploy del API en Railway después de cambiar variables.

---

## Paso 5 — Verificación

1. Abre la URL de Vercel → login con `admin@pdv.local` / `admin123`.
2. **Caja** → Abrir caja del día.
3. **Pedidos** → crear un pedido.
4. **Caja** → cobrar → imprimir tickets.
5. **Cocina** → marcar pedido y entregar.
6. **Admin → Corte** → revisar totales y cerrar (solo si no hay pendientes).

---

## Desarrollo local

**Terminal 1 — API:**

```powershell
cd backend
copy .env.example .env
# Edita DATABASE_URL y AUTH_SECRET
npm install
npm run db:setup
npm run dev
```

**Terminal 2 — Frontend:**

```powershell
cd ..
copy .env.example .env
npm install
npm run dev
```

- Frontend: http://localhost:3000  
- API: http://localhost:4000  

---

## CLI alternativa (opcional)

```powershell
# Vercel (desde la raíz del repo)
npx vercel login
npx vercel --prod

# Railway (desde backend/)
cd backend
npx @railway/cli login
npx @railway/cli init
npx @railway/cli up
```

---

## Notas importantes

- **`AUTH_SECRET` debe ser idéntico** en Railway y Vercel.
- **`FRONTEND_URL` en Railway** debe coincidir con la URL exacta de Vercel (CORS).
- **Imágenes de platillos** en Railway se guardan en disco efímero; al redeploy se pierden. Para producción conviene S3/Cloudinary más adelante.
- **No subas** `backend/.env` a GitHub (contiene contraseñas).
- Si cambias la URL de Vercel, actualiza `FRONTEND_URL` en Railway.
