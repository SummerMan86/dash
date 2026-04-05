<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>EMIS Login</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<h1 class="login-title">EMIS</h1>
		<p class="login-subtitle">Sign in to continue</p>

		{#if !data.authEnabled}
			<div class="login-info">
				<p>Authentication is not configured.</p>
				<p>Set <code>EMIS_AUTH_MODE=session</code> and <code>EMIS_USERS</code> to enable.</p>
			</div>
		{:else}
			{#if form?.error}
				<div class="login-error" role="alert">
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance class="login-form">
				<div class="form-field">
					<label for="username">Username</label>
					<input
						id="username"
						name="username"
						type="text"
						autocomplete="username"
						required
						value={form?.username ?? ''}
					/>
				</div>

				<div class="form-field">
					<label for="password">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
					/>
				</div>

				<button type="submit" class="login-button">Sign in</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 80vh;
		padding: 1rem;
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		padding: 2rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.login-title {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
		font-weight: 700;
		text-align: center;
	}

	.login-subtitle {
		margin: 0 0 1.5rem;
		font-size: 0.875rem;
		color: #64748b;
		text-align: center;
	}

	.login-error {
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #b91c1c;
		font-size: 0.875rem;
	}

	.login-info {
		text-align: center;
		color: #64748b;
		font-size: 0.875rem;
	}

	.login-info code {
		background: #f1f5f9;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.8125rem;
	}

	.login-form {
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

	.login-button {
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

	.login-button:hover {
		background: #1d4ed8;
	}

	.login-button:active {
		background: #1e3a8a;
	}
</style>
