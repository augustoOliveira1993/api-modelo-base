import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

export interface IBoundariesConfig {
  contexts: Record<
    string,
    {
      description?: string;
      modules: string[];
    }
  >;
}

export function validateKebabCase(value: string, label: string): void {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${label} deve estar em kebab-case.`);
  }
}

export function resolveWorkspacePath(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolvedPath);

  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Caminho fora do workspace: ${resolvedPath}`);
  }

  return resolvedPath;
}

export function readBoundariesConfig(root: string): IBoundariesConfig {
  const configPath = resolveWorkspacePath(root, 'boundaries.config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error('boundaries.config.json não foi encontrado no workspace.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    throw new Error('boundaries.config.json contém JSON inválido.');
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('contexts' in parsed) ||
    !parsed.contexts ||
    typeof parsed.contexts !== 'object'
  ) {
    throw new Error('boundaries.config.json deve declarar o objeto contexts.');
  }

  const contexts = parsed.contexts as Record<string, unknown>;
  for (const [name, context] of Object.entries(contexts)) {
    if (
      !context ||
      typeof context !== 'object' ||
      !('modules' in context) ||
      !Array.isArray(context.modules) ||
      context.modules.some(module => typeof module !== 'string')
    ) {
      throw new Error(`O contexto "${name}" deve declarar modules como array.`);
    }
  }

  return parsed as IBoundariesConfig;
}

export function getModuleContext(
  config: IBoundariesConfig,
  moduleName: string,
): string {
  const contexts = Object.entries(config.contexts)
    .filter(([, context]) => context.modules.includes(moduleName))
    .map(([name]) => name);

  if (contexts.length !== 1) {
    throw new Error(
      contexts.length === 0
        ? `O módulo pai "${moduleName}" não está registrado em boundaries.config.json.`
        : `O módulo "${moduleName}" está registrado em mais de um contexto.`,
    );
  }

  return contexts[0];
}

export function getModuleManifestContext(source: string): string {
  const file = ts.createSourceFile(
    'module.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const manifest = findModuleManifestObject(file);
  const contextProperty = manifest.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && propertyName(property.name) === 'context',
  );

  if (
    !contextProperty ||
    (!ts.isStringLiteral(contextProperty.initializer) &&
      !ts.isNoSubstitutionTemplateLiteral(contextProperty.initializer))
  ) {
    throw new Error('module.ts deve declarar context como texto literal.');
  }

  return contextProperty.initializer.text;
}

export function addModuleToContext(
  root: string,
  moduleName: string,
  contextName: string,
): string | undefined {
  const config = readBoundariesConfig(root);
  const targetContext = config.contexts[contextName];

  if (!targetContext) {
    throw new Error(
      `Contexto "${contextName}" não existe em boundaries.config.json.`,
    );
  }

  const currentContexts = Object.entries(config.contexts)
    .filter(([, context]) => context.modules.includes(moduleName))
    .map(([name]) => name);

  if (currentContexts.length > 1) {
    throw new Error(`O módulo "${moduleName}" está registrado em mais de um contexto.`);
  }
  const currentContext = currentContexts[0];

  if (currentContext && currentContext !== contextName) {
    throw new Error(
      `O módulo "${moduleName}" já pertence ao contexto "${currentContext}".`,
    );
  }

  if (currentContext === contextName) return undefined;

  targetContext.modules.push(moduleName);
  return `${JSON.stringify(config, null, 2)}\n`;
}

function getAclObject(source: string): ts.ObjectLiteralExpression {
  const file = ts.createSourceFile(
    'ACL.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let aclObject: ts.ObjectLiteralExpression | undefined;

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'ACL' &&
      node.initializer
    ) {
      let initializer = node.initializer;
      while (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)) {
        initializer = initializer.expression;
      }
      if (ts.isObjectLiteralExpression(initializer)) aclObject = initializer;
    }

    ts.forEachChild(node, visit);
  };
  visit(file);

  if (!aclObject) {
    throw new Error('permissions/ACL.ts precisa exportar const ACL como objeto.');
  }

  return aclObject;
}

function propertyName(node: ts.PropertyName | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return undefined;
}

export function createAclContent(resourceKey: string, permissionScope: string): string {
  return `export const ACL = {\n  ${resourceKey}: {\n    create: '${permissionScope}:create',\n    read: '${permissionScope}:read',\n    update: '${permissionScope}:update',\n    delete: '${permissionScope}:delete',\n  },\n} as const;\n\nexport default ACL;\n`;
}

export function addAclResource(
  source: string,
  resourceKey: string,
  permissionScope: string,
): string {
  const aclObject = getAclObject(source);
  if (
    aclObject.properties.some(
      property =>
        ts.isPropertyAssignment(property) &&
        propertyName(property.name) === resourceKey,
    )
  ) {
    throw new Error(`ACL já contém o recurso "${resourceKey}".`);
  }

  const closeBrace = aclObject.end - 1;
  const inner = source.slice(aclObject.getStart() + 1, closeBrace);
  const trimmedInner = inner.trimEnd();
  const trailingWhitespace = inner.slice(trimmedInner.length);
  const comma = trimmedInner.length > 0 && !trimmedInner.endsWith(',') ? ',' : '';
  const addition = `${comma}\n  ${resourceKey}: {\n    create: '${permissionScope}:create',\n    read: '${permissionScope}:read',\n    update: '${permissionScope}:update',\n    delete: '${permissionScope}:delete',\n  },${trailingWhitespace || '\n'}`;

  return `${source.slice(0, closeBrace)}${addition}${source.slice(closeBrace)}`;
}

function findModuleManifestObject(file: ts.SourceFile): ts.ObjectLiteralExpression {
  let manifestObject: ts.ObjectLiteralExpression | undefined;

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineModule' &&
      node.arguments.length > 0 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      manifestObject = node.arguments[0];
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  if (!manifestObject) {
    throw new Error('module.ts deve exportar defineModule({ ... }).');
  }

  return manifestObject;
}

export function addRouteToModuleManifest(
  source: string,
  routePath: string,
  routerName: string,
  routerImport: string,
): string {
  const file = ts.createSourceFile(
    'module.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const manifest = findModuleManifestObject(file);
  const routesProperty = manifest.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && propertyName(property.name) === 'routes',
  );

  if (!routesProperty || !ts.isArrayLiteralExpression(routesProperty.initializer)) {
    throw new Error('module.ts deve declarar routes como array para receber submódulos.');
  }

  for (const element of routesProperty.initializer.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const pathProperty = element.properties.find(
      (property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && propertyName(property.name) === 'path',
    );
    if (
      pathProperty &&
      (ts.isStringLiteral(pathProperty.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(pathProperty.initializer)) &&
      pathProperty.initializer.text === routePath
    ) {
      throw new Error(`module.ts já registra a rota "${routePath}".`);
    }
  }

  const imports = file.statements.filter(ts.isImportDeclaration);
  const existingImport = imports.some(statement => {
    const moduleText = statement.moduleSpecifier;
    return ts.isStringLiteral(moduleText) && moduleText.text === routerImport;
  });
  if (existingImport) {
    throw new Error(`module.ts já importa o router "${routerImport}".`);
  }

  const array = routesProperty.initializer;
  const closeBracket = array.end - 1;
  const inner = source.slice(array.getStart() + 1, closeBracket);
  const trimmedInner = inner.trimEnd();
  const trailingWhitespace = inner.slice(trimmedInner.length);
  const comma = trimmedInner.length > 0 && !trimmedInner.endsWith(',') ? ',' : '';
  const routeEntry = `{ path: '${routePath}', router: ${routerName} },`;
  const routeAddition = `${comma}\n    ${routeEntry}${trailingWhitespace || '\n'}`;
  let updated = `${source.slice(0, closeBracket)}${routeAddition}${source.slice(closeBracket)}`;

  const importText = `import ${routerName} from '${routerImport}';\n`;
  const lastImport = imports[imports.length - 1];
  if (lastImport) {
    updated = `${updated.slice(0, lastImport.end)}\n${importText}${updated.slice(lastImport.end)}`;
  } else {
    updated = `${importText}${updated}`;
  }

  return updated;
}

export function addRepositoryToContainer(
  source: string,
  moduleName: string,
  submodulePath: string,
  resourceName: string,
): string {
  if (source.includes(`'${resourceName}Repository'`)) {
    throw new Error(`container/index.ts já registra ${resourceName}Repository.`);
  }

  const importInterface = `import I${resourceName}Repository from '@modules/${moduleName}/${submodulePath}/repositories/I${resourceName}Repository';`;
  const importImplementation = `import ${resourceName}Repository from '@modules/${moduleName}/${submodulePath}/infra/mongo/repositories/${resourceName}Repository';`;
  const registration = `container.registerSingleton<I${resourceName}Repository>(\n  '${resourceName}Repository',\n  ${resourceName}Repository,\n);\n`;
  const importLines = [...source.matchAll(/^import .*;$/gm)];
  const lastImport = importLines[importLines.length - 1];

  if (!lastImport || lastImport.index === undefined) {
    throw new Error('container/index.ts deve conter imports para registro DI.');
  }

  const importEnd = lastImport.index + lastImport[0].length;
  return `${source.slice(0, importEnd)}\n${importInterface}\n${importImplementation}\n${source.slice(importEnd).trimEnd()}\n\n${registration}`;
}
