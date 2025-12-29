<!--
	WidgetCanvas.svelte

	═══════════════════════════════════════════════════════════════════════════════
	НАЗНАЧЕНИЕ
	═══════════════════════════════════════════════════════════════════════════════
	Интеграционный слой между Svelte и библиотекой GridStack.
	- Svelte отвечает за рендеринг виджетов и управление состоянием
	- GridStack отвечает за drag & drop и resize

	═══════════════════════════════════════════════════════════════════════════════
	КЛЮЧЕВАЯ ПРОБЛЕМА: СИНХРОНИЗАЦИЯ ДВУХ ИСТОЧНИКОВ ИСТИНЫ
	═══════════════════════════════════════════════════════════════════════════════
	Svelte имеет свой массив `widgets`, GridStack имеет внутреннее состояние позиций.
	При drag/resize нужно синхронизировать оба без бесконечных циклов.

	Решение:
	1. Флаги `applyingFromGrid` / `applyingFromStore` блокируют циклы
	2. Svelte action `widgetNode` связывает DOM с GridStack
	3. События `change`, `dragstop`, `resizestop` синхронизируют состояние

	═══════════════════════════════════════════════════════════════════════════════
	ПОТОК ДАННЫХ
	═══════════════════════════════════════════════════════════════════════════════

	Пользователь перетаскивает виджет:
	┌─────────────────────────────────────────────────────────────────────────────┐
	│ Drag → GridStack 'change' → handleGridChange() → onWidgetsChange() → Store │
	│                                       │                                      │
	│                          applyingFromGrid = true                            │
	│                          (блокирует обратную синхронизацию)                  │
	└─────────────────────────────────────────────────────────────────────────────┘

	Store обновляется извне:
	┌─────────────────────────────────────────────────────────────────────────────┐
	│ Store → widgets prop → widgetNode action → syncNodeFromStore() → GridStack │
	│                                       │                                      │
	│                          applyingFromStore = true                           │
	│                          (блокирует событие 'change')                        │
	└─────────────────────────────────────────────────────────────────────────────┘
-->

<script lang="ts">
	import { onDestroy, onMount, tick, type Snippet } from 'svelte';

	import { cn } from '$shared/styles/utils';

	import { DEFAULT_GRID_CONFIG } from '../model/config';
	import type { GridStackApi, GridStackNode } from '../model/gridstack.types';
	import type { DashboardWidget } from '../model/types';
	import { extractNodeId, applyLayoutChanges } from '../model/gridstack-helpers';

	import WidgetCard from './WidgetCard.svelte';

	// ═══════════════════════════════════════════════════════════════════════════
	// СЕКЦИЯ 1: ТИПЫ И ПРОПСЫ
	// ═══════════════════════════════════════════════════════════════════════════

	/** Props for the custom widget snippet */
	export type WidgetSnippetProps = {
		widget: DashboardWidget;
		editable: boolean;
		selected: boolean;
	};

	interface Props {
		widgets?: DashboardWidget[];
		editable?: boolean;
		columns?: number;
		rowHeightPx?: number;
		/** Margin between widgets in pixels */
		margin?: number;
		selectedId?: string | null;
		class?: string;
		/** Custom widget renderer. If not provided, uses default WidgetCard. */
		widgetSnippet?: Snippet<[WidgetSnippetProps]>;
		onWidgetsChange?: (widgets: DashboardWidget[]) => void;
		onFinalize?: (widgets: DashboardWidget[]) => void;
		onSelect?: (id: string) => void;
	}

	let {
		widgets = [],
		editable = true,
		columns = DEFAULT_GRID_CONFIG.columns,
		rowHeightPx = DEFAULT_GRID_CONFIG.rowHeightPx,
		margin = DEFAULT_GRID_CONFIG.margin,
		selectedId = null,
		class: className,
		widgetSnippet,
		onWidgetsChange,
		onFinalize,
		onSelect
	}: Props = $props();

	// ═══════════════════════════════════════════════════════════════════════════
	// СЕКЦИЯ 2: СОСТОЯНИЕ СИНХРОНИЗАЦИИ
	// Флаги и переменные для предотвращения бесконечных циклов обновлений
	// ═══════════════════════════════════════════════════════════════════════════

	/**
	 * Снимок последнего состояния виджетов.
	 * Нужен для `onFinalize`, который вызывается асинхронно после dragstop/resizestop.
	 * К этому моменту реактивное состояние может уже измениться, поэтому храним снимок.
	 */
	let lastWidgets = widgets;
	$effect(() => {
		lastWidgets = widgets;
	});

	/** Ссылка на DOM-контейнер для GridStack */
	let gridEl: HTMLDivElement | null = $state(null);

	/** Инстанс GridStack (null до инициализации) */
	let grid: GridStackApi | null = null;

	/**
	 * Флаг: сейчас применяем изменения ОТ GridStack К Store.
	 * Когда true, игнорируем входящие обновления от Store (предотвращаем цикл).
	 */
	let applyingFromGrid = false;

	/**
	 * Флаг: сейчас применяем изменения ОТ Store К GridStack.
	 * Когда true, игнорируем события 'change' от GridStack (предотвращаем цикл).
	 */
	let applyingFromStore = false;

	/**
	 * Виджеты могут отрендериться ДО инициализации GridStack (Svelte рендерит первым).
	 * Запоминаем такие DOM-элементы и "усыновляем" их в GridStack после init.
	 */
	const pendingWidgetEls = new Set<HTMLElement>();

	/** Параметры для Svelte action widgetNode */
	type WidgetActionParams = {
		id: string;
		layout: DashboardWidget['layout'];
		editable: boolean;
	};

	// ═══════════════════════════════════════════════════════════════════════════
	// СЕКЦИЯ 3: ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
	// Утилиты для работы с флагами и синхронизации состояния
	// ═══════════════════════════════════════════════════════════════════════════

	/**
	 * Выполняет функцию с установленным флагом applyingFromStore.
	 * Используется при записи данных из Store в GridStack.
	 */
	function withApplyingFromStore<T>(fn: () => T): T {
		applyingFromStore = true;
		try {
			return fn();
		} finally {
			applyingFromStore = false;
		}
	}

	/**
	 * Синхронизирует состояние виджета из Store в GridStack.
	 * Вызывается при изменении пропсов виджета или при первичном монтировании.
	 */
	function syncNodeFromStore(nodeEl: HTMLElement, p: WidgetActionParams) {
		const g = grid;
		if (!g) return;

		// Оборачиваем в withApplyingFromStore, чтобы событие 'change' было проигнорировано
		withApplyingFromStore(() => {
			g.update(nodeEl, {
				id: p.id,
				x: p.layout.x,
				y: p.layout.y,
				w: p.layout.w,
				h: p.layout.h,
				noMove: !p.editable,
				noResize: !p.editable
			});
		});
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// СЕКЦИЯ 4: SVELTE ACTION (widgetNode)
	// Связывает DOM-элемент виджета с GridStack
	// ═══════════════════════════════════════════════════════════════════════════

	/**
	 * Svelte action для интеграции виджета с GridStack.
	 *
	 * Что делает:
	 * 1. При монтировании: регистрирует элемент в GridStack (или в очередь ожидания)
	 * 2. При обновлении: синхронизирует layout из Store в GridStack
	 * 3. При размонтировании: удаляет из GridStack (но сохраняет DOM — им владеет Svelte)
	 *
	 * @example
	 * <div use:widgetNode={{ id: widget.id, layout: widget.layout, editable }}>
	 */
	function widgetNode(node: HTMLElement, params: WidgetActionParams) {
		// Запоминаем элемент на случай, если GridStack ещё не инициализирован
		pendingWidgetEls.add(node);

		if (grid) {
			// GridStack уже готов — сразу регистрируем виджет
			grid.makeWidget(node);
			syncNodeFromStore(node, params);
		}

		return {
			/** Вызывается при изменении параметров action */
			update(next: WidgetActionParams) {
				syncNodeFromStore(node, next);
			},

			/** Вызывается при удалении элемента из DOM */
			destroy() {
				pendingWidgetEls.delete(node);
				// false = не удалять DOM (Svelte владеет им)
				if (grid) grid.removeWidget(node, false);
			}
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// СЕКЦИЯ 5: ОБРАБОТЧИКИ СОБЫТИЙ GRIDSTACK
	// Синхронизация изменений от GridStack в Store
	// ═══════════════════════════════════════════════════════════════════════════

	/**
	 * Обрабатывает событие 'change' от GridStack.
	 * Вызывается многократно во время drag/resize (примерно 60 раз в секунду).
	 *
	 * @param items - Массив изменённых узлов GridStack
	 */
	function handleGridChange(items: GridStackNode[] | undefined) {
		// Игнорируем, если это наше собственное обновление (предотвращение цикла)
		if (!items || applyingFromStore) return;

		// Создаём Map для быстрого поиска изменений по ID виджета
		const changesById = new Map<string, GridStackNode>();
		for (const item of items) {
			const id = extractNodeId(item);
			if (id) changesById.set(id, item);
		}

		// Применяем изменения только к тем виджетам, которые действительно изменились
		let hasChanges = false;
		const updatedWidgets = widgets.map((widget) => {
			const change = changesById.get(widget.id);
			if (!change) return widget;

			const patched = applyLayoutChanges(widget, change);
			if (patched !== widget) hasChanges = true;
			return patched;
		});

		if (!hasChanges) return;

		// Уведомляем родителя об изменениях
		applyingFromGrid = true;
		lastWidgets = updatedWidgets;
		onWidgetsChange?.(updatedWidgets);
		applyingFromGrid = false;
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// СЕКЦИЯ 6: ИНИЦИАЛИЗАЦИЯ И ЖИЗНЕННЫЙ ЦИКЛ
	// Создание и уничтожение GridStack
	// ═══════════════════════════════════════════════════════════════════════════

	/**
	 * Инициализирует GridStack с заданной конфигурацией.
	 *
	 * ВАЖНО: GridStack загружается динамически внутри onMount,
	 * потому что его ESM-сборка ломается при SSR в Node.js.
	 */
	async function initGridStack(el: HTMLDivElement): Promise<GridStackApi | null> {
		try {
			const mod = await import('gridstack');
			const GridStack = mod.GridStack;

			if (!GridStack) {
				console.error('[WidgetCanvas] GridStack не найден в модуле');
				return null;
			}

			const g = GridStack.init(
				{
					// Количество колонок сетки (по умолчанию 12)
					column: Math.max(1, Math.floor(columns)),

					// Высота одной ячейки в пикселях
					cellHeight: Math.max(8, Math.floor(rowHeightPx)),

					// Отступ между виджетами
					margin: margin,

					// float: false — виджеты толкают друг друга при перетаскивании
					float: false,

					// Анимация перемещения для плавного UX
					animate: true,

					// Перетаскивание только за специальный handle (не за весь виджет)
					draggable: {
						handle: '.widget-drag-handle'
					},

					// Начальное состояние редактирования
					disableDrag: !editable,
					disableResize: !editable
				},
				el
			);

			return (g as GridStackApi) ?? null;
		} catch (error) {
			console.error('[WidgetCanvas] Ошибка инициализации GridStack:', error);
			return null;
		}
	}

	/**
	 * Подключает обработчики событий GridStack.
	 *
	 * События:
	 * - 'change': вызывается при каждом движении виджета (live updates)
	 * - 'dragstop': вызывается когда пользователь отпустил виджет
	 * - 'resizestop': вызывается когда пользователь закончил ресайз
	 */
	function attachGridEvents(g: GridStackApi) {
		// Live updates: синхронизируем позиции во время drag/resize
		g.on('change', (_e: unknown, items: GridStackNode[] | undefined) => handleGridChange(items));

		// Финализация: сохраняем после завершения взаимодействия
		// tick() нужен чтобы дождаться применения последнего 'change' в Svelte
		g.on('dragstop', async () => {
			await tick();
			onFinalize?.(lastWidgets);
		});

		g.on('resizestop', async () => {
			await tick();
			onFinalize?.(lastWidgets);
		});
	}

	/**
	 * Жизненный цикл: монтирование компонента.
	 * Инициализируем GridStack и подключаем события.
	 */
	onMount(async () => {
		if (!gridEl) return;

		const g = await initGridStack(gridEl);
		if (!g) return;

		grid = g;
		attachGridEvents(g);

		// "Усыновляем" виджеты, которые отрендерились до инициализации GridStack
		for (const el of pendingWidgetEls) {
			g.makeWidget(el);
		}
	});

	/**
	 * Жизненный цикл: размонтирование компонента.
	 * Уничтожаем GridStack (но сохраняем DOM — им владеет Svelte).
	 */
	onDestroy(() => {
		if (grid) grid.destroy(false);
		grid = null;
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// СЕКЦИЯ 7: РЕАКТИВНЫЕ ЭФФЕКТЫ
	// Синхронизация пропсов компонента с GridStack
	// ═══════════════════════════════════════════════════════════════════════════

	/** Обновляет количество колонок при изменении пропа */
	$effect(() => {
		if (!grid) return;
		grid.column(Math.max(1, Math.floor(columns)));
	});

	/** Обновляет высоту ячейки при изменении пропа */
	$effect(() => {
		if (!grid) return;
		grid.cellHeight(Math.max(8, Math.floor(rowHeightPx)));
	});

	/** Включает/выключает редактирование при изменении пропа */
	$effect(() => {
		if (!grid) return;
		grid.enableMove(!!editable);
		grid.enableResize(!!editable);
	});
</script>

<div
	bind:this={gridEl}
	class={cn('grid-stack', className)}
>
	{#each widgets as item (item.id)}
		<div
			class="grid-stack-item"
			data-gs-id={item.id}
			data-gs-x={item.layout.x}
			data-gs-y={item.layout.y}
			data-gs-w={item.layout.w}
			data-gs-h={item.layout.h}
			use:widgetNode={{ id: item.id, layout: item.layout, editable }}
		>
			<div class="grid-stack-item-content h-full">
				<div
					class={cn(
						'group h-full min-h-0 rounded-lg',
						selectedId === item.id ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
					)}
					role="button"
					tabindex={0}
					onclick={() => onSelect?.(item.id)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') onSelect?.(item.id);
					}}
				>
					{#if widgetSnippet}
						{@render widgetSnippet({ widget: item, editable, selected: selectedId === item.id })}
					{:else}
						<WidgetCard widget={item} {editable} />
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	/*
		GridStack places resize handles in the item corner, but the icon is centered inside a 20x20 handle box.
		That can look like it's "floating" away from the visible corner. We keep GridStack geometry intact
		and only move the icon within the handle to sit in the corner.
	*/
	:global(.grid-stack .grid-stack-item > .ui-resizable-se) {
		/* GridStack rotates this handle; anchor rotation to the corner to avoid the icon “floating”. */
		transform-origin: 100% 100%;
		background-position: right bottom;
	}
</style>
