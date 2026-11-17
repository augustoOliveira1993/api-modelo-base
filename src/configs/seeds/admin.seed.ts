import bcrypt from 'bcryptjs';
import { container } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import IRoleRepository from '@modules/users/repositories/IRoleRepository';
import CreateRoleDefaultService from '@modules/users/services/role/CreateRoleDefaultService';
import { ENameRoleDefault } from '@modules/users/dto/IRoleDTO';
import { IUserDTO } from '@modules/users/dto/IUserDTO';
import { logger } from '@shared/utils/logger';
import { ISeed } from './types';

/**
 * Cria o primeiro administrador do sistema.
 *
 * Por que este seed existe: o fluxo de `POST /api/auth/signup` sempre atribui
 * a role `Usuario` (ver `modules/users/services/user/CreateService.ts`). Sem
 * este seed, um banco novo não tem nenhum administrador e não há caminho pela
 * API para promover alguém — só editando o Mongo na mão.
 *
 * Idempotente: se já existir um usuário com o e-mail informado, apenas garante
 * que ele esteja na role de Administrador.
 */
const adminSeed: ISeed = {
  name: 'admin',
  description: 'Cria as roles padrão e o usuário administrador inicial.',

  async run() {
    const email = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD;
    const username = process.env.ADMIN_USERNAME?.trim() || 'admin';

    if (!email || !password) {
      throw new Error(
        'Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed de admin.',
      );
    }

    if (password.length < 8) {
      throw new Error('ADMIN_PASSWORD precisa ter ao menos 8 caracteres.');
    }

    // Garante que as roles padrão existam antes de referenciá-las.
    await container.resolve(CreateRoleDefaultService).execute();

    const usersRepository =
      container.resolve<IUsersRepository>('UsersRepository');
    const roleRepository = container.resolve<IRoleRepository>('RoleRepository');

    const adminRole = await roleRepository.findByName(
      ENameRoleDefault.Administrador,
    );

    if (!adminRole) {
      throw new Error(
        'Role de Administrador não encontrada mesmo após a criação das roles padrão.',
      );
    }

    const existing = await usersRepository.findByEmail(email);

    if (existing) {
      const currentRole = (existing.role as { name?: string } | undefined)?.name;

      if (currentRole === ENameRoleDefault.Administrador) {
        logger.info(`[seed:admin] "${email}" já é administrador. Nada a fazer.`);
        return;
      }

      await usersRepository.update(String(existing._id), {
        role: adminRole,
      } as Partial<IUserDTO>);

      logger.info(`[seed:admin] "${email}" promovido a Administrador.`);
      return;
    }

    await usersRepository.create({
      username,
      email,
      password: bcrypt.hashSync(password, 8),
      role: adminRole,
      status: 'ATIVO',
    } as unknown as IUserDTO);

    logger.info(`[seed:admin] Administrador "${email}" criado com sucesso.`);
  },
};

export default adminSeed;
