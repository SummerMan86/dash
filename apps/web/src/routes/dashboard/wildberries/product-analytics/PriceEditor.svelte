<script lang="ts">
	import { Button } from '@dashboard-builder/platform-ui';
	import { Input } from '@dashboard-builder/platform-ui';
	import { formatNumber } from '@dashboard-builder/platform-core';
	import type { ProductSummary } from './types';

	// --- Props ---
	let {
		product,
		onSuccess,
		onError: onErrorCallback
	}: {
		product: ProductSummary;
		onSuccess?: () => void;
		onError?: (msg: string) => void;
	} = $props();

	// --- State machine ---
	type PriceEditState = 'idle' | 'editing' | 'loading' | 'success' | 'error';

	let priceEditState = $state<PriceEditState>('idle');
	let priceInput = $state<string>('');
	let discountInput = $state<string>('');
	let priceEditError = $state<string>('');
	let priceEditMode = $state<'price' | 'discount'>('price');

	function openPriceEdit(mode: 'price' | 'discount') {
		priceEditMode = mode;
		priceEditState = 'editing';
		priceEditError = '';
		if (mode === 'price') {
			priceInput = String(product.price_max || '');
		} else {
			discountInput = '';
		}
	}

	function cancelPriceEdit() {
		priceEditState = 'idle';
		priceEditError = '';
	}

	async function applyPriceChange() {
		const price = priceEditMode === 'price' ? Number(priceInput) : undefined;
		const discount = priceEditMode === 'discount' ? Number(discountInput) : undefined;

		if (priceEditMode === 'price' && (!price || price <= 0)) {
			priceEditError = 'Введите корректную цену';
			return;
		}
		if (priceEditMode === 'discount' && (discount === undefined || discount < 0 || discount > 95)) {
			priceEditError = 'Скидка должна быть от 0 до 95%';
			return;
		}

		priceEditState = 'loading';
		priceEditError = '';

		try {
			const res = await fetch('/api/wb/prices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nmId: product.nm_id, price, discount })
			});
			const data = await res.json();
			if (!res.ok) {
				priceEditState = 'error';
				priceEditError = data.error ?? 'Неизвестная ошибка';
				onErrorCallback?.(priceEditError);
			} else {
				priceEditState = 'success';
				onSuccess?.();
				setTimeout(() => {
					priceEditState = 'idle';
				}, 3000);
			}
		} catch {
			priceEditState = 'error';
			priceEditError = 'Ошибка сети';
			onErrorCallback?.(priceEditError);
		}
	}

	// Reset edit state when product changes
	$effect(() => {
		product.nm_id;
		priceEditState = 'idle';
		priceEditError = '';
	});
</script>

<!-- Price Management -->
<div class="border-b border-border px-6 py-4">
	<div class="flex flex-wrap items-center gap-3">
		<div class="flex items-center gap-2 text-sm">
			<span class="text-muted-foreground">Текущая цена:</span>
			<span class="font-semibold tabular-nums">
				{#if product.price_min === product.price_max}
					{formatNumber(product.price_max)} ₽
				{:else}
					{formatNumber(product.price_min)}–{formatNumber(product.price_max)} ₽
				{/if}
			</span>
		</div>

		{#if priceEditState === 'idle'}
			<Button variant="outline" size="sm" onclick={() => openPriceEdit('price')}>
				<svg
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
					<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
				</svg>
				Изменить цену
			</Button>
			<Button variant="outline" size="sm" onclick={() => openPriceEdit('discount')}>
				<svg
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"
					/>
					<line x1="7" y1="7" x2="7.01" y2="7" />
				</svg>
				Изменить скидку
			</Button>
		{/if}

		{#if priceEditState === 'success'}
			<span class="type-caption-strong flex items-center gap-1.5 text-success">
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				Отправлено в WB. Изменение появится через 2–5 минут.
			</span>
		{/if}
	</div>

	{#if priceEditState === 'editing' || priceEditState === 'loading' || priceEditState === 'error'}
		<div class="mt-3 flex flex-wrap items-end gap-3">
			{#if priceEditMode === 'price'}
				<div class="flex flex-col gap-1">
					<label class="type-caption-strong text-muted-foreground" for="price-input">
						Новая цена (₽, без скидки)
					</label>
					<Input
						id="price-input"
						type="number"
						min="1"
						step="1"
						class="w-36 tabular-nums"
						bind:value={priceInput}
						disabled={priceEditState === 'loading'}
					/>
				</div>
			{:else}
				<div class="flex flex-col gap-1">
					<label class="type-caption-strong text-muted-foreground" for="discount-input">
						Скидка (0–95%)
					</label>
					<Input
						id="discount-input"
						type="number"
						min="0"
						max="95"
						step="1"
						class="w-28 tabular-nums"
						bind:value={discountInput}
						disabled={priceEditState === 'loading'}
					/>
				</div>
			{/if}

			<div class="flex items-center gap-2">
				<Button
					size="sm"
					loading={priceEditState === 'loading'}
					onclick={applyPriceChange}
					disabled={priceEditState === 'loading'}
				>
					{priceEditState === 'loading' ? 'Отправка…' : 'Применить'}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={cancelPriceEdit}
					disabled={priceEditState === 'loading'}
				>
					Отмена
				</Button>
			</div>

			{#if priceEditError}
				<span class="type-caption text-error">{priceEditError}</span>
			{/if}
		</div>
	{/if}
</div>
