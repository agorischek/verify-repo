import { VerificationBuilder } from "./VerificationBuilder";

export type PluginMethod<TArgs extends any[] = any[], TResult = unknown> = (
  builder: VerificationBuilder,
  ...args: TArgs
) => TResult;

export type PluginCallHandler<
  TArgs extends any[] = any[],
  TResult = unknown,
> = PluginMethod<TArgs, TResult>;

type MethodWrappers<TMethods extends Record<string, PluginMethod>> = {
  [K in keyof TMethods]: (
    ...args: Parameters<TMethods[K]> extends [any, ...infer P] ? P : never
  ) => ReturnType<TMethods[K]>;
};

type CallableEntry<
  TMethods extends Record<string, PluginMethod>,
  TCallable extends PluginCallHandler | undefined,
> = TCallable extends PluginCallHandler<infer Args, infer Result>
  ? ((...args: Args) => Result) & MethodWrappers<TMethods>
  : MethodWrappers<TMethods>;

export function createPluginEntry<
  TMethods extends Record<string, PluginMethod>,
  TCallable extends PluginCallHandler | undefined = undefined,
>(
  builder: VerificationBuilder,
  methods: TMethods,
  callHandler?: TCallable,
): CallableEntry<TMethods, TCallable> {
  const target: Record<string, unknown> | ((...args: any[]) => unknown) =
    typeof callHandler === "function"
      ? (...args: any[]) => (callHandler as PluginCallHandler)(builder, ...args)
      : {};
  const targetObject = target as Record<string, unknown>;

  for (const [name, method] of Object.entries(methods)) {
    targetObject[name] = (...args: any[]) =>
      builder.register(() =>
        (method as PluginMethod)(builder, ...(args as any[])),
      );
  }

  return target as CallableEntry<TMethods, TCallable>;
}
