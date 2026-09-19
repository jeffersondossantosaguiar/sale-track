# sale-track · Guia do dono (MEI de impressão 3D)

Sistema local para controlar **faturamento** (notas fiscais Shopee/TikTok + vendas presenciais),
**dinheiro recebido**, **lucro**, **caixa** e o **teto anual do MEI**. Dados ficam na sua
máquina (pasta `data/`, fora do git).

## Começando

```bash
pnpm install
pnpm db:migrate   # cria/atualiza o banco local
pnpm dev          # abre http://localhost:3000
```

Como **tudo é local e de usuário único**, não há login. Faça backup copiando a pasta `data/`.

## Rotina diária (passo a passo)

1. **Produtos** (`/products`) — cadastre cada produto com:
   - nome, categoria;
   - **margem desejada** do produto;
   - uma ou mais **variantes** (SKU, nome, tempo de impressão, tempo manual, peso de filamento,
     material, embalagem e acessórios);
   - **preço praticado** por canal (Shopee/TikTok). O sistema calcula o **preço sugerido** com
     base no custo, margem do produto e faixas de taxa do canal, mas não altera o praticado sozinho;
   - **código(s) por canal** para vincular itens importados ao catálogo. Na Shopee o vínculo usa
     o `cProd` da nota; no TikTok usa a **descrição do item**, porque o `cProd` costuma vir como
     `Padrao`.
   - O custo fica **congelado por venda**: se você mudar custo, material, impressora ou margem
     depois, as vendas passadas não mudam.
2. **Vendas** (`/sales`) — importe as notas:
   - arraste os arquivos XML baixados dos painéis da Shopee/TikTok;
   - confira o **canal** sugerido pelo nome do arquivo e confirme o lote;
   - a nota **só é importada uma vez** — reenviar o mesmo arquivo avisa "já importada";
   - itens da nota sem variante vinculada caem em "códigos sem vínculo" para você vincular;
   - no TikTok, use a fila para vincular cada descrição correta à variante certa. Se houver dados
     antigos contaminados pelo código `Padrao`, use a ação **Reparar vínculos TikTok** antes de
     aplicar custos;
   - **Venda presencial**: registre à mão no mesmo painel (produtos + data + valor) — ela
     entra no faturamento e no caixa.
3. **Recebido e lucro** (`/sales`) — as notas importadas nascem com o lucro **pendente** até você
   informar quanto caiu na conta:
   - importe os relatórios de saldo/renda da Shopee/TikTok para preencher o **recebido** automaticamente
     quando houver match confiável;
   - confira manualmente casos sem match ou ambíguos;
   - a **taxa** da venda é derivada como `(bruto − frete) − recebido`;
   - o **lucro** é `recebido − soma(custo congelado × quantidade)`;
   - o **bruto da nota nunca muda** e segue como base de faturamento/MEI.
4. **Configurações** (`/settings`) — mantenha os parâmetros que alimentam custo e preço:
   - **Precificação**: energia, horas/semana, custo/hora de mão de obra e materiais;
   - **Impressoras**: aquisição, vida útil, consumo e manutenção; o sistema usa a impressora ativa
     mais cara como referência global;
   - **Canais**: séries de NFe por canal e faixas de taxa (comissão% + fixa por faixa);
   - **Teto MEI**: limite anual configurável.
5. **Caixa** (`/cash`) — lance entradas e saídas por categoria (filamento, energia, embalagem,
   manutenção, taxas, outros). Veja o saldo e o gasto por categoria no **Dashboard**.
   Corrigir lançamento? Use **Estornar** (nunca exclui — mantém o histórico).
6. **Estornar venda** (`/sales`, botão na lista) — se um cliente devolver, estorne a venda:
   ela **sai do faturamento** do mês/ano; se ela tinha entrado no caixa (presencial), o
   reembolso entra sozinho no caixa.
7. **Dashboard** (`/`) — consulte em < 60 s:
   - faturamento do mês e do ano;
   - **% do teto MEI usado** (barra). O teto **é configurável** (padrão R$ 81.000,00) — o
     limite pode mudar por lei;
   - caixa do mês e gastos por categoria;
   - vendas por canal (bruto, taxas derivadas e recebido/líquido). Troque o mês pelo seletor.
8. **Extrato p/ declaração** — no navegador, abra
   `http://localhost:3000/api/export?m=AAAA-MM` (ex.: `?m=2026-09`). Você baixa um **CSV** com
   o faturamento do mês por tipo e o caixa — base direta para a **DASN-SIMEI**.

## Regras que o sistema garante

- **Dinheiro em centavos** — nada de erro de vírgula.
- **Faturamento ≠ Caixa ≠ Lucro**: o faturamento MEI usa o bruto da nota; o caixa acompanha o
  dinheiro real; o lucro usa o recebido menos custo congelado.
- **Taxa derivada**: em vendas de marketplace, a taxa não é a fonte da verdade; ela nasce do
  recebido informado/importado.
- **Custo histórico congelado**: alterações no catálogo recalculam variantes e preços sugeridos,
  mas não reescrevem vendas antigas.
- **Nada é apagado**: venda estornada vira *refunded* com data; lançamento corrigido vira
  estorno com data própria. Histórico sempre auditável.
- **Limpeza**: dados só na sua máquina; backup = copiar a pasta `data/`.

## Manutenção

| Comando | O que faz |
| --- | --- |
| `pnpm db:migrate` | aplica migrações do banco local |
| `pnpm db:seed` | re-cria categorias/teto/faixas padrão (não apaga seus dados) |
| `pnpm test` | roda os testes (validação de regras financeiras) |
| `pnpm typecheck` | valida tipos TypeScript |
| `pnpm lint:check` | roda o Biome sem alterar arquivos |
| `pnpm build` | compila uma versão de produção |

Detalhes técnicos: [docs/domain.md](domain.md), [specs/005-pricing-profit-rework](../specs/005-pricing-profit-rework/spec.md)
e [specs/006-tiktok-description-linking](../specs/006-tiktok-description-linking/spec.md).
