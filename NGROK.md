# Publicar PDV con ngrok (desde tu laptop)

Expone la app local a internet con dos túneles: **frontend** (3000) y **API** (4000).

## Requisitos

- PostgreSQL local con base `pdv` (ya configurada)
- [ngrok](https://ngrok.com/) instalado y cuenta gratuita
- Node.js

## Paso 1 — Token de ngrok

1. Entra a [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken)
2. Copia tu **Authtoken**

## Paso 2 — Configurar ngrok

```powershell
cd c:\Users\Administrador\Desktop\pdv
copy ngrok.yml.example ngrok.yml
```

Edita `ngrok.yml` y reemplaza `TU_NGROK_AUTHTOKEN` por tu token.

## Paso 3 — Levantar la app

**Terminal 1 — Backend:**

```powershell
cd c:\Users\Administrador\Desktop\pdv\backend
npm run dev
```

**Terminal 2 — Frontend:**

```powershell
cd c:\Users\Administrador\Desktop\pdv
npm run dev
```

**Terminal 3 — ngrok:**

```powershell
cd c:\Users\Administrador\Desktop\pdv
.\scripts\ngrok-start.ps1
```

El script muestra la URL pública de la app y actualiza `.env` y `backend/.env`.

## Paso 4 — Reiniciar backend y frontend

Después del script, **detén y vuelve a iniciar** las terminales 1 y 2 (`Ctrl+C` y otra vez `npm run dev`).

Esto aplica:
- `NEXT_PUBLIC_API_URL` → URL ngrok del API
- `FRONTEND_URL` → URL ngrok del frontend (CORS)

## Paso 5 — Compartir

Abre la URL **web** que muestra el script (ej. `https://xxxx.ngrok-free.app`).

Login: `admin@pdv.local` / `admin123`

---

## Notas

- Las URLs de ngrok **cambian** cada vez que reinicias ngrok (plan gratis). Vuelve a ejecutar el script y reinicia backend/frontend.
- Panel de ngrok: http://127.0.0.1:4040
- Tu laptop debe estar encendida y con internet para que funcione.
- Plan de pago de ngrok permite dominio fijo.

## Manual (sin script)

```powershell
ngrok start --all --config ngrok.yml
```

Luego pon en `.env`:

```
NEXT_PUBLIC_API_URL=https://TU-TUNEL-API.ngrok-free.app
```

Y en `backend/.env`:

```
FRONTEND_URL=https://TU-TUNEL-WEB.ngrok-free.app
API_PUBLIC_URL=https://TU-TUNEL-API.ngrok-free.app
```

Reinicia backend y frontend.
