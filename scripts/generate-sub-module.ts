#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  addAclResource,
  addRepositoryToContainer,
  addRouteToModuleManifest,
  getModuleContext,
  getModuleManifestContext,
  readBoundariesConfig,
  resolveWorkspacePath,
  validateKebabCase,
} from './shared/module-generation';

interface IOptions {
  dryRun: boolean;
  force: boolean;
}

interface IGeneratedFile {
  path: string;
  content: string;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toCamelCase(value: string): string {
  return value
    .split('-')
    .map((part, index) => (index === 0 ? part : capitalize(part)))
    .join('');
}

function toPascalCase(value: string): string {
  return value.split('-').map(capitalize).join('');
}

function parseOptions(args: string[]): IOptions {
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  };
}

function createTemplates(
  parentModule: string,
  submoduleName: string,
  resourceName: string,
  resourceKey: string,
  resourcePath: string,
) {
  const resourceImport = `@modules/${parentModule}/${resourcePath}`;

  return {
    dto: `import { Document } from 'mongoose';

export interface I${resourceName}DTO {
  name: string;
  description?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface I${resourceName}Document extends I${resourceName}DTO, Document {}
`,
    repositoryInterface: `import { I${resourceName}DTO, I${resourceName}Document } from '${resourceImport}/dto/I${resourceName}DTO';
import IBaseRepository from '@shared/infra/database/mongo/IBaseRepository';

export default interface I${resourceName}Repository
  extends IBaseRepository<I${resourceName}DTO, I${resourceName}Document> {}
`,
    model: `import { I${resourceName}Document } from '${resourceImport}/dto/I${resourceName}DTO';
import mongoose, { Schema } from 'mongoose';

const schema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    created_by: { type: String },
    updated_by: { type: String },
  },
  { timestamps: true },
);

export const ${resourceName} = mongoose.model<I${resourceName}Document>(
  '${resourceName}',
  schema,
);
`,
    repository: `import { Model } from 'mongoose';
import { ${resourceName} } from '${resourceImport}/infra/mongo/models/${resourceName}';
import { I${resourceName}DTO, I${resourceName}Document } from '${resourceImport}/dto/I${resourceName}DTO';
import I${resourceName}Repository from '${resourceImport}/repositories/I${resourceName}Repository';
import { BaseMongoRepository } from '@shared/infra/database/mongo/BaseMongoRepository';

export default class ${resourceName}Repository
  extends BaseMongoRepository<I${resourceName}DTO, I${resourceName}Document>
  implements I${resourceName}Repository
{
  protected readonly model: Model<I${resourceName}Document> = ${resourceName};
  protected readonly modelPopulated = [];
}
`,
    schemas: `import { IRequestValidationSchemas } from '@shared/middlewares/validateRequest';

const mongoIdPattern = /^[a-f\\d]{24}$/i;
const positiveIntegerPattern = /^\\d+$/;

export const create${resourceName}Schema: IRequestValidationSchemas = {
  body: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', maxLength: 500 },
  },
};

export const update${resourceName}Schema: IRequestValidationSchemas = {
  params: { id: { required: true, type: 'string', pattern: mongoIdPattern } },
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
    search: { type: 'string', maxLength: 120 },
  },
};

export const id${resourceName}Schema: IRequestValidationSchemas = {
  params: { id: { required: true, type: 'string', pattern: mongoIdPattern } },
};
`,
    services: {
      create: `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '${resourceImport}/repositories/I${resourceName}Repository';
import { I${resourceName}DTO, I${resourceName}Document } from '${resourceImport}/dto/I${resourceName}DTO';
import { IServiceResponse } from '@shared/types/global';

@injectable()
export default class CreateService {
  constructor(@inject('${resourceName}Repository') private repository: I${resourceName}Repository) {}

  public async execute(data: I${resourceName}DTO, userEmail?: string): Promise<IServiceResponse<I${resourceName}Document>> {
    const created = await this.repository.create({ ...data, created_by: userEmail });
    return { success: true, message: '${resourceName} criado com sucesso!', data: created };
  }
}
`,
      update: `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '${resourceImport}/repositories/I${resourceName}Repository';
import { I${resourceName}DTO, I${resourceName}Document } from '${resourceImport}/dto/I${resourceName}DTO';
import { IServiceResponse } from '@shared/types/global';
import { NotFoundError } from '@shared/errors/AppError';

@injectable()
export default class UpdateService {
  constructor(@inject('${resourceName}Repository') private repository: I${resourceName}Repository) {}

  public async execute(id: string, data: Partial<I${resourceName}DTO>, userEmail?: string): Promise<IServiceResponse<I${resourceName}Document>> {
    if (!(await this.repository.findById(id))) throw new NotFoundError({ message: '${resourceName} não encontrado' });
    const updated = await this.repository.update(id, { ...data, updated_by: userEmail });
    return { success: true, message: '${resourceName} atualizado com sucesso!', data: updated! };
  }
}
`,
      delete: `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '${resourceImport}/repositories/I${resourceName}Repository';
import { IServiceResponse } from '@shared/types/global';
import { NotFoundError } from '@shared/errors/AppError';

@injectable()
export default class DeleteService {
  constructor(@inject('${resourceName}Repository') private repository: I${resourceName}Repository) {}

  public async execute(id: string): Promise<IServiceResponse<{ id: string }>> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError({ message: '${resourceName} não encontrado' });
    return { success: true, message: '${resourceName} deletado com sucesso!', data: { id: deleted.id } };
  }
}
`,
      findAll: `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '${resourceImport}/repositories/I${resourceName}Repository';
import { applyPaginationParams, buildPaginatedResult } from '@shared/utils/pagination';
import { applySearchParam } from '@shared/utils/search';

@injectable()
export default class FindAllService {
  constructor(@inject('${resourceName}Repository') private repository: I${resourceName}Repository) {}

  public async execute(query: Record<string, any>) {
    let params: Record<string, any> = {};
    params = applySearchParam(query, params, { textFields: ['name', 'description'] });
    params = applyPaginationParams(query, params);
    const [total, data] = await Promise.all([this.repository.total(params), this.repository.findAll(params)]);
    return buildPaginatedResult(data, total, query);
  }
}
`,
      findById: `import { injectable, inject } from 'tsyringe';
import I${resourceName}Repository from '${resourceImport}/repositories/I${resourceName}Repository';
import { NotFoundError } from '@shared/errors/AppError';

@injectable()
export default class FindByIdService {
  constructor(@inject('${resourceName}Repository') private repository: I${resourceName}Repository) {}

  public async execute(id: string) {
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundError({ message: '${resourceName} não encontrado' });
    return record;
  }
}
`,
    },
    controller: `import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { RequiredPermission } from '@shared/permissions/RequiredPermission';
import { ACL } from '@modules/${parentModule}/permissions/ACL';
import CreateService from '${resourceImport}/services/${resourceKey}/CreateService';
import FindAllService from '${resourceImport}/services/${resourceKey}/FindAllService';
import FindByIdService from '${resourceImport}/services/${resourceKey}/FindByIdService';
import UpdateService from '${resourceImport}/services/${resourceKey}/UpdateService';
import DeleteService from '${resourceImport}/services/${resourceKey}/DeleteService';

export default class ${resourceName}Controller {
  @RequiredPermission(ACL.${resourceKey}.create)
  public async create(req: Request, res: Response): Promise<Response> {
    return res.json(await container.resolve(CreateService).execute(req.body, req.userEmail));
  }

  @RequiredPermission(ACL.${resourceKey}.read)
  public async findAll(req: Request, res: Response): Promise<Response> {
    return res.json(await container.resolve(FindAllService).execute(req.query));
  }

  @RequiredPermission(ACL.${resourceKey}.read)
  public async findById(req: Request, res: Response): Promise<Response> {
    return res.json(await container.resolve(FindByIdService).execute(req.params.id));
  }

  @RequiredPermission(ACL.${resourceKey}.update)
  public async update(req: Request, res: Response): Promise<Response> {
    return res.json(await container.resolve(UpdateService).execute(req.params.id, req.body, req.userEmail));
  }

  @RequiredPermission(ACL.${resourceKey}.delete)
  public async delete(req: Request, res: Response): Promise<Response> {
    return res.json(await container.resolve(DeleteService).execute(req.params.id));
  }
}
`,
    routes: `import ${resourceName}Controller from '${resourceImport}/infra/https/controllers/${resourceName}Controller';
import {
  create${resourceName}Schema,
  findAll${resourceName}Schema,
  id${resourceName}Schema,
  update${resourceName}Schema,
} from '${resourceImport}/infra/https/schemas/${resourceName}Schemas';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
import { verifyToken } from '@shared/middlewares/authMiddleware';
import { validateRequest } from '@shared/middlewares/validateRequest';

const controller = new ${resourceName}Controller();

export default defineRoutes({
  authentication: [verifyToken],
  beforeMiddleware: [(_req, res, next) => {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept');
    next();
  }],
  routes: [
    { method: 'POST', path: '/', middleware: [validateRequest(create${resourceName}Schema)], handler: controller.create },
    { method: 'GET', path: '/', middleware: [validateRequest(findAll${resourceName}Schema)], handler: controller.findAll },
    { method: 'GET', path: '/:id', middleware: [validateRequest(id${resourceName}Schema)], handler: controller.findById },
    { method: 'PUT', path: '/:id', middleware: [validateRequest(update${resourceName}Schema)], handler: controller.update },
    { method: 'DELETE', path: '/:id', middleware: [validateRequest(id${resourceName}Schema)], handler: controller.delete },
  ],
});
`,
    openapi: `export const ${resourceKey}OpenApiPaths = {
  '/${parentModule}/${submoduleName}': {
    get: { tags: ['${resourceName}'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Lista retornada' }, '401': { description: 'Não autenticado' }, '403': { description: 'Permissão insuficiente' } } },
    post: { tags: ['${resourceName}'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'Registro criado' }, '401': { description: 'Não autenticado' }, '403': { description: 'Permissão insuficiente' } } },
  },
};
`,
  };
}

function createGeneratedFiles(
  templates: ReturnType<typeof createTemplates>,
  parentModule: string,
  resourceName: string,
  resourceKey: string,
): IGeneratedFile[] {
  return [
    { path: `dto/I${resourceName}DTO.ts`, content: templates.dto },
    { path: `repositories/I${resourceName}Repository.ts`, content: templates.repositoryInterface },
    { path: `infra/mongo/models/${resourceName}.ts`, content: templates.model },
    { path: `infra/mongo/repositories/${resourceName}Repository.ts`, content: templates.repository },
    { path: `infra/https/schemas/${resourceName}Schemas.ts`, content: templates.schemas },
    { path: `infra/https/openapi/${resourceName}OpenApi.ts`, content: templates.openapi },
    { path: `services/${resourceKey}/CreateService.ts`, content: templates.services.create },
    { path: `services/${resourceKey}/UpdateService.ts`, content: templates.services.update },
    { path: `services/${resourceKey}/DeleteService.ts`, content: templates.services.delete },
    { path: `services/${resourceKey}/FindAllService.ts`, content: templates.services.findAll },
    { path: `services/${resourceKey}/FindByIdService.ts`, content: templates.services.findById },
    { path: `infra/https/controllers/${resourceName}Controller.ts`, content: templates.controller },
    { path: `infra/https/routes/${resourceKey}Router.ts`, content: templates.routes },
    {
      path: `infra/https/controllers/${resourceName}Controller.test.ts`,
      content: `import 'reflect-metadata';\n\nimport assert from 'node:assert/strict';\nimport test from 'node:test';\nimport { ACL } from '@modules/${parentModule}/permissions/ACL';\nimport ${resourceName}Controller from './${resourceName}Controller';\nimport { getRequiredPermissions } from '@shared/permissions/RequiredPermission';\n\ntest('${resourceName}Controller declares ACL permissions', () => {\n  const controller = new ${resourceName}Controller();\n  assert.deepEqual(getRequiredPermissions(controller.create), [ACL.${resourceKey}.create]);\n  assert.deepEqual(getRequiredPermissions(controller.findAll), [ACL.${resourceKey}.read]);\n});\n`,
    },
  ];
}

function writeFiles(
  root: string,
  basePath: string,
  files: IGeneratedFile[],
  options: IOptions,
): void {
  const conflicts = files
    .map(file => resolveWorkspacePath(basePath, file.path))
    .filter(filePath => fs.existsSync(filePath));

  if (conflicts.length > 0 && !options.force) {
    throw new Error(
      `Geração bloqueada; arquivos já existem:\n${conflicts
        .map(filePath => `- ${path.relative(root, filePath)}`)
        .join('\n')}\nUse --force para substituir os arquivos gerados.`,
    );
  }

  if (options.dryRun) return;

  for (const file of files) {
    const filePath = resolveWorkspacePath(basePath, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf8');
  }
}

export function generateSubModule(
  parentModule: string,
  submoduleName: string,
  options: IOptions = { dryRun: false, force: false },
  root = process.cwd(),
): void {
  validateKebabCase(submoduleName, 'O nome do submódulo');
  if (!/^[a-z][A-Za-z0-9-]*$/.test(parentModule)) {
    throw new Error('O nome do módulo pai é inválido.');
  }

  const boundaries = readBoundariesConfig(root);
  getModuleContext(boundaries, parentModule);
  const parentPath = resolveWorkspacePath(root, path.join('src', 'modules', parentModule));
  if (!fs.existsSync(parentPath)) {
    throw new Error(`Módulo pai "${parentModule}" não existe em src/modules/.`);
  }

  const manifestPath = path.join(parentPath, 'module.ts');
  const containerPath = path.join(parentPath, 'container', 'index.ts');
  const aclPath = path.join(parentPath, 'permissions', 'ACL.ts');
  for (const [filePath, label] of [
    [manifestPath, 'module.ts'],
    [containerPath, 'container/index.ts'],
    [aclPath, 'permissions/ACL.ts'],
  ]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`O módulo pai precisa declarar ${label}.`);
    }
  }

  const inheritedContext = getModuleContext(boundaries, parentModule);
  const parentManifest = fs.readFileSync(manifestPath, 'utf8');
  if (getModuleManifestContext(parentManifest) !== inheritedContext) {
    throw new Error(
      `O contexto de module.ts deve corresponder ao contexto "${inheritedContext}" de boundaries.config.json.`,
    );
  }

  const resourceName = toPascalCase(submoduleName);
  const resourceKey = toCamelCase(submoduleName);
  const submodulePath = path.join('submodules', submoduleName);
  const targetPath = resolveWorkspacePath(parentPath, submodulePath);
  const routerName = `${resourceKey}Router`;
  const routePath = `/${parentModule}/${submoduleName}`;
  const modulePathForImports = submodulePath.split(path.sep).join('/');
  const routerImport = `@modules/${parentModule}/${modulePathForImports}/infra/https/routes/${resourceKey}Router`;
  const resourceImportPath = modulePathForImports;
  const templates = createTemplates(
    parentModule,
    submoduleName,
    resourceName,
    resourceKey,
    resourceImportPath,
  );
  const files = createGeneratedFiles(templates, parentModule, resourceName, resourceKey);
  const updatedManifest = addRouteToModuleManifest(
    parentManifest,
    routePath,
    routerName,
    routerImport,
  );
  const updatedContainer = addRepositoryToContainer(
    fs.readFileSync(containerPath, 'utf8'),
    parentModule,
    resourceImportPath,
    resourceName,
  );
  const updatedAcl = addAclResource(
    fs.readFileSync(aclPath, 'utf8'),
    resourceKey,
    submoduleName,
  );

  console.log(`\n🚀 Gerando submódulo ${parentModule}/${submoduleName}`);
  console.log(`📁 ${path.relative(root, targetPath)}`);
  console.log(`🔗 Rota: /api${routePath}`);
  console.log(`🔐 Contexto herdado: ${inheritedContext}`);
  console.log('\nArquivos:');
  files.forEach(file => console.log(`  - ${path.join(path.relative(root, targetPath), file.path)}`));
  console.log(`  - ${path.relative(root, manifestPath)} (rota do módulo pai)`);
  console.log(`  - ${path.relative(root, containerPath)} (DI do módulo pai)`);
  console.log(`  - ${path.relative(root, aclPath)} (ACL do módulo pai)`);

  if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0 && !options.force) {
    throw new Error(
      `O diretório do submódulo já existe: ${path.relative(root, targetPath)}. Use --force para sobrescrever os arquivos gerados.`,
    );
  }

  if (options.dryRun) {
    console.log('\n✅ Dry-run concluído. Nenhum arquivo foi alterado.');
    return;
  }

  writeFiles(root, targetPath, files, options);
  fs.writeFileSync(manifestPath, updatedManifest, 'utf8');
  fs.writeFileSync(containerPath, updatedContainer, 'utf8');
  fs.writeFileSync(aclPath, updatedAcl, 'utf8');
  console.log('\n✅ Submódulo criado; o manifesto, DI e ACL do pai foram atualizados.');
}

function main(): void {
  const [parentModule, submoduleName, ...args] = process.argv.slice(2);
  if (!parentModule || !submoduleName || parentModule === '--help') {
    console.error('Uso: npm run generate:sub-module -- <modulo-pai> <sub-modulo> [--dry-run] [--force]');
    process.exitCode = 1;
    return;
  }

  try {
    generateSubModule(parentModule, submoduleName, parseOptions(args));
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
