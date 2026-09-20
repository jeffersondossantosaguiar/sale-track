# Quickstart de Validação: Visão e Roadmap do ERP

## Pré-requisitos

- Spec e plano 007 aprovados.
- Documentos finais criados em `docs/`.
- Execução a partir da raiz do repositório.

## 1. Confirmar os arquivos esperados

```bash
test -f docs/product-vision.md
test -f docs/capability-map.md
test -f docs/roadmap.md
test -f docs/domain.md
```

**Esperado**: todos os comandos terminam sem erro.

## 2. Confirmar a taxonomia de estados

```bash
rg -n "Existente|Existente — redesenhar|Planejada|Hipótese futura|Fora de escopo" docs/capability-map.md
```

**Esperado**: a legenda contém os cinco estados e todas as tabelas usam apenas essa taxonomia.

## 3. Confirmar cobertura das capacidades obrigatórias

```bash
rg -n "Configurações|Catálogo|Precificação|Publicação|Pedidos|Conciliação|Caixa|Compras|Produção|Estoque|Manutenção|Expedição|Integrações|Backup|Indicadores" docs/capability-map.md
```

**Esperado**: cada termo aparece em um domínio proprietário com estado, alvo e dependências.

## 4. Confirmar separação entre atual e futuro

```bash
rg -n "estado atual|implementado|planejado|hipótese|exploração" docs/product-vision.md docs/capability-map.md docs/roadmap.md docs/domain.md
```

**Esperado**:

- `docs/domain.md` descreve apenas comportamento atual;
- visão e mapa distinguem explicitamente realidade e alvo;
- roadmap não usa linguagem de conclusão para itens futuros.

## 5. Validar o roadmap executável

Revisar manualmente todas as iniciativas em `Agora` e `Próximo`.

**Esperado**: cada uma apresenta resultado, dependências, critério de entrada e recorte sugerido para uma spec.

## 6. Validar a oportunidade fiscal

```bash
rg -n -C 3 "NF-e|fiscal" docs/roadmap.md docs/capability-map.md
```

**Esperado**: emissão unificada aparece em Exploração, sem prazo ou compromisso, e exige pesquisa fiscal e comparação de alternativas.

## 7. Validar o playbook SDD

```bash
rg -n "specify|clarify|plan|tasks|implement|converge|analyze|aprovação" docs/roadmap.md
```

**Esperado**: todas as etapas aparecem em ordem, com gates após spec e plano e testes antes de implementação em fluxos de risco.

## 8. Verificar referências e formatação

```bash
rg -n "specs/00[1-7]|docs/domain.md" docs/product-vision.md docs/capability-map.md docs/roadmap.md
git diff --check
```

**Esperado**: capacidades existentes possuem referências e não há erros de whitespace.

## 9. Leitura de aceitação

Uma pessoa que não participou da descoberta deve conseguir, em até dez minutos:

1. explicar o objetivo e os limites do Sale Track;
2. identificar o que existe e o que precisa ser redesenhado;
3. localizar a próxima iniciativa;
4. descrever como ela vira uma feature implementável.

## 10. Fechamento

Após criar os documentos:

1. executar `/speckit.converge` para encontrar lacunas;
2. completar tarefas adicionadas, se houver;
3. executar `/speckit.analyze` para validar spec, plano e tasks;
4. revisar o diff final antes do commit.
