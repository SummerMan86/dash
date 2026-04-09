# @dashboard-builder/platform-core

Leaf foundation package: formatting utilities, shared TypeScript primitives, debounced loader.

No domain knowledge. No UI. No DB access. No EMIS or Wildberries awareness.

## Structure

```
src/
  format.ts              — number/date formatting helpers
  types.ts               — shared TS primitives (JsonPrimitive, JsonValue)
  useDebouncedLoader.svelte.ts — debounced loading state helper (Svelte 5 runes)
  index.ts               — public re-exports
```

## Dependencies

- Svelte (peer) — only for `useDebouncedLoader`
- No other workspace dependencies (leaf package)

## Rules

- This is a leaf foundation package. It must NOT import from any other workspace package.
- No domain logic (EMIS, Wildberries, Strategy, BI) belongs here.
- No UI components — those go in `platform-ui`.
- No DB access — that goes in `db`.
- Keep exports minimal and generic. If a utility is domain-specific, it belongs in the domain package.
