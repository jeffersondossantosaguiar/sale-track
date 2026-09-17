# Research — Precificação e Apuração de Lucro por Canal

**Feature**: `005-pricing-profit-rework` | **Fase 0 do /speckit.plan**

As decisões foram resolvidas na entrevista de grill-me com o dono e validadas contra NFes reais
(Shopee/TikTok) e relatórios exportados. Este documento registra cada decisão, justificativa e
alternativas descartadas.

## 1. Lucro = valor recebido (verdade), não valor da nota

- **Decisão**: `lucro = recebido − Σ(custo × quantidade)`. O **recebido** (valor que cai na conta) é a
  fonte da verdade. O bruto da nota (`vNF`) fica imutável, para faturamento/MEI.
- **Rationale**: a nota embute frete + taxas do marketplace + descontos Pix/cupom; o lucro a partir
  dela é aproximado e superestima o ganho real. O recebido é exato.
- **Alternativas**: manter `lucro = bruto − taxa − custo` (descartado — aproximado e superestima;
  era o "lucro ≈ valor da nota" reportado pelo dono).

## 2. Frete automático da NFe (`vFrete`)

- **Decisão**: extrair `vFrete` no parser → `freight_cents` por venda (default 0). `produto = bruto −
  frete`.
- **Rationale**: validado em nota real (`2609167NCGVX7X`: `vNF 156,49 = vProd 132,62 + vFrete 23,87`).
  O frete já está na nota; não precisa digitação.
- **Alternativas**: frete manual por venda (descartado — redundante, a nota já expõe); frete fixo por
  canal (descartado — varia por venda).

## 3. Taxa derivada e somente-leitura

- **Decisão**: `taxa = (bruto − frete) − recebido`, derivada, não editável.
- **Rationale**: o recebido é a verdade; editar taxa quebraria o conjunto. Mostra quanto o marketplace
  retirou de fato.
- **Alternativas**: taxa editável (existente via `setSaleFee`) (descartado — inconsistente com recebido
  como verdade).

## 4. Sem recebido → lucro pendente

- **Decisão**: sem `received_cents`, lucro fica **pendente**; estimativa por faixa (quando disponível)
  exibida à parte, marcada como estimativa.
- **Rationale**: nunca inventar número (constitution I). Separa apurado de estimado.
- **Alternativas**: fallback automático pela faixa (descartado — mistura apurado com estimado).

## 5. Margem unificada por produto (campo livre, % do bruto)

- **Decisão**: `products.margin_bps`, campo livre (ex.: 30 ou 35). Herdada pelas variantes no preço
  sugerido. **Semântica**: % do preço bruto (validada com o dono: custo R$10, taxa 20%, margem 30% →
  preço R$20).
- **Rationale**: o dono usa 30%/35% por exclusividade do produto (não por canal). Campo livre permite
  qualquer valor sem recálculo manual.
- **Alternativas**: margem por canal (existente — descartado, não reflete a realidade do dono); presets
  30/35 fixos (descartado — o dono prefere digitar).

## 6. Taxa por canal = tabela de faixas (comissão% + fixa), sem subsídio

- **Decisão**: nova entidade `channel_fee_tiers` (channel, min, max, commission_bps, fixed_cents).
  Computada **por item × quantidade** (faixa pelo preço unitário). **Sem subsídio**.
- **Rationale**: as taxas reais (Shopee: ≤79,99→20%+4; 80–99,99→14%+4; ... TikTok: <50→10%+4;
  ≥50→6%+6) são **por valor do item**, escalonadas. Subsídio Pix é entre marketplace e comprador
  (decisão do dono: descartado — só afeta a NFe).
- **Alternativas**: % único por canal (existente — não representa as faixas); subsídio modelado
  (descartado — o dono recebe o mesmo no Pix/cartão e prefere não modelar).

## 7. Preço sugerido por iteração sobre as faixas

- **Decisão**: `computeSuggestedPriceCents(custo, margem, faixas)` itera: candidato → acha faixa →
  `(custo + fixa) / (1 − comissão − margem)` → repete até a faixa estabilizar (limite ~6 iterações);
  erro se comissão+margem ≥ 100% ou faixa não resolvível.
- **Rationale**: a taxa depende do valor, que depende da taxa → iteração resolve. Preserva a margem
  líquida (semântica já validada).
- **Alternativas**: resolver analiticamente por faixa (descartado — iteração é simples e robusta).

## 8. Editor de taxas: texto → linhas estruturadas

- **Decisão**: usuário digita cada faixa em texto (ex.: `<= 79,99 = 20% + 4`); o app converte em
  linhas estruturadas (min/max/comissão/fixa) com **prévia e validação** antes de salvar.
- **Rationale**: legível e à prova de erro (armazena números limpos em centavos/bps, não parseia texto
  em runtime — constitution V).
- **Alternativas**: só linhas estruturadas em tabela (descartado — menos agradável ao dono); texto
  puro sem estrutura (descartado — frágil).

## 9. Importação de relatórios (Shopee/TikTok) → recebido por pedido

- **Decisão**: importar os relatórios exportados para preencher o recebido por pedido.
  - **Shopee** (relatório de saldo): transações "Renda do pedido", com `ID do pedido` e valor. Match por
    **ID do pedido** (presente no nome da NFe) — validado: `260907C6P2FS35 → R$11,17`.
  - **TikTok** (income, aba **"Detalhes do pedido"**): linha por pedido com `ID do pedido/ajuste`,
    `Valor total a ser liquidado`, `Vendas líquidas`, `Custo de frete`, `Taxas`. Os valores por pedido
    **somam o extrato diário** (ex.: 09/14 → 11,86+11,38+11,86 = 35,10 = "Pagamentos"). Match por
    **produto/SKU + data + quantidade + valor coerente** (nome da NFe é timestamp, não casa por ID).
- **Rationale**: dá o recebido real por venda, automatizando a planilha manual. Cada canal tem parser
  próprio (xlsx/csv); o modelo de lucro é agnóstico de canal.
- **Alternativas**: só manual (descartado — o dono quer automação); integração de API (adiada — fora
  do escopo).

## 10. Match: alta confiança auto, ambíguo → conferência manual

- **Decisão**: Shopee casa por ID exato (auto). TikTok casa por produto/SKU+data+qtd+valor coerente;
  só auto-associa com alta confiança; o resto vai para uma **fila de conferência manual**.
- **Rationale**: evita falso vínculo (constitution I). O dono confirma/ajusta.
- **Alternativas**: manual para tudo (descartado — perde automação); auto com heurística agressiva
  (descartado — risco de vínculo errado).

## 11. Reembolsos e cupons

- **Decisão**: reembolsos nos relatórios (valor a liquidar = 0) **ignorados por ora**, documentados no
  README como melhoria/ponto a verificar. Cupons/descontos Pix não são modelados (recebido já embute).
- **Rationale**: manter escopo; o dono optou por ignorar reembolsos nesta versão.
- **Alternativas**: marcar venda como reembolsada (adiado — decisão explícita do dono de postergar).

## 12. Leitura de relatórios (xlsx/csv)

- **Decisão**: suportar **xlsx e csv**. Para xlsx, usar `xlsx` (SheetJS) — já convencional — ou parse
  zip+xml próprio (sem dependência), conforme avaliação na implementação; ambos permitidos. Formato
  assumido estável nas exportações.
- **Rationale**: os relatórios exportam xlsx (validados) e podem vir como csv; não muda a arquitetura.
- **Alternativas**: só xlsx (descartado — o dono mencionou csv como possível).

## 13. Dados e migração

- **Decisão**: dados podem ser migrados/recriados (banco contém apenas NFe de teste; recebidos reais
  virão dos relatórios).
- **Rationale**: liberdade para reformular o schema (research 002 §11).
- **Alternativas**: preservar histórico (desnecessário — dados de teste).