/**
 * GridStack type definitions for internal use.
 *
 * Эти типы оборачивают минимальный API GridStack, который мы используем.
 * Избегаем прямой зависимости от типов gridstack, которые могут сломаться при SSR.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ТИПЫ ДАННЫХ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GridStack node — представляет один виджет в сетке.
 * Все поля опциональны, т.к. GridStack может не передавать все значения.
 */
export type GridStackNode = {
	/** ID виджета (строка или число) */
	id?: string | number;
	/** Позиция X (колонка, 0-based) */
	x?: number;
	/** Позиция Y (строка, 0-based) */
	y?: number;
	/** Ширина в колонках */
	w?: number;
	/** Высота в строках */
	h?: number;
	/** Ссылка на DOM-элемент виджета */
	el?: HTMLElement | null;
	/** Запретить перемещение */
	noMove?: boolean;
	/** Запретить ресайз */
	noResize?: boolean;
};

// ═══════════════════════════════════════════════════════════════════════════
// СОБЫТИЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Типы событий GridStack, которые мы используем.
 * Это type-safe альтернатива строковым литералам.
 */
export type GridStackEvent =
	| 'change'      // Виджет перемещён/изменён размер (вызывается многократно)
	| 'dragstop'    // Перетаскивание завершено
	| 'resizestop'  // Ресайз завершён
	| 'added'       // Виджет добавлен
	| 'removed';    // Виджет удалён

/** Callback для событий GridStack */
export type GridStackEventCallback = (e: unknown, items?: GridStackNode[]) => void;

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GridStack API — минимальная поверхность, используемая нашей интеграцией.
 * Описывает только те методы, которые мы реально вызываем.
 */
export type GridStackApi = {
	/** Подписаться на событие */
	on(event: GridStackEvent, callback: GridStackEventCallback): void;

	/** Обновить параметры виджета */
	update(el: HTMLElement, opts: Partial<GridStackNode>): void;

	/** Зарегистрировать DOM-элемент как виджет GridStack */
	makeWidget(el: HTMLElement): void;

	/** Удалить виджет (removeDOM=false сохраняет DOM) */
	removeWidget(el: HTMLElement, removeDOM?: boolean): void;

	/** Уничтожить GridStack (removeDOM=false сохраняет DOM) */
	destroy(removeDOM?: boolean): void;

	/** Изменить количество колонок */
	column(n: number): void;

	/** Изменить высоту ячейки */
	cellHeight(h: number): void;

	/** Включить/выключить перетаскивание */
	enableMove(enabled: boolean): void;

	/** Включить/выключить ресайз */
	enableResize(enabled: boolean): void;
};

/** GridStack init options */
export type GridStackInitOptions = {
	column?: number;
	cellHeight?: number;
	margin?: number;
	float?: boolean;
	draggable?: { handle?: string };
	disableDrag?: boolean;
	disableResize?: boolean;
};
