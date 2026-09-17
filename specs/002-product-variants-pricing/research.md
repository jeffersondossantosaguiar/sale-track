# Research — Catálogo com Variantes e Precificação por Canal

**Feature**: `002-product-variants-pricing` | **Fase 0 do /speckit.plan**

As decisões desta feature foram todas resolvidas na entrevista de grill-me com o dono; não há
desconhecidos de domínio externo. Este documento registra cada decisão, sua justificativa e as
alternativas descartadas, para servir de trilha de raciocínio no planejamento.

## 1. Modelo Produto → Variante

- **Decisão**: o catálogo passa a ter `Product` (contêiner) → `Variant` (unidade de venda real).
  Todo produto tem ao menos uma variante; produto simples = 1 variante default. Preço/custo saem de
  `products` e viram propriedades da variante.
- **Rationale**: o dono vende a mesma peça em cores/tamanhos/kits com custo e preço distintos. A
  granularidade de venda/import deve ser a variante. Modelo uniforme (produto simples = 1 variante)
  elimina caminhos condicionais no código.
- **Alternatives**: manter um único preço/custo por produto (descartado — não modela variações);
  modelar "sem variantes" como caso especial (descartado — duplica lógica).

## 2. SKU unificado

- **Decisão**: a variante tem um `sku` único e legível definido pelo dono, como identificador
  reconhecível entre canais. **Não** substitui `product_codes` (cProd por canal da nota).
- **Rationale**: o dono quer reconhecer o produto pelo nome entre canais; o cProd continua sendo o
  vínculo com a nota, que difere por canal. SKU é semântico; cProd é operacional.
- **Alternatives**: substituir product_codes pelo SKU (descartado — o cProd da NFe varia por canal e
  o import precisa casar por canal).

## 3. Motor de custo por variante

- **Decisão**: `custo_variante` = filamento + energia+máquina + mão de obra + embalagem + acessórios,
  exibido em detalhamento por linha, com mão de obra destacada.
- **Rationale**: o custo é a base da precificação e do lucro; o detalhamento por linha dá
  rastreabilidade e confiança (alinhado à constitution §III).
- **Componentes**:
  - filamento = `peso(g) / 1000 × R$/kg do material`. **Peso = filamento gasto** (a peça impressa
    pesa ≈ o filamento consumido). Um único campo.
  - energia+máquina = `tempo_impressão × R$/hora_global`.
  - mão de obra = `(tempo_impressão + tempo_manual) × R$/hora_mão_de_obra`.
  - embalagem = custo digitado por variante.
  - acessórios = lista de {nome, custo} somada.
- **Alternatives**: peso separado do consumo de filamento (descartado — redundante); filamento por
  média ponderada de estoque (adiado para evolução futura).

## 4. Parâmetros globais vs por variante

- **Decisão**: energia, máquina e mão de obra são **globais** (taxa); o que varia por variante é o
  **tempo** (impressão e manual). Filamento (material+peso), embalagem, acessórios são por variante.
- **Rationale**: o dono não atribui produto a impressora (usa a que está livre) e não quer redigitar
  energia/mão de obra por cor. O tempo é o único componente que muda por fabricação.
- **Alternatives**: digitar energia/máquina/mão de obra por variante (descartado — redundante e
  propenso a erro).

## 5. Energia e máquina (impressoras como referência)

- **Decisão**: entidade `Printer` (aquisição, vida útil, consumo W, manutenção). O custo/hora global
  de energia+máquina é derivado **da impressora mais cara** cadastrada.
- **Rationale**: qualquer produto pode rodar em qualquer máquina; usar a mais cara é conservador e
  cobre o pior caso, decisão explícita do dono. Parâmetros globais: `R$/kWh`, `hours_per_week`.
- **Cálculo**: `horas_ano = hours_per_week × 52`; `depreciação/hora = aquisição / (vida_útil ×
  horas_ano)`; `energia/hora = (W/1000) × R$/kWh`; `custo_máquina/hora = depreciação + energia +
  manutenção`. Usa-se o maior entre as impressoras cadastradas.
- **Alternatives**: média das máquinas (descartado — o dono preferiu o pior caso, "máquina mais
  cara"); atribuir variante → impressora (descartado — o dono não escolhe a máquina por produto).

## 6. Preço sugerido e praticado por canal

- **Decisão**: `preço_sugerido_canal = (custo + taxa_fixa_canal) / (1 − taxa_var%_canal − margem%_canal)`.
  Margem é **por variante × canal** (Shopee/TikTok). Preço **praticado** é congelado até ação manual.
- **Rationale**: a fórmula preserva a margem líquida descontando taxas do canal (validada
  matematicamente com o dono). O praticado é decisão do dono e não muda automaticamente (o sugerido
  é só ajuda). Taxas de canal passam a ter **componente fixa + percentual** (hoje só há percentual).
- **Alternatives**: markup `custo × (1 + margem)` (descartado — não preserva margem líquida);
  margem única por produto (descartado — o dono usa margens diferentes por canal).

## 7. Filamento por material (preço fixo)

- **Decisão**: entidade `Material` com preço por kg (cor/tipo). Variante referencia um material e
  informa o peso. Alterar o preço do material recalcula o custo das variantes.
- **Rationale**: simples e resolve a incidência do custo sem redigitação. Média ponderada por compra
  (estoque) fica como evolução futura (decisão do dono).
- **Alternatives**: vínculo com estoque de compras (adiado); digitar o custo do filamento a cada
  produto (descartado — repetitivo).

## 8. Acessórios e kits

- **Decisão**: acessórios = lista simples de {nome, custo} somada ao custo. Kit = variante normal com
  custo montado manualmente; **sem** composição automática de componentes (BOM) nesta versão.
- **Rationale**: acessórios são custo somado trivial. Kit-composição automática é o item mais caro e
  não é necessário agora — o dono soma manualmente.
- **Alternatives**: motor de lista de materiais (BOM) automático (adiado para evolução futura).

## 9. Granularidade de venda/import na variante

- **Decisão**: `product_codes` passa a apontar para a variante; `sale_items` ganha `variantId`; o
  custo congelado (`frozenCostCents`) passa a ser o custo da variante. Import casa cProd → variante.
- **Rationale**: mantém a integridade financeira (constitution §I) na nova granularidade e preserva
  o vínculo por canal.
- **Alternatives**: manter vínculo no produto (descartado — incompatível com preço/custo por variante).

## 10. Canal presencial e teto MEI

- **Decisão**: presencial está **fora do escopo** desta feature; o comportamento atual (cadastro de
  venda presencial e sua inclusão no teto) é preservado. Nenhuma mudança na apuração do teto MEI.
- **Rationale**: decisão do dono de não expandir presencial agora, sem remover o que já funciona.
- **Alternatives**: remover presencial do app (descartado — destrutivo, sem ganho); incluir presencial
  na nova precificação (descartado — o dono precifica presencial na hora).

## 11. Dados e migração

- **Decisão**: dados podem ser **migrados/recriados** (há apenas uma nota de teste). Notas reais de
  Shopee/TikTok com múltiplos itens e variantes estão disponíveis para validar as regras de vínculo e
  custo.
- **Rationale**: liberdade para reformular o schema sem compromisso de preservar histórico.
- **Alternatives**: migrar preservando histórico (desnecessário — dados de teste apenas).