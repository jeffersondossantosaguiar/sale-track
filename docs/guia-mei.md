# sale-track · Guia do dono (MEI de impressão 3D)

Sistema local para controlar **faturamento** (notas fiscais Shopee/TikTok + vendas presenciais),
**taxas/líquido**, **caixa** e o **teto anual do MEI**. Dados ficam na sua máquina
(pasta `data/`, fora do git).

## Começando

```bash
npm install
npm run db:migrate   # cria/atualiza o banco local
npm run dev          # abre http://localhost:3000
```

Como **tudo é local e de usuário único**, não há login. Faça backup copiando a pasta `data/`.

## Rotina diária (passo a passo)

1. **Produtos** (`/products`) — cadastre cada produto com:
   - nome, categoria;
   - **preço de venda** e **custo estimado** (a margem é calculada na hora);
   - **código(s)** por canal (o mesmo código que vem na nota). Salvar.
   - O custo fica **congelado por venda**: se você mudar o preço/custo depois, as vendas
     passadas não mudam.
2. **Vendas** (`/sales`) — importe as notas:
   - arraste os arquivos XML baixados dos painéis da Shopee/TikTok;
   - confira o **canal** sugerido pelo nome do arquivo e confirme o lote;
   - a nota **só é importada uma vez** — reenviar o mesmo arquivo avisa "já importada";
   - itens da nota sem produto vinculado caem em "códigos sem vínculo" para você vincular.
   - **Venda presencial**: registre à mão no mesmo painel (produtos + data + valor) — ela
     entra no faturamento e no caixa.
3. **Taxas** (`/sales`, abaixo da lista) — cada canal tem uma **% padrão** configurável
   (ex.: Shopee 12%). Importações novas nascem com essa taxa; você pode **editar a taxa de
   qualquer venda** (o líquido = bruto − taxa recalcula na hora). O **bruto da nota nunca muda**.
4. **Caixa** (`/cash`) — lance entradas e saídas por categoria (filamento, energia, embalagem,
   manutenção, taxas, outros). Veja o saldo e o gasto por categoria no **Dashboard**.
   Corrigir lançamento? Use **Estornar** (nunca exclui — mantém o histórico).
5. **Estornar venda** (`/sales`, botão na lista) — se um cliente devolver, estorne a venda:
   ela **sai do faturamento** do mês/ano; se ela tinha entrado no caixa (presencial), o
   reembolso entra sozinho no caixa.
6. **Dashboard** (`/`) — consulte em < 60 s:
   - faturamento do mês e do ano;
   - **% do teto MEI usado** (barra). O teto **é configurável** (padrão R$ 81.000,00) — o
     limite pode mudar por lei;
   - caixa do mês e gastos por categoria;
   - vendas por canal (bruto, taxas, líquido). Troque o mês pelo seletor.
7. **Extrato p/ declaração** — no navegador, abra
   `http://localhost:3000/api/export?m=AAAA-MM` (ex.: `?m=2026-09`). Você baixa um **CSV** com
   o faturamento do mês por tipo e o caixa — base direta para a **DASN-SIMEI**.

## Regras que o sistema garante

- **Dinheiro em centavos** — nada de erro de vírgula.
- **Faturamento ≠ Caixa**: o faturamento MEI usa o bruto da nota; o caixa acompanha o
  dinheiro real (líquido + taxas) — conferível com os painéis das plataformas.
- **Nada é apagado**: venda estornada vira *refunded* com data; lançamento corrigido vira
  estorno com data própria. Histórico sempre auditável.
- **Limpeza**: dados só na sua máquina; backup = copiar a pasta `data/`.

## Manutenção

| Comando | O que faz |
| --- | --- |
| `npm run db:migrate` | aplica migrações do banco local |
| `npm run db:seed` | re-cria categorias/teto padrão (não apaga seus dados) |
| `npm test` | roda os testes (validação de regras financeiras) |
| `npm run build` | compila uma versão de produção |

Detalhes técnicos: [specs/001-sales-control-system/plan.md](../specs/001-sales-control-system/plan.md) e
[data-model.md](../specs/001-sales-control-system/data-model.md).