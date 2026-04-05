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

	const ROLES = ['viewer', 'editor', 'admin'] as const;

	// --- Users state ---
	type UserRow = { id: string; username: string; role: string; createdAt: string; updatedAt: string };
	let users: UserRow[] = $state(data.users.map((u) => ({ ...u })));
	let currentUserId = data.currentUserId;

	// --- Create user form ---
	let newUser = $state({ username: '', password: '', role: 'viewer' as string });
	let createError: string | null = $state(null);
	let createSaving = $state(false);

	// --- Edit user state ---
	let editingUserId: string | null = $state(null);
	let editUser = $state({ role: 'viewer' as string, password: '' });
	let editError: string | null = $state(null);
	let editSaving = $state(false);

	// --- Delete user state ---
	let deletingUserId: string | null = $state(null);
	let deleteError: string | null = $state(null);
	let deleteSaving = $state(false);

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

	// --- Create handler ---
	async function createUser() {
		if (!newUser.username.trim() || !newUser.password.trim()) {
			createError = 'Username and password are required';
			return;
		}
		if (newUser.password.length < 8) {
			createError = 'Password must be at least 8 characters';
			return;
		}
		createError = null;
		createSaving = true;
		const result = await apiCall('/api/emis/admin/users', 'POST', {
			username: newUser.username.trim(),
			password: newUser.password,
			role: newUser.role
		});
		createSaving = false;
		if (!result.ok) {
			createError = result.error ?? 'Failed to create user';
			return;
		}
		const created = result.data as UserRow;
		users = [...users, created];
		newUser = { username: '', password: '', role: 'viewer' };
	}

	// --- Edit handlers ---
	function startEdit(id: string) {
		const u = users.find((i) => i.id === id);
		if (!u) return;
		editingUserId = id;
		editUser = { role: u.role, password: '' };
		editError = null;
	}

	async function saveEdit() {
		if (!editingUserId) return;
		editError = null;

		const patch: Record<string, unknown> = { role: editUser.role };
		if (editUser.password.trim()) {
			if (editUser.password.length < 8) {
				editError = 'Password must be at least 8 characters';
				return;
			}
			patch.password = editUser.password;
		}

		editSaving = true;
		const result = await apiCall(`/api/emis/admin/users/${editingUserId}`, 'PATCH', patch);
		editSaving = false;
		if (!result.ok) {
			editError = result.error ?? 'Failed to update user';
			return;
		}
		const updated = result.data as UserRow;
		users = users.map((u) => (u.id === editingUserId ? updated : u));
		editingUserId = null;
	}

	function cancelEdit() {
		editingUserId = null;
		editError = null;
	}

	// --- Delete handlers ---
	function startDelete(id: string) {
		deletingUserId = id;
		deleteError = null;
	}

	function cancelDelete() {
		deletingUserId = null;
		deleteError = null;
	}

	async function confirmDelete() {
		if (!deletingUserId) return;
		deleteError = null;
		deleteSaving = true;
		const result = await apiCall(`/api/emis/admin/users/${deletingUserId}`, 'DELETE');
		deleteSaving = false;
		if (!result.ok) {
			deleteError = result.error ?? 'Failed to delete user';
			return;
		}
		users = users.filter((u) => u.id !== deletingUserId);
		deletingUserId = null;
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleString('ru-RU', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>EMIS Admin - Users</title>
	<meta name="description" content="Admin interface for managing EMIS user accounts." />
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/admin/dictionaries">/admin/dictionaries</a>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS Admin</div>
				<h1 class="type-page-title">User Management</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Manage user accounts: create, edit roles, reset passwords and delete users.
				</p>
			</div>
		</header>

		<!-- Users table -->
		<Card>
			<CardHeader>
				<CardTitle>Users</CardTitle>
				<CardDescription>
					Registered EMIS users ({users.length} total)
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if editError}
					<div
						class="type-body-sm rounded border border-destructive/30 bg-destructive/10 p-3 text-destructive"
					>
						{editError}
					</div>
				{/if}

				<div class="overflow-x-auto">
					<table class="type-body-sm w-full text-left">
						<thead>
							<tr class="border-b border-border/60 text-muted-foreground">
								<th class="pr-4 pb-2 font-medium">Username</th>
								<th class="pr-4 pb-2 font-medium">Role</th>
								<th class="pr-4 pb-2 font-medium">Created</th>
								<th class="pb-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each users as user (user.id)}
								{#if editingUserId === user.id}
									<tr class="border-b border-border/30 bg-muted/20">
										<td class="py-2 pr-4 font-mono">
											{user.username}
											{#if user.id === currentUserId}
												<span class="type-caption ml-1 text-muted-foreground">(you)</span>
											{/if}
										</td>
										<td class="py-2 pr-4">
											<Select bind:value={editUser.role} class="h-8">
												{#each ROLES as r}
													<option value={r}>{r}</option>
												{/each}
											</Select>
										</td>
										<td class="py-2 pr-4">
											<Input
												bind:value={editUser.password}
												type="password"
												placeholder="New password (leave empty to keep)"
												class="h-8"
											/>
										</td>
										<td class="py-2">
											<div class="flex gap-2">
												<Button size="sm" onclick={saveEdit} loading={editSaving}>
													Save
												</Button>
												<Button size="sm" variant="ghost" onclick={cancelEdit}>
													Cancel
												</Button>
											</div>
										</td>
									</tr>
								{:else}
									<tr class="border-b border-border/30">
										<td class="py-2 pr-4 font-mono">
											{user.username}
											{#if user.id === currentUserId}
												<span class="type-caption ml-1 text-muted-foreground">(you)</span>
											{/if}
										</td>
										<td class="py-2 pr-4">
											<span
												class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
												class:bg-blue-100={user.role === 'viewer'}
												class:text-blue-800={user.role === 'viewer'}
												class:bg-amber-100={user.role === 'editor'}
												class:text-amber-800={user.role === 'editor'}
												class:bg-emerald-100={user.role === 'admin'}
												class:text-emerald-800={user.role === 'admin'}
											>
												{user.role}
											</span>
										</td>
										<td class="py-2 pr-4 text-muted-foreground">
											{formatDate(user.createdAt)}
										</td>
										<td class="py-2">
											<div class="flex gap-2">
												<Button size="sm" variant="ghost" onclick={() => startEdit(user.id)}>
													Edit
												</Button>
												{#if user.id !== currentUserId}
													<Button
														size="sm"
														variant="ghost"
														class="text-destructive hover:text-destructive"
														onclick={() => startDelete(user.id)}
													>
														Delete
													</Button>
												{/if}
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>

		<!-- Delete confirmation dialog -->
		{#if deletingUserId}
			{@const userToDelete = users.find((u) => u.id === deletingUserId)}
			<Card>
				<CardHeader>
					<CardTitle class="text-destructive">Confirm Deletion</CardTitle>
					<CardDescription>
						Are you sure you want to delete user <strong>{userToDelete?.username}</strong>?
						This action cannot be undone. All sessions of this user will be terminated.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if deleteError}
						<div
							class="type-body-sm rounded border border-destructive/30 bg-destructive/10 p-3 text-destructive"
						>
							{deleteError}
						</div>
					{/if}
					<div class="flex gap-3">
						<Button
							size="sm"
							variant="destructive"
							onclick={confirmDelete}
							loading={deleteSaving}
						>
							Delete User
						</Button>
						<Button size="sm" variant="ghost" onclick={cancelDelete}>
							Cancel
						</Button>
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Create user form -->
		<Card>
			<CardHeader>
				<CardTitle>Create User</CardTitle>
				<CardDescription>
					Add a new user account. Password must be at least 8 characters.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if createError}
					<div
						class="type-body-sm rounded border border-destructive/30 bg-destructive/10 p-3 text-destructive"
					>
						{createError}
					</div>
				{/if}
				<div class="grid gap-3 sm:grid-cols-4">
					<Input
						bind:value={newUser.username}
						placeholder="Username"
						class="h-8"
					/>
					<Input
						bind:value={newUser.password}
						type="password"
						placeholder="Password (min 8 chars)"
						class="h-8"
					/>
					<Select bind:value={newUser.role} class="h-8">
						{#each ROLES as r}
							<option value={r}>{r}</option>
						{/each}
					</Select>
					<Button size="sm" onclick={createUser} loading={createSaving}>Add User</Button>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
