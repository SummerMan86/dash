# EMIS Manual Entry

App-local module: CMS-style editor forms for manual EMIS data entry (objects and news).

## Structure

```
emis-manual-entry/
  ObjectEditorForm.svelte  — form for creating/editing EMIS objects (infrastructure, facilities)
  NewsEditorForm.svelte    — form for creating/editing EMIS news items
```

## What these forms do

Both forms use SvelteKit `use:enhance` for progressive enhancement (no JS required for submission). They handle:

- Field validation with inline error display
- Loading state during submission
- Dictionary-driven selects (object types, countries, sources)
- Geometry fields (lat/lon) with conditional editability (point vs non-point)
- JSON attribute/meta editors

## Dependencies

- `$app/forms` — SvelteKit `enhance` action (why this feature stays in app, not in a package)
- `@dashboard-builder/emis-contracts/emis-dictionary` — `EmisCountry`, `EmisObjectType`, `EmisSource` types
- `@dashboard-builder/platform-ui` — `Button`, `Input`, `Select` components

## Consumers

- `src/routes/emis/objects/*/` — object create/edit pages
- `src/routes/emis/news/*/` — news create/edit pages

## Rules

- This is an app-local module. It lives in `$lib/emis-manual-entry/`, not in packages, because it depends on `$app/forms` which is SvelteKit app-specific.
- Forms are presentational: validation logic and form actions live in the consuming route's `+page.server.ts`.
- No direct API calls or server imports from these components.
