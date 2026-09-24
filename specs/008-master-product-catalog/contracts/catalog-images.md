# Contract: Catalog Image HTTP

## Endpoint

```text
GET /api/catalog-images/{ownerType}/{ownerId}
```

`ownerType` aceita `product` ou `variant`. `ownerId` é inteiro positivo.

## Resolução

- `product`: retorna a imagem própria do produto.
- `variant`: retorna a imagem própria da variante quando existir; caso contrário, retorna a imagem do produto proprietário.

Esse fallback representa a imagem efetiva. A interface pode solicitar a URL da variante sem conhecer a origem dos bytes.

## Responses

### `200 OK`

Headers:

```text
Content-Type: image/jpeg | image/png | image/webp
Content-Length: tamanho persistido
Content-Disposition: inline; filename="nome-sanitizado"
X-Content-Type-Options: nosniff
Cache-Control: private, no-cache
```

Body: stream ou bytes do arquivo original validado.

### `400 Bad Request`

Tipo de proprietário inválido ou id não inteiro positivo.

### `404 Not Found`

Proprietário inexistente ou nenhuma imagem efetiva cadastrada.

## Safety and performance

- A rota nunca interpreta caminho fornecido pelo usuário. Ela resolve uma chave opaca no banco e delega a abertura ao `CatalogMediaStore`.
- A implementação local confina toda leitura a `data/catalog-media/` e rejeita chave inválida antes de acessar o sistema de arquivos.
- Conteúdo é buscado somente para o proprietário solicitado.
- Consultas de listagem não compartilham a projeção dessa rota.
- MIME da resposta vem da lista fechada validada no upload.
- Arquivo ausente para uma chave existente responde 404 e registra uma inconsistência reparável; não expõe o caminho físico.
