export const ACL = {
  permissao: {
    criar: 'permissao:criar',
    ver: 'permissao:ver',
    editar: 'permissao:editar',
    excluir: 'permissao:excluir',
  },
  grupo: {
    criar: 'grupo:criar',
    ver: 'grupo:ver',
    editar: 'grupo:editar',
    excluir: 'grupo:excluir',
  },
  roles: {
    permissions: {
      update: 'roles:permissions:update',
    },
  },
} as const;

export default ACL;
