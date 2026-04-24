import { lazy, type ComponentType } from "react";

type ExtractLazyComponent<T> = T extends ComponentType<infer P> ? ComponentType<P> : never;

function isLazyComponentExport(value: unknown): value is ComponentType<unknown> {
  return typeof value === "function" || (typeof value === "object" && value !== null);
}

export function lazyNamed<TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  factory: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(async () => {
    const mod = await factory();
    const component = mod[key];
    if (!isLazyComponentExport(component)) {
      throw new TypeError(`La exportación "${String(key)}" no es un componente React válido.`);
    }
    return { default: component as ExtractLazyComponent<TModule[TKey]> };
  });
}
