## EMIS Offline Bundle Source

This folder is a local source scaffold for:

```bash
pnpm map:assets:install -- --source /home/orl/shared_folder/apps/dashboard-builder/offline-bundle
```

It is not a real offline basemap yet.

Before switching `EMIS_MAP_MODE=offline`, replace the placeholder assets here with a real
pre-extracted bundle:

- `style.json`
- files inside `tiles/`
- files inside `sprites/`
- files inside `fonts/`

Recommended workflow:

1. Drop the real bundle contents into this folder.
2. Run the install command above.
3. Verify with `pnpm map:assets:status`.
4. Only then switch the runtime to offline mode.
