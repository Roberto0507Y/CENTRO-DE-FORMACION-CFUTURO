import { lazy, type ComponentType } from "react";

export function lazyNamed<TModule extends Record<string, ComponentType<any>>, TKey extends keyof TModule>(
  factory: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(async () => {
    const mod = await factory();
    return { default: mod[key] as ComponentType<any> };
  });
}
