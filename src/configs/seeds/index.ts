import 'reflect-metadata';
import 'dotenv/config';
import '@shared/container';

import { connectDB, disconnectDB } from '@configs/database/mongodb.config';
import { logger } from '@shared/utils/logger';
import { ISeed } from './types';
import adminSeed from './admin.seed';

/**
 * Registre aqui os seeds do projeto. A ordem do array é a ordem de execução.
 *
 * Seeds devem ser idempotentes — o runner não controla o que já rodou.
 */
const seeds: ISeed[] = [adminSeed];

function parseArgs(argv: string[]) {
  const only = argv
    .find(arg => arg.startsWith('--only='))
    ?.split('=')[1]
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean);

  return {
    list: argv.includes('--list'),
    only,
  };
}

function printList() {
  console.log('\nSeeds disponíveis:\n');
  for (const seed of seeds) {
    console.log(`  ${seed.name.padEnd(16)} ${seed.description}`);
  }
  console.log('\nUso: yarn seed [--only=nome1,nome2] [--list]\n');
}

async function main() {
  const { list, only } = parseArgs(process.argv.slice(2));

  if (list) {
    printList();
    return;
  }

  const selected = only
    ? seeds.filter(seed => only.includes(seed.name))
    : seeds;

  if (only) {
    const unknown = only.filter(
      name => !seeds.some(seed => seed.name === name),
    );
    if (unknown.length > 0) {
      throw new Error(
        `Seed(s) não encontrado(s): ${unknown.join(', ')}. Use --list para ver os disponíveis.`,
      );
    }
  }

  if (selected.length === 0) {
    logger.warn('Nenhum seed selecionado.');
    return;
  }

  await connectDB();

  try {
    for (const seed of selected) {
      logger.info(`[seed] Executando "${seed.name}"...`);
      await seed.run();
    }
    logger.info(`[seed] Concluído (${selected.length} seed(s)).`);
  } finally {
    await disconnectDB();
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    // console.error síncrono: logger.error + process.exit perde a mensagem
    // porque o transporte do Winston não descarrega antes do processo morrer.
    console.error(
      `[seed] Falhou: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  });
