// The React Compiler emits `import { c as _c } from "react/compiler-runtime"`.
// The published @types/react intentionally omits this export, so we declare the
// real runtime export (`c` is React's memoization cache helper / useMemoCache).
declare module "react/compiler-runtime" {
  // The memoization cache is an array of opaque slots holding arbitrary
  // memoized values, so `any` matches React's real runtime signature here.
  export function c(size: number): Array<any>;
}
