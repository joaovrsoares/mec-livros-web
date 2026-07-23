# MEC Livros Web

Aplicação web desenvolvida em [Next.js](https://nextjs.org) (App Router com TypeScript) para busca, navegação, otimização de imagens e download de livros do acervo do MEC Livros.

---

## 🚀 Funcionalidades

- **Busca e Paginação de Livros**: Busca por título, autor, URL ou ID com paginação em grade responsiva (12 itens por página).
- **Otimização e Proxy de Capas**: Servidor proxy (`/api/cover-proxy`) que detecta os *magic bytes* das imagens (incluindo imagens AVIF/PNG salvas com extensão `.jpg`), convertendo e padronizando em WebP de alta qualidade através da biblioteca `sharp`.
- **Pré-carregamento em Memória**: Pré-carregamento das capas no servidor durante a busca para renderização instantânea no navegador sem blocos em branco.
- **Skeleton Screens & Layout Responsivo**: Interface com animação Shimmer em esqueletos de carregamento sem saltos de layout (*Cumulative Layout Shift*).
- **Download de EPUB Descriptografado**: Endpoint interno (`/api/books/[id]/download-decrypted`) que efetua o download do EPUB criptografado, descriptografa o conteúdo via AES-256 e entrega o arquivo `.epub` pronto para leitura.
- **Conversão de EPUB para PDF (A4)**: Endpoint interno (`/api/books/[id]/download-pdf`) que renderiza e converte o EPUB descriptografado diretamente para documento PDF formatado.
- **Proteção Antiabuso (Rate Limiting)**: Limitador de requisições por cliente (IP) com janela de tempo curta e limite diário configurável.

---

## 🛠️ Configuração e Instalação

### 1. Requisitos
- Node.js 20+
- npm 10+

### 2. Variáveis de Ambiente
Copie o arquivo de exemplo para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha as variáveis em `.env.local`:

```env
# Token de Autenticação Bearer (obrigatório para downloads de EPUB/PDF)
MEC_LIVROS_BEARER_TOKEN=seu_bearer_token_aqui

# Chaves de Descriptografia AES-256 (32 bytes para KEY, 16 bytes para IV)
MEC_LIVROS_AES_KEY=R1FTmXDFrfIlQvpLg8PkDvuuW3cmss56
MEC_LIVROS_AES_IV=lSrKOxW5xDPU7BMr

# Rate Limit de Download por IP
MEC_DOWNLOAD_SHORT_WINDOW_SECONDS=45
MEC_DOWNLOAD_SHORT_WINDOW_MAX=1
MEC_DOWNLOAD_DAILY_MAX=50
```

---

## 💻 Executando o Projeto

### Instalar dependências
```bash
npm install
```

### Executar ambiente de desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000).

### Executar testes unitários e de integração
```bash
npm test
```

### Executar build de produção
```bash
npm run build
npm start
```

---

## 📦 Containerização (Docker)

Para rodar a aplicação em um ambiente isolado via Docker (Alpine Linux com Chromium e Puppeteer nativos):

```bash
docker build -t mec-livros-web .
docker run -p 3000:3000 --env-file .env.local mec-livros-web
```

---

## 📁 Estrutura de Pastas

```text
├── public/                 # Assets estáticos (logos, favicons)
├── src/
│   ├── app/
│   │   ├── api/            # Route Handlers (cover-proxy, books, health)
│   │   ├── livro/[id]/     # Página de detalhes do livro
│   │   ├── layout.tsx      # Layout principal
│   │   ├── loading.tsx     # Skeleton screen de carregamento
│   │   └── page.tsx        # Página inicial e busca
│   ├── components/         # Componentes React (DownloadButton, etc.)
│   └── lib/                # Lógicas e utilitários (sharp, AES-256, EPUB to PDF, API MEC)
└── next.config.ts          # Configurações do Next.js e localPatterns
```

---

## 🔒 Segurança

- **Credenciais**: Nunca comite o arquivo `.env.local` ou credenciais privadas no repositório.
- **SSRF Protection**: O proxy de imagem valida os domínios permitidos (`static-meclivros.mec.gov.br`).
