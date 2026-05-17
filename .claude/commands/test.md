---
description: Roda a suite Jest do projeto (npm test)
argument-hint: [pattern opcional para filtrar testes]
---

Roda os testes Jest do projeto Agraas.

Passos:

1. Se `$ARGUMENTS` for fornecido, é um pattern de teste (ex: nome de arquivo, describe, it). Usar como filtro.
2. Comando:
   - Sem args: `npm test`
   - Com args: `npm test -- $ARGUMENTS`
3. Capture stdout+stderr.
4. Se todos passarem: reporte "✅ N suites, M testes, tudo verde" em 1 linha.
5. Se houver falhas:
   - Reporte falhas resumidas (suite, teste, mensagem de erro de cada uma)
   - Pergunte se quer investigar a primeira

Não tente corrigir automaticamente — só reportar. O usuário decide o próximo passo.

Pattern (se fornecido): $ARGUMENTS
