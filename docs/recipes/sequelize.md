# Receita: banco SQL secundário com Sequelize

O template usa **MongoDB como banco principal**. O suporte a SQL (MySQL / SQL Server)
existia no `src/configs/database/`, mas **nenhum módulo o utilizava** — só o graceful
shutdown chamava `closeSequelizeConnections()`. Para não carregar ~40 MB de drivers
(`sequelize`, `mysql2`, `tedious`) em todo projeto novo, ele saiu do `src/` e virou
esta receita.

Use quando o projeto precisar ler de um ERP/legado em SQL mantendo o Mongo como
banco de escrita.

## 1. Instalar as dependências

```bash
yarn add sequelize mysql2 tedious
```

## 2. Restaurar os arquivos

Copie os dois arquivos ao lado deste README de volta para o `src`, removendo o
sufixo `.txt`:

```bash
cp docs/recipes/sequelize.config.ts.txt src/configs/database/sequelize.config.ts
cp docs/recipes/sequelize.connection.ts.txt src/configs/database/sequelize.connection.ts
```

## 3. Declarar as variáveis de ambiente

Adicione ao `.env` e ao `.env.example` apenas os perfis que for usar:

```dotenv
# MySQL principal
MYSQL_DB_HOST=
MYSQL_DB_PORT=3306
MYSQL_DB_USER=
MYSQL_DB_PASSWORD=
MYSQL_DB_DATABASE=

# MySQL SAP (segundo perfil)
MYSQL_SAP_HOST=
MYSQL_SAP_PORT=3306
MYSQL_SAP_USER=
MYSQL_SAP_PASSWORD=
MYSQL_SAP_DATABASE=

# SQL Server
SQLSERVER_DB_HOST=
SQLSERVER_DB_PORT=1433
SQLSERVER_DB_USER=
SQLSERVER_DB_PASSWORD=
SQLSERVER_DB_DATABASE=
```

> Estas variáveis eram lidas pelo código mas **nunca constaram do `.env.example`** —
> por isso estão documentadas aqui.

## 4. Fechar as conexões no shutdown

Sem este passo o processo não encerra de forma limpa: o pool do Sequelize mantém
sockets abertos e o `GRACEFUL_SHUTDOWN_TIMEOUT_MS` estoura.

Em `src/shared/infra/https/server.ts`:

```ts
import { closeSequelizeConnections } from '@configs/database/sequelize.connection';

registerGracefulShutdown({
  server: app.httpServer,
  timeoutMs: env.shutdownTimeoutMs,
  closeResources: async () => {
    await app.shutdown();
    if (isEnabled('SOCKET_MANAGER')) await socketManager.close();
    await RedisClient.disconnect();
    await closeSequelizeConnections();   // <-- adicionar
    await disconnectDB();
  },
});
```

## 5. Usar numa consulta

```ts
import { getMySQLConnection } from '@configs/database/sequelize.connection';

const [rows] = await getMySQLConnection().query(
  'SELECT id, nome FROM colaboradores WHERE ativo = :ativo',
  { replacements: { ativo: 1 } },
);
```

## Observações

- Conexões SQL **não** participam do `withTransaction()` do Mongo
  (`@shared/utils/transactions`). Não há transação distribuída entre os dois bancos.
- Prefira encapsular o acesso SQL atrás de um repositório com interface própria,
  registrado no container, para manter os services agnósticos de origem de dados.
- `tedious` (SQL Server) tem build nativo pesado; se só precisar de MySQL, instale
  apenas `sequelize` e `mysql2`.
