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

1. En el mismo proyecto: **Add Service → GitHub Repo** → elige tu repo `pdv`.
2. **Settings → Root Directory**: `backend`
3. **Settings → Networking → Generate Domain** → copia la URL (ej. `https://pdv-api-production.up.railway.app`).

### Variables de entorno del servicio API

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | Referencia al PostgreSQL de Railway (`${{Postgres.DATABASE_URL}}`) |
| `AUTH_SECRET` | Secreto largo aleatorio (mín. 32 caracteres). **Guárdalo.** |
| `FRONTEND_URL` | Por ahora `http://localhost:3000` (la actualizas después de Vercel) |
| `API_PUBLIC_URL` | URL pública del API (sin `/` final) |
| `PORT` | Railway lo inyecta solo; puedes omitirlo |

4. **Deploy**. Al arrancar ejecuta `db:push`, `db:seed` y levanta el servidor (`backend/railway.toml`).
5. Verifica: abre `https://TU-API.up.railway.app/health` → debe responder `{"ok":true}`.

### Usuario inicial (seed)

- **Email:** `admin@pdv.local`
- **Contraseña:** `admin123`  
  Cambia la contraseña después del primer acceso en producción.

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
