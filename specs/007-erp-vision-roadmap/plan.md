# Implementation Plan: Visão e Roadmap do ERP

**Branch**: `007-erp-vision-roadmap` | **Date**: 2026-09-19 | **Spec**: `specs/007-erp-vision-roadmap/spec.md`

**Input**: Feature specification from `/specs/007-erp-vision-roadmap/spec.md`

## Summary

Consolidar a evolução do Sale Track como ERP vertical em três documentos complementares:

1. `docs/product-vision.md`: propósito, princípios, fluxos e limites do produto.
2. `docs/capability-map.md`: capacidades por domínio, estado atual, alvo, dependências e referências.
3. `docs/roadmap.md`: horizontes de evolução, iniciativas, critérios de entrada e playbook SDD.

`docs/domain.md` permanece a fonte da realidade implementada e recebe apenas uma seção de navegação para os documentos de futuro. A documentação futura não altera comportamento do sistema nem descreve hipóteses como funcionalidades existentes.

## Technical Context

**Language/Version**: Markdown em português; convenções GitHub-flavored Markdown

**Primary Dependencies**: Constitution, `README.md`, `docs/domain.md`, `docs/guia-mei.md`, specs 001-006, schema e rotas atuais como evidência do estado implementado

**Storage**: Arquivos versionados no repositório; sem alteração de banco ou dados locais

**Testing**: Revisão estrutural, validação de links e referências, `rg` para cobertura dos estados/capacidades e `git diff --check`

**Target Platform**: Repositório local e renderizadores Markdown

**Project Type**: Documentação de produto e planejamento

**Performance Goals**: Uma iniciativa priorizada deve ser localizada e compreendida em até dez minutos

**Constraints**: O domínio atual não pode incorporar comportamento futuro; oportunidades externas/fiscais exigem pesquisa própria; sem datas ou esforço inventados; texto deve permanecer conciso e navegável

**Scale/Scope**: Três documentos novos, atualização pequena de `docs/domain.md` e artefatos SDD da spec 007

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§I Integridade dos Dados Financeiros**: a documentação preserva NFe imutável, custo congelado, retificação explícita e separação entre estimativa e realizado. **Atende**.
- **§II Simplicidade Local e Single-User**: local/single-user permanece realidade atual; nuvem, múltiplos usuários e automações externas aparecem apenas como hipóteses sujeitas a decisão. **Atende**.
- **§III Modelo de Dinheiro Verificável**: mapa e visão separam faturamento, transações, recebido, lucro e caixa; regras configuradas de canal geram estimativas, não substituem o realizado. **Atende**.
- **§IV Testes Obrigatórios no Pipeline de Importação**: o playbook exige red-green para importação, dinheiro, conciliação, custos e publicação. Esta feature não altera pipeline. **Atende**.
- **§V Stack Tipada e Manutenível**: nenhuma mudança de stack ou schema; specs futuras continuam obrigadas a usar migrações e testes. **Atende**.
- **Backup e portabilidade**: entram como capacidade transversal, mantendo dados locais e exportáveis. **Atende**.

Sem violações constitucionais ou justificativas de complexidade.

### Rechecagem pós-design

O desenho mantém `docs/domain.md` como estado atual, usa estados explícitos no mapa, trata NF-e e integrações como exploração quando não validadas e exige emenda constitucional antes de qualquer mudança incompatível. **Gate aprovado**.

## Project Structure

### Documentation (this feature)

```text
specs/007-erp-vision-roadmap/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # gerado após aprovação deste plano
```

Não há contrato externo nesta iniciativa; `contracts/` não será criado.

### Source Documentation (repository root)

```text
docs/
├── product-vision.md        # identidade, princípios, fluxos e limites
├── capability-map.md        # capacidades, estados, dependências e referências
├── roadmap.md               # horizontes, iniciativas e playbook de execução
├── domain.md                # realidade atual; recebe links para os documentos acima
└── guia-mei.md              # rotina atual; permanece inalterado nesta feature
```

**Structure Decision**: separar visão, mapa e roadmap evita misturar propósito, inventário funcional e ordem de execução. `domain.md` continua factual; specs continuam registrando decisões e requisitos por feature.

## Documentation Design

### `docs/product-vision.md`

- Contexto da empresa e problema original da planilha.
- Definição de ERP vertical e fonte de verdade.
- Princípios de produto e integridade financeira.
- Fluxos de ponta a ponta.
- Pilares funcionais.
- Limites e antiobjetivos.
- Definição de sucesso da visão.

### `docs/capability-map.md`

- Legenda dos estados padronizados.
- Um bloco por domínio proprietário.
- Tabela por capacidade com estado, evidência atual, alvo e dependências.
- Fluxos entre domínios.
- Requisitos transversais.
- Decisões em aberto e referências às specs existentes.

### `docs/roadmap.md`

- Regras dos horizontes Agora, Próximo, Depois e Exploração.
- Iniciativas ordenadas por dependência, sem datas arbitrárias.
- Para Agora e Próximo: resultado, pré-requisitos, critério de entrada e recorte sugerido de spec.
- Registro de oportunidades futuras, incluindo emissor unificado de NF-e.
- Playbook SDD completo para cada nova feature.
- Critérios de conclusão e atualização do roadmap.

### Atualização de `docs/domain.md`

- Adicionar uma seção curta de navegação.
- Declarar que o arquivo descreve somente o estado implementado.
- Linkar visão, mapa e roadmap sem copiar conteúdo futuro.

## Source-of-Truth Rules

1. Código, schema, rotas e comportamento testado comprovam o que existe.
2. `docs/domain.md` resume o estado implementado.
3. Specs registram requisitos e decisões de cada entrega, mesmo quando ainda existem tarefas operacionais pendentes.
4. `capability-map.md` classifica a maturidade sem reescrever specs.
5. `roadmap.md` prioriza iniciativas; não é evidência de implementação.
6. `product-vision.md` muda apenas quando objetivo, público, princípios ou limites do produto mudarem.

## Validation Strategy

- Confirmar que todas as capacidades de FR-003 aparecem exatamente uma vez sob um domínio proprietário.
- Confirmar que cada capacidade implementada tem referência para código/documentação ou spec existente.
- Confirmar que todo item de Agora/Próximo contém resultado, dependências, critério de entrada e recorte sugerido.
- Buscar linguagem que confunda planejado com implementado.
- Validar que NF-e unificada permanece em Exploração e exige pesquisa fiscal.
- Validar links relativos e formatação com `git diff --check`.
- Executar `/speckit.analyze` após gerar tasks e `/speckit.converge` após criar os documentos.

## Complexity Tracking

N/A. A iniciativa reduz ambiguidade sem adicionar runtime, dependências ou armazenamento.
