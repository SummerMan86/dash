<script lang="ts">
	import type { PageData } from './$types';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@dashboard-builder/platform-ui';

	let { data }: { data: PageData } = $props();
	let c = $derived(data.candidate);

	let resolving = $state(false);
	let resolveError = $state<string | null>(null);

	async function resolve(resolution: string, targetObjectId?: string) {
		resolving = true;
		resolveError = null;
		try {
			const body: Record<string, string> = { resolution };
			if (targetObjectId) body.targetObjectId = targetObjectId;

			const res = await fetch(`/api/emis/ingestion/conflicts/${c.id}/resolve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const err = await res.json();
				resolveError = err.error ?? 'Resolve failed';
				return;
			}
			window.location.reload();
		} finally {
			resolving = false;
		}
	}
</script>

<svelte:head>
	<title>Imported Candidate {c.name ?? c.sourceRef} - EMIS</title>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis</a>
				<a class="underline underline-offset-4" href="/emis/objects">/objects</a>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">
					Imported Candidate
				</div>
				<h1 class="type-page-title">{c.name ?? c.sourceRef}</h1>
			</div>
		</header>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Candidate Info</CardTitle>
					<CardDescription>{c.sourceCode} / {c.sourceRef}</CardDescription>
				</CardHeader>
				<CardContent>
					<dl class="grid grid-cols-2 gap-2 type-body-sm">
						<dt class="text-muted-foreground">Status</dt>
						<dd><span class="rounded bg-muted px-2 py-0.5">{c.status}</span></dd>
						<dt class="text-muted-foreground">Resolution</dt>
						<dd>{c.resolution ?? '—'}</dd>
						<dt class="text-muted-foreground">Object Type</dt>
						<dd>{c.objectTypeCode ?? '—'}</dd>
						<dt class="text-muted-foreground">Country</dt>
						<dd>{c.countryCode ?? '—'}</dd>
						<dt class="text-muted-foreground">Geometry</dt>
						<dd>{c.geometryType ?? 'none'}</dd>
						<dt class="text-muted-foreground">Name EN</dt>
						<dd>{c.nameEn ?? '—'}</dd>
						{#if c.promotedObjectId}
							<dt class="text-muted-foreground">Published to</dt>
							<dd>
								<a class="underline" href="/emis/objects/{c.promotedObjectId}">{c.promotedObjectId}</a>
							</dd>
						{/if}
					</dl>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Match Candidates ({c.matches.length})</CardTitle>
				</CardHeader>
				<CardContent>
					{#if c.matches.length === 0}
						<p class="type-body-sm text-muted-foreground">No matches found.</p>
					{:else}
						<ul class="space-y-3">
							{#each c.matches as match}
								<li class="rounded border p-3">
									<div class="flex items-center justify-between">
										<a class="type-body-sm font-medium underline" href="/emis/objects/{match.matchedObjectId}">
											{match.matchedObjectName}
										</a>
										<span class="type-caption text-muted-foreground">
											{match.matchKind} ({match.score !== null ? (match.score * 100).toFixed(0) + '%' : '—'})
										</span>
									</div>
								</li>
							{/each}
						</ul>
					{/if}

					{#if c.resolution}
						<div class="mt-4 rounded bg-muted/50 p-3">
							<p class="type-caption font-medium text-muted-foreground">Winner Rule</p>
							<p class="type-body-sm">
								{#if c.resolution === 'unique'}
									No matches found — candidate is unique.
								{:else if c.resolution === 'duplicate_with_clear_winner'}
									Source-priority policy or high-confidence match resolved a clear winner.
								{:else if c.resolution === 'possible_duplicate_low_confidence'}
									Matches found but confidence is too low for auto-resolution. Manual review required.
								{:else if c.resolution === 'invalid_or_unmapped'}
									Candidate has no mapped object type or failed validation.
								{/if}
							</p>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Raw Payload</CardTitle>
			</CardHeader>
			<CardContent>
				<pre class="max-h-96 overflow-auto rounded bg-muted p-4 font-mono text-xs">{JSON.stringify(c.rawPayload, null, 2)}</pre>
			</CardContent>
		</Card>

		{#if c.status !== 'published' && c.status !== 'rejected'}
			<Card>
				<CardHeader>
					<CardTitle>Resolve Actions</CardTitle>
				</CardHeader>
				<CardContent>
					{#if resolveError}
						<div class="mb-4 rounded border border-error/30 bg-error-muted/30 p-3 type-body-sm text-error">
							{resolveError}
						</div>
					{/if}
					<div class="flex flex-wrap gap-3">
						<button
							class="rounded bg-primary px-4 py-2 text-primary-foreground type-body-sm disabled:opacity-50"
							disabled={resolving}
							onclick={() => resolve('unique')}
						>
							Publish as New
						</button>
						{#if c.matches.length > 0}
							<button
								class="rounded bg-secondary px-4 py-2 text-secondary-foreground type-body-sm disabled:opacity-50"
								disabled={resolving}
								onclick={() => resolve('duplicate_with_clear_winner', c.matches[0].matchedObjectId)}
							>
								Merge with {c.matches[0].matchedObjectName}
							</button>
						{/if}
						<button
							class="rounded border px-4 py-2 type-body-sm disabled:opacity-50"
							disabled={resolving}
							onclick={() => resolve('possible_duplicate_low_confidence')}
						>
							Hold (Low Confidence)
						</button>
						<button
							class="rounded bg-muted px-4 py-2 type-body-sm disabled:opacity-50"
							disabled={resolving}
							onclick={() => resolve('invalid_or_unmapped')}
						>
							Reject
						</button>
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
