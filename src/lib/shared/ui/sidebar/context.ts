import { derived, get, writable, type Readable, type Writable } from 'svelte/store';

export type SidebarSide = 'left' | 'right';

export type SidebarContext = {
	/** Desktop open state (>= lg). */
	openDesktop: Writable<boolean>;
	/** Mobile open state (< lg). */
	openMobile: Writable<boolean>;
	/** Collapsed state (desktop only): показываем только иконки. */
	collapsed: Writable<boolean>;
	/** Current viewport is desktop (>= lg). */
	isDesktop: Writable<boolean>;
	/** Convenience "effective open" depending on viewport. */
	isOpen: Readable<boolean>;
	/** Toggle: desktop toggles collapsed, mobile toggles openMobile (drawer). */
	toggle: () => void;
	/** Expand sidebar (desktop: uncollapse, mobile: open drawer). */
	open: () => void;
	/** Collapse/close sidebar (desktop: collapse, mobile: close drawer). */
	close: () => void;
	/** Toggle collapsed state on desktop. */
	toggleCollapse: () => void;
};

export const SIDEBAR_CTX = Symbol('SIDEBAR_CTX');

export function createSidebarContext(opts?: {
	defaultDesktopOpen?: boolean;
	defaultMobileOpen?: boolean;
	defaultCollapsed?: boolean;
}) {
	const openDesktop = writable(opts?.defaultDesktopOpen ?? true);
	const openMobile = writable(opts?.defaultMobileOpen ?? false);
	const collapsed = writable(opts?.defaultCollapsed ?? false);
	const isDesktop = writable(false);

	const isOpen = derived([openDesktop, openMobile, isDesktop], ([$d, $m, $isDesktop]) =>
		$isDesktop ? $d : $m
	);

	function open() {
		if (get(isDesktop)) {
			openDesktop.set(true);
			collapsed.set(false);
		} else {
			openMobile.set(true);
		}
	}

	function close() {
		if (get(isDesktop)) {
			collapsed.set(true);
		} else {
			openMobile.set(false);
		}
	}

	function toggle() {
		if (get(isDesktop)) {
			collapsed.update((v) => !v);
		} else {
			openMobile.update((v) => !v);
		}
	}

	function toggleCollapse() {
		collapsed.update((v) => !v);
	}

	return {
		openDesktop,
		openMobile,
		collapsed,
		isDesktop,
		isOpen,
		toggle,
		open,
		close,
		toggleCollapse
	} satisfies SidebarContext;
}


