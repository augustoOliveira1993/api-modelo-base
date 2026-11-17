import { Document } from 'mongoose';
import { IRoleDTO } from './IRoleDTO';

export interface IUserDTO {
  username: string;
  email: string;
  password?: string;
  role?: string | IRoleDTO;
  permissaos?: string[];
  avatar_url?: string;
  apelido?: string;
  setor?: string;
  pagina_inicial?: string;
  status?: string;
  tempo_expiracao_token?: string;
  /**
   * Tenant do usuário. Preenchido apenas quando o projeto usa multi-tenancy
   * (ver @shared/utils/loja); em projetos single-tenant permanece nulo.
   */
  loja?: string | null;
  /** Demais tenants aos quais o usuário tem acesso. */
  lojas_associadas?: string[];
}

export interface IUserDocument extends IUserDTO, Document {}

export interface IDataBodyAddPermissions {
  permissaos: string[];
}

export interface IResquestQuery {
  search: string | null;
}

export interface IFindAllResponse {
  data: IUserDTO[];
  total: number;
}
