Front-end MVP do MEC Livros em [Next.js](https://nextjs.org), com:

- busca pública de livros;
- paginação (12 itens por página);
- página de detalhes por livro;
- endpoint backend para baixar e descriptografar o EPUB.

## Configuração

1. Copie as variáveis de ambiente:

```bash
cp .env.example .env.local
```

2. Preencha `MEC_LIVROS_BEARER_TOKEN` em `.env.local`.

### Rate limit de download (antiabuso)

O endpoint de download descriptografado possui limitador por cliente (IP):

- `MEC_DOWNLOAD_SHORT_WINDOW_SECONDS` (padrão: `45`)
- `MEC_DOWNLOAD_SHORT_WINDOW_MAX` (padrão: `1`)
- `MEC_DOWNLOAD_DAILY_MAX` (padrão: `25`)

Com os padrões acima, você pode baixar com calma ao longo do dia, mas evita rajadas e abuso.

## Rodando localmente

Primeiro, instale dependências:

```bash
npm install
```

Depois, suba o servidor:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Rotas principais

- `/` busca e lista de livros (6 colunas x 2 linhas por página).
- `/livro/[id]` detalhes do livro e botão de download do EPUB descriptografado.

## Endpoint interno de download

`GET /api/books/[id]/download-decrypted`

Esse endpoint:

1. gera URL temporária do EPUB criptografado via API autenticada;
2. baixa o arquivo da AWS;
3. descriptografa arquivos `.xhtml` e `.html` no EPUB;
4. devolve o `.epub` processado para o cliente.

## Segurança

- Nunca exponha o Bearer token no front-end.
- Use somente no backend (`.env.local`).
