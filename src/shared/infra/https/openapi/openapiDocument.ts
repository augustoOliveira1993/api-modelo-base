type HttpMethod = 'get' | 'post' | 'put' | 'delete';

interface IOpenApiOperation {
  tags: string[];
  summary: string;
  security?: Array<Record<string, string[]>>;
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
  responses: Record<string, unknown>;
}

interface IOpenApiDocument {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Partial<Record<HttpMethod, IOpenApiOperation>>>;
  components: Record<string, unknown>;
}

const authSecurity = [{ bearerAuth: [] }];

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', pattern: '^[a-f\\d]{24}$' },
};

const paginationParams = [
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1 },
  },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100 },
  },
  {
    name: 'pagination',
    in: 'query',
    schema: { type: 'string', enum: ['offset', 'cursor'] },
  },
  {
    name: 'search',
    in: 'query',
    schema: { type: 'string' },
  },
  {
    name: 'cursor',
    in: 'query',
    schema: { type: 'string' },
  },
  {
    name: 'cursorField',
    in: 'query',
    schema: { type: 'string', default: 'createdAt' },
  },
  {
    name: 'cursorDirection',
    in: 'query',
    schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
];

function jsonBody(schemaRef: string): Record<string, unknown> {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: schemaRef },
      },
    },
  };
}

function successResponse(description = 'Operação realizada com sucesso') {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/SuccessResponse' },
      },
    },
  };
}

function errorResponses(includeForbidden = false): Record<string, unknown> {
  return {
    '400': {
      description: 'Requisição inválida',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
    '401': {
      description: 'Não autenticado',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
    ...(includeForbidden
      ? {
          '403': {
            description: 'Permissão insuficiente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        }
      : {}),
    '404': {
      description: 'Recurso não encontrado',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
    '500': {
      description: 'Erro interno',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  };
}

function crudPaths(
  path: string,
  tag: string,
  schemaName: string,
  options: { publicOperations?: string[]; publicAll?: boolean } = {},
) {
  const schemaRef = `#/components/schemas/${schemaName}`;
  const isProtected = (operation: string): boolean =>
    !options.publicAll && !options.publicOperations?.includes(operation);
  const security = (operation: string) =>
    (isProtected(operation) ? { security: authSecurity } : {});

  return {
    [path]: {
      get: {
        tags: [tag],
        summary: `Lista registros de ${tag}`,
        ...security('get'),
        parameters: paginationParams,
        responses: {
          '200': successResponse('Lista paginada retornada com sucesso'),
          ...errorResponses(isProtected('get')),
        },
      },
      post: {
        tags: [tag],
        summary: `Cria registro de ${tag}`,
        ...security('post'),
        requestBody: jsonBody(schemaRef),
        responses: {
          '200': successResponse('Registro criado com sucesso'),
          ...errorResponses(isProtected('post')),
        },
      },
    },
    [`${path}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Busca registro de ${tag} por id`,
        ...security('getById'),
        parameters: [idParam],
        responses: {
          '200': successResponse('Registro retornado com sucesso'),
          ...errorResponses(isProtected('getById')),
        },
      },
      put: {
        tags: [tag],
        summary: `Atualiza registro de ${tag}`,
        ...security('put'),
        parameters: [idParam],
        requestBody: jsonBody(schemaRef),
        responses: {
          '200': successResponse('Registro atualizado com sucesso'),
          ...errorResponses(isProtected('put')),
        },
      },
      delete: {
        tags: [tag],
        summary: `Remove registro de ${tag}`,
        ...security('delete'),
        parameters: [idParam],
        responses: {
          '200': successResponse('Registro removido com sucesso'),
          ...errorResponses(isProtected('delete')),
        },
      },
    },
  } satisfies IOpenApiDocument['paths'];
}

export const openApiDocument: IOpenApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Backend Base TS API',
    description: 'Contrato base para APIs criadas a partir deste template.',
    version: '1.0.0',
  },
  servers: [
    {
      url: '/api',
      description: 'Servidor atual',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação, sessão e usuário logado' },
    { name: 'Users', description: 'Gestão de usuários' },
    { name: 'Roles', description: 'Gestão de perfis' },
    { name: 'Logs', description: 'Auditoria e registros de operação' },
    { name: 'Notifications', description: 'Notificações' },
  ],
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Cria novo usuário',
        requestBody: jsonBody('#/components/schemas/SignUpRequest'),
        responses: {
          '200': successResponse('Usuário criado com sucesso'),
          ...errorResponses(),
        },
      },
    },
    '/auth/signin': {
      post: {
        tags: ['Auth'],
        summary: 'Autentica usuário',
        requestBody: jsonBody('#/components/schemas/SignInRequest'),
        responses: {
          '200': successResponse('Login realizado com sucesso'),
          ...errorResponses(),
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renova token de acesso',
        requestBody: jsonBody('#/components/schemas/RefreshTokenRequest'),
        responses: {
          '200': successResponse('Token renovado com sucesso'),
          ...errorResponses(),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Retorna usuário autenticado',
        security: authSecurity,
        responses: {
          '200': successResponse('Usuário autenticado retornado'),
          ...errorResponses(),
        },
      },
    },
    ...crudPaths('/users', 'Users', 'User', { publicOperations: ['post'] }),
    ...crudPaths('/roles', 'Roles', 'Role'),
    ...crudPaths('/logs', 'Logs', 'Log'),
    ...crudPaths('/notifications', 'Notifications', 'Notification', { publicAll: true }),
    '/roles/{idRole}/permissions': {
      post: {
        tags: ['Roles'],
        summary: 'Atribui permissão a um perfil',
        security: authSecurity,
        parameters: [
          { name: 'idRole', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': successResponse('Permissão atribuída com sucesso'),
          ...errorResponses(true),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          message: { type: 'string' },
          status_code: { type: 'integer' },
          requestId: { type: 'string' },
        },
      },
      SignUpRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      SignInRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          login: {
            type: 'string',
            description: 'Username ou email. Alternativamente envie username ou email.',
          },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
        },
      },
      Role: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
      Log: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          category: { type: 'string' },
          action: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          read: { type: 'boolean' },
        },
      },
    },
  },
};
