# Agraas — plataforma

Gestão fiscal, contábil e rastreio individual para a pecuária bovina brasileira.

- **Como trabalhar aqui, stack, regras:** [`CLAUDE.md`](CLAUDE.md)
- **Onde estamos (página viva):** [`docs/STATUS.md`](docs/STATUS.md)
- **Decisões paradas:** [`docs/decisoes/pendentes.md`](docs/decisoes/pendentes.md)
- **Raio-x de manutenção:** [`docs/manutencao/`](docs/manutencao/)

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # jest
npx tsc --noEmit     # typecheck
npm run lint:migrations
```

Produção: `agraas-platform.vercel.app` (deploy automático por push em `main`).
Migrations: `supabase/migrations/` — aplicar só com ordem expressa (ver CLAUDE.md).
