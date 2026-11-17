import mongoose, { Schema } from 'mongoose';
import { IUserDocument } from '@modules/users/dto/IUserDTO';

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String },
    permissaos: [{ type: Schema.Types.ObjectId, ref: 'Permissao' }],
    avatar_url: { type: String },
    apelido: { type: String },
    setor: { type: String },
    pagina_inicial: { type: String },
    status: { type: String, default: 'ATIVO' },
    role: { type: Schema.Types.ObjectId, ref: 'Role' },
    tempo_expiracao_token: { type: String, default: '8h' },
    // Multi-tenancy: só é usado quando o projeto liga o filtro por loja
    // (@shared/utils/loja). Em projetos single-tenant permanece nulo.
    loja: { type: Schema.Types.ObjectId, ref: 'Loja', default: null },
    lojas_associadas: [{ type: Schema.Types.ObjectId, ref: 'Loja' }],
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model<IUserDocument>('User', UserSchema);
