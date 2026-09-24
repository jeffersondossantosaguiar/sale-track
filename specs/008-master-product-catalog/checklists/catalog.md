# Requirements Quality Checklist: Catálogo mestre

**Purpose**: Revisar clareza, completude, consistência e verificabilidade dos requisitos antes da implementação
**Created**: 2026-09-19
**Feature**: [spec.md](../spec.md)
**Audience**: revisão pré-implementação

**Note**: Este checklist avalia a qualidade dos requisitos, não se a implementação já está pronta. Os itens permanecem desmarcados até revisão humana.

## Ownership and Inheritance

- [x] CHK001 Os requisitos enumeram todos os campos compartilhados que pertencem ao produto e todos os campos que podem ser sobrescritos pela variante? [Completeness, Spec §Field Inventory; FR-001; FR-004]
- [x] CHK002 A semântica de `null` como herança está definida sem conflito com string vazia ou valor intencionalmente removido? [Clarity, Spec §FR-005–FR-006; Data Model §Variant]
- [x] CHK003 O comportamento ao alterar um valor compartilhado está especificado tanto para variantes herdadas quanto para variantes sobrescritas? [Coverage, Spec §US2; SC-004]
- [x] CHK004 A remoção de uma sobrescrita possui resultado verificável inclusive quando o valor do produto também está vazio? [Edge Case, Spec §Edge Cases]
- [x] CHK005 Tipo, tema e categoria estão inequivocamente excluídos das sobrescritas desta fatia? [Scope, Spec §FR-004; Data Model §Valores efetivos]

## Identity and Channel Codes

- [x] CHK006 A normalização e a unicidade do SKU estão definidas para caixa, espaços externos e espaços repetidos? [Clarity, Spec §FR-003; Research §3]
- [x] CHK007 Os requisitos distinguem SKU interno, código Shopee, descrição TikTok e código geral sem usar um termo genérico ambíguo? [Consistency, Spec §FR-010–FR-012]
- [x] CHK008 A precedência entre código específico e geral está definida para Shopee, TikTok e presencial? [Completeness, Data Model §Regras de casamento]
- [x] CHK009 A proibição de `Padrao` TikTok cobre cadastro manual, aprendizado e importações futuras? [Coverage, Spec §FR-011; Edge Cases]
- [x] CHK010 A unicidade de código por canal trata explicitamente o caso histórico de `NULL` usado para “geral”? [Risk, Research §4]

## Financial Integrity

- [x] CHK011 Os requisitos deixam claro quais mudanças recalculam custo/preço sugerido e quais não disparam cálculo financeiro? [Clarity, Plan §Design Strategy; Data Model §Variant]
- [x] CHK012 A imutabilidade de `frozenCostCents` está exigida em importação, vínculo manual e manutenção do catálogo? [Constitution, Plan §Constitution Check; Contracts §Compatibility]
- [x] CHK013 Todos os valores monetários permanecem definidos em centavos inteiros e com limites não negativos? [Consistency, Spec §FR-008; Data Model]
- [x] CHK014 O reset autorizado está separado das operações normais e não enfraquece a regra geral de preservação do histórico financeiro? [Scope, Spec §FR-019–FR-021]

## Local Media

- [x] CHK015 Os requisitos definem formatos aceitos, tamanho máximo, validação de assinatura e comportamento de falha do upload? [Completeness, Data Model §ImageInput]
- [x] CHK016 A chave de mídia está definida como opaca, relativa e não controlada pelo usuário, com proteção explícita contra path traversal? [Security, Data Model §Product; Contracts catalog-images]
- [x] CHK017 O plano especifica ordem e compensação para falha entre gravação de arquivo e commit no banco? [Recovery, Research §Consistência]
- [x] CHK018 O comportamento de substituição e remoção evita referência quebrada mesmo se a limpeza do arquivo anterior falhar? [Recovery, Research §Consistência]
- [x] CHK019 O fallback de imagem da variante para o produto está definido para leitura, remoção e arquivo ausente? [Coverage, Contracts catalog-images; Spec §Edge Cases]
- [x] CHK020 Backup e restauração tratam SQLite e `data/catalog-media/` como uma unidade e evitam caminhos absolutos? [Portability, Plan §Constitution Check; Quickstart §9]
- [x] CHK021 A fronteira para uma futura implementação S3 está definida sem incluir S3, credenciais ou sincronização no escopo atual? [Scope, Research §5; Tasks §Notes]

## Catalog Experience

- [x] CHK022 A busca define todos os campos consultados e se a comparação é case-insensitive? [Clarity, Data Model §CatalogFilter]
- [x] CHK023 Filtros de cor, tamanho e acabamento especificam que qualquer variante com valor efetivo compatível torna o produto elegível? [Coverage, Spec §US4; Research §8]
- [x] CHK024 O estado padrão, a inclusão de inativos e o comportamento em novos fluxos de venda estão definidos? [Clarity, Spec §FR-018; Data Model §CatalogFilter]
- [x] CHK025 A interface diferencia visualmente valor interno, herdado, sobrescrito e específico de canal sem depender apenas de cor? [Accessibility, Contracts catalog-ui]
- [x] CHK026 Os estados de carregamento, erro e cadastro incompleto têm requisitos que preservam layout e entradas do usuário? [Recovery, Spec §US4; Contracts catalog-ui]
- [x] CHK027 Os requisitos responsivos cobrem pesquisa, filtros, lista, editor e ações sem sobreposição? [Coverage, Contracts catalog-ui; Quickstart §10]

## Scope and Acceptance

- [x] CHK028 Os limites excluem inequivocamente galeria, projeção/publicação de anúncio, receitas detalhadas, kits, bundles e personalizações? [Scope, Spec §FR-022–FR-023]
- [x] CHK029 Cada história possui teste independente executável sem depender de funcionalidade explicitamente fora de escopo? [Testability, Spec §User Scenarios]
- [x] CHK030 Os critérios de sucesso têm tarefas correspondentes para tempo de cadastro, filtros, herança, canais, imagem e ausência de publicação? [Traceability, Spec §SC-001–SC-008; Tasks]
- [x] CHK031 O procedimento de reset exige confirmação do alvo, aplicativo parado, remoção de WAL/SHM e mídia, migração, seed e verificação de contagens? [Safety, Quickstart §2; Tasks T042]
- [x] CHK032 A atualização de `docs/domain.md` está condicionada à implementação real, evitando documentar estado futuro como atual? [Governance, Plan §Design Strategy; Tasks T040]

## Notes

- Itens não marcados indicam revisão pendente, não falha de implementação.
- Achados devem ser corrigidos nos artefatos SDD antes de iniciar `/speckit.implement`.
- Checklist revisado e aprovado pelo usuário em 2026-09-19; aprovação não representa implementação concluída.
