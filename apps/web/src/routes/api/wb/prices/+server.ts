/**
 * POST /api/wb/prices
 *
 * Proxy endpoint for Wildberries Prices & Discounts API.
 * Keeps WB_API_TOKEN server-side only — never exposed to client.
 *
 * WB API docs: https://openapi.wildberries.ru/#tag/Ceny-i-skidki
 * Endpoint: POST https://discounts-prices.wb.ru/api/v2/upload/task
 *
 * Body: { nmId: number, price: number, discount?: number }
 * - price: new price in RUB (without discount)
 * - discount: new discount in % (0–95), optional
 */

import { json, type RequestHandler } from '@sveltejs/kit';

const WB_PRICES_URL = 'https://discounts-prices.wb.ru/api/v2/upload/task';

interface PriceUpdateRequest {
	nmId: number;
	price?: number;
	discount?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	const token = process.env.WB_API_TOKEN?.trim();
	if (!token) {
		return json({ error: 'WB_API_TOKEN не задан. Добавьте токен в .env файл.' }, { status: 503 });
	}

	let body: PriceUpdateRequest;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Некорректный JSON' }, { status: 400 });
	}

	const { nmId, price, discount } = body;

	if (!nmId || typeof nmId !== 'number') {
		return json({ error: 'nmId обязателен' }, { status: 400 });
	}
	if (price === undefined && discount === undefined) {
		return json({ error: 'Укажите price или discount' }, { status: 400 });
	}
	if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
		return json({ error: 'price должен быть положительным числом' }, { status: 400 });
	}
	if (discount !== undefined && (typeof discount !== 'number' || discount < 0 || discount > 95)) {
		return json({ error: 'discount должен быть от 0 до 95' }, { status: 400 });
	}

	// Build WB API payload
	const wbPayload: Record<string, unknown> = { nmID: nmId };
	if (price !== undefined) wbPayload.price = Math.round(price);
	if (discount !== undefined) wbPayload.discount = Math.round(discount);

	let wbResponse: Response;
	try {
		wbResponse = await fetch(WB_PRICES_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: token
			},
			body: JSON.stringify({ data: [wbPayload] })
		});
	} catch (e) {
		return json({ error: 'Ошибка сети при обращении к WB API' }, { status: 502 });
	}

	const wbText = await wbResponse.text();
	let wbData: unknown;
	try {
		wbData = JSON.parse(wbText);
	} catch {
		wbData = { raw: wbText };
	}

	if (!wbResponse.ok) {
		const detail =
			typeof wbData === 'object' && wbData !== null && 'detail' in wbData
				? (wbData as Record<string, unknown>).detail
				: wbText;
		return json(
			{ error: `WB API вернул ${wbResponse.status}: ${detail}` },
			{ status: wbResponse.status }
		);
	}

	// WB returns taskId — update becomes visible after a few minutes
	return json({ ok: true, wbResponse: wbData });
};
