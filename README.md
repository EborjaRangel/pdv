# PDV Restaurante

Punto de venta web para restaurante de comida para llevar.

## Arquitectura

| Servicio | Plataforma | Carpeta |
|----------|------------|---------|
| Frontend (UI) | **Vercel** | raíz del repo |
| Backend (API) | **Railway** | `backend/` |
| Base de datos | **Railway PostgreSQL** | — |

## Desarrollo local

**Terminal 1 — API (puerto 4000):**

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

**Terminal 2 — Frontend (puerto 3000):**

```bash
cp .env.example .env
npm install
npm run dev
```

Login: `admin@pdv.local` / `admin123`

## Despliegue en producción

Guía paso a paso: **[DEPLOY.md](./DEPLOY.md)**

## Módulos

| Ruta | Rol | Función |
|------|-----|---------|
| `/pedidos` | Mesero, Cajero, Admin | Tomar pedidos |
| `/caja` | Cajero, Admin | Cobrar e imprimir |
| `/cocina` | Cocina, Admin | Ver pedidos |
| `/admin` | Admin | Platillos, usuarios, corte, config |

## Flujo

Tomar pedido → Cobrar → Imprimir 2 tickets (cliente + cocina)
