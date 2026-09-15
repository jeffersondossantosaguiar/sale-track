# Contrato de Importação XML — NFe 55 (sale-track)

Parte dos contratos da feature `001-sales-control-system`. Define a fonte e o formato que o
sistema aceita. A implementação lê o **CAMPO de origem do marketplace**; este documento é o
contrato entre o importador e o resto da aplicação.

## Fonte
Arquivos XML de **NFe modelo 55 (mercadoria)**, emitidos pelo dono para vender em Shopee e
TikTok — baixados do painel do vendedor/de armazenamento. Estoque: `*.xml`.

## Entrada (inputs aceitos)
- Um ou vários arquivos XML de uma vez (lote).
- Canal **sugerido** pelo padrão do nome do arquivo e **confirmado/editável** pelo usuário no
  lote antes de confirmar.
- Arquivos de um padrão desconhecido exigem escolha manual de canal.

## Saída (o que o parser entrega — modelo normalizado)
Para cada XML, o parser extrai e entrega uma candidata a venda:

| Campo | Fonte no XML | Obrigatório |
|---|---|---|
| invoiceNumber | `nfeProc/NFe/infNFe/ide/nNF` | sim |
| serie | `ide/serie` | sim |
| issueDate | `ide/dhEmi` | sim |
| grossCents | `total/ICMSTot/vNF` | sim |
| channel | derivado do nome do arquivo + confirmação do usuário | sim |
| items[].cProd | `det/prod/cProd` | sim |
| items[].description | `det/prod/xProd` | sim |
| items[].qty | `det/prod/qCom` | sim |
| items[].unitPriceCents | `det/prod/vUnCom` | sim |
| items[].totalCents | `det/prod/vProd` | sim |
| rawXml | cópia do arquivo | sim |

## Regras de negócio impostas na borda
1. **Dedup**: se já existe venda com o mesmo `invoiceNumber + issueDate`, o arquivo é marcado
   como "já importado" e **não** cria nova venda (mostra aviso).
2. **Canal**: o valor derivado do padrão do arquivo é pré-preenchido; o usuário pode mudar por
   lote. Sem padrão conhecido → pergunta manual.
3. **Vínculo de item**: `cProd` → tenta `product_codes` (filtrado pelo canal quando o código é
   por canal; `general` caso contrário). Sem match → item sem vínculo (não bloqueia lote); o
   dono vincula depois e o vínculo é lembrado.
4. **Custo**: ao casar, grava `frozenCostCents = products.estimatedCostCents` no item (data da
   venda). Sem custo → fica null (=margem não calculada) até ação explícita.
5. **Valor bruto** vem **imutável** do XML (`vNF`); nada no sistema recalcula o bruto.

## Segurança / limites de parser
- Parse roda em **Web Worker** (navegador); apenas o resultado saneado vai ao servidor.
- Tamanho por XML: aceitar arquivos comuns (~50–400 KB); rejeitar acima de NEEDS
  CLARIFICATION? → **Decisão**: limite 10 MB com aviso claro (mantém fluidez, protege de
  arquivo corrompido).
- XML malformado: import continua para os demais; registra erro na fila "falhas de importação".
