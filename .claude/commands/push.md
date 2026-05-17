---
description: Push de commits limpos para origin/main (sem commitar nada novo)
---

Push de commits já feitos localmente, sem stagear nada.

Passos:

1. Rode em paralelo:
   - `git fetch origin main` (atualiza ref do remote)
   - `git log origin/main..HEAD --oneline` (commits a pushar)
   - `git status --porcelain` (working tree)
2. **Se não houver commits para pushar** (output vazio do segundo comando), reporte "nada a pushar" e pare.
3. **Se working tree não estiver limpo**, alerte o usuário com a lista de mudanças não commitadas mas siga em frente com o push (não bloqueia). O usuário decide se quer rodar `/checkpoint` depois.
4. Execute `git push origin main`.
5. Reporte: range pushado (ex. `abc1234..def5678`), quantos commits, mudanças pendentes (se houver).
