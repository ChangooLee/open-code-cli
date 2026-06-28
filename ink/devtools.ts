/**
 * React DevTools connection for the Ink reconciler (development only).
 *
 * Imported purely for its side effects from reconciler.ts under
 * NODE_ENV=development (`void import('./devtools.js')`). Connecting requires the
 * optional `react-devtools-core` package, which is not part of this build, so
 * this module is a no-op placeholder. reconciler.ts tolerates a missing
 * connection, so importing this file must never throw.
 */
export {}
