import type { VerificationContext } from "./VerificationContext";

export type PluginMethod<TArgs extends any[] = any[], TResult = unknown> = (...args: TArgs) => TResult;

export type PluginCallHandler<TArgs extends any[] = any[], TResult = unknown> = (
  context: VerificationContext,
  ...args: TArgs
) => TResult;

type MethodWrappers<TMethods extends Record<string, PluginMethod>> = {
  [K in keyof TMethods]: (...args: Parameters<TMethods[K]>) => ReturnType<TMethods[K]>;
};

type CallableEntry<TMethods extends Record<string, PluginMethod>, TCallable extends PluginCallHandler | undefined> =
  TCallable extends PluginCallHandler<infer Args, infer Result>
    ? ((...args: Args) => Result) & MethodWrappers<TMethods>
    : MethodWrappers<TMethods>;

export class PluginEntry<
  TMethods extends Record<string, PluginMethod>,
  TCallable extends PluginCallHandler | undefined = undefined,
> {
  constructor(context: VerificationContext, methods: TMethods, callHandler?: TCallable) {
    const target: Record<string, unknown> | ((...args: any[]) => unknown) =
      typeof callHandler === "function" ? (...args: any[]) => (callHandler as PluginCallHandler)(context, ...args) : {};
    const targetObject = target as Record<string, unknown>;

    for (const [name, method] of Object.entries(methods)) {
      targetObject[name] = (...args: any[]) => context.lock(() => (method as PluginMethod)(...(args as any[])));
    }

    // Return the target object instead of this instance
    return target as CallableEntry<TMethods, TCallable>;
  }
}
