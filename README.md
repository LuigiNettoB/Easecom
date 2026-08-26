# HubMulticanal

Plataforma web e mobile de gestão para vendedores de e-commerce que atuam em
vários marketplaces ao mesmo tempo (Mercado Livre, Amazon, Shopee, entre
outros). O sistema centraliza catálogo, estoque unificado, pedidos,
fornecedores, financeiro e indicadores.

Este repositório contém apenas a **fundação técnica** do projeto: estrutura de
pastas, backend Django autenticando com JWT, frontend web e app mobile com
login funcional. Nenhum módulo de negócio (produto, estoque, pedido,
fornecedor, anúncio, financeiro) foi implementado ainda.

## Stack

- **Backend**: Python 3.12, Django 5, Django REST Framework,
  `djangorestframework-simplejwt`, `psycopg[binary]`, `django-environ`,
  `django-cors-headers`, `drf-spectacular`, `django-filter`, `supabase`
  (cliente Python do Supabase Storage). Qualidade: `pytest`, `pytest-django`,
  `factory-boy`, `ruff`, `black`.
- **Web**: React 18 + TypeScript, Vite, React Router, TanStack Query, React
  Hook Form + Zod, Axios, Tailwind CSS + componentes no estilo shadcn/ui,
  ESLint + Prettier.
- **Mobile**: React Native com Expo (TypeScript), Expo Router, Axios, TanStack
  Query, Expo SecureStore.
- **Infra**: GitHub Actions para CI.

## Pré-requisitos

- Python 3.12
- Node.js 20+
- PostgreSQL 16 rodando em `localhost:5432`, com:
  - banco `hub`, usuário `hub`, senha `hub`
  - um segundo banco `hub_test`, de propriedade do mesmo usuário `hub`, usado
    pelos testes automatizados
  - o usuário `hub` precisa da permissão `CREATEDB` (o Django cria e recria o
    banco de testes a cada execução da suíte):
    ```sql
    ALTER ROLE hub CREATEDB;
    ```
- Um projeto no [Supabase](https://supabase.com) com um bucket de Storage
  criado (usado para upload/download de arquivos) — veja a seção
  [Armazenamento de arquivos](#armazenamento-de-arquivos-supabase-storage).

**Docker é opcional.** Existe um `docker-compose.yml` na raiz só para quem
preferir rodar o Postgres em container. O caminho principal é o PostgreSQL
instalado nativamente no Windows — nenhuma etapa deste guia depende de Docker.

> Nesta máquina de desenvolvimento específica não havia PostgreSQL instalado
> nem permissão de administrador para instalar o pacote oficial. Para
> destravar o ambiente, foi montada uma instância portátil (binários do EDB
> descompactados, sem instalador, sem exigir admin) rodando em
> `C:\Users\<usuário>\pgsql16`, com o banco `hub`/`hub_test` já criados
> conforme acima. Ela **não inicia sozinha ao ligar o PC** — precisa ser
> subida manualmente:
> ```powershell
> C:\Users\<usuário>\pgsql16\pgsql\bin\pg_ctl.exe -D C:\Users\<usuário>\pgsql16\data -l C:\Users\<usuário>\pgsql16\logfile.txt start
> # para parar:
> C:\Users\<usuário>\pgsql16\pgsql\bin\pg_ctl.exe -D C:\Users\<usuário>\pgsql16\data stop
> ```
> Se sua máquina já tem o PostgreSQL 16 instalado normalmente (como serviço do
> Windows), ignore esta nota — ele já escuta em `localhost:5432` sozinho.

## Como rodar — Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements\dev.txt

copy .env.example .env
# edite .env se necessário (por padrão já aponta para hub/hub/localhost:5432)

python manage.py migrate
python manage.py seed_demo        # opcional: cria 2 vendedores de demonstração (exige DEBUG=True)
python manage.py runserver
```

Se o PowerShell bloquear a ativação do ambiente virtual:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Com o servidor no ar, a documentação interativa (Swagger) fica em
`http://localhost:8000/api/v1/docs/`. É possível cadastrar um vendedor, fazer
login e testar o endpoint protegido inteiramente por ali (clique em
"Authorize" e cole o `access` token retornado pelo login).

### Testes e qualidade

```powershell
pytest
ruff check .
black --check .
```

## Como rodar — Web

```powershell
cd web
npm install
copy .env.example .env.local
npm run dev
```

Abre em `http://localhost:5173`. O backend precisa estar rodando em
`http://localhost:8000` (ou ajuste `VITE_API_URL` em `.env.local`).

## Como rodar — Mobile

```powershell
cd mobile
npm install
copy .env.example .env.local
```

Edite `.env.local` e troque `EXPO_PUBLIC_API_URL` pelo IP da sua máquina na
rede local (não `localhost` — um celular físico não enxerga o `localhost` do
computador; ex.: `http://192.168.0.10:8000/api/v1`). Para descobrir o IP,
rode `ipconfig` e procure o adaptador de rede em uso.

```powershell
npx expo start
```

Escaneie o QR code com o app Expo Go, ou pressione `a`/`i` para abrir em um
emulador Android/iOS já configurado.

## Estrutura de pastas

```
.
├── backend/    Django + DRF
├── web/        React + Vite
├── mobile/     React Native + Expo Router
├── docs/       documentação do projeto (ex.: backlog)
└── .github/    workflows de CI
```

### Backend

```
backend/
├── config/
│   ├── settings/       base.py, dev.py, prod.py, test.py
│   ├── urls.py
│   ├── wsgi.py / asgi.py
└── apps/
    ├── core/            ModeloBase, multi-tenancy, tratamento de erro, paginação
    ├── contas/           Vendedor, Usuario, Perfil
    ├── autenticacao/     serializers/views/services de cadastro, login e refresh
    ├── arquivos/         upload/download de arquivos via Supabase Storage
    └── canais/           ⚠️ temporário: fixture estático simulando a API do Mercado Livre
```

> `apps/canais` é um teste temporário, não um módulo de negócio real: serve um
> fixture estático (`apps/canais/fixtures/mercado_livre.json`) via
> `GET /api/v1/canais/mercado-livre/resumo`, sem banco, sem multi-tenancy, só
> para a Home do web ter algo para mostrar enquanto a integração de verdade
> com marketplaces não existe. Remova quando não precisar mais dele.

Views nunca contêm regra de negócio — a lógica de cada operação composta vive
em `services.py` dentro do app correspondente (ver
`apps/autenticacao/services.py`). Isso importa porque as regras de estoque e
pedidos que virão depois são complexas demais para caber em uma view.

### Web

```
web/src/
├── app/          providers (QueryClient, Router, AuthProvider) e rotas
├── shared/
│   ├── api/      cliente axios com interceptors + tipos da API
│   ├── auth/     contexto de autenticação e guarda de rota
│   ├── ui/       componentes do design system (Button, Input, Card...)
│   └── lib/      utilitários (ex.: cn())
├── features/
│   └── auth/     telas de login e cadastro
└── pages/        Layout autenticado, Home, NotFound e páginas ainda vazias
                  (Catálogo, Estoque, Pedidos, Fornecedores, Financeiro, Canais)
```

### Mobile

```
mobile/
├── app/
│   ├── _layout.tsx     Stack raiz com guarda de autenticação (Stack.Protected)
│   ├── login.tsx        tela pública de login
│   └── (tabs)/           Início, Estoque, Pedidos, Perfil
└── shared/
    ├── api/              cliente axios (mesmos interceptors do web, adaptados a SecureStore)
    └── auth/             contexto de autenticação
```

## Como funciona o multi-tenancy

Toda entidade de negócio futura (produto, estoque, pedido, fornecedor...) vai
herdar de `apps.core.models.ModeloMultiTenant`, que já traz:

1. Um campo `vendedor` (chave estrangeira).
2. Um manager padrão (`objects`) que **filtra automaticamente** pelo vendedor
   da requisição atual — quem programa a próxima funcionalidade não precisa
   lembrar de escrever `.filter(vendedor=...)` em toda consulta.
3. Um manager sem filtro, `objects_todos`, para uso administrativo (admin do
   Django, comandos de management, scripts de suporte).

O vendedor "atual" é lido do access token JWT (claim `vendedor_id`, inserido
no login por `TokenObtainPersonalizadoSerializer`) por
`apps.core.middleware.TenantMiddleware`, que guarda o valor em um
`contextvars.ContextVar` (funciona tanto em WSGI quanto em ASGI) durante o
tempo de vida da requisição.

**Armadilha 1 — fail closed, não fail open.** Se não houver vendedor no
contexto (comando de management, shell, script fora de uma requisição
autenticada), `objects` retorna um queryset **vazio**, nunca todos os
registros. Isso é proposital: é melhor um `.none()` inesperado durante o
desenvolvimento do que vazar dados de um vendedor para outro por esquecimento.
Use `objects_todos` conscientemente quando precisar enxergar todos os
vendedores.

**Armadilha 2 — `Usuario` não é `ModeloMultiTenant`.** O model de usuário
(`apps.contas.models.Usuario`) tem um campo `vendedor`, mas herda direto de
`ModeloBase`, não de `ModeloMultiTenant`. Motivo: a autenticação (login)
precisa localizar um usuário pelo e-mail *antes* de existir qualquer contexto
de tenant — se `Usuario` usasse o manager filtrado, login nunca encontraria
ninguém. Além disso, `vendedor` é opcional em `Usuario` para permitir
superusuários de plataforma (via `createsuperuser`) que só acessam o Django
admin e não pertencem a nenhum vendedor.

**Armadilha 3 — criação de objetos ignora o filtro.** `.create()` sempre
insere, independentemente do contexto de tenant (o filtro só afeta leituras).
Isso é esperado, mas significa que criar um registro sem definir `vendedor`
explicitamente vai falhar por causa da constraint do banco, não por causa do
manager — a proteção do manager é só para leitura.

Veja o teste que prova o isolamento em
`backend/apps/core/tests/test_multitenancy.py` (usa um model de teste,
`RecursoDeTeste`, carregado só em `config.settings.test`, já que nenhuma
entidade de negócio real existe ainda neste esqueleto).

## Endpoints da fatia vertical

| Método | Rota                     | Descrição                                     |
| ------ | ------------------------ | ---------------------------------------------- |
| POST   | `/api/v1/auth/cadastro`  | Cria vendedor + usuário administrador           |
| POST   | `/api/v1/auth/login`     | Retorna `access` e `refresh` token               |
| POST   | `/api/v1/auth/refresh`   | Renova o `access` token                          |
| GET    | `/api/v1/eu`             | Dados do usuário autenticado (rota protegida)    |
| POST   | `/api/v1/eu/senha`       | Troca a senha do usuário autenticado             |
| POST   | `/api/v1/arquivos`       | Upload de arquivo (multipart) para o Storage     |
| GET    | `/api/v1/arquivos/<id>`  | Retorna a URL de download de um arquivo enviado  |

Todo erro de API segue o mesmo formato:

```json
{
  "timestamp": "2026-08-21T22:53:38.204Z",
  "status": 409,
  "codigo": "email_duplicado",
  "mensagem": "Já existe um usuário cadastrado com este e-mail.",
  "erros_de_campo": [{ "campo": "email", "mensagens": ["Este e-mail já está em uso."] }]
}
```

`erros_de_campo` só aparece quando existem erros de validação por campo.

## Armazenamento de arquivos (Supabase Storage)

Upload e download de arquivos passam sempre pelo backend — web e mobile nunca
falam direto com o Supabase. A `service role key` (chave com acesso total ao
projeto) fica só no `.env` do backend e nunca é enviada ao cliente; o Django é
quem decide, via JWT + multi-tenancy, quem pode subir ou baixar o quê.

**Configuração** (`backend/.env`, veja `.env.example`):

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key do seu projeto>
SUPABASE_STORAGE_BUCKET=images
SUPABASE_STORAGE_BUCKET_PUBLICO=True
```

A `service role key` e a URL ficam em **Project Settings → API** no painel do
Supabase. O bucket precisa existir antes (crie em **Storage** no painel, ou
programaticamente com a mesma key). `SUPABASE_STORAGE_BUCKET_PUBLICO=True`
faz o backend devolver a URL pública direta do arquivo; se o bucket for
privado, mude para `False` e o backend gera uma URL assinada (válida por 1h)
a cada requisição.

**Como funciona:**

- `POST /api/v1/arquivos` (multipart, campo `arquivo`) — o backend gera um
  caminho `<vendedor_id>/<uuid>.<extensão>` no bucket (nunca usa o nome
  original como caminho, evitando colisão e vazamento de informação),
  sobe o conteúdo e grava um registro `Arquivo` (`apps.arquivos.models`,
  `ModeloMultiTenant`) com os metadados. Retorna a URL de download.
- `GET /api/v1/arquivos/<id>` — busca o registro via `Arquivo.objects`
  (já filtrado pelo vendedor do token, como qualquer `ModeloMultiTenant`) e
  devolve a URL. Um usuário de outro vendedor recebe 404, nunca o arquivo de
  alguém mais — é a mesma proteção documentada em
  [Como funciona o multi-tenancy](#como-funciona-o-multi-tenancy), não uma
  regra nova.
- Os testes em `backend/apps/arquivos/tests/` sobem arquivos de verdade no
  bucket configurado (mesmo espírito de testar contra o Postgres real, não
  mocks) — rodar `pytest` exige um `.env` com credenciais válidas do Supabase.

No CI (`.github/workflows/ci.yml`), essas credenciais vêm de *secrets* do
repositório — configure em **Settings → Secrets and variables → Actions**:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET`. Sem
isso, o job `pytest` do CI falha nos testes de `arquivos`.
