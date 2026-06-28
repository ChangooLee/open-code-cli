export type DeepImmutable<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepImmutable<U>>
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>
    : T extends Set<infer M>
      ? ReadonlySet<DeepImmutable<M>>
      : T extends (...args: never[]) => unknown
        ? T
        : T extends object
          ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
          : T
export type Permutations<T extends string, U extends string = T> = [T] extends [
  never,
]
  ? ''
  : T extends string
    ? `${T}${'' | Permutations<Exclude<U, T>>}`
    : never
