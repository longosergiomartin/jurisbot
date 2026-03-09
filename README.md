# JurisBot 🇦🇷

Buscador de jurisprudencia argentina con IA. Conecta lenguaje natural con SAIJ, CSJN y BCRA.

## Deploy en Vercel

1. Subí este repositorio a GitHub
2. Importalo en [vercel.com](https://vercel.com)
3. En Vercel → Settings → Environment Variables, agregá:
   - `ANTHROPIC_API_KEY` = tu API key de [console.anthropic.com](https://console.anthropic.com)
4. Deploy ✓

## Desarrollo local

```bash
npm install
# Crear archivo .env.local con:
# ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```
