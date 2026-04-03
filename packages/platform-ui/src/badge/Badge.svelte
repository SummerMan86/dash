<!--
  Badge Component
  Compact label for status, counts, and categories

  Usage:
    <Badge>Default</Badge>
    <Badge variant="success">Active</Badge>
    <Badge variant="error" size="sm">3</Badge>
    <Badge variant="outline">Category</Badge>
-->

<script lang="ts">
	import { cn } from '../styles/utils';
	import type { Snippet } from 'svelte';

	type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'muted';
	type BadgeSize = 'sm' | 'default';

	interface Props {
		variant?: BadgeVariant;
		size?: BadgeSize;
		class?: string;
		children?: Snippet;
		[key: string]: unknown;
	}

	let {
		variant = 'default',
		size = 'default',
		class: className,
		children,
		...rest
	}: Props = $props();

	const variants: Record<BadgeVariant, string> = {
		default: 'bg-primary/10 text-primary border-primary/20',
		success: 'bg-success-muted text-success-muted-foreground border-success/20',
		warning: 'bg-warning-muted text-warning-muted-foreground border-warning/20',
		error: 'bg-error-muted text-error-muted-foreground border-error/20',
		info: 'bg-info-muted text-info-muted-foreground border-info/20',
		outline: 'bg-transparent text-foreground border-border',
		muted: 'bg-muted text-muted-foreground border-transparent'
	};

	const sizes: Record<BadgeSize, string> = {
		sm: 'px-1.5 py-0.5 text-[10px]',
		default: 'px-2.5 py-0.5'
	};
</script>

<span
	class={cn(
		'type-badge inline-flex items-center gap-1 rounded-full border',
		'transition-colors duration-[var(--transition-fast)]',
		variants[variant],
		sizes[size],
		className
	)}
	{...rest}
>
	{#if children}
		{@render children()}
	{/if}
</span>
