import * as fs from 'fs';
import * as path from 'path';
import { Router } from 'express';

import { IModuleManifest } from '@shared/modules/IModuleManifest';

/**
 * Loader de módulos.
 *
 * Substitui os dois composition roots que cresciam a cada módulo novo
 * (`shared/container/index.ts` e `routes/index.ts` + `routes/domains/*`). Cada
 * módulo declara o que é em `src/modules/<nome>/module.ts`; aqui a gente
 * descobre, seleciona, valida dependências e monta.
 *
 * Seleção, em ordem de precedência:
 *   1. `MODULES` no ambiente — lista separada por vírgula, ou `*`.
 *   2. `modules.json` na raiz do repo — `{ "modules": ["a","b"] }` ou `"*"`.
 *   3. Nada declarado: todos os módulos presentes em disco.
 *
 * O padrão é "todos" de propósito: quem não configura nada continua com o
 * comportamento de antes.
 */

/** `src/modules` em dev (ts-node) e `dist/modules` em produção. */
const MODULES_DIR = path.resolve(__dirname, '..', '..', 'modules');

/** Raiz do repo: `src/` e `dist/` estão ambos um nível abaixo dela. */
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');

const SELECTION_FILE = path.join(ROOT_DIR, 'modules.json');

const ALL = '*';

export class ModuleLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModuleLoadError';
  }
}

let cache: IModuleManifest[] | null = null;

/** Resolve `<base>.ts` ou `<base>.js`, conforme rodando em src/ ou dist/. */
function resolveSourceFile(basePath: string): string | null {
  for (const extension of ['.ts', '.js']) {
    const candidate = `${basePath}${extension}`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function discoverModuleDirs(): string[] {
  if (!fs.existsSync(MODULES_DIR)) return [];

  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function parseSelectionList(raw: string): string[] | typeof ALL {
  const trimmed = raw.trim();
  if (trimmed === ALL || trimmed === '') return ALL;

  return trimmed
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);
}

function readSelectionFile(): string[] | typeof ALL | null {
  if (!fs.existsSync(SELECTION_FILE)) return null;

  const parsed = JSON.parse(fs.readFileSync(SELECTION_FILE, 'utf-8')) as {
    modules?: string[] | string;
  };

  const declared = parsed.modules;
  if (declared === undefined) return null;
  if (typeof declared === 'string') return parseSelectionList(declared);
  return declared;
}

/** Nomes de módulo a instalar, já validados contra o que existe em disco. */
export function resolveSelection(available: string[]): string[] {
  const fromEnv = process.env.MODULES;
  const selection =
    fromEnv !== undefined ? parseSelectionList(fromEnv) : readSelectionFile();

  if (selection === null || selection === ALL) return [...available];

  const unknown = selection.filter(name => !available.includes(name));
  if (unknown.length > 0) {
    throw new ModuleLoadError(
      `Módulo(s) selecionado(s) que não existem em src/modules: ${unknown.join(', ')}.\n` +
        `Disponíveis: ${available.join(', ')}`,
    );
  }

  return [...new Set(selection)].sort();
}

function requireManifest(moduleName: string): IModuleManifest {
  const manifestPath = resolveSourceFile(
    path.join(MODULES_DIR, moduleName, 'module'),
  );

  if (!manifestPath) {
    throw new ModuleLoadError(
      `Módulo "${moduleName}" não tem manifesto.\n` +
        `Crie src/modules/${moduleName}/module.ts exportando defineModule({ ... }).\n` +
        'Ver docs/MODULES.md.',
    );
  }

  const loaded = require(manifestPath);
  const manifest = (loaded.default ?? loaded) as IModuleManifest;

  if (!manifest || typeof manifest.name !== 'string') {
    throw new ModuleLoadError(
      `Manifesto inválido em ${manifestPath}: exporte defineModule({ ... }) como default.`,
    );
  }

  if (manifest.name !== moduleName) {
    throw new ModuleLoadError(
      `Manifesto de "${moduleName}" declara name="${manifest.name}". ` +
        'O nome precisa ser igual ao do diretório.',
    );
  }

  return manifest;
}

/**
 * Importa `container/index` do módulo, se existir.
 *
 * Roda antes de qualquer manifesto porque os containers registram no tsyringe
 * por efeito colateral de import, e os routers dos manifestos instanciam
 * controllers. Mantém a ordem que `shared/container/index.ts` tinha: primeiro
 * todo o DI, depois as rotas.
 */
function registerModuleContainer(moduleName: string): void {
  const containerPath = resolveSourceFile(
    path.join(MODULES_DIR, moduleName, 'container', 'index'),
  );

  if (containerPath) require(containerPath);
}

function validateDependencies(
  manifests: IModuleManifest[],
  selected: string[],
): void {
  const installed = new Set(selected);
  const problems: string[] = [];

  for (const manifest of manifests) {
    const missing = (manifest.dependsOn ?? []).filter(
      dependency => !installed.has(dependency),
    );

    if (missing.length > 0) {
      problems.push(
        `  - "${manifest.name}" depende de: ${missing.sort().join(', ')}`,
      );
    }
  }

  if (problems.length > 0) {
    throw new ModuleLoadError(
      `Módulos instalados dependem de módulos que não foram instalados:\n${problems.join('\n')}\n` +
        'Adicione-os à seleção (modules.json ou MODULES=) ou remova quem depende deles.',
    );
  }
}

/**
 * Dependências primeiro, ordem estável.
 *
 * Tolera ciclo de propósito: o núcleo de estoque/hospedagem/financeiro tem um
 * (`caixa ↔ colaborador ↔ entrada ↔ estadia ↔ item ↔ saida`) e quebrá-lo é a
 * Fase 4. Como o tsyringe resolve sob demanda e os prefixos de rota são
 * distintos, a ordem não muda comportamento — só precisa ser determinística.
 */
function orderByDependencies(manifests: IModuleManifest[]): IModuleManifest[] {
  const byName = new Map(manifests.map(manifest => [manifest.name, manifest]));
  const ordered: IModuleManifest[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  const visit = (name: string): void => {
    if (done.has(name) || visiting.has(name)) return;
    visiting.add(name);

    const manifest = byName.get(name);
    for (const dependency of [...(manifest?.dependsOn ?? [])].sort()) {
      if (byName.has(dependency)) visit(dependency);
    }

    visiting.delete(name);
    done.add(name);
    if (manifest) ordered.push(manifest);
  };

  [...byName.keys()].sort().forEach(visit);
  return ordered;
}

/**
 * Descobre, seleciona e carrega os módulos. Idempotente: o resultado fica em
 * cache para que container e rotas compartilhem a mesma instalação.
 */
export function loadModules(): IModuleManifest[] {
  if (cache) return cache;

  try {
    const available = discoverModuleDirs();
    const selected = resolveSelection(available);

    selected.forEach(registerModuleContainer);

    const manifests = selected.map(requireManifest);
    validateDependencies(manifests, selected);

    cache = orderByDependencies(manifests);
    return cache;
  } catch (error) {
    // O logger tem `handleExceptions: true` num transport de arquivo, então uma
    // exceção não tratada aqui sairia calada no console e iria só para
    // logs/infos/. Erro de instalação de módulo precisa aparecer no boot.
    if (error instanceof ModuleLoadError) {
      console.error(`\n[modules] ${error.message}\n`);
    }
    throw error;
  }
}

/** Só para teste: força a próxima chamada a redescobrir. */
export function resetModulesCache(): void {
  cache = null;
}

/** Router com todas as montagens declaradas pelos módulos instalados. */
export function buildModulesRouter(): Router {
  const routes = Router();

  for (const manifest of loadModules()) {
    for (const route of manifest.routes ?? []) {
      if (route.middlewares && route.middlewares.length > 0) {
        routes.use(route.path, route.middlewares, route.router);
      } else {
        routes.use(route.path, route.router);
      }
    }
  }

  return routes;
}

/** Inventário do que está instalado. Usado por `yarn modules:list` e testes. */
export function describeModules(): Array<{
  name: string;
  context: string;
  description?: string;
  dependsOn: string[];
  paths: string[];
}> {
  return loadModules().map(manifest => ({
    name: manifest.name,
    context: manifest.context,
    description: manifest.description,
    dependsOn: manifest.dependsOn ?? [],
    paths: (manifest.routes ?? []).map(route => route.path),
  }));
}
