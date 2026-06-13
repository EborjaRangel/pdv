# Deploy paso a paso: Railway (API + BD) + Vercel (Frontend)

```
Usuario → Vercel (Next.js) → Railway (Express) → PostgreSQL (Railway)
```

---

## Antes de empezar — checklist

- [ ] Código subido a GitHub (`https://github.com/EborjaRangel/pdv`)
- [ ] Cuenta en [railway.app](https://railway.app)
- [ ] Cuenta en [vercel.com](https://vercel.com)
- [ ] Inventa un `AUTH_SECRET` largo (mín. 32 caracteres) y **guárdalo** — lo usarás en Railway **y** Vercel

Ejemplo de secreto (cámbialo por uno propio):

```
IZofufm1LP3eRR1QB-vZmMmQ4lo4IDVX0ELu2pRpvdI
```

---

## PASO 1 — Subir el código a GitHub

Si tienes cambios locales sin subir:

```powershell
cd c:\Users\Administrador\Desktop\pdv
git add .
git commit -m "Preparar deploy Railway + Vercel"
git push origin main
```

---

## PASO 2 — Railway: PostgreSQL

1. [railway.app](https://railway.app) → **New Project**
2. **Add Service** → **Database** → **PostgreSQL**
3. Clic en el servicio → **Settings** → renombra a `postgres`

---

## PASO 3 — Railway: Backend (API)

### 3.1 Crear servicio

1. En el **mismo proyecto** → **+ New** → **GitHub Repo**
2. Elige el repo **`pdv`**
3. Renombra el servicio a **`pdv-api`**

### 3.2 Root Directory (MUY IMPORTANTE)

1. Servicio **`pdv-api`** → **Settings**
2. **Root Directory** → escribe:

```
backend
```

3. **Save**

> Si no pones `backend`, Railway despliega Next.js y falla.

### 3.3 Variables de entorno

Servicio **`pdv-api`** → **Variables** → agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` *(Add Reference → postgres)* |
| `AUTH_SECRET` | Tu secreto largo (el mismo en Vercel) |
| `FRONTEND_URL` | `http://localhost:3000` *(temporal, lo cambias en paso 6)* |
| `API_PUBLIC_URL` | *(vacío por ahora)* |

### 3.4 URL pública del API

1. **`pdv-api`** → **Settings** → **Networking**
2. **Generate Domain**
3. Copia la URL, ejemplo:

```
https://pdv-api-production-xxxx.up.railway.app
```

4. Vuelve a **Variables** y pon:

| Variable | Valor |
|----------|-------|
| `API_PUBLIC_URL` | `https://pdv-api-production-xxxx.up.railway.app` |

### 3.5 Verificar Railway

Espera deploy **Success** (verde). Abre en el navegador:

```
https://TU-URL-RAILWAY.app/health
```

Debe responder:

```json
{"ok":true}
```

Login inicial (creado automáticamente):

| Email | Contraseña |
|-------|------------|
| `admin@pdv.local` | `admin123` |

---

## PASO 4 — Vercel: Frontend

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Importa el repo **`pdv`**
3. **Root Directory:** dejar vacío (raíz del repo)
4. Framework: **Next.js** (auto)

### Variables de entorno en Vercel

**Settings → Environment Variables** (Production):

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | URL de Railway **sin** `/` final |
| `AUTH_SECRET` | **Exactamente el mismo** que en Railway |

Ejemplo:

```
NEXT_PUBLIC_API_URL=https://pdv-api-production-xxxx.up.railway.app
AUTH_SECRET=IZofufm1LP3eRR1QB-vZmMmQ4lo4IDVX0ELu2pRpvdI
```

5. Clic **Deploy**
6. Copia la URL de producción, ejemplo:

```
https://pdv.vercel.app
```

---

## PASO 5 — Probar Vercel (fallará login si falta paso 6)

Abre `https://TU-APP.vercel.app/login`

Si el login no funciona todavía, es normal — falta CORS (siguiente paso).

---

## PASO 6 — Enlazar front y back (CORS)

1. Railway → servicio **`pdv-api`** → **Variables**
2. Edita **`FRONTEND_URL`**:

```
https://TU-APP.vercel.app
```

Sin `/` al final. Si tienes varias URLs:

```
https://pdv.vercel.app,https://pdv-git-main-eborjarangel.vercel.app
```

3. Railway redeploya solo. Espera **Success**.

---

## PASO 7 — Verificación final

1. Abre la URL de **Vercel** → `/login`
2. Entra con `admin@pdv.local` / `admin123`
3. **Caja** → Abrir caja del día
4. **Pedidos** → crear pedido → debe ir a Caja
5. **Caja** → cobrar
6. **Cocina** → marcar y entregar

---

## Errores comunes (2ª vez que falla)

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Railway build falla en Next.js | Root Directory no es `backend` | Paso 3.2 |
| `/health` no responde en Railway | Deploy falló o sin dominio | Paso 3.4, revisar logs |
| Login en Vercel no funciona | `FRONTEND_URL` mal o distinto `AUTH_SECRET` | Pasos 3.3, 4 y 6 |
| "No hay conexión con el API" | `NEXT_PUBLIC_API_URL` mal en Vercel | Paso 4, redeploy Vercel |
| CORS error en consola del navegador | `FRONTEND_URL` no coincide con URL de Vercel | Paso 6 — URL **exacta** con `https://` |
| `AUTH_SECRET` distintos | JWT inválido tras login | Mismo valor en Railway y Vercel |

---

## Variables — resumen final

**Railway (`pdv-api`):**

```
DATABASE_URL=${{postgres.DATABASE_URL}}
AUTH_SECRET=tu-secreto
FRONTEND_URL=https://tu-app.vercel.app
API_PUBLIC_URL=https://tu-api.up.railway.app
```

**Vercel:**

```
NEXT_PUBLIC_API_URL=https://tu-api.up.railway.app
AUTH_SECRET=tu-secreto
```

---

## Desarrollo local

```powershell
# Terminal 1
cd backend
copy .env.example .env
npm run db:setup
npm run dev

# Terminal 2
cd ..
copy .env.example .env
npm run dev
```

- Frontend: http://localhost:3000  
- API: http://localhost:4000

---

## Notas

- Tras cambiar variables en Vercel → **Redeploy**
- Tras cambiar variables en Railway → redeploy automático
- Imágenes de platillos en Railway se pierden al redeploy (disco efímero)
- No subas `.env` a GitHub
