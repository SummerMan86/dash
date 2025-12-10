<!--
  Button Component - Adapted from shadcn-svelte
  Carbon Design System integration

  Features:
  - 6 variants (default/primary, destructive, outline, secondary, ghost, link)
  - 4 sizes (sm, default, lg, icon)
  - Full accessibility (ARIA, keyboard)
  - Loading state
  - Disabled state
  - Icon support
-->


<script lang="ts">
	// 1. Imports
	import { cn } from '$shared/styles/utils';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	// 2. Types
	type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
	type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

	// 3. Props interface
	interface Props extends HTMLButtonAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		loading?: boolean;
		class?: string;
		children?: Snippet;
	}
    // 4. Получение props ($props)  
	let {
		variant = 'default',
		size = 'default',
		loading = false,
		class: className,
		children,
		disabled,
		...rest
	}: Props = $props();

	// ========================================
	// VARIANT STYLES - Carbon DS Adapted
	// ========================================
	// Changed: hover:bg-primary/90 → hover:bg-primary-hover (Carbon tokens)
	// Changed: Secondary uses Carbon gray-80 instead of zinc
	// Rest: Same structure as shadcn-svelte

	// 5. Private variables
	const variants: Record<ButtonVariant, string> = {
		// Primary action - Carbon blue-60
		default:
			'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled',

		// Destructive action - Carbon red-60
		destructive:
			'bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-active',

		// Outline variant - using Carbon borders
		outline:
			'border border-input bg-background hover:bg-accent hover:text-accent-foreground',

		// Secondary action - Carbon gray-80
		secondary:
			'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-active',

		// Ghost - subtle hover only
		ghost: 'hover:bg-accent hover:text-accent-foreground',

		// Link style
		link: 'text-primary underline-offset-4 hover:underline'
	};

	// Size variants - same as shadcn-svelte
	const sizes: Record<ButtonSize, string> = {
		default: 'h-10 px-4 py-2',
		sm: 'h-9 rounded-md px-3 text-sm',
		lg: 'h-11 rounded-md px-8 text-lg',
		icon: 'h-10 w-10'
	};
</script>

<button
	class={cn(
		// Base styles
		'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
		'ring-offset-background transition-colors',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'disabled:pointer-events-none disabled:opacity-50',

		// Apply variant and size
		variants[variant],
		sizes[size],

		// Loading state
		loading && 'cursor-wait',

		// Custom classes
		className
	)}
	disabled={loading || disabled}
	{...rest}
>
	{#if loading}
		<!-- Loading spinner -->
		<svg
			class="animate-spin h-4 w-4"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle
				class="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
		<span class="sr-only">Loading...</span>
	{/if}

	{#if children}
		{@render children()}
	{/if}
</button>
