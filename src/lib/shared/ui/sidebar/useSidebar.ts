import { getContext } from 'svelte';
import { SIDEBAR_CTX, type SidebarContext } from './context';

export function useSidebar() {
	const ctx = getContext<SidebarContext>(SIDEBAR_CTX) as SidebarContext | undefined;
	if (!ctx) {
		throw new Error('Sidebar components must be used within <SidebarProvider>.');
	}
	return ctx;
}


