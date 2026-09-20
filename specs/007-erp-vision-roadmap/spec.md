# Feature Specification: Visao e Roadmap do ERP

**Feature Branch**: `007-erp-vision-roadmap`

**Created**: 2026-09-19

**Status**: Implemented

**Input**: User description: "Criar documentos que consolidem a visao do Sale Track como ERP vertical, mapeiem capacidades atuais e futuras e expliquem o passo a passo para implementar cada nova feature."

## Contexto

O Sale Track nasceu para substituir uma planilha de controle da empresa e ja cobre partes de vendas, faturamento, caixa, catalogo, custos e precificacao. A visao evoluiu para um ERP vertical de uma operacao de impressao 3D, com o proprio sistema como fonte de verdade para produtos e com integracoes futuras com Shopee, TikTok e outros canais.

As conversas de descoberta identificaram quatro eixos principais: catalogo mestre e publicacao multicanal; configuracoes, custos e precificacao; pedidos e conciliacao financeira; producao, insumos e expedicao. Tambem surgiram capacidades transversais, como auditoria, backup, seguranca, saude das integracoes e oportunidades futuras, incluindo um possivel emissor unificado de NF-e.

Esta iniciativa organiza essa visao sem implementar funcionalidades de negocio. A documentacao deve distinguir claramente o que existe hoje, o que precisa ser redesenhado, o que esta planejado e o que permanece apenas como hipotese.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compreender a visao e os limites do produto (Priority: P1)

Como dono da empresa, quero encontrar uma visao unica do Sale Track como ERP vertical, para entender quais problemas ele resolve, quais principios orientam o produto e quais limites evitam que ele se transforme em um ERP generico.

**Why this priority**: Sem uma visao compartilhada, novas funcionalidades podem ser implementadas isoladamente, duplicar conceitos ou ampliar o escopo sem gerar valor para a operacao real.

**Independent Test**: Um leitor que conhece a empresa, mas nao participou das conversas, consegue explicar o objetivo do Sale Track, seus usuarios, seus fluxos centrais e seus limites depois de ler apenas o documento de visao.

**Acceptance Scenarios**:

1. **Given** a documentacao atual e as decisoes recentes, **When** o dono consulta a visao do produto, **Then** encontra objetivo, contexto, principios, publico, fluxos principais e limites explicitos.
2. **Given** uma ideia de funcionalidade generica, **When** ela e comparada com os limites documentados, **Then** e possivel decidir se ela pertence ao ERP vertical, e uma oportunidade futura ou esta fora de escopo.
3. **Given** a premissa constitucional de operacao local e single-user, **When** capacidades futuras de nuvem, usuarios ou integracoes sao citadas, **Then** elas aparecem como hipoteses sujeitas a decisao e nao como realidade atual.

---

### User Story 2 - Mapear capacidades e dependencias (Priority: P2)

Como responsavel pelo produto, quero visualizar todas as capacidades do ERP e seu estado, para reconhecer o que ja existe, o que precisa ser melhorado e quais fundacoes devem vir antes das integracoes e automacoes.

**Why this priority**: O mapa reduz lacunas e deixa explicitas dependencias como configuracoes antes de custos, custos antes de precificacao e catalogo antes de publicacao multicanal.

**Independent Test**: Cada capacidade discutida pode ser localizada por dominio, estado e dependencia, sem precisar ler specs antigas ou inspecionar o codigo.

**Acceptance Scenarios**:

1. **Given** uma capacidade como "catalogo mestre", **When** o mapa e consultado, **Then** o leitor encontra seus componentes, estado atual, resultado desejado e dependencias.
2. **Given** uma capacidade parcialmente existente, **When** ela e classificada, **Then** a documentacao diferencia "existente" de "existente, mas precisa de redesenho".
3. **Given** uma oportunidade como emissao unificada de NF-e, **When** ela e registrada, **Then** aparecem seu valor potencial, incertezas e gates de pesquisa sem compromisso de implementacao.

---

### User Story 3 - Evoluir o ERP por features independentes (Priority: P3)

Como mantenedor, quero um roadmap e um procedimento repetivel para transformar cada iniciativa em uma feature especificada, planejada, testada e validada, para evoluir o ERP sem misturar varios dominios em uma unica entrega.

**Why this priority**: A visao so gera valor quando orienta uma sequencia executavel e preserva o fluxo SDD adotado pelo projeto.

**Independent Test**: Escolher qualquer iniciativa priorizada e seguir o playbook ate obter uma spec com escopo, plano, tarefas, testes e criterios de fechamento, sem depender de instrucoes externas.

**Acceptance Scenarios**:

1. **Given** uma iniciativa priorizada, **When** o mantenedor consulta o roadmap, **Then** encontra objetivo, dependencias, criterio de prontidao e proximo artefato esperado.
2. **Given** uma feature aprovada, **When** o mantenedor segue o processo documentado, **Then** executa descoberta, spec, plano, tasks, implementacao, convergencia e analise com os gates de revisao exigidos.
3. **Given** uma ideia futura ainda incerta, **When** ela e revisada, **Then** passa primeiro por pesquisa e decisao antes de receber uma spec de implementacao.

### Edge Cases

- Uma capacidade ja existe no codigo, mas a experiencia ou o modelo atual nao atende mais a visao: classificar como "existente, precisa de redesenho" e registrar o problema sem declarar a implementacao como ausente.
- Uma iniciativa depende de mudanca na constitution: registrar o conflito e exigir emenda explicita antes de planejar a implementacao.
- Uma capacidade pertence a mais de um dominio: definir um dominio proprietario e registrar as integracoes, evitando duplicar a mesma responsabilidade.
- Uma ideia depende de regras fiscais, APIs ou politicas externas ainda desconhecidas: manter como hipotese com pesquisa obrigatoria e fontes oficiais antes de assumir viabilidade.
- Uma prioridade muda: atualizar o roadmap sem reescrever o historico do dominio atual nem converter ideias futuras em compromissos retroativos.
- Uma feature proposta mistura varios resultados independentes: dividir em specs menores, preservando dependencias e entregas testaveis.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A documentacao DEVE definir o Sale Track como ERP vertical da empresa de impressao 3D, incluindo problema, publico, objetivo, principios e limites.
- **FR-002**: A documentacao DEVE separar inequivocamente estado atual, estado desejado, iniciativas priorizadas, hipoteses futuras e itens fora de escopo.
- **FR-003**: O mapa de capacidades DEVE cobrir, no minimo: configuracoes e cadastros operacionais; catalogo mestre; custos e precificacao; publicacao multicanal; pedidos e documentos fiscais; transacoes e conciliacao financeira; caixa e contas a pagar; compras e fornecedores; producao e capacidade; insumos e estoque; manutencao; expedicao e pos-venda; integracoes; auditoria, backup e seguranca; indicadores e alertas.
- **FR-004**: Cada capacidade DEVE ter um estado padronizado: "existente", "existente - redesenhar", "planejada", "hipotese futura" ou "fora de escopo".
- **FR-005**: O mapa DEVE mostrar dependencias e fluxos entre capacidades, incluindo configuracoes → custos → catalogo → precos → publicacao; pedidos → conciliacao → resultado financeiro; e pedidos + catalogo → producao → insumos → expedicao.
- **FR-006**: O roadmap DEVE organizar iniciativas em horizontes sem prometer datas nao validadas e DEVE declarar os criterios para uma iniciativa avancar ao proximo horizonte.
- **FR-007**: O roadmap DEVE priorizar fundacoes de dominio e qualidade dos dados antes de automacoes externas que dependam delas.
- **FR-008**: A documentacao DEVE incluir um playbook passo a passo para executar cada nova feature pelo fluxo SDD do projeto, com gates explicitos depois da spec e do plano.
- **FR-009**: O playbook DEVE exigir testes primeiro quando a feature tocar importacao, dinheiro, conciliacao, custos, publicacao ou outro fluxo com risco de corrupcao silenciosa.
- **FR-010**: O possivel emissor unificado de NF-e DEVE ser registrado como hipotese futura, com pesquisa fiscal e operacional obrigatoria e comparacao entre integracao especializada e implementacao propria antes de qualquer compromisso.
- **FR-011**: A documentacao DEVE registrar decisoes em aberto, riscos, premissas e gatilhos que justifiquem revisitar uma oportunidade futura.
- **FR-012**: `docs/domain.md` DEVE continuar representando a realidade atual do dominio e DEVE apontar para a visao e o roadmap sem incorporar funcionalidades ainda nao implementadas como se ja existissem.
- **FR-013**: Os documentos DEVERAO referenciar as specs existentes quando uma capacidade ja estiver total ou parcialmente implementada.
- **FR-014**: A documentacao DEVE incluir requisitos transversais de integridade financeira, historico, rastreabilidade, portabilidade, backup, seguranca de credenciais e observabilidade das integracoes.
- **FR-015**: A documentacao DEVE indicar explicitamente que regras configuradas de taxas geram estimativas, enquanto relatorios ou transacoes conciliadas determinam o resultado financeiro real.
- **FR-016**: A documentacao DEVE ser escrita em portugues claro e permitir que uma iniciativa priorizada seja localizada e compreendida em ate dez minutos.

### Key Entities

- **Visao do Produto**: define identidade, publico, problemas, principios, fluxos centrais e limites do Sale Track.
- **Capacidade**: unidade funcional do ERP, com dominio proprietario, estado, resultado esperado, dependencias, riscos e referencias existentes.
- **Iniciativa**: mudanca priorizavel que evolui uma ou mais capacidades e pode originar uma spec independente.
- **Horizonte**: classificacao de prioridade sem data rigida, usada para ordenar agora, proximo, depois e exploracao.
- **Decisao em Aberto**: escolha ainda nao validada, com contexto, alternativas, evidencias necessarias e gatilho de revisao.
- **Oportunidade Futura**: ideia com valor potencial, mas sem compromisso de entrega ate passar por pesquisa e priorizacao.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos dominios e capacidades enumerados em FR-003 aparecem no mapa com estado, objetivo e dependencias.
- **SC-002**: Todas as capacidades implementadas citadas no mapa possuem referencia para a documentacao atual ou para pelo menos uma spec existente.
- **SC-003**: Um leitor consegue distinguir, sem consultar o codigo, o que existe hoje, o que sera redesenhado, o que esta priorizado e o que e apenas hipotese futura.
- **SC-004**: Toda iniciativa nos horizontes "agora" e "proximo" possui resultado esperado, dependencias, criterio de entrada e sugestao de recorte para uma spec independente.
- **SC-005**: O playbook descreve 100% das etapas obrigatorias do fluxo SDD e identifica claramente os dois pontos que exigem aprovacao do usuario antes da implementacao.
- **SC-006**: O emissor unificado de NF-e e outras oportunidades futuras aparecem sem linguagem que implique compromisso, prazo ou viabilidade ja confirmada.
- **SC-007**: A documentacao final nao contradiz a constitution nem descreve funcionalidades futuras como comportamento atual do sistema.

## Assumptions

- O usuario principal continua sendo o dono da empresa, em operacao local e single-user, conforme a constitution vigente.
- Esta iniciativa produz apenas documentacao; nao altera banco, interface, calculos ou integracoes.
- A visao futura pode mencionar nuvem, multiplos usuarios e APIs, mas qualquer implementacao que conflite com a constitution exige decisao e emenda separadas.
- O roadmap usa horizontes e dependencias, nao datas fechadas ou estimativas de esforco sem pesquisa.
- Ideias fiscais e integracoes externas exigem pesquisa em fontes oficiais na feature correspondente.
- Specs existentes continuam sendo o historico de decisoes das funcionalidades ja implementadas.
