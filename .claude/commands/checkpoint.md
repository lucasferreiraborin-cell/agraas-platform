---
description: git add -A + commit (mensagem fornecida ou autogerada do diff) + push origin main
argument-hint: [mensagem de commit opcional]
---

Faça um checkpoint do trabalho atual: stage tudo, commit, push.

Passos:

1. Rode `git status --short` e `git diff --stat HEAD` em paralelo para entender o que será commitado.
2. **Se `$ARGUMENTS` foi fornecido**, use como base da mensagem (parágrafo principal). Se vazio, leia o diff (`git diff --cached HEAD` ou `git diff HEAD` se nada staged) e escreva uma mensagem concisa (1-2 frases focadas no "porquê").
3. Cheque que não há arquivos sensíveis (`.env*`, `*.local.json`, `credentials*`, `secrets*`, `*.key`, `*.pem`) no staged. Se houver, **pare e avise o usuário**.
4. Execute em sequência:
   - `git add -A`
   - `git commit` com a mensagem via HEREDOC, terminando com:
     ```
     Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
     ```
   - `git push origin main`
5. Rode `git status` ao final para confirmar tree clean.

Reporte ao usuário em 2-3 linhas: hash do commit, resumo do que foi commitado, confirmação do push.

Argumento do usuário: $ARGUMENTS
