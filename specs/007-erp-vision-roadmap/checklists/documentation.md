# Documentation Requirements Checklist: Visão e Roadmap do ERP

**Purpose**: Revisar se os requisitos da documentação são completos, claros, consistentes e verificáveis antes da implementação
**Created**: 2026-09-19
**Feature**: [`spec.md`](../spec.md)

**Note**: Este checklist avalia a qualidade dos requisitos, não a conclusão das tarefas de implementação.
**Review Ownership**: Marque um item como `[x]` somente quando a revisão confirmar que o critério de qualidade foi atendido.

## Completeness

- [x] CHK001 Os requisitos definem contexto, usuário principal, objetivo, princípios, fluxos, limites e antiobjetivos da visão do produto? [Spec §FR-001; Plan §Documentation Design]
- [x] CHK002 A lista de capacidades cobre explicitamente todos os 15 grupos obrigatórios sem depender de uma categoria implícita como "outros"? [Spec §FR-003; SC-001]
- [x] CHK003 Os requisitos de cada capacidade incluem estado, domínio proprietário, objetivo, dependências, riscos e referência existente quando aplicável? [Spec §Key Entities; FR-004; FR-013]
- [x] CHK004 Os itens de Agora e Próximo exigem resultado, dependências, critério de entrada e recorte sugerido de spec? [Spec §SC-004; Plan §docs/roadmap.md]
- [x] CHK005 O playbook cobre descoberta, validação crítica, spec, dois gates de aprovação, plano, tasks, testes, implementação, convergência e análise? [Spec §FR-008; SC-005]
- [x] CHK006 Integridade financeira, histórico, rastreabilidade, portabilidade, backup, credenciais e observabilidade possuem requisitos explícitos? [Spec §FR-014]
- [x] CHK007 Riscos, premissas, decisões em aberto e gatilhos para revisitar oportunidades futuras estão exigidos? [Spec §FR-011]

## Clarity

- [x] CHK008 Os cinco estados de capacidade são mutuamente distinguíveis, incluindo o limite entre "existente" e "existente - redesenhar"? [Spec §FR-002; FR-004; Edge Cases]
- [x] CHK009 Os horizontes Agora, Próximo, Depois e Exploração possuem significado e gates claros sem implicar prazo? [Spec §FR-006; Assumptions]
- [x] CHK010 "Fonte de verdade" distingue o cadastro canônico do produto das projeções e identificadores específicos de cada canal? [Spec §Contexto; Plan §Documentation Design]
- [x] CHK011 O requisito financeiro diferencia inequivocamente estimativa baseada em configuração de realizado baseado em relatório ou transação conciliada? [Spec §FR-015]
- [x] CHK012 O termo "ERP vertical" possui limites suficientes para decidir quando uma ideia é pertinente, exploratória ou fora de escopo? [Spec §US1 Acceptance Scenario 2; FR-001]
- [x] CHK013 O critério de compreensão em dez minutos possui um objeto verificável, isto é, uma iniciativa priorizada com seus campos obrigatórios? [Spec §FR-016; SC-004]

## Consistency

- [x] CHK014 A regra de que `docs/domain.md` representa somente o estado atual é consistente com o papel futuro de visão, mapa e roadmap? [Spec §FR-012; Plan §Source-of-Truth Rules]
- [x] CHK015 As prioridades preservam fundações de domínio e qualidade de dados antes de publicação, automação e conciliação externas? [Spec §FR-007; FR-005]
- [x] CHK016 As premissas de operação local e single-user são compatíveis com a constitution, e mudanças incompatíveis exigem decisão separada? [Spec §Assumptions; Plan §Constitution Check]
- [x] CHK017 O mapa evita propriedade duplicada quando uma capacidade participa de mais de um domínio? [Spec §Edge Cases; SC-001]
- [x] CHK018 As specs 001-006 são tratadas como referências históricas sem substituir evidência do código, schema e comportamento testado? [Spec §FR-013; Plan §Source-of-Truth Rules]

## Scenario Coverage

- [x] CHK019 Há critério para classificar uma capacidade parcialmente implementada cuja experiência ou modelo precisa de redesenho? [Spec §Edge Cases]
- [x] CHK020 Há critério para iniciativas que cruzam vários domínios, incluindo domínio proprietário e integrações? [Spec §Edge Cases]
- [x] CHK021 Há critério para dividir uma proposta grande em specs independentes e preservar suas dependências? [Spec §Edge Cases; US3]
- [x] CHK022 Há tratamento explícito para mudanças de prioridade sem reescrever o histórico do estado atual? [Spec §Edge Cases]
- [x] CHK023 Há tratamento explícito para regras fiscais, APIs ou políticas externas desconhecidas, exigindo pesquisa oficial antes da viabilidade? [Spec §Edge Cases; Assumptions]

## Future Opportunities and Acceptance

- [x] CHK024 A emissão unificada de NF-e permanece uma hipótese, com pesquisa fiscal e comparação entre integração especializada e implementação própria? [Spec §FR-010; SC-006]
- [x] CHK025 Os requisitos impedem que integrações Shopee, TikTok ou futuros canais sejam descritas como disponíveis antes de implementação e validação? [Spec §FR-002; SC-003; SC-007]
- [x] CHK026 Os critérios de sucesso permitem verificar cobertura das capacidades e referências sem interpretar intenção subjetiva? [Spec §SC-001; SC-002]
- [x] CHK027 Os testes independentes das três histórias podem ser executados por leitura isolada de visão, mapa e roadmap? [Spec §User Scenarios & Testing]
- [x] CHK028 A documentação é explicitamente limitada a esta iniciativa, sem exigir alteração de banco, interface, cálculos ou integrações? [Spec §Assumptions; Plan §Technical Context]

## Notes

- Deixe itens sem marcação quando houver ambiguidade, lacuna ou necessidade de decisão do usuário.
- Registre achados ao lado do item correspondente antes de ajustar a spec ou o plano.
- `checklists/requirements.md` mantém o checklist estrutural gerado na especificação.
