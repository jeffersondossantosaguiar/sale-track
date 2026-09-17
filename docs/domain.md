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

- **Product** — contêiner de **variantes**; nome, categoria. Não carrega mais preço/custo.
- **Variant** — unidade real de venda com **SKU único**, insumos de fabricação (tempo de impressão, tempo manual, peso = filamento, material, embalagem, acessórios), **custo calculado** e preços por canal. Produto simples = 1 variante default.
- **Material** — filamento com preço por kg (cor/tipo).
- **VariantPrice** — margem, preço sugerido e praticado por variante × canal (Shopee/TikTok).
- **Printer** — referência de custo (aquisição, vida útil, consumo W, manutenção) para derivar o R$/hora global (usa-se a **mais cara**).
- **Sale** — canal, data, status (`normal` | `estornado` + data), itens `[{ descrição, qtd, valor unit, cProd, variantId?, custo congelado }]`, valor bruto (NFe, imutável), **taxa marketplace** pré-preenchida por canal e editável, **líquido = bruto − taxa**, nº + série da NFe, cópia do XML bruto. Estorno **tira a venda do faturamento**, zera líquido, e sugere saída de caixa (reembolso).
- **CashEntry (caixa)** — data, tipo (entrada/saída), categoria (filamento, energia, manutenção, taxas, embalagem, outros), valor, descrição, vínculo opcional a venda(s).
- **Invoice** — incorporado à Sale: número, série, data, total, XML original salvo. **Deduplicação por nº da nota.**

## Custo, margem e precificação (motor de custo)
- **Motor de custo da variante:** `custo = filamento + energia + máquina + mão de obra + embalagem + acessórios`, detalhado por linha (mão de obra destacada).
  - filamento = `peso(g)/1000 × R$/kg do material` (peso = filamento gasto).
  - energia = `tempo_impressão × energia/h global` (impressora **mais cara** ativa × `kW × R$/kWh`).
  - máquina = `tempo_impressão × máquina/h global` (depreciação + manutenção da impressora mais cara).
  - mão de obra = `tempo MANUAL × R$/hora` — **o tempo de impressão NÃO conta** (é trabalho da máquina; 004).
- **Preço sugerido por canal** = `(custo + taxa_fixa) / (1 − taxa% − margem%)`. **Preço praticado** é decisão do dono e fica **congelado** (o sugerido é só ajuda; mudanças de custo/margem/taxa não o alteram). A taxa % do canal é gravada como **basis points** (`% × 100`).
- **Custo congelado na venda:** cada venda guarda o custo vigente da **variante** *no dia da venda* — alterar custo/preço do cadastro **não muda** margens históricas (a NFe também não pode ser alterada).
- Botão **"aplicar custo atual às vendas sem custo"**: preenche só vendas que nunca tiveram custo e nunca toca nas já definidas.

## Taxas do marketplace
- **Percentual/regra padrão por canal**, configurado pelo usuário (a partir dos docs de cobrança de Shopee/TikTok e do det. das taxas no painel do vendedor).
- Na venda, a taxa vem **pré-preenchida** e é **editável** com o detalhamento real do pedido. Regra do sistema é só palpite inicial — a verdade é sempre o detalhamento do painel.

## Importação de XML
- Upload **em lote** de vários XMLs de uma vez.
- **Canal detectado pelo nome do arquivo** (Shopee: `..._invoice_file_...`; TikTok: número puro) — sugestão **editável por lote** antes de confirmar; padrão desconhecido pergunta manual.
- Itens casam com o catálogo por `cProd` + dica de canal, na granularidade de **variante**; sem vínculo cai na fila "códigos sem vínculo" para ligar à variante **uma vez** (daí aprende). Ao vincular, congela o custo da venda.
- Faturamento do mês = NF importadas + presencial − estornos.

## Telas / relatórios
- **Dashboard:** faturamento do mês + barra de % do teto MEI no ano (leitura); caixa (entradas, saídas, saldo); gastos por categoria; vendas por canal (bruto / taxas / líquido); vendas recentes.
- **Navegação:** menu lateral (sidebar) fixo em desktop e drawer/hambúrguer em telas pequenas, com item expansível **Configurações**.
- **Produtos** (catálogo manual + códigos por canal), **Vendas** (importadas + manuais + estornar + taxa editável), **Caixa**, **Códigos sem vínculo**, **Importar XML**, **Extrato mensal exportável** (base para DASN).
- **Configurações** (`/settings`, menu lateral): **Precificação** (`/settings/pricing` — parâmetros globais de energia/horas/mão de obra + materiais), **Impressoras** (`/settings/printers`), **Taxas por canal** (`/settings/sales-channels` — taxa padrão % + fixa) e **Teto MEI** (`/settings/mei` — edição; Dashboard mostra apenas o progresso).

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