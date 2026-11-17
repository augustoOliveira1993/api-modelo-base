#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import {
  addModuleToContext,
  createAclContent,
  resolveWorkspacePath,
  validateKebabCase,
} from './shared/module-generation';

// Função auxiliar para capitalizar primeira letra
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Função para converter para camelCase
function toCamelCase(str: string): string {
  return str
    .split('-')
    .map((word, index) => (index === 0 ? word : capitalize(word)))
    .join('');
}

// Função para converter para PascalCase
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => capitalize(word))
    .join('');
}

// Templates
const templates = {
  dto: (resourceName: string) => `import { Document } from 'mongoose';

export interface I${resourceName}DTO {
  name: string;
  description?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface I${resourceName}Document extends I${resourceName}DTO, Document {}
`,

  repositoryInterface: (
    resourceName: string,
    moduleName: string,
    options: IGenerateOptions,
  ) => `import { I${resourceName}DTO, I${resourceName}Document } from '@modules/${moduleName}/dto/I${resourceName}DTO';
import ${
    options.softDelete
      ? '{ IBaseSoftDeleteRepository } from \'@shared/infra/database/mongo/IBaseSoftDeleteRepository\''
      : 'IBaseRepository from \'@shared/infra/database/mongo/IBaseRepository\''
  };

export default interface I${resourceName}Repository
  extends ${options.softDelete ? 'IBaseSoftDeleteRepository' : 'IBaseRepository'}<I${resourceName}DTO, I${resourceName}Document> {
  // Adicione métodos customizados aqui
}
`,

  repositoryImpl: (
    resourceName: string,
    moduleName: string,
    options: IGenerateOptions,
  ) => `import { Model } from 'mongoose';
import { ${resourceName} } from '@modules/${moduleName}/infra/mongo/models/${resourceName}';
import { I${resourceName}DTO, I${resourceName}Document } from '@modules/${moduleName}/dto/I${resourceName}DTO';
import I${resourceName}Repository from '@modules/${moduleName}/repositories/I${resourceName}Repository';
import { ${options.softDelete ? 'SoftDeleteMongoRepository' : 'BaseMongoRepository'} } from '@shared/infra/database/mongo/${options.softDelete ? 'SoftDeleteMongoRepository' : 'BaseMongoRepository'}';

export default class ${resourceName}Repository
  extends ${options.softDelete ? 'SoftDeleteMongoRepository' : 'BaseMongoRepository'}<I${resourceName}DTO, I${resourceName}Document>
  implements I${resourceName}Repository
{
  protected readonly model: Model<I${resourceName}Document> = ${resourceName};
  protected readonly modelPopulated = [];
}
`,

  model: (
    resourceName: string,
    moduleName: string,
    options: IGenerateOptions,
  ) => `import { I${resourceName}Document } from '@modules/${moduleName}/dto/I${resourceName}DTO';
import mongoose, { Schema } from 'mongoose';

const schema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    created_by: { type: String },
    updated_by: { type: String },
    ${options.softDelete ? 'deletedAt: { type: Date, default: null },' : ''}
  },
  {
    timestamps: true,
  },
);

export const ${resourceName} = mongoose.model<I${resourceName}Document>('${resourceName}', schema);
`,

  schemas: (resourceName: string) => `import { IRequestValidationSchemas } from '@shared/middlewares/validateRequest';

const mongoIdPattern = /^[a-f\\d]{24}$/i;
const positiveIntegerPattern = /^\\d+$/;

export const create${resourceName}Schema: IRequestValidationSchemas = {
  body: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', maxLength: 500 },
  },
};

export const update${resourceName}Schema: IRequestValidationSchemas = {
  params: {
    id: { required: true, type: 'string', pattern: mongoIdPattern },
  },
  body: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', maxLength: 500 },
  },
};

export const findAll${resourceName}Schema: IRequestValidationSchemas = {
  query: {
    page: { type: 'string', pattern: positiveIntegerPattern },
    limit: { type: 'string', pattern: positiveIntegerPattern },
    pagination: { type: 'string', allowedValues: ['offset', 'cursor'] },
    cursor: { type: 'string', maxLength: 500 },
    cursorField: { type: 'string', maxLength: 80 },
    cursorDirection: { type: 'string', allowedValues: ['asc', 'desc'] },
    search: { type: 'string', maxLength: 120 },
    sortBy: { type: 'string', maxLength: 80 },
    sortDesc: { type: 'string', allowedValues: ['true', 'false'] },
  },
};

export const id${resourceName}Schema: IRequestValidationSchemas = {
  params: {
    id: { required: true, type: 'string', pattern: mongoIdPattern },
  },
};
`,

  openapi: (
    resourceName: string,
    moduleName: string,
    options: IGenerateOptions,
  ) => `export const ${toCamelCase(resourceName)}OpenApiPaths = {
  '/${moduleName}': {
    get: {
      tags: ['${resourceName}'],
      summary: 'Lista registros de ${resourceName}',
      ${options.auth ? 'security: [{ bearerAuth: [] }],' : ''}
      responses: {
        '200': { description: 'Lista retornada com sucesso' }${options.auth ? ",\n        '401': { description: 'Não autenticado' },\n        '403': { description: 'Permissão insuficiente' }" : ''},
      },
    },
    post: {
      tags: ['${resourceName}'],
      summary: 'Cria registro de ${resourceName}',
      ${options.auth ? 'security: [{ bearerAuth: [] }],' : ''}
      responses: {
        '200': { description: 'Registro criado com sucesso' }${options.auth ? ",\n        '401': { description: 'Não autenticado' },\n        '403': { description: 'Permissão insuficiente' }" : ''},
      },
    },
  },
  '/${moduleName}/{id}': {
    get: {
      tags: ['${resourceName}'],
      summary: 'Busca registro de ${resourceName} por id',
      ${options.auth ? 'security: [{ bearerAuth: [] }],' : ''}
      responses: {
        '200': { description: 'Registro retornado com sucesso' }${options.auth ? ",\n        '401': { description: 'Não autenticado' },\n        '403': { description: 'Permissão insuficiente' }" : ''},
      },
    },
    put: {
      tags: ['${resourceName}'],
      summary: 'Atualiza registro de ${resourceName}',
      ${options.auth ? 'security: [{ bearerAuth: [] }],' : ''}
      responses: {
        '200': { description: 'Registro atualizado com sucesso' }${options.auth ? ",\n        '401': { description: 'Não autenticado' },\n        '403': { description: 'Permissão insuficiente' }" : ''},
      },
    },
    delete: {
      tags: ['${resourceName}'],
      summary: 'Remove registro de ${resourceName}',
      ${options.auth ? 'security: [{ bearerAuth: [] }],' : ''}
      responses: {
        '200': { description: 'Registro removido com sucesso' }${options.auth ? ",\n        '401': { description: 'Não autenticado' },\n        '403': { description: 'Permissão insuficiente' }" : ''},
      },
    },
  },
};
`,

  createService: (
    resourceName: string,
    moduleName: string,
  ) => `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '@modules/${moduleName}/repositories/I${resourceName}Repository';
import { I${resourceName}DTO, I${resourceName}Document } from '@modules/${moduleName}/dto/I${resourceName}DTO';
import { IServiceResponse } from '@shared/types/global';

@injectable()
export default class CreateService {
  constructor(
    @inject('${resourceName}Repository')
    private repository: I${resourceName}Repository,
  ) {}

  public async execute(
    data: I${resourceName}DTO,
    userEmail: string | undefined,
  ): Promise<IServiceResponse<I${resourceName}Document>> {
    const created = await this.repository.create({
      ...data,
      created_by: userEmail,
    });

    return {
      success: true,
      message: '${resourceName} criado com sucesso!',
      data: created,
    };
  }
}
`,

  updateService: (
    resourceName: string,
    moduleName: string,
  ) => `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '@modules/${moduleName}/repositories/I${resourceName}Repository';
import { I${resourceName}DTO, I${resourceName}Document } from '@modules/${moduleName}/dto/I${resourceName}DTO';
import { IServiceResponse } from '@shared/types/global';
import { NotFoundError } from '@shared/errors/AppError';

@injectable()
export default class UpdateService {
  constructor(
    @inject('${resourceName}Repository')
    private repository: I${resourceName}Repository,
  ) {}

  public async execute(
    id: string,
    data: Partial<I${resourceName}DTO>,
    userEmail: string | undefined,
  ): Promise<IServiceResponse<I${resourceName}Document>> {
    const exist = await this.repository.findById(id);
    if (!exist) {
      throw new NotFoundError({ message: '${resourceName} não encontrado' });
    }

    const updated = await this.repository.update(id, {
      ...data,
      updated_by: userEmail,
    });

    return {
      success: true,
      message: '${resourceName} atualizado com sucesso!',
      data: updated!,
    };
  }
}
`,

  deleteService: (
    resourceName: string,
    moduleName: string,
    options: IGenerateOptions,
  ) => `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '@modules/${moduleName}/repositories/I${resourceName}Repository';
import { IServiceResponse } from '@shared/types/global';
import { NotFoundError } from '@shared/errors/AppError';

@injectable()
export default class DeleteService {
  constructor(
    @inject('${resourceName}Repository')
    private repository: I${resourceName}Repository,
  ) {}

  public async execute(id: string): Promise<IServiceResponse<{ id: string }>> {
    const deleted = await this.repository.${options.softDelete ? 'softDelete' : 'delete'}(id);
    if (!deleted) {
      throw new NotFoundError({ message: '${resourceName} não encontrado' });
    }

    return {
      success: true,
      message: '${resourceName} deletado com sucesso!',
      data: { id: deleted.id },
    };
  }
}
`,

  findAllService: (
    resourceName: string,
    moduleName: string,
  ) => `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '@modules/${moduleName}/repositories/I${resourceName}Repository';
import { I${resourceName}Document } from '@modules/${moduleName}/dto/I${resourceName}DTO';
import {
  applyCursorPaginationParams,
  applyPaginationParams,
  buildCursorPaginatedResult,
  buildPaginatedResult,
  ICursorPaginationResult,
  IPaginatedResult,
} from '@shared/utils/pagination';
import { applySearchParam } from '@shared/utils/search';

@injectable()
export default class FindAllService {
  constructor(
    @inject('${resourceName}Repository')
    private repository: I${resourceName}Repository,
  ) {}

  public async execute(
    query: Record<string, any>,
  ): Promise<
    | IPaginatedResult<I${resourceName}Document>
    | ICursorPaginationResult<I${resourceName}Document>
  > {
    let queryParams: Record<string, any> = {};

    // Aplica busca textual
    queryParams = applySearchParam(query, queryParams, {
      textFields: ['name', 'description'],
    });

    if (query.pagination === 'cursor' || query.cursor) {
      queryParams = applyCursorPaginationParams(query, queryParams);
      const data = await this.repository.findAll(queryParams);

      return buildCursorPaginatedResult(data, query);
    }

    // Aplica paginação por offset
    queryParams = applyPaginationParams(query, queryParams);

    const [total, data] = await Promise.all([
      this.repository.total(queryParams),
      this.repository.findAll(queryParams),
    ]);

    return buildPaginatedResult(data, total, query);
  }
}
`,

  findByIdService: (
    resourceName: string,
    moduleName: string,
  ) => `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '@modules/${moduleName}/repositories/I${resourceName}Repository';
import { I${resourceName}Document } from '@modules/${moduleName}/dto/I${resourceName}DTO';
import { NotFoundError } from '@shared/errors/AppError';

@injectable()
export default class FindByIdService {
  constructor(
    @inject('${resourceName}Repository')
    private repository: I${resourceName}Repository,
  ) {}

  public async execute(id: string): Promise<I${resourceName}Document> {
    const exist = await this.repository.findById(id);
    if (!exist) {
      throw new NotFoundError({ message: '${resourceName} não encontrado' });
    }
    return exist;
  }
}
`,

  controller: (
    resourceName: string,
    moduleName: string,
    resourceLower: string,
    options: IGenerateOptions,
  ) => `import { Request, Response } from 'express';
import { container } from 'tsyringe';
${options.auth ? "import { RequiredPermission } from '@shared/permissions/RequiredPermission';" : ''}
${options.auth ? `import { ACL } from '@modules/${moduleName}/permissions/ACL';` : ''}

import FindAllService from '@modules/${moduleName}/services/${resourceLower}/FindAllService';
import CreateService from '@modules/${moduleName}/services/${resourceLower}/CreateService';
import DeleteService from '@modules/${moduleName}/services/${resourceLower}/DeleteService';
import FindByIdService from '@modules/${moduleName}/services/${resourceLower}/FindByIdService';
import UpdateService from '@modules/${moduleName}/services/${resourceLower}/UpdateService';

export default class ${resourceName}Controller {
  ${options.auth ? `@RequiredPermission(ACL.${resourceLower}.read)` : ''}
  public async findAll(req: Request, res: Response): Promise<Response> {
    const service = container.resolve(FindAllService);
    const result = await service.execute(req.query);
    return res.json(result);
  }

  ${options.auth ? `@RequiredPermission(ACL.${resourceLower}.create)` : ''}
  public async create(req: Request, res: Response): Promise<Response> {
    const service = container.resolve(CreateService);
    const result = await service.execute(req.body, req.userEmail);
    return res.json(result);
  }

  ${options.auth ? `@RequiredPermission(ACL.${resourceLower}.read)` : ''}
  public async findById(req: Request, res: Response): Promise<Response> {
    const service = container.resolve(FindByIdService);
    const result = await service.execute(req.params.id);
    return res.json(result);
  }

  ${options.auth ? `@RequiredPermission(ACL.${resourceLower}.update)` : ''}
  public async update(req: Request, res: Response): Promise<Response> {
    const service = container.resolve(UpdateService);
    const result = await service.execute(req.params.id, req.body, req.userEmail);
    return res.json(result);
  }

  ${options.auth ? `@RequiredPermission(ACL.${resourceLower}.delete)` : ''}
  public async delete(req: Request, res: Response): Promise<Response> {
    const service = container.resolve(DeleteService);
    const result = await service.execute(req.params.id);
    return res.json(result);
  }
}
`,

  routes: (
    resourceName: string,
    moduleName: string,
    options: IGenerateOptions,
  ) => `import { RequestHandler } from 'express';
import ${resourceName}Controller from '@modules/${moduleName}/infra/https/controllers/${resourceName}Controller';
import {
  create${resourceName}Schema,
  findAll${resourceName}Schema,
  id${resourceName}Schema,
  update${resourceName}Schema,
} from '@modules/${moduleName}/infra/https/schemas/${resourceName}Schemas';
import { validateRequest } from '@shared/middlewares/validateRequest';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
${options.auth ? "import { verifyToken } from '@shared/middlewares/authMiddleware';" : ''}
${options.cache ? "import { cacheMiddleware, updateCacheMiddleware, invalidateCacheDynamicMiddleware } from '@shared/middlewares/cacheMiddleware';" : ''}

const controller = new ${resourceName}Controller();
const cacheReadMiddlewares: RequestHandler[] = ${options.cache ? '[cacheMiddleware, updateCacheMiddleware]' : '[]'};
const cacheMutationMiddlewares: RequestHandler[] = ${options.cache ? '[invalidateCacheDynamicMiddleware]' : '[]'};

export default defineRoutes({
  authentication: ${options.auth ? '[verifyToken]' : '[]'},
  beforeMiddleware: [(_req, res, next) => {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept');
    next();
  }],
  routes: [
    { method: 'POST', path: '/', ${options.auth ? '' : 'auth: false,'} middleware: [validateRequest(create${resourceName}Schema), ...cacheMutationMiddlewares], handler: controller.create },
    { method: 'GET', path: '/', ${options.auth ? '' : 'auth: false,'} middleware: [validateRequest(findAll${resourceName}Schema), ...cacheReadMiddlewares], handler: controller.findAll },
    { method: 'GET', path: '/:id', ${options.auth ? '' : 'auth: false,'} middleware: [validateRequest(id${resourceName}Schema), ...cacheReadMiddlewares], handler: controller.findById },
    { method: 'PUT', path: '/:id', ${options.auth ? '' : 'auth: false,'} middleware: [validateRequest(update${resourceName}Schema), ...cacheMutationMiddlewares], handler: controller.update },
    { method: 'DELETE', path: '/:id', ${options.auth ? '' : 'auth: false,'} middleware: [validateRequest(id${resourceName}Schema), ...cacheMutationMiddlewares], handler: controller.delete },
  ],
});
`,

  container: (
    resourceName: string,
    moduleName: string,
  ) => `import { container } from 'tsyringe';
import I${resourceName}Repository from '@modules/${moduleName}/repositories/I${resourceName}Repository';
import ${resourceName}Repository from '@modules/${moduleName}/infra/mongo/repositories/${resourceName}Repository';

container.registerSingleton<I${resourceName}Repository>(
  '${resourceName}Repository',
  ${resourceName}Repository,
);
`,

  moduleManifest: (
    moduleName: string,
    resourceLower: string,
    context: string,
  ) => `import { defineModule } from '@shared/modules/defineModule';
import ${resourceLower}Router from '@modules/${moduleName}/infra/https/routes/${resourceLower}Router';

// Manifesto: é o que instala o módulo. O loader importa container/index.ts por
// convenção, então DI não se declara aqui. O router gerado já aplica
// defineRoutes centraliza a autenticação, autorização declarada no controller
// e os middlewares específicos de cada rota. Ver docs/MODULES.md.
export default defineModule({
  name: '${moduleName}',
  context: '${context}',
  routes: [{ path: '/${moduleName}', router: ${resourceLower}Router }],
});
`,
};

interface IGenerateOptions {
  dryRun: boolean;
  force: boolean;
  auth: boolean;
  cache: boolean;
  audit: boolean;
  softDelete: boolean;
  context: string;
}

/** Usado quando `--context=` não é informado: falha no boot de propósito. */
const CONTEXT_PLACEHOLDER = 'TODO-defina-o-contexto';

interface IGeneratedFile {
  path: string;
  content: string;
}

function parseOptions(args: string[]): IGenerateOptions {
  const contextArg = args.find(arg => arg.startsWith('--context='));

  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    auth: !args.includes('--public') && !args.includes('--no-auth'),
    cache: args.includes('--cache'),
    audit: !args.includes('--no-audit'),
    softDelete: args.includes('--soft-delete'),
    context: contextArg
      ? contextArg.slice('--context='.length)
      : CONTEXT_PLACEHOLDER,
  };
}

function validateModuleName(moduleName: string): void {
  validateKebabCase(moduleName, 'O nome do módulo');
}

function ensureInsideWorkspace(targetPath: string): void {
  resolveWorkspacePath(process.cwd(), path.relative(process.cwd(), targetPath));
}

function printPlan(
  moduleName: string,
  folders: string[],
  files: IGeneratedFile[],
  basePath: string,
  options: IGenerateOptions,
  updatesBoundaries: boolean,
): void {
  console.log(options.dryRun ? '\n🔎 Dry-run ativo' : '\n🧭 Plano de geração');
  console.log(`📦 Módulo: ${moduleName}`);
  console.log(`📁 Base: ${path.relative(process.cwd(), basePath)}`);
  console.log(`⚙️  Force: ${options.force ? 'sim' : 'não'}`);
  console.log('\nOpções:');
  console.log(`  - Auth: ${options.auth ? 'protegido por verifyToken' : 'público'}`);
  console.log(`  - Cache: ${options.cache ? 'habilitado nas leituras' : 'desabilitado'}`);
  console.log(`  - Audit: ${options.audit ? 'auditoria global aplicável' : 'não intencional'}`);
  console.log(`  - Soft delete: ${options.softDelete ? 'habilitado' : 'desabilitado'}`);

  console.log('\nPastas:');
  folders.forEach(folder => {
    console.log(`  - ${path.join(path.relative(process.cwd(), basePath), folder)}`);
  });

  console.log('\nArquivos:');
  files.forEach(file => {
    const filePath = path.join(path.relative(process.cwd(), basePath), file.path);
    console.log(`  - ${filePath}`);
  });

  console.log('\nInstalação:');
  console.log(
    `  - manifesto ${moduleName}/module.ts (contexto: ${options.context})`,
  );
  console.log('  - nenhum arquivo de shared/ é alterado');
  if (updatesBoundaries) {
    console.log(`  - boundaries.config.json registra ${moduleName} em ${options.context}`);
  }
}

function assertCanWrite(
  basePath: string,
  files: IGeneratedFile[],
  options: IGenerateOptions,
): void {
  if (options.force) return;

  const conflicts: string[] = [];
  if (fs.existsSync(basePath) && fs.readdirSync(basePath).length > 0) {
    conflicts.push(path.relative(process.cwd(), basePath));
  }

  files.forEach(file => {
    const filePath = path.join(basePath, file.path);
    if (fs.existsSync(filePath)) {
      conflicts.push(path.relative(process.cwd(), filePath));
    }
  });

  if (conflicts.length > 0) {
    if (options.dryRun) {
      console.log('\n⚠️  Conflitos detectados no dry-run:');
      conflicts.forEach(conflict => console.log(`  - ${conflict}`));
      return;
    }

    console.error('\n❌ Geração bloqueada para evitar sobrescrita.');
    console.error('Arquivos ou pastas já existentes:');
    conflicts.forEach(conflict => console.error(`  - ${conflict}`));
    console.error('\nUse --force para sobrescrever ou --dry-run para inspecionar.');
    process.exit(1);
  }
}

function writeGeneratedFile(
  basePath: string,
  file: IGeneratedFile,
  options: IGenerateOptions,
): void {
  const filePath = path.join(basePath, file.path);
  ensureInsideWorkspace(filePath);

  if (options.dryRun) return;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, file.content);
  console.log(`✅ Criado arquivo: ${file.path}`);
}

// Função principal
function generateModule(moduleName: string, options: IGenerateOptions) {
  validateModuleName(moduleName);
  const boundariesContent =
    options.context === CONTEXT_PLACEHOLDER
      ? undefined
      : addModuleToContext(process.cwd(), moduleName, options.context);

  const resourceName = toPascalCase(moduleName);
  const resourceLower = toCamelCase(moduleName);
  const basePath = path.join(process.cwd(), 'src', 'modules', moduleName);
  ensureInsideWorkspace(basePath);

  console.log(`\n🚀 Gerando módulo: ${moduleName}`);
  console.log(`📦 Resource: ${resourceName}\n`);

  // Criar estrutura de pastas
  const folders = [
    'container',
    'dto',
    'infra/https/controllers',
    'infra/https/openapi',
    'infra/https/routes',
    'infra/https/schemas',
    'infra/mongo/models',
    'infra/mongo/repositories',
    'permissions',
    'repositories',
    `services/${resourceLower}`,
  ];

  // Criar arquivos
  const files: IGeneratedFile[] = [
    {
      path: `dto/I${resourceName}DTO.ts`,
      content: templates.dto(resourceName),
    },
    {
      path: `repositories/I${resourceName}Repository.ts`,
      content: templates.repositoryInterface(resourceName, moduleName, options),
    },
    {
      path: `infra/mongo/repositories/${resourceName}Repository.ts`,
      content: templates.repositoryImpl(resourceName, moduleName, options),
    },
    {
      path: `infra/mongo/models/${resourceName}.ts`,
      content: templates.model(resourceName, moduleName, options),
    },
    {
      path: `infra/https/schemas/${resourceName}Schemas.ts`,
      content: templates.schemas(resourceName),
    },
    {
      path: `infra/https/openapi/${resourceName}OpenApi.ts`,
      content: templates.openapi(resourceName, moduleName, options),
    },
    {
      path: `services/${resourceLower}/CreateService.ts`,
      content: templates.createService(resourceName, moduleName),
    },
    {
      path: `services/${resourceLower}/UpdateService.ts`,
      content: templates.updateService(resourceName, moduleName),
    },
    {
      path: `services/${resourceLower}/DeleteService.ts`,
      content: templates.deleteService(resourceName, moduleName, options),
    },
    {
      path: `services/${resourceLower}/FindAllService.ts`,
      content: templates.findAllService(resourceName, moduleName),
    },
    {
      path: `services/${resourceLower}/FindByIdService.ts`,
      content: templates.findByIdService(resourceName, moduleName),
    },
    {
      path: `infra/https/controllers/${resourceName}Controller.ts`,
      content: templates.controller(resourceName, moduleName, resourceLower, options),
    },
    {
      path: `infra/https/routes/${resourceLower}Router.ts`,
      content: templates.routes(resourceName, moduleName, options),
    },
    {
      path: 'container/index.ts',
      content: templates.container(resourceName, moduleName),
    },
    {
      path: 'module.ts',
      content: templates.moduleManifest(
        moduleName,
        resourceLower,
        options.context,
      ),
    },
    {
      path: 'permissions/ACL.ts',
      content: createAclContent(resourceLower, moduleName),
    },
    {
      path: `infra/https/controllers/${resourceName}Controller.test.ts`,
      content: `import 'reflect-metadata';\n\nimport assert from 'node:assert/strict';\nimport test from 'node:test';\nimport { ACL } from '@modules/${moduleName}/permissions/ACL';\nimport ${resourceName}Controller from './${resourceName}Controller';\nimport { getRequiredPermissions } from '@shared/permissions/RequiredPermission';\n\ntest('${resourceName}Controller declares ACL permissions', () => {\n  const controller = new ${resourceName}Controller();\n  assert.deepEqual(getRequiredPermissions(controller.create), ${options.auth ? '[ACL.' + resourceLower + '.create]' : '[]'});\n  assert.deepEqual(getRequiredPermissions(controller.findAll), ${options.auth ? '[ACL.' + resourceLower + '.read]' : '[]'});\n});\n`,
    },
  ];

  printPlan(moduleName, folders, files, basePath, options, Boolean(boundariesContent));
  assertCanWrite(basePath, files, options);

  if (options.dryRun) {
    console.log('\n✅ Dry-run concluído. Nenhum arquivo foi alterado.');
    return;
  }

  folders.forEach(folder => {
    const folderPath = path.join(basePath, folder);
    ensureInsideWorkspace(folderPath);
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`✅ Criada pasta: ${folder}`);
  });

  files.forEach(file => {
    writeGeneratedFile(basePath, file, options);
  });

  if (boundariesContent) {
    fs.writeFileSync(
      resolveWorkspacePath(process.cwd(), 'boundaries.config.json'),
      boundariesContent,
      'utf8',
    );
    console.log('✅ Atualizado: boundaries.config.json');
  }

  // Nada de composition root: o módulo se instala pelo próprio module.ts.

  console.log(`\n✨ Módulo "${moduleName}" criado com sucesso!`);
  console.log(`\n📝 Próximos passos:`);
  console.log(
    `   1. Ajuste os campos do DTO em: src/modules/${moduleName}/dto/I${resourceName}DTO.ts`,
  );
  console.log(
    `   2. Ajuste o schema em: src/modules/${moduleName}/infra/mongo/models/${resourceName}.ts`,
  );
  if (options.context === CONTEXT_PLACEHOLDER) {
    console.log(
      `   3. Defina o contexto em: src/modules/${moduleName}/module.ts (hoje: ${CONTEXT_PLACEHOLDER})`,
    );
  }
  console.log(
    `   ${options.context === CONTEXT_PLACEHOLDER ? '4' : '3'}. Registre "${moduleName}" em boundaries.config.json`,
  );
  console.log(
    `   ${options.context === CONTEXT_PLACEHOLDER ? '5' : '4'}. Compile e teste: npm run build && npm run dev`,
  );
  console.log(
    `\n🔗 Rotas disponíveis em: https://localhost:PORT/api/${moduleName}`,
  );
}

// Execução
function main(): void {
  const [moduleName, ...rawOptions] = process.argv.slice(2);
  const options = parseOptions(rawOptions);

  if (!moduleName || moduleName === '--help' || moduleName === '-h') {
    console.error('❌ Nome do módulo não fornecido.');
    console.log(
      '📖 Uso: npm run generate:module -- <nome-do-modulo> [--context=<contexto>] [--dry-run] [--force] [--public] [--cache] [--soft-delete]',
    );
    console.log('📖 Exemplo: npm run generate:module -- products --context=cadastros');
    process.exitCode = 1;
    return;
  }

  try {
    generateModule(moduleName, options);
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
