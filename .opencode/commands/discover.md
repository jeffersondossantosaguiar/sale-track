---
description: Dispara o fluxo de descoberta (grill-me + spec-kit) para um bug, feature ou modificação.
---

## Descrição

$ARGUMENTS

## Workflow de Discovery (SDD + grill-me)

Você está iniciando a descoberta de uma tarefa de **bug / feature / modificação**
neste projeto (sale-track), que usa SDD (Spec-Driven Development) via GitHub
spec-kit. Siga o fluxo abaixo, sem perguntar de novo qual processo usar.

### 1. Carregar o skill `grill-me`
Invoke o skill `grill-me` para entrevistar o usuário e estressar o design:
entenda o problema, o contexto, as dependências, integrações e casos de borda
antes de planejar. Refine os requisitos até não restarem ambiguidades.

### 2. Refinar requisitos na spec
Use o comando adequado do spec-kit:
- Bug ou requisito ambíguo → `/speckit.clarify` (até 5 perguntas direcionadas,
  com respostas codificadas de volta na spec).
- Feature nova → `/speckit.specify` (cria/atualiza `specs/<N>-<nome>/spec.md`).

### 3. Gerar artefatos de design
- `/speckit.plan` → gera research.md / data-model.md / contracts/ / quickstart.md
  e termina na Fase 1 (design). **Gate de revisão** antes de continuar.
- `/speckit.tasks` → gera tasks.md com testes red-green (constitution §IV).
- `/speckit.checklist` → gera checklists de validação.

### 4. Executar e fechar
- `/speckit.implement` → processa e executa tasks.md.
- `/speckit.converge` → detecta e adiciona trabalho restante não construído.
- `/speckit.analyze` → valida consistência entre spec.md, plan.md e tasks.md.

### Regras
- Gates de revisão ocorrem após a spec e após o plano: não pule.
- Não implemente antes de spec, plano e tasks estarem aprovados.
- Testes vêm primeiro (red-green-refactor), conforme a constitution (§IV).