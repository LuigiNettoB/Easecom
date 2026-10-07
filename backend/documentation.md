# Backend — Folder & File Documentation

**Project:** HubMulticanal — Django REST API for multi-marketplace sellers
(e-commerce management: catalog, unified stock, orders, suppliers, finances, indicators).

**Stack:** Django 5 + Django REST Framework, SimpleJWT (auth), django-filter,
drf-spectacular (Swagger), Supabase (Postgres + Storage), pytest.

> Code identifiers (models, services, URLs) are in Portuguese throughout the codebase;
> this doc explains their purpose in English.

---

## Folder tree

```
backend/
├── manage.py
├── pyproject.toml
├── .env.example
├── config/                 # Django project configuration
│   ├── __init__.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── settings/           # Settings split by environment
│       ├── __init__.py
│       ├── base.py
│       ├── dev.py
│       ├── prod.py
│       └── test.py
├── requirements/           # Python dependency sets
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
└── apps/                   # Business applications (Django apps)
    ├── core/               # Cross-cutting infrastructure (multi-tenancy, errors...)
    ├── contas/             # Vendedor (tenant) and Usuario (custom user)
    ├── autenticacao/       # Registration, login, "me" endpoints
    ├── arquivos/           # File upload/download via Supabase Storage
    ├── canais/             # Sales channels (Mercado Livre OAuth + simulated data)
    ├── pedidos/            # Orders unified across channels + sync adapters
    ├── produtos/           # Product catalog and stock
    ├── fornecedores/       # Suppliers
    └── financeiro/         # Financial indicators and manual ledger entries
```

---

## Root files (`backend/`)

| File | Function |
|---|---|
| `manage.py` | Django's CLI entry point (`runserver`, `migrate`, `makemigrations`, `seed_demo`, `sincronizar_pedidos`, ...). Defaults to the `config.settings.dev` environment. |
| `pyproject.toml` | Tooling configuration: **black** and **ruff** (line-length 100, target py312), and **pytest** (uses `config.settings.test`, test paths under `apps/`, always runs with `--reuse-db`). |
| `.env.example` | Template of all environment variables used by the backend (DB connection, Supabase credentials, Mercado Livre OAuth app credentials, frontend URL...). Copy to `.env` locally. |

---

## `config/` — Django project configuration

| File/Folder | Function |
|---|---|
| `config/__init__.py` | Package marker (empty). |
| `config/urls.py` | Root URL routing: Django admin at `/admin/`, all API routes under `/api/v1/` (each app includes its own `urls.py`), plus the OpenAPI schema (`/api/v1/schema/`) and Swagger UI (`/api/v1/docs/`). |
| `config/wsgi.py` | WSGI entry point for synchronous servers (e.g. gunicorn in production). |
| `config/asgi.py` | ASGI entry point for asynchronous servers. |

### `config/settings/` — environment-specific settings

| File | Function |
|---|---|
| `settings/__init__.py` | Package marker (empty — each environment is selected by `DJANGO_SETTINGS_MODULE`). |
| `settings/base.py` | Shared settings for all environments: installed apps, middleware (includes `TenantMiddleware`), Postgres database config (Supabase), custom user model (`contas.Usuario`), DRF defaults (JWT auth, filters, pagination, exception handler), SimpleJWT token lifetimes, CORS, Supabase Storage config, Mercado Livre OAuth credentials, drf-spectacular Swagger config, and logging. |
| `settings/dev.py` | Development overrides: `DEBUG=True` by default, allows localhost + ngrok/dev-tunnel domains (needed for the Mercado Livre OAuth callback). |
| `settings/prod.py` | Production overrides: `DEBUG=False`, `ALLOWED_HOSTS` from env, and security flags (SSL redirect, secure cookies, HSTS). |
| `settings/test.py` | Test overrides: adds the `apps.core.testing` app, runs tests in an isolated `test` Postgres schema (Supabase can't create extra databases), and speeds up hashing with MD5. |

---

## `requirements/` — Python dependencies

| File | Function |
|---|---|
| `base.txt` | Runtime dependencies for every environment: Django, DRF, simplejwt, psycopg, django-environ, django-cors-headers, drf-spectacular, django-filter, supabase client, requests. |
| `dev.txt` | Includes `base.txt` plus development/test tooling: pytest, pytest-django, factory-boy, ruff, black. |
| `prod.txt` | Includes `base.txt` plus production-only dependency: gunicorn. |

---

## `apps/` — business applications

Each Django app follows the same internal layout (whenever applicable):

| File | Function |
|---|---|
| `__init__.py` | Package marker (empty). |
| `apps.py` | AppConfig class registering the app with Django (label + module path). |
| `models.py` | Django ORM models (database tables). |
| `serializers.py` | DRF serializers: input validation (`...EntradaSerializer`) and output formatting (`...SaidaSerializer`). |
| `views.py` | DRF API views/endpoints. |
| `urls.py` | URL patterns for this app, included under `/api/v1/` in `config/urls.py`. |
| `services.py` | Business logic (helper functions called by views; keeps views thin). |
| `filters.py` | django-filter `FilterSet`s used for query-string filtering. |
| `admin.py` | Django admin registrations (management interface at `/admin/`). |
| `migrations/` | Generated database migration files (auto-created by `makemigrations`). |
| `tests/` | pytest test suites. |

---

### `apps/core/` — cross-cutting infrastructure

Shared foundation used by every business app: **multi-tenancy**, base models, and standard error handling.

| File/Folder | Function |
|---|---|
| `models.py` | `ModeloBase` (abstract base with UUID `id`, `criado_em`, `atualizado_em`) and `ModeloMultiTenant` (adds a `vendedor` FK plus `TenantManager` so every query is scoped to the current seller). |
| `tenant_context.py` | Holds the current request's seller id in a `contextvar` (works on WSGI and ASGI) — set/reset by the middleware. |
| `middleware.py` | `TenantMiddleware`: parses the JWT from the `Authorization` header, extracts the `vendedor_id` claim and stores it in the tenant context (doesn't replace DRF auth; missing/invalid tokens simply result in empty queries). |
| `managers.py` | `TenantManager`: automatically filters queries by the current seller; returns an **empty** queryset when there's no seller in context (deliberate safe default to avoid data leaks — use `objects_todos` for admin code). |
| `exceptions.py` | `ErroDeNegocio` (business rule exception with code/status/field errors) and `RecursoNaoEncontrado` (404 variant). |
| `exception_handler.py` | DRF exception handler (`tratador_de_excecao`) that standardizes every API error response (`timestamp`, `status`, `codigo`, `mensagem`, optional `erros_de_campo`) and never leaks stack traces. |
| `pagination.py` | Default pagination class (`PaginacaoPadrao`): 20 items/page, `tamanho_pagina` query param, max 100. |
| `apps.py` | AppConfig for `apps.core`. |
| `management/commands/seed_demo.py` | Management command `seed_demo`: creates 2 demo sellers with an admin user each (idempotent; refuses to run when `DEBUG=False`). |
| `testing/` | A small app loaded **only in test settings** (`config.settings.test`) that provides a concrete `ModeloMultiTenant` (`RecursoDeTeste`) used by the multi-tenancy tests. |
| `migrations/` | Empty — `core` only defines abstract models, which don't need migrations. |
| `tests/test_multitenancy.py` | Tests tenant isolation: seller A can't see seller B's records, the default manager doesn't leak without a context, and `objects_todos` sees everything. |

---

### `apps/contas/` — sellers and users (accounting)

Defines the **tenant** (`Vendedor`) and the **custom user model** used by the whole project.

| File | Function |
|---|---|
| `models.py` | `Vendedor` (the seller/tenant, simple `nome` field) and `Usuario` (custom `AbstractBaseUser` user, login by `email`, with `nome`, `vendedor` FK, `perfil` — ADMINISTRADOR/OPERADOR/FINANCEIRO — and profile/banner photo FKs). |
| `managers.py` | `UsuarioManager`: `create_user`/`create_superuser` helpers for the custom user model. |
| `admin.py` | Admin registration for `Vendedor` and `Usuario` (customized `UserAdmin`). |
| `apps.py` | AppConfig for `apps.contas`. |
| `migrations/` | `0001_initial.py` (Vendedor + Usuario) and `0002_usuario_foto_banner_usuario_foto_perfil.py` (adds photo fields). |
| `tests/factories.py` | Factory-boy factories (`VendedorFactory`, `UsuarioFactory`) reused by every test suite. |

---

### `apps/autenticacao/` — authentication & "me" endpoints

Registration, login, token refresh, and the authenticated user's own data.

| File | Function |
|---|---|
| `views.py` | Endpoints: `CadastroView` (create seller + admin), `LoginView` (access + refresh token), `RefreshView` (renew access token), `EuView` (authenticated user's data), `TrocarSenhaView` (change password), `FotoPerfilView`/`FotoBannerView` (upload profile/banner photos). |
| `serializers.py` | `CadastroEntradaSerializer`/`TrocarSenhaEntradaSerializer` (validated payloads), `UsuarioSaidaSerializer`/`VendedorSaidaSerializer` (output), and `TokenObtainPersonalizadoSerializer` (adds `vendedor_id`, `perfil` and `email` claims to the JWT — used by the middleware to identify the tenant). |
| `services.py` | Business logic: `cadastrar_vendedor_e_administrador` (single-transaction signup with duplicate-email guard), `trocar_senha` (validates current password), `atualizar_foto_perfil`/`atualizar_foto_banner` (upload to storage + link to user). |
| `urls.py` | Routes: `/auth/cadastro`, `/auth/login`, `/auth/refresh`, `/eu`, `/eu/senha`, `/eu/foto-perfil`, `/eu/banner`. |
| `apps.py` | AppConfig for `apps.autenticacao`. |
| `tests/` | `conftest.py` (APIClient fixture) + suites for `test_cadastro`, `test_login`, `test_eu`, `test_trocar_senha`, `test_foto`. |

---

### `apps/arquivos/` — file storage

Upload/download of files to **Supabase Storage** (used for product photos, profile/banner images).

| File | Function |
|---|---|
| `models.py` | `Arquivo`: metadata of an uploaded file (`nome_original`, `caminho_storage`, `content_type`, `tamanho_bytes`). The content lives in the Supabase bucket; this model gives per-seller isolation. |
| `services.py` | `enviar_arquivo` (reads the upload, stores it in the bucket under `<vendedor_id>/<uuid>`, registers metadata), `obter_url_arquivo` (returns a public URL or a 1-hour signed URL depending on bucket config). |
| `serializers.py` | `ArquivoEntradaSerializer` (multipart file field) and `ArquivoSaidaSerializer` (metadata + URL). |
| `views.py` | `ArquivoUploadView` (POST, multipart) and `ArquivoDetalheView` (GET by UUID, 404 via `RecursoNaoEncontrado`). |
| `urls.py` | Routes: `/arquivos` and `/arquivos/<uuid:id>`. |
| `admin.py` | Admin registration for `Arquivo` (uses `objects_todos` to bypass tenant scoping). |
| `apps.py` | AppConfig for `apps.arquivos`. |
| `migrations/` | `0001_initial.py`. |
| `tests/test_arquivos.py` | Tests upload success, auth requirement, and per-seller isolation (404 for other sellers). |

---

### `apps/canais/` — sales channels

Channel connectivity (currently **Mercado Livre** OAuth) and a simulated channel summary used by the frontend Home panel.

| File | Function |
|---|---|
| `models.py` | `MercadoLivreToken`: OAuth tokens (access/refresh/`expires_at`) for a seller's connected Mercado Livre account (one account per seller via `OneToOneField`). |
| `services.py` | Mercado Livre OAuth flow: `gerar_url_autorizacao` (authorization URL with PKCE + signed `state`), `processar_callback_oauth` (exchange `code` for tokens), `esta_conectado_ao_mercado_livre`, `obter_token_valido` (auto-refreshes expired tokens), `chamar_api_mercado_livre` (authenticated API calls on the seller's behalf). |
| `views.py` | `MercadoLivreResumoView` (simulated summary), `MercadoLivreConectarView` (returns the authorization URL), `MercadoLivreStatusView` (connected?), `MercadoLivreCallbackView` (unauthenticated OAuth redirect handler that saves tokens then redirects to the frontend). |
| `resumo_simulado.py` | `obter_resumo_mercado_livre()`: computes receita, status counts, top products and recent orders from the static fixture (temporary until real API data is wired). |
| `fixtures/mercado_livre.json` | Static simulated Mercado Livre data (user, ads, orders, shipments) in the shape of the real API — used by `resumo_simulado.py`. |
| `urls.py` | Routes: `/canais/mercado-livre/resumo`, `/conectar`, `/callback`, `/status`. |
| `admin.py` | Admin registration for `MercadoLivreToken` (tokens read-only). |
| `apps.py` | AppConfig for `apps.canais`. |
| `migrations/` | `0001_initial.py`. |
| `tests/test_mercado_livre.py` | Tests URL generation, OAuth callback/token handling, token refresh logic, authenticated API calls, and all endpoints. |

---

### `apps/pedidos/` — orders

A single unified order format for **all channels**, filled by a sync process with a pluggable adapter per marketplace.

| File | Function |
|---|---|
| `models.py` | `Pedido` (unified order: `canal`, `id_externo`, standardized `status` + original `status_no_canal`, values, buyer, unique per seller+channel+external id) and `ItemPedido` (line items, with `taxa_venda`). |
| `services.py` | `sincronizar_pedidos` (pulls orders from every connected channel adapter, upserts them — idempotent), `obter_resumo_vendas` (sales summary: totals, per-channel/status breakdown, top products). |
| `views.py` | `PedidoListaView` (paginated/filtered list), `PedidoDetalheView` (single order + items), `PedidoSincronizarView` (POST to trigger a sync), `VendasResumoView` (sales totals). |
| `serializers.py` | `PedidoSaidaSerializer` + `ItemPedidoSaidaSerializer` (output, monetary values as JSON numbers), `SincronizacaoSaidaSerializer` (created/updated counts per channel), `ResumoVendasSaidaSerializer`. |
| `filters.py` | `PedidoFiltro`: filter by `canal`, `status`, `entregue`, and date range (`realizado_de`/`realizado_ate`). |
| `adaptadores/` | **Channel adapters.** Each module exposes the same contract: `CANAL`, `esta_conectado(vendedor=...)`, `buscar_pedidos(vendedor=...)` -> generator of `PedidoExterno`. Adding a new marketplace = dropping in a new module and listing it in `ADAPTADORES` here (`__init__.py`). |
| `adaptadores/base.py` | Dataclasses `PedidoExterno` and `ItemExterno` — the neutral, marketplace-independent order format. |
| `adaptadores/mercado_livre.py` | Mercado Livre adapter: paginates `/orders/search` via the authenticated client and translates responses (including status mapping, e.g. `paid`→`PAGO`) into `PedidoExterno`. |
| `management/commands/sincronizar_pedidos.py` | Management command `sincronizar_pedidos` — CLI version of the sync (all sellers, or `--vendedor <nome>`). |
| `urls.py` | Routes: `/pedidos`, `/pedidos/sincronizar`, `/pedidos/<uuid:id>`, `/vendas/resumo`. |
| `admin.py` | Admin registration for `Pedido` (+ `ItemPedido` inline). |
| `apps.py` | AppConfig for `apps.pedidos`. |
| `migrations/` | `0001_initial.py`. |
| `tests/test_pedidos.py` | Tests order translation, pagination traversal, idempotent sync, seller isolation, filters, summary logic, and route behavior. |

---

### `apps/produtos/` — product catalog and stock

The seller's product catalog with unified stock and the channels where each product is advertised.

| File | Function |
|---|---|
| `models.py` | `Produto` (name, `sku` unique per seller, category, price, `estoque`, `foto_url` from storage, optional `fornecedor` FK) and `ProdutoCanal` (child table listing which channels a product is listed on). |
| `services.py` | `criar_produto`/`atualizar_produto`/`excluir_produto` (PATCH semantics, SKU duplicate guard, supplier resolved only within the current seller) and `obter_resumo_estoque` (stock indicators; low-stock threshold at 10). |
| `views.py` | `ProdutoListCreateView` (paginated list with filters + create), `ProdutoDetalheView` (GET/PATCH/DELETE), `EstoqueResumoView` (stock dashboard indicators). |
| `serializers.py` | `ProdutoEntradaSerializer` (validated create/update payload, accepts `canais` as a list), `ProdutoSaidaSerializer` (output incl. channel names + supplier), `EstoqueResumoSaidaSerializer`. |
| `filters.py` | `ProdutoFiltro`: search by name/SKU/category (`busca`), `categoria`, `canal`, and `estoque_baixo`. |
| `urls.py` | Routes: `/produtos`, `/produtos/<uuid:id>`, `/estoque/resumo`. |
| `apps.py` | AppConfig for `apps.produtos`. |
| `migrations/` | Empty — no migrations generated for this app yet. |
| `tests/test_produtos.py` | Tests CRUD, SKU duplicate → 409, search/low-stock filters, seller isolation, stock summary, auth requirement. |

---

### `apps/fornecedores/` — suppliers

Suppliers that stock the seller's products.

| File | Function |
|---|---|
| `models.py` | `Fornecedor`: `nome`, `email` (unique per seller), `ativo`. |
| `services.py` | `criar_fornecedor`/`atualizar_fornecedor`/`excluir_fornecedor`: CRUD with duplicate-email guard scoped to the same seller. |
| `views.py` | `FornecedorListCreateView` (paginated list, filterable, with `produtos_vinculados` count + create) and `FornecedorDetalheView` (GET/PATCH/DELETE). |
| `serializers.py` | `FornecedorEntradaSerializer` / `FornecedorSaidaSerializer` (includes linked-product count). |
| `filters.py` | `FornecedorFiltro`: search by name/email (`busca`) and `ativo`. |
| `urls.py` | Routes: `/fornecedores`, `/fornecedores/<uuid:id>`. |
| `apps.py` | AppConfig for `apps.fornecedores`. |
| `migrations/` | Empty — no migrations generated for this app yet. |
| `tests/test_fornecedores.py` | Tests CRUD, duplicate email → 409, cross-seller email reuse allowed, isolation, auth. |

---

### `apps/financeiro/` — finances

Financial indicators (revenue, fees, expenses, net margin) and manual ledger entries (mostly expenses for now).

| File | Function |
|---|---|
| `models.py` | `Lancamento`: manual entry (`tipo` — RECEITA / TAXA / DESPESA —, `descricao`, optional `canal`, `valor`, `data`). Marketplace revenue/fees are *not* stored here — they're derived from synchronized orders. |
| `services.py` | `obter_resumo_financeiro` (revenue + fees from paid orders, expenses from manual entries; optional period filters; computes net margin) and `criar_lancamento`. |
| `views.py` | `ResumoFinanceiroView` (GET indicators with optional `realizado_de`/`realizado_ate`) and `LancamentoListCreateView` (list + create manual entries). |
| `serializers.py` | `LancamentoEntradaSerializer`/`LancamentoSaidaSerializer` and `ResumoFinanceiroSaidaSerializer` (`receitas`, `despesas`, `taxas`, `margem_liquida`). |
| `filters.py` | `LancamentoFiltro`: filter by `tipo`, `canal`, and date range. |
| `urls.py` | Routes: `/financeiro/resumo`, `/financeiro/lancamentos`. |
| `apps.py` | AppConfig for `apps.financeiro`. |
| `migrations/` | Empty — no migrations generated for this app yet. |
| `tests/test_financeiro.py` | Tests summary calculation, period filtering, seller isolation, manual entry CRUD, auth. |

---

## Notes

- **`apps.notificacoes`** is referenced in `config/settings/base.py` (INSTALLED_APPS) and `config/urls.py`, but the app folder does **not** exist in this checkout yet — it's planned but unimplemented. The API will fail to boot until it's added or the reference is removed.
- **`__pycache__/` folders** and `.pyc` files are auto-generated by Python and safe to ignore.
- **Migrations** exist only for `contas`, `arquivos`, `canais`, and `pedidos`; the `produtos`, `fornecedores`, and `financeiro` apps have models but no migration files yet (`makemigrations` hasn't been run for them).
- **Convention across apps:** business logic lives in `services.py`, views stay thin; all custom business errors use `ErroDeNegocio` from `apps.core.exceptions`; multi-tenant models are queried with the tenant-scoped default manager (`objects`) and `objects_todos` only in admin/management/scripts.