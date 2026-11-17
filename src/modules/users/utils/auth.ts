export function getPermissionsForUser(user: any, slugGrupo?: string): string[] {
  const permissoesSet = new Set<string>();

  for (const profile of user?.profiles || []) {
    for (const permissaoGrupo of profile?.permissoes_grupos || []) {
      const grupoSlug = permissaoGrupo?.grupo?.slug;
      if (!grupoSlug || (slugGrupo && grupoSlug !== slugGrupo)) continue;

      for (const perm of permissaoGrupo?.permissoes || []) {
        if (perm?.name) {
          permissoesSet.add(`${grupoSlug}:${perm.name}`);
        }
      }
    }
  }

  return Array.from(permissoesSet);
}

export function isUserAdmin(user: any): boolean {
  return user?.role?.name === 'Administrador' || false;
}

export function getDefaultProfile(user: any) {
  return user?.profiles?.[0];
}
