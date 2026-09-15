# Sale Track — controle de vendas (MEI / impressão 3D)

## Fonte de verdade
- **Realizado por canal:**
  - **Shopee / TikTok:** vendas entram **automaticamente** pela importação do XML da NFe (modelo 55, mercadoria). No Shopee/TikTok **só dá para enviar pedido emitindo NFe** → todo pedido de marketplace tem XML, o import cobre 100% deles por construção.
  - **Presencial:** venda cadastrada **manualmente** (sem nota; conta como faturamento para a DASN mesmo sem NF).
- **Faturamento ≠ dinheiro recebido:** separados desde o início.
  - Faturamento (controle MEI) = soma das NFe importadas + vendas presenciais, **menos estornos**.
  - Dinheiro recebido = caixa (repasse do marketplace e PIX/cash presencial), lançado manualmente.
- **Venda = pedido = 1 NFe.** 2 itens num pedido = 1 NFe; 2 pedidos do mesmo cliente = 2 NFe.

## Teto MEI
- Teto vigente: **R$ 81.000/ano** (2026). Propostas de aumento para R$ 110~145k em tramitação — limite fica **configurável** no sistema, com alerta de % usado.

## Entidades

- **Product** — nome, categoria, preço de venda, custo estimado atual (filamento + energia aprox.), lista de **códigos** (`cProd` por canal: Shopee, TikTok, geral). Códigos curados manualmente; o sistema aprende novos vínculos ao ligar um código solto.
- **Sale** — canal, data, status (`normal` | `estornado` + data), itens `[{ descrição, qtd, valor unit, cProd, productId?, custo congelado }]`, valor bruto (NFe, imutável), **taxa marketplace** pré-preenchida por canal e editável, **líquido = bruto − taxa**, nº + série da NFe, cópia do XML bruto. Estorno **tira a venda do faturamento**, zera líquido, e sugere saída de caixa (reembolso).
- **CashEntry (caixa)** — data, tipo (entrada/saída), categoria (filamento, energia, manutenção, taxas, embalagem, outros), valor, descrição, vínculo opcional a venda(s).
- **Invoice** — incorporado à Sale: número, série, data, total, XML original salvo. **Deduplicação por nº da nota.**

## Custo e margem
- **Custo congelado na venda:** cada venda guarda o custo vigente do produto *no dia da venda* — alterar o custo/preço do cadastro **não muda** margens históricas (a NFe também não pode ser alterada).
- Botão **"aplicar custo atual às vendas sem custo"**: preenche só vendas que nunca tiveram custo (fase de transição pós-importação) e nunca toca nas já definidas.
- Margem por venda usa o custo congelado; margem de novo produto usa o custo atual do cadastro.

## Taxas do marketplace
- **Percentual/regra padrão por canal**, configurado pelo usuário (a partir dos docs de cobrança de Shopee/TikTok e do det. das taxas no painel do vendedor).
- Na venda, a taxa vem **pré-preenchida** e é **editável** com o detalhamento real do pedido. Regra do sistema é só palpite inicial — a verdade é sempre o detalhamento do painel.

## Importação de XML
- Upload **em lote** de vários XMLs de uma vez.
- **Canal detectado pelo nome do arquivo** (Shopee: `..._invoice_file_...`; TikTok: número puro) — sugestão **editável por lote** antes de confirmar; padrão desconhecido pergunta manual.
- Itens casam com o catálogo por `cProd` + dica de canal; sem vínculo cai na fila "códigos sem vínculo" para ligar ao produto **uma vez** (daí aprende). Ao vincular, congela o custo da venda.
- Faturamento do mês = NF importadas + presencial − estornos.

## Telas / relatórios
- **Dashboard:** faturamento do mês + barra de % do teto MEI no ano; caixa (entradas, saídas, saldo); gastos por categoria; vendas por canal (bruto / taxas / líquido); vendas recentes.
- **Produtos** (catálogo manual + códigos por canal), **Vendas** (importadas + manuais + estornar + taxa editável), **Caixa**, **Códigos sem vínculo**, **Importar XML**, **Configurações** (teto MEI, % taxa por canal), **Extrato mensal exportável** (base para DASN).

## Stack / operação
- **Next.js fullstack** (App Router + Server Actions) + **SQLite** (Drizzle + better-sqlite3) + **Tailwind + ShadCN + Biome**, **Node LTS**.
- App **local**, single-user, sem login; abre no navegador (acessível do celular na mesma rede Wi-Fi).
- Backup simples: copiar o arquivo SQLite (botão de exportar backup/CSV).

## Fora de escopo (fase atual)
- Integração com APIs de Shopee/TikTok (fase futura, o stack permite).
- Estoque/controle de inventário (produção sob demanda).
- Reconciliação bancária (sem importar extrato).
- Notas de serviço (NFS-e) — só NFe 55.

## Decisões registradas na entrevista
- XML cria a venda completa; caixa manual com categorias; custo estimado por produto (congelado por venda); estorno por status; upload em lote com dedup; catálogo manual + vínculo automático por `cProd`; canal por padrão de nome de arquivo; taxas por venda pré-preenchidas; histórico migrado pelos XMLs; local; Next.js fullstack.