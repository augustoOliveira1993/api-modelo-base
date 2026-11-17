/**
 * Permissões declaradas por um método de controller.
 *
 * A metadata é indexada pela função do método para que o registro HTTP possa
 * aplicá-la sem acoplar controllers a middlewares ou ao Express Router.
 */
const permissionsByHandler = new WeakMap<Function, readonly string[]>();

export function RequiredPermission(
  ...permissions: string[]
): MethodDecorator {
  if (
    permissions.length === 0 ||
    permissions.some(permission => permission.trim().length === 0)
  ) {
    throw new TypeError('RequiredPermission exige ao menos uma permissão válida.');
  }

  return (_target, propertyKey, descriptor): void => {
    const handler = descriptor.value;

    if (typeof handler !== 'function') {
      throw new TypeError(
        `RequiredPermission só pode ser aplicado a métodos: ${String(propertyKey)}.`,
      );
    }

    const existing = permissionsByHandler.get(handler) ?? [];
    permissionsByHandler.set(handler, [...existing, ...permissions]);
  };
}

export function getRequiredPermissions(
  handler: Function,
): readonly string[] {
  return permissionsByHandler.get(handler) ?? [];
}
