---
description: Roda npx tsc --noEmit no projeto inteiro e reporta erros agrupados por arquivo
---

Typecheck completo do projeto (diferente do hook PostToolUse, que filtra por path crítico).

Passos:

1. Execute `npx tsc --noEmit --pretty false 2>&1`.
2. Se output vazio: reporte "✅ Sem erros de tipo." e termine.
3. Se houver erros:
   - Conte total de linhas de erro
   - Agrupe por arquivo (linhas do formato `path/to/file.ts(L,C): error TS...`)
   - Liste os 10 arquivos com mais erros, com contagem
   - Mostre os 20 primeiros erros completos
   - Pergunte ao usuário se quer ver mais ou começar a corrigir

Reporte conciso: total de erros, arquivos afetados, primeiros 20 erros.
