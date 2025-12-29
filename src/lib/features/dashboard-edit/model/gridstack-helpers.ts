/**
 * gridstack-helpers.ts
 *
 * Вспомогательные функции для работы с GridStack.
 * Вынесены из WidgetCanvas для улучшения читаемости и тестируемости.
 */

import type { GridStackNode } from './gridstack.types';
import type { DashboardWidget } from './types';

/**
 * Извлекает ID виджета из GridStack node.
 *
 * GridStack может хранить ID в разных местах в зависимости от версии:
 * - node.id (string или number)
 * - node.el.getAttribute('data-gs-id')
 * - node.el.getAttribute('gs-id')
 *
 * Эта функция проверяет все варианты для совместимости с разными версиями.
 *
 * @example
 * const id = extractNodeId(gridStackNode);
 * if (id) {
 *   const widget = widgets.find(w => w.id === id);
 * }
 */
export function extractNodeId(node: GridStackNode): string | null {
	// Приоритет 1: прямой id (строка)
	if (typeof node.id === 'string' && node.id) {
		return node.id;
	}

	// Приоритет 2: прямой id (число → преобразуем в строку)
	if (typeof node.id === 'number') {
		return String(node.id);
	}

	// Приоритет 3: data-атрибуты на DOM-элементе
	const dataGsId = node.el?.getAttribute('data-gs-id');
	if (dataGsId) return dataGsId;

	const gsId = node.el?.getAttribute('gs-id');
	if (gsId) return gsId;

	return null;
}

/**
 * Применяет изменения layout из GridStack к виджету.
 *
 * GridStack может не передавать все значения (x, y, w, h),
 * поэтому используем fallback к текущим значениям виджета.
 *
 * Возвращает НОВЫЙ объект только если layout действительно изменился.
 * Это важно для оптимизации — React/Svelte могут пропустить ререндер
 * если объект тот же.
 *
 * @param widget - Текущий виджет
 * @param node - Узел GridStack с новыми координатами
 * @returns Новый виджет с обновлённым layout, или тот же объект если ничего не изменилось
 *
 * @example
 * const updated = applyLayoutChanges(widget, gridStackNode);
 * if (updated !== widget) {
 *   // Layout изменился, нужно обновить store
 * }
 */
export function applyLayoutChanges(
	widget: DashboardWidget,
	node: GridStackNode
): DashboardWidget {
	// Берём новые значения или fallback к существующим
	const newX = node.x ?? widget.layout.x;
	const newY = node.y ?? widget.layout.y;
	const newW = node.w ?? widget.layout.w;
	const newH = node.h ?? widget.layout.h;

	// Проверяем, изменилось ли что-то
	const isUnchanged =
		newX === widget.layout.x &&
		newY === widget.layout.y &&
		newW === widget.layout.w &&
		newH === widget.layout.h;

	// Если ничего не изменилось — возвращаем тот же объект
	if (isUnchanged) {
		return widget;
	}

	// Создаём новый объект с обновлённым layout
	return {
		...widget,
		layout: {
			...widget.layout,
			x: newX,
			y: newY,
			w: newW,
			h: newH
		}
	};
}

/**
 * Создаёт Map для быстрого поиска изменений по ID виджета.
 *
 * @param items - Массив изменённых узлов от GridStack
 * @returns Map<widgetId, GridStackNode>
 *
 * @example
 * const changesMap = createChangesMap(gridStackItems);
 * const widgetChange = changesMap.get(widget.id);
 */
export function createChangesMap(items: GridStackNode[]): Map<string, GridStackNode> {
	const map = new Map<string, GridStackNode>();

	for (const item of items) {
		const id = extractNodeId(item);
		if (id) {
			map.set(id, item);
		}
	}

	return map;
}

/**
 * Применяет изменения GridStack к массиву виджетов.
 *
 * @param widgets - Текущий массив виджетов
 * @param changesById - Map с изменениями от GridStack
 * @returns Объект с обновлённым массивом и флагом изменений
 *
 * @example
 * const { widgets: updated, hasChanges } = applyChangesToWidgets(widgets, changesMap);
 * if (hasChanges) {
 *   onWidgetsChange(updated);
 * }
 */
export function applyChangesToWidgets(
	widgets: DashboardWidget[],
	changesById: Map<string, GridStackNode>
): { widgets: DashboardWidget[]; hasChanges: boolean } {
	let hasChanges = false;

	const updated = widgets.map((widget) => {
		const change = changesById.get(widget.id);
		if (!change) return widget;

		const patched = applyLayoutChanges(widget, change);
		if (patched !== widget) {
			hasChanges = true;
		}
		return patched;
	});

	return { widgets: updated, hasChanges };
}
