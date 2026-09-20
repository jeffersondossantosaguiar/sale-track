# Visão do Produto - Sale Track

## Identidade

O Sale Track é o ERP vertical da operação de impressão 3D da empresa. Ele nasceu para substituir uma planilha do Google usada para controlar vendas, faturamento, caixa e custos, mas a direção do produto é mais ampla: transformar o sistema local na fonte de verdade operacional para produtos, custos, pedidos, produção e resultado financeiro.

O usuário principal é o dono da empresa. O produto deve priorizar clareza, rastreabilidade e velocidade de decisão para uma operação pequena, local e single-user. Integrações, automações e canais novos só entram quando preservarem essa simplicidade.

## Problema

A operação vende em canais com regras diferentes, principalmente Shopee e TikTok. O valor da NFe representa o total pago pelo cliente, incluindo frete e produto, enquanto o dinheiro recebido na conta já vem descontado por regras próprias de cada canal. O ERP precisa separar faturamento, recebido, taxa real, custo congelado e lucro para evitar decisões baseadas em estimativas.

Outro problema central é o cadastro de produtos. O catálogo atual existe, mas ainda não deve ser tratado como o modelo final de produto da empresa. A visão desejada é que o Sale Track mantenha um cadastro mestre canônico e gere projeções controladas para cada canal de venda, com nomes, códigos, preços, atributos e regras específicas sem duplicar a verdade do produto.

## Fonte De Verdade

Fonte de verdade significa que o dado nasce ou é consolidado no Sale Track antes de orientar canais, relatórios e decisões. A regra é:

- Produto mestre: nome interno, variantes, SKU, receita de produção, custos, materiais, mídias e atributos essenciais pertencem ao ERP.
- Projeções de canal: título, descrição, categoria, identificadores, preço praticado e regras específicas de Shopee, TikTok ou futuros canais derivam do cadastro mestre, mas podem ter overrides rastreáveis.
- Resultado financeiro: estimativas de taxas ajudam a precificar; relatórios ou transações conciliadas determinam o realizado.
- Histórico: NFe, custo congelado, recebido conciliado e estornos não são reescritos silenciosamente.

## Princípios

- Integridade financeira vem antes de automação. Nenhum cálculo deve esconder se é estimado ou realizado.
- O sistema deve evoluir por fatias independentes, cada uma com spec, plano, tasks, validação e fechamento.
- O domínio atual fica em [domain.md](domain.md); visão, mapa e roadmap descrevem direção e prioridades.
- O ERP deve ser especializado na operação real de impressão 3D, não um ERP genérico.
- O cadastro de produtos deve ser confortável para trabalhar todos os dias, não apenas tecnicamente correto.
- Integrações externas devem entrar primeiro como leitura, importação ou reconciliação segura antes de qualquer escrita automática em canal.
- Qualquer mudança para nuvem, multiusuário ou emissão fiscal própria exige decisão explícita, porque altera premissas constitucionais ou riscos operacionais.

## Fluxos Centrais

1. Configurações -> custos -> catálogo -> preços -> publicação.
   Materiais, impressoras, energia, mão de obra, embalagens, taxas e margens alimentam o custo e o preço sugerido. O cadastro mestre usa esses dados para formar produtos publicáveis.

2. Pedidos -> conciliação -> resultado financeiro.
   XML/NFe e vendas manuais formam o faturamento. Relatórios ou transações de marketplace preenchem o recebido real. A diferença entre produto e recebido explica taxas, ajustes, descontos e pendências.

3. Pedidos + catálogo -> produção -> insumos -> expedição.
   O pedido precisa gerar necessidade de produção, consumir materiais, respeitar capacidade de impressoras e terminar em separação, envio ou pós-venda.

4. Compras -> estoque -> custo.
   Entradas de filamento, embalagem e acessórios precisam atualizar disponibilidade e base de custo sem alterar margens históricas já congeladas.

## Pilares Funcionais

- Catálogo mestre: produtos, variantes, SKUs, códigos por canal, receitas de produção, kits, mídia e atributos.
- Configurações operacionais: canais, séries de NFe, materiais, impressoras, parâmetros de custo, mão de obra, embalagem, manutenção e teto MEI.
- Custos e precificação: custo calculado, preço sugerido, preço praticado, margem por canal e histórico protegido.
- Pedidos e documentos fiscais: importação de XML, vendas presenciais, estornos, deduplicação e vínculo com itens do catálogo.
- Conciliação financeira: recebido real, taxas derivadas, reembolsos, ajustes, pendências e lucro por venda.
- Caixa e contas a pagar: entradas, saídas, categorias, vínculo com vendas ou compras e visão de saldo.
- Produção e estoque: fila de produção, capacidade, consumo previsto, consumo real e disponibilidade de insumos.
- Integrações: Shopee, TikTok e futuros canais como conectores controlados, com credenciais seguras e observabilidade.
- Operação e governança: auditoria, backup, portabilidade, indicadores e decisões rastreáveis.

## Limites

O Sale Track não deve tentar virar um ERP genérico. Uma ideia pertence ao produto quando melhora a operação de venda, produção, custo, estoque, caixa, fiscal ou canal da empresa de impressão 3D. Ideias úteis, mas amplas demais, entram como hipótese futura ou ficam fora de escopo.

Ficam fora da visão atual de implementação:

- multiempresa, multiusuário e permissões complexas;
- contabilidade completa;
- folha de pagamento;
- CRM genérico;
- BI corporativo amplo;
- automação fiscal própria sem pesquisa especializada;
- publicação automática em canais sem modelo canônico, validação e reversibilidade.

## Sucesso Da Visão

A visão está funcionando quando uma nova ideia pode ser classificada rapidamente como ajuste do estado atual, redesenho necessário, iniciativa priorizada, hipótese futura ou fora de escopo. O dono deve conseguir escolher a próxima feature sem misturar catálogo, financeiro, produção e integrações em uma entrega grande demais.

O resultado desejado é um ERP pequeno, confiável e muito aderente à empresa: o lugar onde os produtos são cadastrados, os canais são alimentados com controle, os pedidos viram produção, os custos permanecem auditáveis e o lucro real deixa de depender de planilhas paralelas.
