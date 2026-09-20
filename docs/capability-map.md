# Mapa De Capacidades - Sale Track

Este mapa separa a realidade implementada da direção futura. O estado atual detalhado continua em [domain.md](domain.md); este documento mostra maturidade, alvo e dependências por domínio proprietário.

## Legenda

- **Existente**: já está implementada e atende ao desenho atual.
- **Existente — redesenhar**: existe parcial ou funcionalmente, mas o modelo, a UX ou a profundidade precisam evoluir para a visão do ERP.
- **Planejada**: ainda não existe como capacidade de produto, mas pertence claramente ao ERP vertical.
- **Hipótese futura**: pode gerar valor, mas exige pesquisa, validação externa ou decisão estratégica antes de virar spec.
- **Fora de escopo**: não pertence ao Sale Track na visão atual.

Hierarquia de evidência: código, schema e comportamento testado; [domain.md](domain.md); specs implementadas; roadmap. Specs antigas registram decisões, mas não substituem o estado real do código.

## Capacidades Por Domínio

Neste nível do mapa, cada linha representa uma capacidade macro e também seu domínio proprietário. Quando ela participa de outros fluxos, a relação aparece como dependência, sem duplicar a responsabilidade.

| Capacidade | Estado | Evidência atual | Resultado desejado | Dependências / referências |
| --- | --- | --- | --- | --- |
| Configurações e cadastros operacionais | Existente — redesenhar | Configurações de Precificação, impressoras, canais, séries de NFe, teto MEI, materiais e faixas de taxa existem em `/settings`; schema em `src/lib/db/schema.ts`. | Uma área de Configurações mais profissional, validada e navegável, com histórico para parâmetros críticos e separação clara entre custo, canal, fiscal e operação. | Base atual em [domain.md](domain.md), `specs/002-product-variants-pricing/`, `specs/003-settings-navigation/`, `specs/004-cost-pricing-corrections/`, `specs/005-pricing-profit-rework/`; alimenta custos, Catálogo, Pedidos e integração. |
| Catálogo mestre | Existente — redesenhar | Produtos, variantes, materiais, preços por canal e códigos por canal já existem. | Cadastro canônico do produto com variantes, SKU, receitas de Produção, mídias, atributos, kits/bundles e projeções por canal sem duplicar a verdade do produto. | `specs/002-product-variants-pricing/` e `specs/006-tiktok-description-linking/`; depende de Configurações e custos; bloqueia Publicação multicanal confiável. |
| Custos e Precificação | Existente — redesenhar | Motor calcula filamento, energia, máquina, mão de obra manual, embalagem, acessórios, taxa e margem; preço praticado fica separado do sugerido. | Motor auditável, com breakdown claro, versões/histórico para parâmetros críticos, simulação de margem por canal e UX mais direta para decisão de preço. | `specs/002-product-variants-pricing/`, `specs/004-cost-pricing-corrections/`, `specs/005-pricing-profit-rework/`; depende de materiais, impressoras, mão de obra, canais e Catálogo. |
| Publicação multicanal | Planejada | Hoje há preços e códigos por canal, mas não há modelo de anúncio nem envio para marketplace. | Projeções por canal com título, descrição, categoria, atributos, preço, status, pendências, validações e opção futura de sincronização. | Depende do catálogo mestre redesenhado, credenciais e pesquisa das APIs de Shopee/TikTok. |
| Pedidos e documentos fiscais | Existente — redesenhar | XML NFe cria vendas, deduplica por nota, identifica canal por série/arquivo e permite venda presencial manual. | Pedidos como entidade operacional mais rica, mantendo NFe imutável, vínculo com Produção, Expedição, pós-venda e Conciliação por transação. | `specs/001-sales-control-system/`, `specs/005-pricing-profit-rework/`, `specs/006-tiktok-description-linking/`; depende de Catálogo e regras fiscais atuais. |
| Transações e Conciliação financeira | Existente — redesenhar | Venda possui recebido manual ou importado de relatório; taxa é derivada como produto menos recebido. | Ledger de transações por canal, com comissões, frete, descontos, ajustes, reembolsos e repasses conciliáveis contra pedido e NFe. | `specs/005-pricing-profit-rework/`; depende de identificadores confiáveis de pedido/canal e amostras oficiais de relatórios/APIs. |
| Caixa e contas a pagar | Existente — redesenhar | Caixa manual com entradas, saídas, categorias, status e vínculo opcional com venda. | Contas a pagar e saídas operacionais mais estruturadas, com fornecedores, Compras, vencimentos, anexos e Conciliação futura. | `specs/001-sales-control-system/`; depende de Compras/fornecedores para deixar de ser só lançamento manual. |
| Compras e fornecedores | Planejada | Não há módulo dedicado; compras aparecem indiretamente como saídas de caixa. | Cadastro de fornecedores, pedidos de compra, recebimento de materiais, custos por lote e vínculo com caixa. | Depende da fundação de estoque de insumos e de caixa estruturado. |
| Produção e capacidade | Planejada | Variantes guardam tempo de impressão e tempo manual, mas não há fila de produção. | Fila por pedido, prioridade, status, impressora, tempo previsto, gargalos, retrabalho e apontamento de conclusão. | Depende de catálogo mestre, pedidos e impressoras configuradas. |
| Insumos e estoque | Planejada | Materiais existem para custo por kg; não há estoque físico, reserva ou consumo. | Estoque de filamento, embalagem e acessórios com entradas, reservas por produção, baixa por consumo e alertas de reposição. | Depende de receitas de produto e produção; começa com entradas manuais e depois se integra a Compras. |
| Manutenção | Planejada | Impressoras guardam custo de aquisição, vida útil, consumo e manutenção estimada para custo/hora. | Registro operacional de manutenção preventiva/corretiva, parada, custo real, peças e impacto na capacidade. | Depende de cadastro de impressoras e produção/capacidade. |
| Expedição e pós-venda | Planejada | Pedido/venda registra canal e valores, mas não há fluxo de separação, envio, ocorrência ou atendimento. | Status de separação, embalagem, postagem, devolução, troca, reclamação e impacto financeiro. | Depende de pedidos, produção, estoque e conciliação. |
| Integrações | Planejada | Hoje há importação local de XML e relatórios; APIs de Shopee/TikTok não estão implementadas. | Conectores por canal com credenciais seguras, importação incremental, saúde da integração, logs, retries e modo de simulação antes de escrita. | Depende de modelo de produto, pedidos, transações e pesquisa oficial das APIs. |
| Auditoria, backup e segurança | Existente — redesenhar | App local single-user; SQLite copiável manualmente; extrato mensal exportável em CSV. Não há backup/restauração guiados nem trilha geral de mudanças. | Backup guiado, restauração testável, exportação, trilha de mudanças em dados críticos, proteção de credenciais e decisões explícitas para qualquer mudança de operação. | Constitution, [domain.md](domain.md); credenciais dependem das integrações. |
| Indicadores e alertas | Existente — redesenhar | Dashboard mostra faturamento, MEI, caixa, gastos, vendas por canal e vendas recentes. | Alertas de margem baixa, conciliação pendente, estoque mínimo, teto MEI, produção atrasada, integração com erro e preço desalinhado. | Depende de dados confiáveis de financeiro, produção, estoque e integrações. |
| Emissão unificada de NF-e | Hipótese futura | O sistema importa XML NFe, mas não emite notas. | Avaliar se vale centralizar emissão ou integrar emissor especializado, sem comprometer conformidade fiscal. | Exige pesquisa fiscal e operacional; comparar provedor especializado versus implementação própria. |
| Operação multiusuário/nuvem | Hipótese futura | Constitution atual define app local single-user. | Só considerar se a operação exigir acesso simultâneo, permissões, auditoria forte e backup remoto. | Exige decisão constitucional separada. |
| Contabilidade completa, folha e CRM genérico | Fora de escopo | Não há implementação e não faz parte do problema principal. | Manter fora para preservar foco no ERP vertical da operação. | Pode integrar dados exportados no futuro, sem virar módulo interno. |

## Fluxos Entre Domínios

Configurações -> custos -> catálogo -> preços -> publicação:
materiais, impressoras, energia, mão de obra, embalagem e taxas alimentam o motor de custo. O catálogo usa esse custo para formar preço sugerido e preço praticado. Só depois disso faz sentido criar projeções de canal e automatizar publicação.

Pedidos -> conciliação -> resultado financeiro:
NFe e vendas presenciais criam o faturamento. Relatórios ou transações conciliadas preenchem o recebido real. Taxas configuradas continuam sendo estimativas para precificação; o resultado financeiro real vem do recebido conciliado e dos custos congelados.

Pedidos + catálogo -> produção -> insumos -> expedição:
o pedido demanda variantes do catálogo. A receita de produção define tempo, material e etapas. A produção reserva e consome insumos, usa capacidade das impressoras e libera o item para expedição ou pós-venda.

Compras -> estoque -> custo:
compras registram fornecedores, lotes, valores e recebimento. Estoque passa a ter custo e disponibilidade. O custo futuro usa novos parâmetros, mas vendas antigas preservam custo congelado.

## Requisitos Transversais

- Integridade financeira: separar faturamento, recebido, caixa, taxa, custo e lucro; nunca sobrescrever histórico crítico sem registro.
- Rastreabilidade: cada importação, vínculo de produto, ajuste financeiro, estorno e sincronização futura deve deixar evidência.
- Portabilidade e backup: SQLite local continua copiável/exportável; restauração precisa ser testável quando virar feature.
- Segurança de credenciais: APIs de canal exigem armazenamento local seguro, escopo mínimo e logs sem segredos.
- Observabilidade de integrações: cada conector precisa mostrar última execução, erro, volume importado, pendências e ação recomendada.
- Evolução por specs: capacidades grandes devem virar entregas independentes com dependências explícitas.

## Riscos E Decisões Em Aberto

- APIs de Shopee e TikTok podem não expor todos os componentes necessários para explicar lucro real. A primeira spec de integração deve pesquisar fontes oficiais e validar amostras reais.
- O modelo de produto precisa decidir como representar kits, bundles, personalizações, mídias e atributos obrigatórios por canal.
- O ledger financeiro precisa decidir se uma venda pode ter muitas transações de canal, incluindo reembolso, ajuste, subsídio e repasse parcial.
- Produção precisa decidir se a unidade de trabalho é pedido, item, variante ou peça impressa.
- Emissão unificada de NF-e só deve avançar depois de pesquisa fiscal, riscos de certificado, contingência, manutenção legal e comparação com emissores especializados.

## Referências

- Estado atual: [domain.md](domain.md)
- Rotas e schema: `src/app/`, `src/lib/db/schema.ts`
- Vendas, XML e caixa: `specs/001-sales-control-system/`
- Variantes, custo e precificação: `specs/002-product-variants-pricing/`
- Configurações e navegação: `specs/003-settings-navigation/`
- Correções de custo e taxas: `specs/004-cost-pricing-corrections/`
- Recebido, lucro e faixas de taxa: `specs/005-pricing-profit-rework/`
- Vínculo TikTok por descrição: `specs/006-tiktok-description-linking/`
