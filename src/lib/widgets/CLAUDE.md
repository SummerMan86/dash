# widgets/ — Reusable widget implementations

## Purpose
Composite UI widgets that combine shared/ui primitives with business logic.
Widgets can use entities, shared, but NOT features (no circular deps).

## Available widgets

### filters/
Complete filter UI system.
```
FilterPanel.svelte    # Container: renders all registered specs as filter fields
FilterField.svelte    # Dispatcher: picks correct filter component by FilterSpec.type
DateRangeFilter.svelte
SelectFilter.svelte
MultiSelectFilter.svelte
TextFilter.svelte
```

Usage:
```svelte
<script>
  import { registerFilters } from '$entities/filter';
  import { FilterPanel } from '$widgets/filters';
  import { pageFilters } from './filters';

  registerFilters(pageFilters);
</script>

<FilterPanel />
```

### stock-alerts/
Wildberries stock alert widgets.
```
ScenarioParams.svelte  # UI for preset calc params (lead time, safety days, etc.)
StatusBadge.svelte     # Stock status indicator
```

## Conventions
- Widgets expose Svelte components only (no raw TS logic, keep that in entities/features)
- Props should be typed with Svelte 5 `$props()` rune
- Use design system tokens, not raw Tailwind colors
