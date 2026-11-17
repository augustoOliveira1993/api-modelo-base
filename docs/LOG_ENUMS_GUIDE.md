# Enums de Log - Guia de Uso

Este documento descreve os enums centralizados para categorias e ações de log, localizados em `src/modules/log/dto/ILogDTO.ts`.

## 📋 Enums Disponíveis

### LogCategory

Categorias de log disponíveis no sistema:

```typescript
export enum LogCategory {
  AUDIT = 'AUDIT',              // Logs de auditoria automática
  SESSION_LOG = 'SESSION_LOG',  // Logs de sessão (login, logout, etc)
  SYSTEM = 'SYSTEM',            // Logs de sistema
  ERROR = 'ERROR',              // Logs de erro
  WARNING = 'WARNING',          // Logs de aviso
  INFO = 'INFO',                // Logs informativos
}
```

### LogAction

Ações de log disponíveis no sistema:

```typescript
export enum LogAction {
  // Ações de CRUD
  CREATE = 'CREATE',                    // Criação de registro
  UPDATE = 'UPDATE',                    // Atualização de registro
  DELETE = 'DELETE',                    // Deleção de registro
  READ = 'READ',                        // Leitura de registro

  // Ações de Sessão
  LOGIN = 'LOGIN',                      // Login bem-sucedido
  LOGOUT = 'LOGOUT',                    // Logout
  ACCESS_DENIED = 'ACCESS_DENIED',      // Acesso negado
  SESSION_EXPIRED = 'SESSION_EXPIRED',  // Sessão expirada

  // Outras ações
  UNKNOWN = 'UNKNOWN',                  // Ação desconhecida
}
```

## 🔧 Como Usar

### Importação

```typescript
import { LogCategory, LogAction } from '@modules/log/dto/ILogDTO';
```

### Exemplo de Uso em Services

```typescript
import ILogRepository from '@modules/log/repositories/ILogRepository';
import { LogCategory, LogAction } from '@modules/log/dto/ILogDTO';

class MyService {
  constructor(
    @inject('LogRepository')
    private logRepository: ILogRepository,
  ) {}

  async execute() {
    // Registra log usando enums
    await this.logRepository.create({
      action: LogAction.CREATE,
      category: LogCategory.AUDIT,
      message: 'Usuário criado com sucesso',
      created_by: 'admin@example.com',
    });
  }
}
```

### Exemplo de Uso em Middlewares

```typescript
import { LogCategory, LogAction } from '@modules/log/dto/ILogDTO';

function myMiddleware(req: Request, res: Response, next: NextFunction) {
  // Usa enum para categorizar log
  logRepository.create({
    action: LogAction.ACCESS_DENIED,
    category: LogCategory.SESSION_LOG,
    message: 'Tentativa de acesso não autorizado',
    ip: req.ip,
  });
}
```

## 📊 Exemplos por Categoria

### AUDIT (Auditoria)

Usado pelo middleware de auditoria automática para registrar todas operações CUD:

```typescript
{
  action: LogAction.UPDATE,
  category: LogCategory.AUDIT,
  message: 'PUT /api/users/123',
  created_by: 'usuario@example.com',
  ip: '192.168.1.100',
  sessionId: 'abc-123',
  endpoint: '/api/users/123',
  diff: { nome: { old: 'João', new: 'João Silva' } }
}
```

### SESSION_LOG (Logs de Sessão)

Usado para registrar eventos relacionados a sessões:

```typescript
// Login
{
  action: LogAction.LOGIN,
  category: LogCategory.SESSION_LOG,
  message: 'Login realizado com sucesso - São Paulo, SP - Brasil',
  created_by: 'usuario@example.com',
  ip: '200.123.45.67',
  sessionId: '550e8400-e29b-41d4-a716-446655440000'
}

// Logout
{
  action: LogAction.LOGOUT,
  category: LogCategory.SESSION_LOG,
  message: 'Logout realizado - Duração da sessão: 2h 15m',
  created_by: 'usuario@example.com',
  sessionId: '550e8400-e29b-41d4-a716-446655440000'
}

// Acesso Negado
{
  action: LogAction.ACCESS_DENIED,
  category: LogCategory.SESSION_LOG,
  message: 'Acesso negado: Sessão expirada ou encerrada',
  created_by: 'usuario@example.com',
  ip: '200.123.45.67',
  endpoint: '/api/users'
}
```

### SYSTEM (Sistema)

Para logs gerais do sistema:

```typescript
{
  action: LogAction.UNKNOWN,
  category: LogCategory.SYSTEM,
  message: 'Serviço iniciado com sucesso',
  created_by: 'system'
}
```

### ERROR (Erros)

Para registrar erros da aplicação:

```typescript
{
  action: LogAction.UNKNOWN,
  category: LogCategory.ERROR,
  message: 'Erro ao conectar ao banco de dados',
  created_by: 'system',
  diff: { error: 'Connection timeout', stack: '...' }
}
```

## 🔍 Consultas MongoDB

### Buscar por Categoria

```javascript
// Todos os logs de auditoria
db.logs.find({ category: LogCategory.AUDIT })

// Todos os logs de sessão
db.logs.find({ category: LogCategory.SESSION_LOG })
```

### Buscar por Ação

```javascript
// Todos os logins
db.logs.find({ action: LogAction.LOGIN })

// Todas as operações de criação
db.logs.find({ action: LogAction.CREATE })

// Todos os acessos negados
db.logs.find({ action: LogAction.ACCESS_DENIED })
```

### Consultas Combinadas

```javascript
// Logs de auditoria de criação
db.logs.find({
  category: LogCategory.AUDIT,
  action: LogAction.CREATE
})

// Logs de sessão de um usuário específico
db.logs.find({
  category: LogCategory.SESSION_LOG,
  created_by: 'usuario@example.com'
}).sort({ createdAt: -1 })

// Acessos negados nas últimas 24 horas
db.logs.find({
  category: LogCategory.SESSION_LOG,
  action: LogAction.ACCESS_DENIED,
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
})
```

## ✨ Vantagens dos Enums

1. **Type Safety**: TypeScript valida em tempo de compilação
2. **Autocomplete**: IDEs sugerem valores válidos
3. **Refatoração**: Mudanças são refletidas em todo o código
4. **Documentação**: Valores centralizados e documentados
5. **Consistência**: Impossível usar valores inválidos
6. **Manutenção**: Adicionar novas categorias/ações em um único lugar

## 🚀 Adicionando Novos Valores

Para adicionar uma nova categoria ou ação:

1. Edite `src/modules/log/dto/ILogDTO.ts`
2. Adicione o novo valor ao enum apropriado
3. TypeScript irá validar automaticamente em todo o código

```typescript
// Exemplo: Adicionar nova categoria
export enum LogCategory {
  AUDIT = 'AUDIT',
  SESSION_LOG = 'SESSION_LOG',
  SYSTEM = 'SYSTEM',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
  SECURITY = 'SECURITY',  // 👈 Nova categoria
}

// Exemplo: Adicionar nova ação
export enum LogAction {
  // ... ações existentes
  BACKUP = 'BACKUP',           // 👈 Nova ação
  RESTORE = 'RESTORE',         // 👈 Nova ação
}
```

## 📝 Notas Importantes

- Os enums são **strings**, não números, para melhor legibilidade no MongoDB
- A interface `ILogDTO` aceita tanto o enum quanto strings (`LogAction | string`) para retrocompatibilidade
- Use sempre os enums quando possível para máxima type safety
- Strings literais só devem ser usadas em casos excepcionais

## 🔗 Arquivos Relacionados

- **DTO**: [src/modules/log/dto/ILogDTO.ts](../modules/log/dto/ILogDTO.ts)
- **Schema MongoDB**: [src/modules/log/infra/mongo/models/Log.ts](../modules/log/infra/mongo/models/Log.ts)
- **Middleware de Auditoria**: [src/shared/middlewares/auditMiddleware.ts](../shared/middlewares/auditMiddleware.ts)
- **SessionLogService**: [src/modules/session/services/session/SessionLogService.ts](../modules/session/services/session/SessionLogService.ts)
