import { container } from 'tsyringe';
import { ExternalSocketManager } from '@shared/socket/ExternalSocketClient';
import {
  HOSPEDAGEM_PORT,
  IHospedagemPort,
  NullHospedagemPort,
} from '@shared/ports/hospedagem';
import { CAIXA_PORT, ICaixaPort, NullCaixaPort } from '@shared/ports/financeiro';
import {
  COLABORADOR_PORT,
  IColaboradorPort,
  NullColaboradorPort,
} from '@shared/ports/colaborador';
import { loadModules } from '@shared/modules';

/**
 * Portas com fallback nulo: registradas ANTES do loader para que o módulo
 * dono da implementação real (ex.: estadia → HospedagemPort) sobrescreva o
 * registro ao ser instalado — no tsyringe, o último registro do token vence.
 */
container.registerInstance<IHospedagemPort>(
  HOSPEDAGEM_PORT,
  new NullHospedagemPort(),
);
container.registerInstance<ICaixaPort>(CAIXA_PORT, new NullCaixaPort());
container.registerInstance<IColaboradorPort>(
  COLABORADOR_PORT,
  new NullColaboradorPort(),
);

/**
 * Instala os módulos selecionados (modules.json ou MODULES=; padrão: todos).
 *
 * Cada módulo registra o próprio DI em `container/index.ts`, que o loader
 * importa antes de qualquer router. Não adicione imports de módulo aqui: crie
 * `src/modules/<nome>/module.ts`. Ver docs/MODULES.md.
 */
loadModules();

// Registro opcional (já funciona com @singleton)
container.registerSingleton<ExternalSocketManager>(
  'ExternalSocketManager',
  ExternalSocketManager,
);
