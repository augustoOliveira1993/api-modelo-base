#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

export type PresetName =
  | 'minimal'
  | 'enterprise'
  | 'realtime'
  | 'observability';

export interface ITemplatePreset {
  name: PresetName;
  description: string;
  notes: string[];
  overrides: Record<string, string>;
}

export const presets: Record<PresetName, ITemplatePreset> = {
  minimal: {
    name: 'minimal',
    description: 'API enxuta com Express, MongoDB, auth local, health e OpenAPI.',
    notes: [
      'Redis, Socket.IO, email e monitoramento detalhado ficam desabilitados.',
      'Use para CRUDs e APIs internas pequenas que nao precisam de recursos enterprise.',
    ],
    overrides: {
      FEATURE_METRICS: 'false',
      FEATURE_HEALTH_CHECK: 'true',
      FEATURE_OPENAPI: 'true',
      FEATURE_RATE_LIMIT: 'true',
      FEATURE_HELMET: 'true',
      FEATURE_MONGO_SANITIZE: 'true',
      FEATURE_CIRCUIT_BREAKER: 'false',
      FEATURE_REDIS_CACHE: 'false',
      FEATURE_ROUTE_MONITORING: 'false',
      FEATURE_SOCKET_MANAGER: 'false',
      FEATURE_EMAIL_NOTIFICATIONS: 'false',
    },
  },
  enterprise: {
    name: 'enterprise',
    description: 'API corporativa com Redis, auditoria, sessoes, AD e email habilitados.',
    notes: [
      'Configure AD_URL, DOMAIN_CONTROLLER e credenciais Azure antes de usar em producao.',
      'Indicado para backoffice, integracoes corporativas e autenticacao centralizada.',
    ],
    overrides: {
      FEATURE_METRICS: 'true',
      FEATURE_HEALTH_CHECK: 'true',
      FEATURE_OPENAPI: 'true',
      FEATURE_RATE_LIMIT: 'true',
      FEATURE_HELMET: 'true',
      FEATURE_MONGO_SANITIZE: 'true',
      FEATURE_CIRCUIT_BREAKER: 'true',
      FEATURE_REDIS_CACHE: 'true',
      FEATURE_ROUTE_MONITORING: 'true',
      FEATURE_SOCKET_MANAGER: 'false',
      FEATURE_EMAIL_NOTIFICATIONS: 'true',
    },
  },
  realtime: {
    name: 'realtime',
    description: 'API com Socket.IO, notificacoes em tempo real e Redis habilitados.',
    notes: [
      'Use quando notificacoes, eventos ou telas colaborativas forem parte central do produto.',
      'Configure CORS com a origem real do frontend antes de publicar.',
    ],
    overrides: {
      FEATURE_METRICS: 'true',
      FEATURE_HEALTH_CHECK: 'true',
      FEATURE_OPENAPI: 'true',
      FEATURE_RATE_LIMIT: 'true',
      FEATURE_HELMET: 'true',
      FEATURE_MONGO_SANITIZE: 'true',
      FEATURE_CIRCUIT_BREAKER: 'true',
      FEATURE_REDIS_CACHE: 'true',
      FEATURE_ROUTE_MONITORING: 'true',
      FEATURE_SOCKET_MANAGER: 'true',
      FEATURE_EMAIL_NOTIFICATIONS: 'false',
    },
  },
  observability: {
    name: 'observability',
    description: 'API focada em metricas, health, OpenAPI, request id e logs estruturados.',
    notes: [
      'Mantem recursos de observabilidade ligados para validar deploys e operacao.',
      'Nao habilita Socket.IO ou email por padrao.',
    ],
    overrides: {
      FEATURE_METRICS: 'true',
      FEATURE_HEALTH_CHECK: 'true',
      FEATURE_OPENAPI: 'true',
      FEATURE_RATE_LIMIT: 'true',
      FEATURE_HELMET: 'true',
      FEATURE_MONGO_SANITIZE: 'true',
      FEATURE_CIRCUIT_BREAKER: 'true',
      FEATURE_REDIS_CACHE: 'false',
      FEATURE_ROUTE_MONITORING: 'true',
      FEATURE_SOCKET_MANAGER: 'false',
      FEATURE_EMAIL_NOTIFICATIONS: 'false',
    },
  },
};

function parseEnv(content: string): Map<string, string> {
  const values = new Map<string, string>();

  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) return;

    values.set(
      trimmed.slice(0, separatorIndex),
      trimmed.slice(separatorIndex + 1),
    );
  });

  return values;
}

export function renderEnv(
  baseContent: string,
  preset: ITemplatePreset,
): string {
  const baseValues = parseEnv(baseContent);
  Object.entries(preset.overrides).forEach(([key, value]) => {
    baseValues.set(key, value);
  });

  const usedKeys = new Set<string>();
  const renderedLines = baseContent.split(/\r?\n/).map(line => {
    const trimmed = line.trim();
    const separatorIndex = trimmed.indexOf('=');

    if (!trimmed || trimmed.startsWith('#') || separatorIndex <= 0) {
      return line;
    }

    const key = trimmed.slice(0, separatorIndex);
    usedKeys.add(key);
    return `${key}=${baseValues.get(key) ?? ''}`;
  });

  Object.entries(preset.overrides).forEach(([key, value]) => {
    if (!usedKeys.has(key)) renderedLines.push(`${key}=${value}`);
  });

  return renderedLines.join('\n').replace(/\n*$/, '\n');
}

function listPresets(): void {
  Object.values(presets).forEach(preset => {
    console.log(`${preset.name}: ${preset.description}`);
  });
}

function resolveOutputPath(presetName: PresetName, args: string[]): string {
  const outputArg = args.find(arg => arg.startsWith('--output='));
  if (outputArg) return path.resolve(outputArg.slice('--output='.length));

  return path.resolve(`.env.preset.${presetName}`);
}

function ensureInsideWorkspace(filePath: string): void {
  const workspace = process.cwd();
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(workspace)) {
    console.error(`Erro: output fora do workspace: ${resolvedPath}`);
    process.exit(1);
  }
}

function printPlan(
  preset: ITemplatePreset,
  outputPath: string,
  dryRun: boolean,
): void {
  console.log(dryRun ? '\nDry-run ativo' : '\nAplicando preset');
  console.log(`Preset: ${preset.name}`);
  console.log(`Descricao: ${preset.description}`);
  console.log(`Output: ${path.relative(process.cwd(), outputPath)}`);
  console.log('\nFlags:');
  Object.entries(preset.overrides).forEach(([key, value]) => {
    console.log(`  - ${key}=${value}`);
  });
  console.log('\nNotas:');
  preset.notes.forEach(note => console.log(`  - ${note}`));
}

function run(args: string[]): void {
  if (args.includes('--list')) {
    listPresets();
    return;
  }

  const presetName = args.find(arg => !arg.startsWith('--')) as
    | PresetName
    | undefined;

  if (!presetName || !presets[presetName]) {
    console.error('Uso: npm run preset -- <minimal|enterprise|realtime|observability> [--dry-run] [--force] [--output=.env.local]');
    console.error('Liste presets com: npm run preset -- --list');
    process.exit(1);
  }

  const preset = presets[presetName];
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const outputPath = resolveOutputPath(presetName, args);
  ensureInsideWorkspace(outputPath);

  printPlan(preset, outputPath, dryRun);

  if (dryRun) {
    console.log('\nDry-run concluido. Nenhum arquivo foi alterado.');
    return;
  }

  if (fs.existsSync(outputPath) && !force) {
    console.error(`\nErro: ${path.relative(process.cwd(), outputPath)} ja existe.`);
    console.error('Use --force para sobrescrever.');
    process.exit(1);
  }

  const envExamplePath = path.resolve('.env.example');
  const baseContent = fs.readFileSync(envExamplePath, 'utf-8');
  const renderedEnv = renderEnv(baseContent, preset);

  fs.writeFileSync(outputPath, renderedEnv);
  console.log(`\nPreset gravado em ${path.relative(process.cwd(), outputPath)}.`);
}

// Só executa como CLI. Permite que `init-project.ts` importe `presets` e
// `renderEnv` sem disparar o script.
if (require.main === module) {
  run(process.argv.slice(2));
}
