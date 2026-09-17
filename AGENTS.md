# sale-track — instruções do agente

## Workflow / Discovery (obrigatório)

Este projeto usa SDD (Spec-Driven Development) via GitHub spec-kit
(comandos em `.opencode/commands/speckit.*`). Ao iniciar QUALQUER
tarefa de bug, feature ou modificação, siga o processo sem precisar
que o usuário o repita:

1. **Descobrir / refinar requisitos**:
   - Bug ou requisito ambíguo → `/speckit.clarify` (até 5 perguntas) ou
     `/speckit.specify` (criar/atualizar a spec).
2. **Estressar o plano**: carregar o skill `grill-me` para entrevistar e
   validar dependências, integrações e casos de borda do design antes de planejar.
3. **Gerar artefatos**:
   - `/speckit.plan` → research.md / data-model.md / contracts/ / quickstart.md
   - `/speckit.tasks` → tasks.md com testes red-green
   - `/speckit.checklist` → checklists de validação
4. **Executar e fechar**:
   - `/speckit.implement` → processa tasks.md
   - `/speckit.converge` → detecta e adiciona trabalho restante
   - `/speckit.analyze` → valida consistência entre spec/plan/tasks

### Regras
- Gates de revisão ocorrem após a spec e após o plano: não pule.
- Não implemente antes de spec, plano e tasks estarem aprovados.
- Testes vêm primeiro (red-green-refactor), conforme a constitution (§IV).

## Comandos de atalho
- `/discover <descrição>` — dispara o fluxo de descoberta (grill-me + spec-kit).