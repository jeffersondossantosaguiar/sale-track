# Sale Track — controle de vendas (MEI / impressão 3D)

## Como usar esta documentação

Este arquivo descreve somente o estado atual implementado do domínio. Visão futura, capacidades planejadas e ordem de evolução ficam separadas em:

- [Visão do Produto](product-vision.md) — objetivo, princípios, fluxos e limites do ERP vertical.
- [Mapa de Capacidades](capability-map.md) — estado, alvo, dependências e riscos por domínio.
- [Roadmap](roadmap.md) — horizontes, próximas iniciativas e playbook SDD para novas features.

## Fonte de verdade
- **Realizado por canal:**
  - **Shopee / TikTok:** vendas entram **automaticamente** pela importação do XML da NFe (modelo 55, mercadoria). No Shopee/TikTok **só dá para enviar pedido emitindo NFe** → todo pedido de marketplace tem XML, o import cobre 100% deles por construção.
  - **Presencial:** venda cadastrada **manualmente** (sem nota; conta como faturamento para a DASN mesmo sem NF).
- **Faturamento ≠ dinheiro recebido ≠ lucro:** separados desde o início.
  - Faturamento (controle MEI) = soma das NFe importadas + vendas presenciais, **menos estornos**.
  - Dinheiro recebido = valor que caiu na conta, preenchido manualmente ou por relatório Shopee/TikTok.
  - Lucro = recebido − custo congelado dos itens vendidos; sem recebido, fica pendente.
- **Venda = pedido = 1 NFe.** 2 itens num pedido = 1 NFe; 2 pedidos do mesmo cliente = 2 NFe.

## Teto MEI
- Teto vigente: **R$ 81.000/ano** (2026). Propostas de aumento para R$ 110~145k em tramitação — limite fica **configurável** no sistema, com alerta de % usado.

## Entidades

- **Product** — catálogo mestre do ERP e fonte de verdade da identidade compartilhada: nome, categoria, tipo, tema/personagem, cor principal, tamanho/escala, acabamento, notas internas, margem e imagem principal. Não carrega preço/custo.
- **Variant** — unidade real de venda com **SKU único normalizado em maiúsculas**, nome comercial, overrides opcionais de cor/tamanho/acabamento/notas/imagem, insumos de fabricação (tempo de impressão, tempo manual, peso = filamento, material, embalagem, acessórios), **custo calculado** e preços por canal. Produto simples = 1 variante default.
- **Imagem do catálogo** — arquivo local salvo em `data/catalog-media/`, fora do Git. O banco guarda somente chave opaca, MIME, nome original e tamanho; produto/variante nunca guarda caminho absoluto nem blob binário. Variante sem imagem própria usa fallback da imagem do produto. JPEG/PNG/WebP até 5 MiB, com validação de MIME e assinatura.
- **Material** — filamento com preço por kg (cor/tipo).
- **VariantPrice** — margem, preço sugerido e praticado por variante × canal (Shopee/TikTok).
- **Printer** — referência de custo (aquisição, vida útil, consumo W, manutenção) para derivar o R$/hora global (usa-se a **mais cara**).
- **Sale** — canal, data, status (`normal` | `refunded` + data), itens `[{ descrição, qtd, valor unit, cProd, variantId?, custo congelado }]`, valor bruto (NFe, imutável), frete, **recebido** (manual ou relatório), taxa derivada `produto − recebido`, lucro `recebido − custo`, nº + série da NFe, cópia do XML bruto. Estorno **tira a venda do faturamento**, zera líquido, e sugere saída de caixa (reembolso).
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

## Recebido, taxas e relatórios
- O **recebido** é a fonte da verdade financeira da venda: pode ser digitado em Vendas ou importado dos relatórios dos marketplaces.
- Shopee cruza relatório com NFe por ID do pedido; TikTok cruza por produto/SKU + data + quantidade + valor coerente. Matches ambíguos ficam para conferência manual.
- A **taxa da venda** é derivada como `(bruto − frete) − recebido`; ela é somente leitura.
- As **faixas de taxa por canal** ficam em Configurações → Canais e servem para calcular preço sugerido, não para sobrescrever o recebido real.

## Importação de XML
- Upload **em lote** de vários XMLs de uma vez.
- **Canal identificado pela série da NFe** (configurável em Configurações → Canais; ex.: Shopee = séries 1 e 2, TikTok = série 3). Série não mapeada cai para o padrão do nome de arquivo (Shopee: `..._invoice_file_...`; TikTok: número puro); desconhecido pergunta manual — sugestão **editável por lote** antes de confirmar.
- Itens casam com o catálogo por chave de canal, na granularidade de **variante**: Shopee/presencial usam `cProd`; TikTok usa a **descrição do item** porque o `cProd` vem genérico (`Padrao`). `product_codes.channel` é sempre explícito (`geral`, `shopee`, `tiktok`) e a unicidade usa `(channel, normalizedCode)`. TikTok rejeita o código genérico `Padrao`; deve aprender pela descrição. Sem vínculo cai na fila "códigos sem vínculo" para ligar à variante **uma vez** (daí aprende). Ao aplicar custo, congela o custo da venda.
- Faturamento do mês = NF importadas + presencial − estornos.

## Telas / relatórios
- **Dashboard:** faturamento do mês + barra de % do teto MEI no ano (leitura); caixa (entradas, saídas, saldo); gastos por categoria; vendas por canal (bruto / taxas derivadas / recebido); vendas recentes.
- **Navegação:** menu lateral (sidebar) fixo em desktop e drawer/hambúrguer em telas pequenas, com item expansível **Configurações**.
- **Produtos** (catálogo mestre + variantes + herança/overrides + imagem local + códigos por canal), **Vendas** (importadas + manuais + recebido/lucro + estornar + importar relatórios), **Caixa**, **Códigos sem vínculo**, **Importar XML**, **Extrato mensal exportável** (base para DASN).
- **Configurações** (`/settings`, menu lateral): **Precificação** (`/settings/pricing` — parâmetros globais de energia/horas/mão de obra + materiais), **Impressoras** (`/settings/printers`), **Canais** (`/settings/channels` — séries de emissão da NFe que identificam o canal + faixas de taxa) e **Teto MEI** (`/settings/mei` — edição; Dashboard mostra apenas o progresso).

## Stack / operação
- **Next.js fullstack** (App Router + Server Actions) + **SQLite** (Drizzle + better-sqlite3) + **Tailwind + ShadCN + Biome**, **Node LTS**.
- App **local**, single-user, sem login; abre no navegador (acessível do celular na mesma rede Wi-Fi).
- Os dados ficam em `data/sale-track.db` e as imagens do catálogo em `data/catalog-media/`; backup/restauração precisa copiar os dois juntos com o app fechado. Há exportação do extrato mensal em CSV, mas ainda não existe um fluxo guiado de backup e restauração do banco+mídia.

## Fora de escopo (fase atual)
- Integração com APIs de Shopee/TikTok (fase futura, o stack permite).
- Estoque/controle de inventário (produção sob demanda).
- Reconciliação bancária (sem importar extrato).
- Notas de serviço (NFS-e) — só NFe 55.

## Decisões registradas na entrevista
- XML cria a venda completa; caixa manual com categorias; variantes com custo calculado e congelado por venda; estorno por status; upload em lote com dedup; catálogo manual + vínculo automático por `cProd` na Shopee/presencial e por descrição no TikTok; canal por série da NFe com fallback por nome de arquivo; recebido por relatório/manual; taxa derivada; histórico migrado pelos XMLs; local; Next.js fullstack.
