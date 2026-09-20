# Data Model: Visão e Roadmap do ERP

Esta feature não altera o banco. As entidades abaixo estruturam os documentos e o processo de decisão.

## Visão do Produto

Representa a identidade estável do Sale Track.

**Campos conceituais**:

- problema e contexto da empresa;
- usuário principal;
- proposta de valor;
- princípios de produto;
- fluxos centrais;
- limites e antiobjetivos;
- resultados esperados.

**Relacionamentos**:

- orienta todos os domínios e capacidades;
- limita quais iniciativas entram no roadmap;
- mudanças incompatíveis podem exigir emenda constitucional.

## Domínio

Agrupa responsabilidades relacionadas sob um proprietário conceitual.

**Campos conceituais**:

- nome;
- propósito;
- fronteiras;
- capacidades pertencentes;
- integrações com outros domínios.

**Regra**: cada capacidade tem um domínio proprietário, mesmo quando participa de vários fluxos.

## Capacidade

Representa algo que o ERP faz ou pretende fazer.

**Campos conceituais**:

- nome;
- domínio proprietário;
- estado;
- evidência atual;
- resultado desejado;
- dependências;
- referências a docs/specs;
- riscos ou decisões em aberto.

**Estados válidos**:

1. `Existente`: atende ao objetivo atual documentado.
2. `Existente — redesenhar`: há implementação útil, mas modelo ou experiência precisa evoluir.
3. `Planejada`: necessidade validada, ainda sem entrega suficiente.
4. `Hipótese futura`: valor potencial não validado ou dependente de pesquisa.
5. `Fora de escopo`: explicitamente excluída da visão atual.

**Transições**:

```text
Hipótese futura → Planejada
  somente após pesquisa e decisão

Planejada → Existente
  somente após spec, implementação, testes e convergência

Existente → Existente — redesenhar
  quando o comportamento continua útil, mas deixa de atender à visão

Qualquer estado → Fora de escopo
  por decisão explícita registrada
```

## Iniciativa

Unidade priorizável que evolui uma ou mais capacidades.

**Campos conceituais**:

- título;
- resultado de negócio esperado;
- capacidades afetadas;
- horizonte;
- pré-requisitos;
- critério de entrada;
- recorte sugerido de spec;
- riscos;
- status da decisão.

**Regra**: uma iniciativa deve produzir um resultado validável; iniciativas com resultados independentes são divididas.

## Horizonte

Ordena iniciativas sem prometer calendário.

**Valores**:

- `Agora`: fundação ou problema validado pronto para descoberta/spec.
- `Próximo`: depende de itens em Agora ou precisa de refinamento adicional.
- `Depois`: importante, mas sem urgência ou com dependências maiores.
- `Exploração`: hipótese que exige pesquisa antes de priorização.

**Critério de avanço**:

```text
Exploração → Depois/Próximo
  evidência de valor + viabilidade + compatibilidade constitucional

Depois/Próximo → Agora
  dependências atendidas + escopo recortável + prioridade aprovada

Agora → Spec
  problema, usuário, resultado e limites claros
```

## Decisão em Aberto

Registra uma escolha ainda não resolvida.

**Campos conceituais**:

- pergunta;
- contexto;
- alternativas conhecidas;
- evidência necessária;
- risco de decidir cedo;
- gatilho de revisão;
- decisão resultante, quando houver.

## Referência

Conecta afirmações do mapa às evidências existentes.

**Tipos**:

- documentação atual;
- spec;
- código/schema/rota;
- constitution;
- pesquisa externa futura.

**Regra**: capacidades marcadas como existentes precisam de pelo menos uma referência verificável.
