# Onboarding FSJBE — Importação de Rebanho Real

> Fazenda São João da Boa Esperança · Jandaia, GO · ~2.300 cabeças

## Pré-requisitos

1. **Login funcional** — `fsjdbe@gmail.com` (solicitar senha ao admin)
2. **Arquivo CSV** exportado do sistema atual (planilha Excel funciona)
3. **Colunas obrigatórias:** `codigo_interno` (brinco ou ID do animal)
4. **Colunas recomendadas:** nome, sexo, raça, data_nascimento, peso_kg, rfid, categoria

## Passo a passo

### 1. Preparar o CSV

Use o template em `/public/templates/fsjbe_import_template.csv` como referência.

**Formato aceito:**
- CSV com separador vírgula (`,`) ou ponto e vírgula (`;`)
- Encoding UTF-8 ou Latin-1 (detectado automaticamente)
- Primeira linha = cabeçalho com nomes das colunas
- Tamanho máximo: ~10MB (~5.000 linhas)

**Colunas mapeáveis:**

| Coluna Agraas | Aliases aceitos | Obrigatória |
|---|---|---|
| Código do animal | codigo, code, id, brinco, tag, numero | ✅ Sim |
| Apelido / Nome | apelido, nome, name, nick | Não |
| Sexo | sexo, sex, genero, gender | Não |
| Raça | raca, breed, racial, grupo | Não |
| Data de nascimento | nascimento, birth, nasc, dob, dtnasc | Não |
| Peso (kg) | peso, weight, kg, pesagem | Não |
| Status | status, situacao, state | Não |
| Categoria | categoria, category, lote, tipo | Não |
| Observações | obs, observacao, nota, comentario | Não |
| RFID / Chip | rfid, chip, brincoelet, transponder | Não |
| Código do pai | pai, sire, touro, father | Não |
| Código da mãe | mae, dam, vaca, mother | Não |

**Sexo aceita:** M, Macho, Male, F, Fêmea, Female
**Data aceita:** DD/MM/YYYY ou YYYY-MM-DD

### 2. Acessar o importador

1. Login em https://agraas-platform.vercel.app
2. Menu lateral → **Ferramentas** → **Importar animais**
3. Selecionar **Propriedade de destino**: "Fazenda São João da Boa Esperança"
4. Opcionalmente selecionar um **Lote** (ex: "Engorda Q2 2026")
5. Arrastar o arquivo CSV ou clicar para selecionar

### 3. Mapeamento de colunas

O sistema detecta automaticamente quais colunas do CSV correspondem a quais campos da Agraas (badge "Auto" aparece). Revise e ajuste se necessário.

Clique **Ver prévia** para conferir as 10 primeiras linhas.

### 4. Importar

Clique **Importar X registros**. O processo:
- Cria animais novos se o código interno não existir
- Atualiza animais existentes se o código já estiver cadastrado
- Registra pesagem se a coluna peso estiver mapeada

### 5. Calcular scores

Após a importação, clique **Calcular scores** para acionar o Score Engine Agraas em todos os animais importados.

### 6. Verificar

- `/animais` — lista completa com scores
- `/passaporte/AGR-XXXXXXXX` — passaporte público de qualquer animal
- `/relatorios` — KPIs atualizados

## Limites conhecidos

| Parâmetro | Limite |
|---|---|
| Animais por CSV | ~2.500 (limitado pelo timeout do servidor — 60s) |
| Tamanho do arquivo | ~10MB |
| Rate limit da API | 5 requests por minuto |
| Campos de relacionamento (pai/mãe) | Resolvidos por `internal_code` — o pai/mãe precisa já existir |

**Para rebanhos > 2.500 cabeças:** dividir o CSV em 2 partes (ex: machos e fêmeas) e importar sequencialmente.

## Suporte

Contato técnico: lucas@agraas.com.br
