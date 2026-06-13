# Publicar PDV en internet

## Opcion recomendada: Cloudflare (sin pantalla de advertencia)

ngrok en plan gratis **bloquea los scripts de Next.js** y la app no arranca bien en el navegador.

Cloudflare Tunnel funciona sin ese problema.

### Pasos

**Terminal 1 — Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```powershell
npm run dev
```

**Terminal 3 — Tunel:**
```powershell
.\scripts\cloudflare-start.ps1
```

Reinicia backend y frontend tras el script. Abre la URL que muestra (ej. `https://xxxx.trycloudflare.com/login`).

Login: `admin@pdv.local` / `admin123`

---

## Red local (misma WiFi, sin tunel)

Si el celular o tablet esta en la misma red WiFi:

```
http://192.168.1.170:3000/login
```

(La IP puede cambiar; el script de Cloudflare la muestra al ejecutarse.)

En `.env` y `backend/.env` pon esa URL como `NEXT_PUBLIC_API_URL` y `FRONTEND_URL`, y reinicia ambos servicios.

---

## ngrok (alternativa, puede fallar en navegador)

Ver `NGROK.md`. Requiere pulsar **Visit Site** y aun asi a veces no carga JavaScript.

---

## Instalar cloudflared

```powershell
winget install Cloudflare.cloudflared
```
