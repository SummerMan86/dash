<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// --- Form state ---
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let saving = $state(false);
	let error: string | null = $state(null);
	let success: string | null = $state(null);

	// --- Client-side validation ---
	let validationError = $derived.by(() => {
		if (newPassword && newPassword.length < 8) {
			return 'New password must be at least 8 characters.';
		}
		if (confirmPassword && newPassword !== confirmPassword) {
			return 'Passwords do not match.';
		}
		return null;
	});

	let canSubmit = $derived(
		currentPassword.length > 0 &&
			newPassword.length >= 8 &&
			newPassword === confirmPassword &&
			!saving
	);

	async function handleChangePassword() {
		error = null;
		success = null;

		if (!canSubmit) return;

		saving = true;
		try {
			const resp = await fetch('/api/emis/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword,
					newPassword
				})
			});

			const json = await resp.json();

			if (!resp.ok) {
				error = json?.error ?? `HTTP ${resp.status}`;
				return;
			}

			success = 'Password changed successfully. All other sessions have been invalidated.';
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Network error';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>EMIS Settings</title>
</svelte:head>

<div class="settings-container">
	<div class="settings-content">
		<header class="settings-header">
			<div class="settings-breadcrumb">
				<a href="/emis">/emis workspace</a>
			</div>
			<h1 class="settings-title">Settings</h1>
			<p class="settings-subtitle">
				Signed in as <strong>{data.username}</strong> ({data.role})
			</p>
		</header>

		<div class="settings-card">
			<h2 class="card-title">Change Password</h2>
			<p class="card-description">
				Update your password. All other active sessions will be signed out.
			</p>

			{#if error}
				<div class="message message-error" role="alert">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="message message-success" role="status">
					{success}
				</div>
			{/if}

			<form
				class="password-form"
				onsubmit={(e) => {
					e.preventDefault();
					handleChangePassword();
				}}
			>
				<div class="form-field">
					<label for="currentPassword">Current password</label>
					<input
						id="currentPassword"
						type="password"
						autocomplete="current-password"
						required
						bind:value={currentPassword}
					/>
				</div>

				<div class="form-field">
					<label for="newPassword">New password</label>
					<input
						id="newPassword"
						type="password"
						autocomplete="new-password"
						required
						minlength={8}
						bind:value={newPassword}
					/>
				</div>

				<div class="form-field">
					<label for="confirmPassword">Confirm new password</label>
					<input
						id="confirmPassword"
						type="password"
						autocomplete="new-password"
						required
						bind:value={confirmPassword}
					/>
				</div>

				{#if validationError}
					<p class="validation-hint">{validationError}</p>
				{/if}

				<button type="submit" class="submit-button" disabled={!canSubmit}>
					{#if saving}
						Changing...
					{:else}
						Change password
					{/if}
				</button>
			</form>
		</div>
	</div>
</div>

<style>
	.settings-container {
		display: flex;
		justify-content: center;
		padding: 2rem 1rem;
	}

	.settings-content {
		width: 100%;
		max-width: 540px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.settings-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.settings-breadcrumb {
		font-size: 0.75rem;
		color: #64748b;
	}

	.settings-breadcrumb a {
		text-decoration: underline;
		text-underline-offset: 4px;
		color: inherit;
	}

	.settings-title {
		margin: 0.5rem 0 0;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.settings-subtitle {
		margin: 0;
		font-size: 0.875rem;
		color: #64748b;
	}

	.settings-card {
		padding: 1.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.card-description {
		margin: 0;
		font-size: 0.875rem;
		color: #64748b;
	}

	.message {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.message-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #b91c1c;
	}

	.message-success {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #15803d;
	}

	.password-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-field label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #334155;
	}

	.form-field input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.form-field input:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
	}

	.validation-hint {
		margin: 0;
		font-size: 0.8125rem;
		color: #b91c1c;
	}

	.submit-button {
		padding: 0.625rem 1rem;
		border: none;
		border-radius: 6px;
		background: #1e40af;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}

	.submit-button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.submit-button:active:not(:disabled) {
		background: #1e3a8a;
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
