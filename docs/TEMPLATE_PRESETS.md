# Presets do template

Os presets ajudam a iniciar um projeto novo com um conjunto coerente de feature flags. Eles nao removem codigo nem dependencias: geram um arquivo `.env.preset.<nome>` baseado no `.env.example`, pronto para copiar ou comparar com o `.env` do novo projeto.

## Presets disponiveis

### `minimal`

API enxuta com Express, MongoDB, auth local, health check e OpenAPI.

- Redis cache: desabilitado.
- Socket.IO: desabilitado.
- Email Microsoft Graph: desabilitado.
- Metricas detalhadas e route monitoring: desabilitados.

### `enterprise`

API corporativa com Redis, auditoria, sessoes, Active Directory e email habilitados.

- Redis cache: habilitado.
- Route monitoring e metricas: habilitados.
- Email Microsoft Graph: habilitado.
- Socket.IO: desabilitado por padrao.

### `realtime`

API para notificacoes e eventos em tempo real.

- Socket.IO: habilitado.
- Redis cache: habilitado.
- Route monitoring e metricas: habilitados.
- Email: desabilitado por padrao.

### `observability`

API focada em operacao, metricas, health, OpenAPI, request id e logs estruturados.

- Metricas, health, OpenAPI e route monitoring: habilitados.
- Redis cache, Socket.IO e email: desabilitados por padrao.

## Como usar

Liste os presets:

```bash
npm run preset -- --list
```

Inspecione sem gravar arquivo:

```bash
npm run preset -- minimal --dry-run
```

Gere o arquivo do preset:

```bash
npm run preset -- minimal
```

Isso cria:

```bash
.env.preset.minimal
```

Para escolher outro destino:

```bash
npm run preset -- enterprise --output=.env.enterprise
```

Para sobrescrever um arquivo existente:

```bash
npm run preset -- enterprise --output=.env.enterprise --force
```

## Bootstrap recomendado

1. Gere o preset mais proximo do projeto.
2. Compare com `.env.example`.
3. Copie os valores para `.env`.
4. Ajuste segredos, `CORS`, URLs de banco, Redis e credenciais externas.
5. Rode `npm run lint`, `npm run test` e `npm run build`.
