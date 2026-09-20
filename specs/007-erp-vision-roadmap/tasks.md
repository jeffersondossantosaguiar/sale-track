# Tasks: Visão e Roadmap do ERP

**Input**: Artefatos de design em `specs/007-erp-vision-roadmap/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md` e `quickstart.md`

**Tests**: Esta feature altera somente documentação. Em vez de testes automatizados de runtime, cada história possui uma leitura independente e a fase final executa as verificações estruturais de `quickstart.md`.

**Organization**: As tarefas são agrupadas por história de usuário para que visão, mapa e roadmap possam ser revisados separadamente antes da integração final.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode ser executada em paralelo porque altera arquivo diferente e não depende de conteúdo ainda não produzido.
- **[Story]**: associa a tarefa à história de usuário correspondente.
- Toda tarefa cita os caminhos exatos dos arquivos envolvidos.

## Phase 1: Source Validation

**Purpose**: Confirmar a evidência usada para diferenciar estado atual, redesenho e futuro.

- [x] T001 Reconciliar `README.md`, `docs/domain.md`, `docs/guia-mei.md`, `src/lib/db/schema.ts`, `src/app/`, `specs/001-sales-control-system/`, `specs/002-product-variants-pricing/`, `specs/003-settings-navigation/`, `specs/004-cost-pricing-corrections/`, `specs/005-pricing-profit-rework/` e `specs/006-tiktok-description-linking/` com as decisões registradas em `specs/007-erp-vision-roadmap/research.md`, corrigindo apenas divergências encontradas

**Checkpoint**: As classificações futuras poderão ser justificadas por documentação, specs ou comportamento implementado.

---

## Phase 2: Shared Documentation Foundation

**Purpose**: Criar o vocabulário e as regras que impedem contradições entre os três documentos.

- [x] T002 [P] Definir legenda de estados, domínio proprietário e hierarquia de fontes em `docs/capability-map.md`
- [x] T003 [P] Definir horizontes, gates de avanço e regra de ausência de datas arbitrárias em `docs/roadmap.md`

**Checkpoint**: Estados e horizontes possuem significado único antes do preenchimento das capacidades e iniciativas.

---

## Phase 3: User Story 1 - Compreender a visão e os limites do produto (Priority: P1) MVP

**Goal**: Explicar por que o Sale Track existe, para quem ele é construído, quais fluxos conecta e quais limites preservam seu caráter de ERP vertical.

**Independent Test**: Um leitor que não acompanhou a descoberta lê somente `docs/product-vision.md` e consegue explicar objetivo, usuário principal, pilares, fluxos, princípios e itens fora de escopo sem confundir visão futura com comportamento atual.

### Implementation for User Story 1

- [x] T004 [P] [US1] Criar contexto, identidade do ERP vertical, usuário principal e definição de fonte de verdade em `docs/product-vision.md`
- [x] T005 [US1] Documentar princípios de produto, integridade financeira, fluxos ponta a ponta e pilares funcionais em `docs/product-vision.md`
- [x] T006 [US1] Documentar limites, antiobjetivos, premissas constitucionais e critérios de sucesso da visão em `docs/product-vision.md`

**Checkpoint**: A visão é útil isoladamente e não promete integrações, nuvem, múltiplos usuários ou emissão fiscal ainda não validados.

---

## Phase 4: User Story 2 - Mapear capacidades e dependências (Priority: P2)

**Goal**: Organizar todas as capacidades do ERP por domínio, estado, resultado desejado, dependências e evidências existentes.

**Independent Test**: Um leitor localiza cada capacidade de FR-003 em `docs/capability-map.md`, identifica seu único domínio proprietário, diferencia existente de redesenho ou futuro e segue suas referências sem consultar o código.

### Implementation for User Story 2

- [x] T007 [US2] Mapear configurações e cadastros operacionais, catálogo mestre, custos e precificação, publicação multicanal, pedidos e documentos fiscais em `docs/capability-map.md`
- [x] T008 [US2] Mapear transações e conciliação financeira, caixa e contas a pagar, compras e fornecedores, produção e capacidade, insumos e estoque em `docs/capability-map.md`
- [x] T009 [US2] Mapear manutenção, expedição e pós-venda, integrações, auditoria/backup/segurança, indicadores e alertas em `docs/capability-map.md`
- [x] T010 [US2] Documentar fluxos entre domínios, requisitos transversais, riscos, decisões em aberto e referências às specs 001-006 em `docs/capability-map.md`
- [x] T011 [US2] Revisar em `docs/capability-map.md` a separação entre estimativas de taxas configuradas e resultado financeiro real baseado em relatórios ou transações conciliadas

**Checkpoint**: Todas as capacidades obrigatórias aparecem uma única vez como propriedade funcional, com integrações e dependências registradas separadamente.

---

## Phase 5: User Story 3 - Evoluir o ERP por features independentes (Priority: P3)

**Goal**: Transformar a visão em uma sequência executável de iniciativas e em um processo repetível para cada nova feature.

**Independent Test**: Um mantenedor escolhe uma iniciativa em `docs/roadmap.md`, encontra resultado, dependências, gate e recorte sugerido e consegue seguir o playbook até obter spec, plano, tarefas, implementação e validação.

### Implementation for User Story 3

- [x] T012 [US3] Preencher iniciativas de Agora e Próximo com resultado, dependências, critério de entrada e recorte sugerido de spec em `docs/roadmap.md`
- [x] T013 [US3] Preencher Depois e Exploração, incluindo pesquisa de APIs de canais e hipótese de emissor unificado de NF-e, em `docs/roadmap.md`
- [x] T014 [US3] Documentar descoberta, grill crítico, spec, gates de aprovação, plano, tasks, testes red-green, implementação, convergência e análise no playbook SDD de `docs/roadmap.md`
- [x] T015 [US3] Documentar critérios de conclusão, atualização do roadmap e divisão de iniciativas grandes em specs independentes em `docs/roadmap.md`

**Checkpoint**: O roadmap orienta a próxima entrega sem datas inventadas e mantém oportunidades incertas atrás de gates de pesquisa e decisão.

---

## Phase 6: Integration and Validation

**Purpose**: Conectar os documentos, revisar consistência e demonstrar os critérios de sucesso.

- [x] T016 Adicionar uma seção curta de navegação e a declaração de estado implementado em `docs/domain.md`, apontando para `docs/product-vision.md`, `docs/capability-map.md` e `docs/roadmap.md`
- [x] T017 Revisar links, terminologia, estados, horizontes e referências cruzadas em `docs/product-vision.md`, `docs/capability-map.md`, `docs/roadmap.md` e `docs/domain.md`
- [x] T018 Executar todas as verificações descritas em `specs/007-erp-vision-roadmap/quickstart.md` e registrar qualquer ajuste necessário nos documentos afetados
- [x] T019 Executar `/speckit.converge` e `/speckit.analyze`, resolver inconsistências encontradas em `specs/007-erp-vision-roadmap/` e confirmar formatação com `git diff --check`

**Checkpoint**: Os três documentos e `docs/domain.md` satisfazem FR-001 a FR-016 e podem orientar a seleção da próxima feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Source Validation (Phase 1)**: não possui dependências e deve confirmar a base factual.
- **Shared Foundation (Phase 2)**: depende de T001 e bloqueia o preenchimento do mapa e do roadmap.
- **User Story 1 (Phase 3)**: depende de T001; pode avançar em paralelo com as histórias 2 e 3 após a fundação compartilhada.
- **User Story 2 (Phase 4)**: depende de T002 e da evidência confirmada em T001.
- **User Story 3 (Phase 5)**: depende de T003 e usa as dependências funcionais consolidadas pela US2 para a revisão final.
- **Integration and Validation (Phase 6)**: depende das três histórias concluídas.

### User Story Dependencies

- **US1 (P1)**: independente para leitura; define a identidade e os limites usados na revisão final.
- **US2 (P2)**: independente para leitura após a legenda de T002; fornece as dependências que validam a ordenação do roadmap.
- **US3 (P3)**: independente para leitura após T003; a versão final deve ser reconciliada com o mapa concluído.

### Parallel Opportunities

- T002 e T003 podem ser executadas em paralelo por alterarem arquivos diferentes.
- T004 pode iniciar em paralelo com T002 e T003 depois de T001.
- A redação de `docs/product-vision.md` pode prosseguir em paralelo ao preenchimento de `docs/capability-map.md`.
- A estrutura inicial de `docs/roadmap.md` pode prosseguir em paralelo, mas T012-T015 devem ser reconciliadas com as dependências finalizadas em T010.

---

## Implementation Strategy

### MVP First

1. Concluir T001.
2. Produzir e validar `docs/product-vision.md` com T004-T006.
3. Pausar para o teste independente da US1.

### Incremental Delivery

1. Acrescentar o mapa de capacidades e validar a US2.
2. Acrescentar o roadmap e o playbook e validar a US3.
3. Integrar a navegação em `docs/domain.md`.
4. Executar quickstart, convergência e análise antes do commit.

## Notes

- Esta feature não altera código, banco, cálculos, interface ou integrações.
- Uma referência a capacidade futura deve usar estado e horizonte explícitos.
- Itens de Agora e Próximo não representam promessa de prazo.
- As verificações documentais substituem testes de runtime somente nesta feature sem mudança comportamental.
