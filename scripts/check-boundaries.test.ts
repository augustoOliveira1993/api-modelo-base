import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import test from 'node:test';

interface ICheckerViolation {
  key: string;
  rule: string;
  file: string;
  detail: string;
}

interface ICheckerPayload {
  total: number;
  totals: Record<string, number>;
  violations: ICheckerViolation[];
}

interface IFixture {
  tempDir: string;
  srcArg: string;
  configArg: string;
  baselineArg: string;
  baselinePath: string;
}

const checkerScript = path.join(__dirname, 'check-boundaries.js');

function runChecker(args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [checkerScript, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function outputOf(result: SpawnSyncReturns<string>): string {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

/**
 * Le a saida --json do checker.
 *
 * O spawn do ts-node falha de vez em quando no Windows sob carga: o processo
 * morre por sinal (status null) ou nem chega a subir, e o stdout volta vazio.
 * Sem estas guardas o JSON.parse estoura um SyntaxError generico que esconde a
 * causa real; aqui a mensagem carrega o status, o erro do spawn e a saida.
 */
function parseCheckerJson(result: SpawnSyncReturns<string>): ICheckerPayload {
  if (result.status === null) {
    assert.fail(
      `O checker nao terminou normalmente (signal=${result.signal}` +
        `, error=${result.error ? result.error.message : 'nenhum'}).\n${outputOf(result)}`,
    );
  }

  try {
    return JSON.parse(result.stdout) as ICheckerPayload;
  } catch (error: unknown) {
    assert.fail(
      `Saida do checker nao e JSON valido (status=${result.status}): ` +
        `${error instanceof Error ? error.message : String(error)}\n${outputOf(result)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Monta uma arvore src/ de mentira dentro do repo para exercitar as regras sem
 * depender do codigo real. Retorna os caminhos (relativos a cwd) que o script
 * espera em --src/--config/--baseline.
 */
function makeFixture(files: Record<string, string>, config: unknown): IFixture {
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-boundaries-'));

  // Se a montagem falhar no meio, o diretorio ja existe e o withFixture ainda
  // nao tem como limpa-lo: limpe aqui antes de propagar o erro.
  try {
    for (const [relPath, content] of Object.entries(files)) {
      const target = path.join(tempDir, relPath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf-8');
    }

    const configPath = path.join(tempDir, 'boundaries.config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }

  const dirName = path.basename(tempDir);
  return {
    tempDir,
    srcArg: `--src=${dirName}/src`,
    configArg: `--config=${dirName}/boundaries.config.json`,
    baselineArg: `--baseline=${dirName}/.boundaries-baseline.json`,
    baselinePath: path.join(tempDir, '.boundaries-baseline.json'),
  };
}

const TWO_CONTEXT_CONFIG = {
  contexts: {
    alpha: { modules: ['pedido'] },
    beta: { modules: ['cobranca'] },
  },
  composition: { files: ['src/shared/container/index.ts'] },
};

function withFixture<T>(
  files: Record<string, string>,
  config: unknown,
  fn: (fixture: IFixture) => T,
): T {
  const fixture = makeFixture(files, config);
  try {
    return fn(fixture);
  } finally {
    fs.rmSync(fixture.tempDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Guarda de regressao no codigo real — o teste que trava a Fase 1
// ---------------------------------------------------------------------------

test('nenhuma violacao NOVA de fronteira no codigo atual', () => {
  const result = runChecker([]);
  const output = outputOf(result);

  assert.equal(
    result.status,
    0,
    `Uma violacao nova de fronteira foi introduzida:\n${output}`,
  );
  assert.match(output, /nenhuma violacao nova de fronteira/);
});

test('todos os modulos de src/modules estao mapeados em um contexto', () => {
  const result = runChecker(['--json', '--no-baseline']);
  const payload = parseCheckerJson(result);
  const unmapped = payload.violations.filter(
    (violation) => violation.rule === 'unmapped-module',
  );

  assert.deepEqual(
    unmapped.map((violation) => violation.detail),
    [],
    'Adicione o modulo novo a um contexto em boundaries.config.json',
  );
});

test('baseline so contem chaves de violacoes que o checker ainda reporta', () => {
  const baseline = JSON.parse(
    fs.readFileSync('.boundaries-baseline.json', 'utf-8'),
  ) as { violations: string[] };
  const result = runChecker(['--json', '--no-baseline']);
  const payload = parseCheckerJson(result);
  const currentKeys = new Set(payload.violations.map((violation) => violation.key));

  const stale = baseline.violations.filter((key) => !currentKeys.has(key));

  assert.deepEqual(
    stale,
    [],
    'Violacoes foram resolvidas. Rode: yarn check:boundaries --update-baseline',
  );
});

test('shared/ nao depende de modulo fora do contexto platform', () => {
  const result = runChecker(['--json', '--no-baseline']);
  const payload = parseCheckerJson(result);
  const offenders = payload.violations.filter(
    (violation) => violation.rule === 'shared-imports-non-platform',
  );

  assert.deepEqual(
    offenders.map((violation) => `${violation.file}: ${violation.detail}`),
    [],
    'src/shared e src/configs so podem depender do contexto platform',
  );
});

// ---------------------------------------------------------------------------
// Deteccao das regras, com fixtures isoladas
// ---------------------------------------------------------------------------

test('detecta import de model Mongoose entre modulos', () => {
  withFixture(
    {
      'src/modules/pedido/services/CreateService.ts':
        "import { Cobranca } from '@modules/cobranca/infra/mongo/models/Cobranca';\n",
      'src/modules/cobranca/infra/mongo/models/Cobranca.ts': 'export const Cobranca = {};\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);
      const rules = payload.violations.map((violation) => violation.rule);

      assert.equal(result.status, 1, outputOf(result));
      assert.ok(rules.includes('cross-module-model'), outputOf(result));
    },
  );
});

test('detecta vazamento por caminho relativo, nao so por alias', () => {
  withFixture(
    {
      'src/modules/pedido/services/CreateService.ts':
        "import { Cobranca } from '../../cobranca/infra/mongo/models/Cobranca';\n",
      'src/modules/cobranca/infra/mongo/models/Cobranca.ts': 'export const Cobranca = {};\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);
      const rules = payload.violations.map((violation) => violation.rule);

      assert.equal(
        result.status,
        1,
        `import relativo nao pode escapar da regra\n${outputOf(result)}`,
      );
      assert.ok(rules.includes('cross-module-model'), outputOf(result));
    },
  );
});

test('detecta invocacao de service entre contextos diferentes', () => {
  withFixture(
    {
      'src/modules/pedido/services/CreateService.ts':
        "import Svc from '@modules/cobranca/services/cobranca/RegistrarService';\n",
      'src/modules/cobranca/services/cobranca/RegistrarService.ts':
        'export default class RegistrarService {}\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);
      const rules = payload.violations.map((violation) => violation.rule);

      assert.ok(rules.includes('cross-context-service'), outputOf(result));
    },
  );
});

test('nao acusa service dentro do mesmo contexto', () => {
  withFixture(
    {
      'src/modules/pedido/services/CreateService.ts':
        "import Svc from '@modules/pedidoItem/services/item/AddService';\n",
      'src/modules/pedidoItem/services/item/AddService.ts':
        'export default class AddService {}\n',
    },
    {
      contexts: { alpha: { modules: ['pedido', 'pedidoItem'] } },
    },
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);
      const rules = payload.violations.map((violation) => violation.rule);

      assert.ok(!rules.includes('cross-context-service'), outputOf(result));
    },
  );
});

test('nao acusa import de DTO nem de porta de repositorio', () => {
  withFixture(
    {
      'src/modules/pedido/services/CreateService.ts':
        "import { ICobrancaDTO } from '@modules/cobranca/dto/ICobrancaDTO';\n" +
        "import ICobrancaRepository from '@modules/cobranca/repositories/ICobrancaRepository';\n",
      'src/modules/cobranca/dto/ICobrancaDTO.ts': 'export type ICobrancaDTO = {};\n',
      'src/modules/cobranca/repositories/ICobrancaRepository.ts':
        'export default interface ICobrancaRepository {}\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);

      assert.equal(payload.total, 0, JSON.stringify(payload.violations, null, 2));
      assert.equal(result.status, 0, outputOf(result));
    },
  );
});

test('detecta ciclo entre modulos', () => {
  withFixture(
    {
      'src/modules/pedido/services/CreateService.ts':
        "import { ICobrancaDTO } from '@modules/cobranca/dto/ICobrancaDTO';\n",
      'src/modules/cobranca/services/CreateService.ts':
        "import { IPedidoDTO } from '@modules/pedido/dto/IPedidoDTO';\n",
      'src/modules/pedido/dto/IPedidoDTO.ts': 'export type IPedidoDTO = {};\n',
      'src/modules/cobranca/dto/ICobrancaDTO.ts': 'export type ICobrancaDTO = {};\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);
      const cycles = payload.violations.filter(
        (violation) => violation.rule === 'module-cycle',
      );

      assert.equal(cycles.length, 1, outputOf(result));
      assert.match(cycles[0].detail, /cobranca <-> pedido/);
    },
  );
});

test('detecta modulo sem contexto declarado', () => {
  withFixture(
    {
      'src/modules/orfao/services/CreateService.ts': 'export default class S {}\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);
      const unmapped = payload.violations.filter(
        (violation) => violation.rule === 'unmapped-module',
      );

      assert.equal(unmapped.length, 1, outputOf(result));
      assert.match(unmapped[0].detail, /orfao/);
    },
  );
});

test('composition root pode importar qualquer modulo', () => {
  withFixture(
    {
      'src/shared/container/index.ts':
        "import '@modules/cobranca/container';\n" +
        "import { Cobranca } from '@modules/cobranca/infra/mongo/models/Cobranca';\n",
      'src/modules/cobranca/container/index.ts': 'export {};\n',
      'src/modules/cobranca/infra/mongo/models/Cobranca.ts': 'export const Cobranca = {};\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);

      assert.equal(payload.total, 0, JSON.stringify(payload.violations, null, 2));
    },
  );
});

test('shared fora do composition root nao pode depender de contexto de negocio', () => {
  withFixture(
    {
      'src/shared/middlewares/pedidoMiddleware.ts':
        "import ICobrancaRepository from '@modules/cobranca/repositories/ICobrancaRepository';\n",
      'src/modules/cobranca/repositories/ICobrancaRepository.ts':
        'export default interface ICobrancaRepository {}\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg }) => {
      const result = runChecker([srcArg, configArg, '--no-baseline', '--json']);
      const payload = parseCheckerJson(result);
      const rules = payload.violations.map((violation) => violation.rule);

      assert.ok(rules.includes('shared-imports-non-platform'));
    },
  );
});

// ---------------------------------------------------------------------------
// Comportamento do baseline
// ---------------------------------------------------------------------------

test('baseline silencia violacao conhecida e falha em violacao nova', () => {
  withFixture(
    {
      'src/modules/pedido/services/CreateService.ts':
        "import { Cobranca } from '@modules/cobranca/infra/mongo/models/Cobranca';\n",
      'src/modules/cobranca/infra/mongo/models/Cobranca.ts': 'export const Cobranca = {};\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg, baselineArg, baselinePath, tempDir }) => {
      const created = runChecker([
        srcArg,
        configArg,
        baselineArg,
        '--update-baseline',
      ]);
      assert.equal(created.status, 0, outputOf(created));

      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      assert.equal(baseline.violations.length, 1);
      assert.equal(baseline.totals['cross-module-model'], 1);

      const clean = runChecker([srcArg, configArg, baselineArg]);
      assert.equal(clean.status, 0, outputOf(clean));

      // Uma violacao nova, fora do baseline, tem que quebrar o build.
      fs.writeFileSync(
        path.join(tempDir, 'src/modules/pedido/services/UpdateService.ts'),
        "import { Cobranca } from '@modules/cobranca/infra/mongo/models/Cobranca';\n",
        'utf-8',
      );

      const dirty = runChecker([srcArg, configArg, baselineArg]);
      const output = outputOf(dirty);

      assert.equal(dirty.status, 1);
      assert.match(output, /NOVA/);
      assert.match(output, /UpdateService\.ts/);
    },
  );
});

test('baseline aponta violacoes ja resolvidas para o placar poder ser travado', () => {
  withFixture(
    {
      'src/modules/pedido/services/CreateService.ts':
        "import { Cobranca } from '@modules/cobranca/infra/mongo/models/Cobranca';\n",
      'src/modules/cobranca/infra/mongo/models/Cobranca.ts': 'export const Cobranca = {};\n',
    },
    TWO_CONTEXT_CONFIG,
    ({ srcArg, configArg, baselineArg, tempDir }) => {
      runChecker([srcArg, configArg, baselineArg, '--update-baseline']);

      fs.writeFileSync(
        path.join(tempDir, 'src/modules/pedido/services/CreateService.ts'),
        "import { ICobrancaDTO } from '@modules/cobranca/dto/ICobrancaDTO';\n",
        'utf-8',
      );

      const result = runChecker([srcArg, configArg, baselineArg]);
      const output = outputOf(result);

      assert.equal(result.status, 0, output);
      assert.match(output, /resolvidas\s*:\s*1/);
      assert.match(output, /--update-baseline/);
    },
  );
});
