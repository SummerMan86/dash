<script lang="ts">
	import type { PageData } from './$types';

	import { Button } from '@dashboard-builder/platform-ui';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@dashboard-builder/platform-ui';
	import { Input } from '@dashboard-builder/platform-ui';
	import { Select } from '@dashboard-builder/platform-ui';

	let { data }: { data: PageData } = $props();

	// --- Countries state ---
	let countries = $state(data.countries.map((c) => ({ ...c })));
	let newCountry = $state({ code: '', nameRu: '', nameEn: '' });
	let editingCountryCode: string | null = $state(null);
	let editCountry = $state({ nameRu: '', nameEn: '' });
	let countryError: string | null = $state(null);
	let countrySaving = $state(false);

	// --- Object Types state ---
	let objectTypes = $state(data.objectTypes.map((o) => ({ ...o })));
	let newObjectType = $state({ code: '', name: '', geometryKind: 'point' as string, iconKey: '' });
	let editingObjectTypeId: string | null = $state(null);
	let editObjectType = $state({
		code: '',
		name: '',
		geometryKind: 'point' as string,
		iconKey: ''
	});
	let objectTypeError: string | null = $state(null);
	let objectTypeSaving = $state(false);

	// --- Sources state ---
	let sources = $state(data.sources.map((s) => ({ ...s })));
	let newSource = $state({
		code: '',
		name: '',
		kind: '',
		baseUrl: '',
		isActive: true
	});
	let editingSourceId: string | null = $state(null);
	let editSource = $state({
		code: '',
		name: '',
		kind: '',
		baseUrl: '',
		isActive: true
	});
	let sourceError: string | null = $state(null);
	let sourceSaving = $state(false);

	const GEOMETRY_KINDS = ['point', 'linestring', 'polygon', 'mixed'] as const;

	async function apiCall(
		url: string,
		method: string,
		body?: Record<string, unknown>
	): Promise<{ ok: boolean; data?: unknown; error?: string }> {
		try {
			const resp = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: body ? JSON.stringify(body) : undefined
			});
			const json = await resp.json();
			if (!resp.ok) {
				return { ok: false, error: json?.error ?? `HTTP ${resp.status}` };
			}
			return { ok: true, data: json };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
		}
	}

	// --- Country handlers ---
	async function createCountry() {
		if (!newCountry.code.trim() || !newCountry.nameRu.trim() || !newCountry.nameEn.trim()) {
			countryError = 'All fields are required';
			return;
		}
		countryError = null;
		countrySaving = true;
		const result = await apiCall('/api/emis/dictionaries/countries', 'POST', {
			code: newCountry.code.trim(),
			nameRu: newCountry.nameRu.trim(),
			nameEn: newCountry.nameEn.trim()
		});
		countrySaving = false;
		if (!result.ok) {
			countryError = result.error ?? 'Failed to create';
			return;
		}
		const created = result.data as { code: string; nameRu: string; nameEn: string };
		countries = [...countries, created];
		newCountry = { code: '', nameRu: '', nameEn: '' };
	}

	function startEditCountry(code: string) {
		const c = countries.find((i) => i.code === code);
		if (!c) return;
		editingCountryCode = code;
		editCountry = { nameRu: c.nameRu, nameEn: c.nameEn };
		countryError = null;
	}

	async function saveCountry() {
		if (!editingCountryCode) return;
		countryError = null;
		countrySaving = true;
		const result = await apiCall(
			`/api/emis/dictionaries/countries/${editingCountryCode}`,
			'PATCH',
			{
				nameRu: editCountry.nameRu.trim(),
				nameEn: editCountry.nameEn.trim()
			}
		);
		countrySaving = false;
		if (!result.ok) {
			countryError = result.error ?? 'Failed to update';
			return;
		}
		const updated = result.data as { code: string; nameRu: string; nameEn: string };
		countries = countries.map((c) => (c.code === editingCountryCode ? updated : c));
		editingCountryCode = null;
	}

	// --- Object Type handlers ---
	async function createObjectType() {
		if (!newObjectType.code.trim() || !newObjectType.name.trim()) {
			objectTypeError = 'Code and name are required';
			return;
		}
		objectTypeError = null;
		objectTypeSaving = true;
		const result = await apiCall('/api/emis/dictionaries/object-types', 'POST', {
			code: newObjectType.code.trim(),
			name: newObjectType.name.trim(),
			geometryKind: newObjectType.geometryKind,
			iconKey: newObjectType.iconKey.trim() || null
		});
		objectTypeSaving = false;
		if (!result.ok) {
			objectTypeError = result.error ?? 'Failed to create';
			return;
		}
		const created = result.data as (typeof objectTypes)[0];
		objectTypes = [...objectTypes, created];
		newObjectType = { code: '', name: '', geometryKind: 'point', iconKey: '' };
	}

	function startEditObjectType(id: string) {
		const o = objectTypes.find((i) => i.id === id);
		if (!o) return;
		editingObjectTypeId = id;
		editObjectType = {
			code: o.code,
			name: o.name,
			geometryKind: o.geometryKind,
			iconKey: o.iconKey ?? ''
		};
		objectTypeError = null;
	}

	async function saveObjectType() {
		if (!editingObjectTypeId) return;
		objectTypeError = null;
		objectTypeSaving = true;
		const result = await apiCall(
			`/api/emis/dictionaries/object-types/${editingObjectTypeId}`,
			'PATCH',
			{
				code: editObjectType.code.trim(),
				name: editObjectType.name.trim(),
				geometryKind: editObjectType.geometryKind,
				iconKey: editObjectType.iconKey.trim() || null
			}
		);
		objectTypeSaving = false;
		if (!result.ok) {
			objectTypeError = result.error ?? 'Failed to update';
			return;
		}
		const updated = result.data as (typeof objectTypes)[0];
		objectTypes = objectTypes.map((o) => (o.id === editingObjectTypeId ? updated : o));
		editingObjectTypeId = null;
	}

	// --- Source handlers ---
	async function createSource() {
		if (!newSource.code.trim() || !newSource.name.trim() || !newSource.kind.trim()) {
			sourceError = 'Code, name and kind are required';
			return;
		}
		sourceError = null;
		sourceSaving = true;
		const result = await apiCall('/api/emis/dictionaries/sources', 'POST', {
			code: newSource.code.trim(),
			name: newSource.name.trim(),
			kind: newSource.kind.trim(),
			baseUrl: newSource.baseUrl.trim() || null,
			isActive: newSource.isActive
		});
		sourceSaving = false;
		if (!result.ok) {
			sourceError = result.error ?? 'Failed to create';
			return;
		}
		const created = result.data as (typeof sources)[0];
		sources = [...sources, created];
		newSource = { code: '', name: '', kind: '', baseUrl: '', isActive: true };
	}

	function startEditSource(id: string) {
		const s = sources.find((i) => i.id === id);
		if (!s) return;
		editingSourceId = id;
		editSource = {
			code: s.code,
			name: s.name,
			kind: s.kind,
			baseUrl: s.baseUrl ?? '',
			isActive: s.isActive
		};
		sourceError = null;
	}

	async function saveSource() {
		if (!editingSourceId) return;
		sourceError = null;
		sourceSaving = true;
		const result = await apiCall(`/api/emis/dictionaries/sources/${editingSourceId}`, 'PATCH', {
			code: editSource.code.trim(),
			name: editSource.name.trim(),
			kind: editSource.kind.trim(),
			baseUrl: editSource.baseUrl.trim() || null,
			isActive: editSource.isActive
		});
		sourceSaving = false;
		if (!result.ok) {
			sourceError = result.error ?? 'Failed to update';
			return;
		}
		const updated = result.data as (typeof sources)[0];
		sources = sources.map((s) => (s.id === editingSourceId ? updated : s));
		editingSourceId = null;
	}
</script>

<svelte:head>
	<title>EMIS Admin - Dictionaries</title>
	<meta name="description" content="Admin interface for managing EMIS dictionary tables." />
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/objects">/emis/objects</a>
				<a class="underline underline-offset-4" href="/emis/news">/emis/news</a>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">
					EMIS Admin
				</div>
				<h1 class="type-page-title">Dictionaries</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Manage reference data: countries, object types and sources. These dictionaries are used
					across all EMIS entities.
				</p>
			</div>
		</header>

		<!-- Countries -->
		<Card>
			<CardHeader>
				<CardTitle>Countries</CardTitle>
				<CardDescription>
					ISO 2-letter country codes with Russian and English names ({countries.length} entries)
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if countryError}
					<div class="type-body-sm rounded border border-destructive/30 bg-destructive/10 p-3 text-destructive">
						{countryError}
					</div>
				{/if}

				<div class="overflow-x-auto">
					<table class="type-body-sm w-full text-left">
						<thead>
							<tr class="border-b border-border/60 text-muted-foreground">
								<th class="pb-2 pr-4 font-medium">Code</th>
								<th class="pb-2 pr-4 font-medium">Name (RU)</th>
								<th class="pb-2 pr-4 font-medium">Name (EN)</th>
								<th class="pb-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each countries as country (country.code)}
								{#if editingCountryCode === country.code}
									<tr class="border-b border-border/30 bg-muted/20">
										<td class="py-2 pr-4 font-mono">{country.code}</td>
										<td class="py-2 pr-4">
											<Input bind:value={editCountry.nameRu} class="h-8" />
										</td>
										<td class="py-2 pr-4">
											<Input bind:value={editCountry.nameEn} class="h-8" />
										</td>
										<td class="py-2">
											<div class="flex gap-2">
												<Button size="sm" onclick={saveCountry} loading={countrySaving}>
													Save
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onclick={() => (editingCountryCode = null)}
												>
													Cancel
												</Button>
											</div>
										</td>
									</tr>
								{:else}
									<tr class="border-b border-border/30">
										<td class="py-2 pr-4 font-mono">{country.code}</td>
										<td class="py-2 pr-4">{country.nameRu}</td>
										<td class="py-2 pr-4">{country.nameEn}</td>
										<td class="py-2">
											<Button
												size="sm"
												variant="ghost"
												onclick={() => startEditCountry(country.code)}
											>
												Edit
											</Button>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>

				<div class="border-t border-border/40 pt-4">
					<div class="type-caption mb-2 font-medium text-muted-foreground">Add country</div>
					<div class="grid gap-3 sm:grid-cols-4">
						<Input
							bind:value={newCountry.code}
							placeholder="Code (2 chars)"
							maxlength={2}
							class="h-8 uppercase"
						/>
						<Input bind:value={newCountry.nameRu} placeholder="Name (RU)" class="h-8" />
						<Input bind:value={newCountry.nameEn} placeholder="Name (EN)" class="h-8" />
						<Button size="sm" onclick={createCountry} loading={countrySaving}>Add</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Object Types -->
		<Card>
			<CardHeader>
				<CardTitle>Object Types</CardTitle>
				<CardDescription>
					Types of EMIS objects with geometry kind and icon ({objectTypes.length} entries)
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if objectTypeError}
					<div class="type-body-sm rounded border border-destructive/30 bg-destructive/10 p-3 text-destructive">
						{objectTypeError}
					</div>
				{/if}

				<div class="overflow-x-auto">
					<table class="type-body-sm w-full text-left">
						<thead>
							<tr class="border-b border-border/60 text-muted-foreground">
								<th class="pb-2 pr-4 font-medium">Code</th>
								<th class="pb-2 pr-4 font-medium">Name</th>
								<th class="pb-2 pr-4 font-medium">Geometry</th>
								<th class="pb-2 pr-4 font-medium">Icon</th>
								<th class="pb-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each objectTypes as ot (ot.id)}
								{#if editingObjectTypeId === ot.id}
									<tr class="border-b border-border/30 bg-muted/20">
										<td class="py-2 pr-4">
											<Input bind:value={editObjectType.code} class="h-8" />
										</td>
										<td class="py-2 pr-4">
											<Input bind:value={editObjectType.name} class="h-8" />
										</td>
										<td class="py-2 pr-4">
											<Select bind:value={editObjectType.geometryKind} class="h-8">
												{#each GEOMETRY_KINDS as gk}
													<option value={gk}>{gk}</option>
												{/each}
											</Select>
										</td>
										<td class="py-2 pr-4">
											<Input
												bind:value={editObjectType.iconKey}
												placeholder="icon key"
												class="h-8"
											/>
										</td>
										<td class="py-2">
											<div class="flex gap-2">
												<Button size="sm" onclick={saveObjectType} loading={objectTypeSaving}>
													Save
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onclick={() => (editingObjectTypeId = null)}
												>
													Cancel
												</Button>
											</div>
										</td>
									</tr>
								{:else}
									<tr class="border-b border-border/30">
										<td class="py-2 pr-4 font-mono">{ot.code}</td>
										<td class="py-2 pr-4">{ot.name}</td>
										<td class="py-2 pr-4">{ot.geometryKind}</td>
										<td class="py-2 pr-4">{ot.iconKey ?? '—'}</td>
										<td class="py-2">
											<Button
												size="sm"
												variant="ghost"
												onclick={() => startEditObjectType(ot.id)}
											>
												Edit
											</Button>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>

				<div class="border-t border-border/40 pt-4">
					<div class="type-caption mb-2 font-medium text-muted-foreground">Add object type</div>
					<div class="grid gap-3 sm:grid-cols-5">
						<Input bind:value={newObjectType.code} placeholder="Code" class="h-8" />
						<Input bind:value={newObjectType.name} placeholder="Name" class="h-8" />
						<Select bind:value={newObjectType.geometryKind} class="h-8">
							{#each GEOMETRY_KINDS as gk}
								<option value={gk}>{gk}</option>
							{/each}
						</Select>
						<Input bind:value={newObjectType.iconKey} placeholder="Icon key" class="h-8" />
						<Button size="sm" onclick={createObjectType} loading={objectTypeSaving}>Add</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Sources -->
		<Card>
			<CardHeader>
				<CardTitle>Sources</CardTitle>
				<CardDescription>
					News and data ingestion sources ({sources.length} entries)
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if sourceError}
					<div class="type-body-sm rounded border border-destructive/30 bg-destructive/10 p-3 text-destructive">
						{sourceError}
					</div>
				{/if}

				<div class="overflow-x-auto">
					<table class="type-body-sm w-full text-left">
						<thead>
							<tr class="border-b border-border/60 text-muted-foreground">
								<th class="pb-2 pr-4 font-medium">Code</th>
								<th class="pb-2 pr-4 font-medium">Name</th>
								<th class="pb-2 pr-4 font-medium">Kind</th>
								<th class="pb-2 pr-4 font-medium">Base URL</th>
								<th class="pb-2 pr-4 font-medium">Active</th>
								<th class="pb-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each sources as src (src.id)}
								{#if editingSourceId === src.id}
									<tr class="border-b border-border/30 bg-muted/20">
										<td class="py-2 pr-4">
											<Input bind:value={editSource.code} class="h-8" />
										</td>
										<td class="py-2 pr-4">
											<Input bind:value={editSource.name} class="h-8" />
										</td>
										<td class="py-2 pr-4">
											<Input bind:value={editSource.kind} class="h-8" />
										</td>
										<td class="py-2 pr-4">
											<Input bind:value={editSource.baseUrl} placeholder="URL" class="h-8" />
										</td>
										<td class="py-2 pr-4">
											<input type="checkbox" bind:checked={editSource.isActive} />
										</td>
										<td class="py-2">
											<div class="flex gap-2">
												<Button size="sm" onclick={saveSource} loading={sourceSaving}>
													Save
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onclick={() => (editingSourceId = null)}
												>
													Cancel
												</Button>
											</div>
										</td>
									</tr>
								{:else}
									<tr class="border-b border-border/30">
										<td class="py-2 pr-4 font-mono">{src.code}</td>
										<td class="py-2 pr-4">{src.name}</td>
										<td class="py-2 pr-4">{src.kind}</td>
										<td class="py-2 pr-4 max-w-[200px] truncate font-mono text-xs">
											{src.baseUrl ?? '—'}
										</td>
										<td class="py-2 pr-4">{src.isActive ? 'Yes' : 'No'}</td>
										<td class="py-2">
											<Button
												size="sm"
												variant="ghost"
												onclick={() => startEditSource(src.id)}
											>
												Edit
											</Button>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>

				<div class="border-t border-border/40 pt-4">
					<div class="type-caption mb-2 font-medium text-muted-foreground">Add source</div>
					<div class="grid gap-3 sm:grid-cols-6">
						<Input bind:value={newSource.code} placeholder="Code" class="h-8" />
						<Input bind:value={newSource.name} placeholder="Name" class="h-8" />
						<Input bind:value={newSource.kind} placeholder="Kind" class="h-8" />
						<Input bind:value={newSource.baseUrl} placeholder="Base URL" class="h-8" />
						<label class="flex items-center gap-2 type-caption text-muted-foreground">
							<input type="checkbox" bind:checked={newSource.isActive} />
							Active
						</label>
						<Button size="sm" onclick={createSource} loading={sourceSaving}>Add</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
