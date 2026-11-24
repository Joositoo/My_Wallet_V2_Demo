# MyWallet · Demo

Versión **demo** de [MyWallet V2](https://github.com/Joositoo/My_Wallet_V2), una aplicación web de finanzas personales hecha con Next.js: ingresos, gastos, suscripciones, deudas, categorías y un dashboard con métricas.

Esta demo **no necesita base de datos ni servidor**. Todo el backend está simulado en el navegador, así que puedes ver y usar la aplicación tal y como funcionaría con la base de datos real.

## Cómo funciona

- Las páginas son las mismas que las de la versión completa y siguen haciendo `fetch("/api/...")`.
- `src/lib/demo/fetchShim.js` intercepta esas llamadas y las resuelve con `src/lib/demo/handlers.js`, que replica las validaciones, códigos de error y formato de respuesta de la API real.
- Los datos viven en `localStorage` (`src/lib/demo/store.js`), por lo que los cambios persisten al recargar y cada visitante tiene su propia copia.
- `src/lib/demo/seed.js` genera datos de ejemplo **relativos a la fecha actual** (12 meses de historial, 4 suscripciones y 3 deudas en distintos estados: activa, retrasada y liquidada). Se regeneran automáticamente cuando cambia el mes.
- El botón **Restablecer demo** (barra lateral o aviso inferior) devuelve los datos al estado inicial.
- No hay login: la demo entra directamente al dashboard.

## Diferencias con la versión completa

| | Versión completa | Demo |
|---|---|---|
| Datos | MySQL / MariaDB | localStorage del navegador |
| Autenticación | NextAuth (credenciales + JWT) | Ninguna |
| API | Rutas `/api` de Next.js | Simulada en el cliente |
| Despliegue | Servidor Node + base de datos | Sitio estático (`output: "export"`) |

## Ejecutar en local

```bash
npm install
npm run dev        # http://localhost:3000
```

## Generar el sitio estático

```bash
npm run build      # genera la carpeta out/
npm run preview    # sirve out/ en local
```

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Recharts · Lucide · date-fns
