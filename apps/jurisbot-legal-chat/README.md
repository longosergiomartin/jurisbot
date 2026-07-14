# JurisBot — chat de jurisprudencia argentina

Proyecto independiente de Cognify (el resto de este repo). Es un chat que busca
fallos y resoluciones reales en SAIJ, CSJN y BCRA usando la herramienta de
búsqueda web nativa de Claude, restringida a esos tres dominios.

## Desarrollo local

```bash
cd apps/jurisbot-legal-chat
npm install
cp .env.example .env   # completar ANTHROPIC_API_KEY
npm run dev
```

`npm run dev` levanta Vite, pero `api/chat.js` es una función serverless
(formato Vercel) — para probar el chat de punta a punta corré `vercel dev`
desde esta carpeta, o desplegá el proyecto en Vercel.

## Deploy

En Vercel, creá un proyecto nuevo apuntando a este repo con **Root Directory**
= `apps/jurisbot-legal-chat`, y configurá la variable de entorno
`ANTHROPIC_API_KEY`. Es un proyecto Vercel separado del de Cognify — no
comparte build ni dominio.
