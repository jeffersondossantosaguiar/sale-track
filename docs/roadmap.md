# Roadmap - Sale Track ERP

O roadmap usa horizontes, não datas. Cada iniciativa só avança quando suas dependências estiverem claras e quando puder virar uma spec independente pelo fluxo SDD do projeto.

## Horizontes

- **Agora**: fundações necessárias para destravar o próximo ciclo de produto. Pode virar spec quando o objetivo, os dados afetados e o teste independente estiverem claros.
- **Próximo**: depende de uma ou mais fundações de Agora. Pode avançar quando o domínio proprietário e as integrações estiverem definidos.
- **Depois**: importante para o ERP, mas ainda depende de capacidades intermediárias ou maturidade operacional.
- **Exploração**: oportunidade com valor potencial, mas que exige pesquisa, validação externa ou decisão estratégica antes de promessa de implementação.

Nenhum horizonte representa prazo. Uma mudança de prioridade deve atualizar este arquivo sem reescrever o que já existe em [domain.md](domain.md).

Regra de avanço entre horizontes:

- **Exploração -> Depois/Próximo**: há evidência de valor, viabilidade mínima e compatibilidade com as premissas do projeto.
- **Depois/Próximo -> Agora**: as dependências essenciais estão atendidas, o resultado pode ser recortado em uma spec e a prioridade foi aprovada.
- **Agora -> Spec**: o critério de entrada da iniciativa foi cumprido e problema, usuário, resultado e limites estão claros.

## Agora

### Redesenhar catálogo mestre e experiência de produtos

- Resultado esperado: produtos e variantes viram cadastro canônico, com SKU, custos, códigos por canal, atributos essenciais, mídia, receita de produção e base para projeções de canal.
- Dependências: modelo atual de produtos/variantes, specs `002` e `006`, decisões sobre kits, personalizações e campos obrigatórios por canal.
- Critério de entrada: listar os campos reais que a empresa precisa para cadastrar, produzir e vender um produto; separar o que é interno do que é específico de canal.
- Recorte sugerido de spec: "Cadastro mestre de produto e variante" com migração compatível, UX de cadastro e teste de vínculo com vendas existentes.

### Consolidar configurações, custos e precificação

- Resultado esperado: configurações de materiais, impressoras, energia, mão de obra, embalagens, manutenção e taxas ficam mais claras, validadas e auditáveis.
- Dependências: specs `002`, `003`, `004`, `005`; decisão sobre quais parâmetros precisam de histórico e quais podem continuar globais.
- Critério de entrada: inventariar todos os campos de configuração atuais e marcar quais afetam custo, preço, fiscal, canal ou operação.
- Recorte sugerido de spec: "Configurações operacionais e motor de custo revisado" com testes para custo, preço sugerido e preservação de histórico.

### Modelar transações e conciliação financeira real

- Resultado esperado: venda passa a poder explicar o recebido por componentes reais do canal, em vez de depender apenas de um recebido agregado.
- Dependências: vendas atuais, importação de relatórios, identificadores de pedido/canal, amostras reais de Shopee e TikTok.
- Critério de entrada: coletar exemplos oficiais de relatórios ou exportações com pedido, produto, frete, comissão, desconto, reembolso e repasse.
- Recorte sugerido de spec: "Ledger de transações de marketplace" com testes red-green para matching, taxa derivada, reembolso e pendência manual.

## Próximo

### Criar projeções de canal para produtos

- Resultado esperado: cada produto pode ter representação por canal com título, descrição, categoria, atributos, preço, código externo, status e pendências.
- Dependências: catálogo mestre redesenhado e precificação confiável.
- Critério de entrada: definir quais campos Shopee, TikTok e um canal futuro exigem hoje, mesmo que a publicação por API ainda não exista.
- Recorte sugerido de spec: "Modelo de anúncio/projeção por canal" com validação local, diffs e sem escrita automática em marketplace.

### Implementar fila de produção

- Resultado esperado: pedidos geram trabalho de produção com status, prioridade, impressora, tempo previsto, etapa manual e conclusão.
- Dependências: catálogo com receita de produção, pedidos vinculados a variantes e impressoras configuradas.
- Critério de entrada: escolher o nível de controle inicial: pedido, item, variante ou peça impressa.
- Recorte sugerido de spec: "Fila de produção por pedido" com testes para criação automática, status e impacto em capacidade.

### Fundar estoque de insumos

- Resultado esperado: filamentos, embalagens e acessórios passam a ter saldo, entradas, reservas, consumo e alertas de reposição.
- Dependências: catálogo/receitas de produção, compras ou entradas manuais, produção.
- Critério de entrada: definir unidade de medida, lote, custo de entrada e quando o consumo deve ser baixado.
- Recorte sugerido de spec: "Estoque mínimo de insumos" com testes para entrada, reserva, baixa e custo congelado futuro.

### Pesquisar primeira integração de canal

- Resultado esperado: decidir qual canal deve ser integrado primeiro e qual operação inicial é segura: leitura de pedidos, leitura financeira, sincronização de produtos ou publicação.
- Dependências: catálogo/projeções, conciliação, credenciais e acesso oficial à API do canal.
- Critério de entrada: documentação oficial consultada, credenciais disponíveis, limites de API conhecidos e dados que resolvem uma dor real.
- Recorte sugerido de spec: "Spike de integração Shopee ou TikTok" focado em leitura, logs, credenciais locais e modo sem escrita.

## Depois

- Compras e fornecedores: transformar saídas de caixa em compras rastreáveis, com fornecedor, lote, material recebido e custo.
- Manutenção de impressoras: registrar manutenção preventiva/corretiva, parada, custo real e impacto na capacidade.
- Expedição e pós-venda: controlar separação, postagem, ocorrência, troca, devolução e reflexo financeiro.
- Indicadores e alertas operacionais: margem baixa, conciliação pendente, estoque mínimo, produção atrasada, teto MEI e falha de integração.
- Backup e restauração guiados: exportar, restaurar e validar a integridade do SQLite local.
- Auditoria de mudanças críticas: registrar alterações em custo, preço, estorno, recebido, vínculo de produto e configuração de canal.

## Exploração

- Emissor unificado de NF-e: hipótese futura. Exige pesquisa fiscal e operacional, certificado, contingência, regras legais, manutenção normativa e comparação entre integração com emissor especializado e implementação própria.
- Operação em nuvem ou multiusuário: hipótese futura. Conflita com a premissa atual de local/single-user e exige decisão constitucional separada.
- Escrita automática em marketplaces: só deve avançar depois de catálogo mestre, projeções por canal, logs, rollback operacional e pesquisa oficial das APIs.
- Novos canais de venda: devem entrar primeiro como canal configurável e projeção de produto; automações vêm depois.
- Reconciliação bancária: pode gerar valor, mas deve esperar o ledger de transações dos marketplaces para não duplicar conceitos.

## Playbook Para Cada Nova Feature

1. Descobrir e refinar.
   Use `/speckit.clarify` quando houver ambiguidade ou `/speckit.specify` para criar/atualizar a spec. A feature deve ter objetivo, usuário, fluxo, fora de escopo e teste independente.

2. Fazer crítica de desenho.
   Estressar dependências, integrações, dados históricos, edge cases, risco financeiro e reversibilidade. O projeto pede o skill `grill-me`; se ele não estiver disponível, registrar a revisão crítica manualmente na spec ou no research.

3. Aprovar a spec.
   Gate obrigatório com o usuário. Sem aprovação da spec, não seguir para plano.

4. Planejar.
   Rodar `/speckit.plan` e produzir research, data-model, contratos quando houver integração/API, quickstart e checagem constitucional.

5. Aprovar o plano.
   Segundo gate obrigatório com o usuário. Sem aprovação do plano, não gerar tasks de implementação.

6. Quebrar em tasks e checklist.
   Rodar `/speckit.tasks` e `/speckit.checklist`. Tasks devem permitir entrega incremental e testes red-green quando houver risco.

7. Escrever testes primeiro quando tocar risco.
   Importação, dinheiro, conciliação, custos, publicação, integração e histórico exigem testes antes da implementação. O teste deve falhar pelo motivo certo antes do código mudar.

8. Implementar.
   Rodar `/speckit.implement`, processar tasks em ordem, preservar dados existentes e evitar refactors fora do escopo.

9. Convergir.
   Rodar `/speckit.converge` para encontrar lacunas entre spec, plano, tasks e implementação. Adicionar tasks restantes quando necessário.

10. Analisar.
    Rodar `/speckit.analyze`, resolver inconsistências e validar quickstart, testes e `git diff --check`.

11. Fechar.
    Atualizar `docs/domain.md` somente quando houver comportamento implementado. Atualizar este roadmap quando uma iniciativa mudar de horizonte, for concluída ou for dividida em specs menores.

## Critérios De Conclusão

Uma iniciativa só deve ser considerada concluída quando:

- a spec aprovada corresponde ao que foi implementado;
- os testes relevantes passam;
- o quickstart da feature foi executado;
- dados históricos foram preservados;
- `docs/domain.md` foi atualizado, se o comportamento atual mudou;
- o roadmap foi ajustado para remover, dividir ou reclassificar o próximo trabalho.
