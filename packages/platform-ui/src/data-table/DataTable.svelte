<!--
  DataTable Component
  Reusable sortable table with typed columns and custom cell rendering

  Usage:
    <DataTable
      columns={[
        { key: 'name', label: 'Название' },
        { key: 'revenue', label: 'Выручка', align: 'right', sortable: true },
        { key: 'status', label: 'Статус', align: 'center', cell: statusCell },
      ]}
      rows={data}
      sortKey="revenue"
      sortDir="desc"
      onSort={(key, dir) => { sortKey = key; sortDir = dir; }}
      onRowClick={(row) => selectRow(row)}
      activeRowKey="id"
      activeRowValue={selectedId}
    />

  Custom cell rendering via snippets:
    {#snippet statusCell(value, row)}
      <Badge variant={row.ok ? 'success' : 'error'}>{value}</Badge>
    {/snippet}
-->

<script lang="ts" generics="T extends Record<string, unknown>">
	import { cn } from '../styles/utils';
	import type { Snippet } from 'svelte';

	type SortDir = 'asc' | 'desc';
	type ColumnAlign = 'left' | 'center' | 'right';

	interface Column {
		/** Row property key */
		key: string;
		/** Column header label */
		label: string;
		/** Text alignment */
		align?: ColumnAlign;
		/** Enable sorting on this column */
		sortable?: boolean;
		/** Minimum width CSS value */
		minWidth?: string;
		/** Custom cell renderer snippet: (value, row) => markup */
		cell?: Snippet<[unknown, T]>;
		/** Additional classes for <td> */
		class?: string;
	}

	interface Props {
		/** Column definitions */
		columns: Column[];
		/** Data rows */
		rows: T[];
		/** Current sort column key */
		sortKey?: string;
		/** Current sort direction */
		sortDir?: SortDir;
		/** Sort change handler */
		onSort?: (key: string, dir: SortDir) => void;
		/** Row click handler */
		onRowClick?: (row: T) => void;
		/** Row property to compare for active highlight */
		activeRowKey?: string;
		/** Value to match against activeRowKey for active highlight */
		activeRowValue?: unknown;
		/** Loading state — shows skeleton rows */
		loading?: boolean;
		/** Number of skeleton rows to show */
		skeletonRows?: number;
		/** Empty state snippet */
		empty?: Snippet;
		/** Additional classes for the wrapper */
		class?: string;
		[key: string]: unknown;
	}

	let {
		columns,
		rows,
		sortKey,
		sortDir = 'desc',
		onSort,
		onRowClick,
		activeRowKey,
		activeRowValue,
		loading = false,
		skeletonRows = 5,
		empty,
		class: className,
		...rest
	}: Props = $props();

	function handleSort(col: Column) {
		if (!col.sortable || !onSort) return;
		const newDir: SortDir = sortKey === col.key && sortDir === 'desc' ? 'asc' : 'desc';
		onSort(col.key, newDir);
	}

	function sortIndicator(col: Column): string {
		if (!col.sortable || sortKey !== col.key) return '';
		return sortDir === 'asc' ? ' \u2191' : ' \u2193';
	}

	function isActive(row: T): boolean {
		if (!activeRowKey || activeRowValue === undefined) return false;
		return row[activeRowKey] === activeRowValue;
	}

	const alignClass: Record<ColumnAlign, string> = {
		left: 'text-left',
		center: 'text-center',
		right: 'text-right'
	};
</script>

<div
	class={cn('overflow-hidden rounded-lg border border-card-border bg-card shadow-sm', className)}
	{...rest}
>
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-border bg-muted/30">
					{#each columns as col}
						<th
							class={cn(
								'type-overline px-4 py-3 text-muted-foreground',
								alignClass[col.align ?? 'left'],
								col.sortable &&
									'cursor-pointer transition-colors duration-[var(--transition-fast)] hover:text-foreground'
							)}
							style={col.minWidth ? `min-width: ${col.minWidth}` : undefined}
							onclick={() => handleSort(col)}
						>
							{col.label}{sortIndicator(col)}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-border/50">
				{#if loading}
					{#each Array(skeletonRows) as _, i}
						<tr>
							{#each columns as col}
								<td class={cn('px-4 py-3', alignClass[col.align ?? 'left'])}>
									<div
										class="skeleton-shimmer h-4 rounded"
										style="width: {60 + ((i * 13 + columns.indexOf(col) * 17) % 30)}%"
									></div>
								</td>
							{/each}
						</tr>
					{/each}
				{:else if rows.length === 0}
					<tr>
						<td colspan={columns.length} class="px-4 py-16 text-center text-muted-foreground">
							{#if empty}
								{@render empty()}
							{:else}
								<div class="flex flex-col items-center gap-2">
									<svg
										class="h-8 w-8 text-muted-foreground/50"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
									>
										<path
											d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
										/>
									</svg>
									<span>Нет данных</span>
								</div>
							{/if}
						</td>
					</tr>
				{:else}
					{#each rows as row}
						<tr
							class={cn(
								'transition-colors duration-[var(--transition-fast)]',
								onRowClick && 'cursor-pointer hover:bg-muted/40',
								isActive(row) && 'bg-primary/5 hover:bg-primary/8'
							)}
							onclick={() => onRowClick?.(row)}
						>
							{#each columns as col}
								<td class={cn('px-4 py-3', alignClass[col.align ?? 'left'], col.class)}>
									{#if col.cell}
										{@render col.cell(row[col.key], row)}
									{:else}
										{row[col.key] ?? '\u2014'}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
