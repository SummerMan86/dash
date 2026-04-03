import type {
	EmisMapNewsFeatureProperties,
	EmisMapVesselFeatureProperties,
	EmisMapSelectedFeature,
	EmisMapSelectedRouteFeature
} from '@dashboard-builder/emis-contracts/emis-map';

const popupDateFormatter = new Intl.DateTimeFormat('ru-RU', {
	dateStyle: 'medium',
	timeStyle: 'short'
});

const importanceLabels: Record<number, string> = {
	5: 'критическая',
	4: 'высокая',
	3: 'средняя',
	2: 'низкая',
	1: 'минимальная'
};

const severityBadgeLabels: Record<number, string> = {
	5: 'КРИТИЧЕСКАЯ',
	4: 'ВАЖНАЯ',
	3: 'СРЕДНЯЯ',
	2: 'НИЗКАЯ',
	1: 'НЕЗНАЧИТЕЛЬНАЯ'
};

const severityBadgeColors: Record<number, { bg: string; text: string }> = {
	5: { bg: '#da1e28', text: '#ffffff' },
	4: { bg: '#ff832b', text: '#161616' },
	3: { bg: '#f1c21b', text: '#161616' },
	2: { bg: '#42be65', text: '#161616' },
	1: { bg: '#c6c6c6', text: '#161616' }
};

type ParsedGdeltSummary = {
	cameoCode: string | null;
	goldstein: string | null;
	mentions: string | null;
	tone: string | null;
};

function parseGdeltSummary(raw: string | null): ParsedGdeltSummary | null {
	if (!raw || !raw.includes('CAMEO')) return null;

	const parts = raw.split('|').map((s) => s.trim());
	let cameoCode: string | null = null;
	let goldstein: string | null = null;
	let mentions: string | null = null;
	let tone: string | null = null;

	for (const part of parts) {
		if (part.startsWith('CAMEO ')) cameoCode = part.replace('CAMEO ', '');
		else if (part.startsWith('Goldstein ')) {
			const val = parseFloat(part.replace('Goldstein ', ''));
			if (Number.isFinite(val)) goldstein = val.toFixed(1);
		} else if (part.startsWith('Mentions: ')) mentions = part.replace('Mentions: ', '');
		else if (part.startsWith('Tone: ')) {
			const val = parseFloat(part.replace('Tone: ', ''));
			if (Number.isFinite(val)) tone = val.toFixed(1);
		}
	}

	return { cameoCode, goldstein, mentions, tone };
}

function extractArticleTitle(url: string | null): string | null {
	if (!url) return null;
	try {
		const pathname = new URL(url).pathname;
		const slug = pathname.split('/').filter(Boolean).pop();
		if (!slug || slug.length < 8) return null;
		return (
			slug
				.replace(/\.html?$/i, '')
				.replace(/^article_[a-f0-9-]+$/i, '')
				.replace(/[-_]+/g, ' ')
				.replace(/\b\w/g, (c) => c.toUpperCase())
				.trim() || null
		);
	} catch {
		return null;
	}
}

function extractActors(title: string): string | null {
	const parts = title
		.split(' / ')
		.map((s) => s.trim())
		.filter(Boolean);
	const actors = parts.filter((p) => !p.includes(','));
	return actors.length ? actors.join(' / ') : null;
}

function createLine(label: string, value: string) {
	const line = document.createElement('div');
	line.style.display = 'flex';
	line.style.gap = '6px';
	line.style.alignItems = 'baseline';
	line.style.flexWrap = 'wrap';

	const labelNode = document.createElement('span');
	labelNode.textContent = `${label}:`;
	labelNode.style.fontWeight = '600';
	labelNode.style.color = '#161616';

	const valueNode = document.createElement('span');
	valueNode.textContent = value;
	valueNode.style.color = '#525252';

	line.append(labelNode, valueNode);
	return line;
}

function createDivider() {
	const hr = document.createElement('div');
	hr.style.borderTop = '1px solid #e0e0e0';
	hr.style.margin = '2px 0';
	return hr;
}

function createMetaLine(icon: string, text: string) {
	const row = document.createElement('div');
	row.style.display = 'flex';
	row.style.gap = '6px';
	row.style.alignItems = 'center';
	row.textContent = `${icon} ${text}`;
	return row;
}

function formatDate(value: string) {
	return popupDateFormatter.format(new Date(value));
}

function getDetailHref(feature: EmisMapSelectedFeature): string | null {
	if (feature.kind === 'object') return `/emis/objects/${feature.id}`;
	if (feature.kind === 'news') return `/emis/news/${feature.id}`;
	return null;
}

function createDetailLink(feature: EmisMapSelectedFeature) {
	const href = getDetailHref(feature);
	if (!href) return null;

	const link = document.createElement('a');
	link.href = href;
	link.textContent = 'Открыть карточку';
	link.style.width = 'fit-content';
	link.style.fontWeight = '600';
	link.style.color = '#0f62fe';
	link.style.textDecoration = 'underline';
	link.style.textUnderlineOffset = '3px';
	return link;
}

function createActionLink(text: string, href: string, external = false) {
	const link = document.createElement('a');
	link.href = href;
	link.textContent = text;
	link.style.fontWeight = '600';
	link.style.fontSize = '12px';
	link.style.color = '#0f62fe';
	link.style.textDecoration = 'underline';
	link.style.textUnderlineOffset = '3px';
	if (external) {
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
	}
	return link;
}

function appendNewsPopupContent(root: HTMLElement, feature: EmisMapNewsFeatureProperties) {
	// --- Header: severity badge + category badge ---
	const headerRow = document.createElement('div');
	headerRow.style.display = 'flex';
	headerRow.style.alignItems = 'center';
	headerRow.style.gap = '6px';
	headerRow.style.flexWrap = 'wrap';

	if (feature.importance != null) {
		const badge = document.createElement('span');
		const colors = severityBadgeColors[feature.importance] ?? { bg: '#c6c6c6', text: '#161616' };
		badge.textContent = severityBadgeLabels[feature.importance] ?? String(feature.importance);
		badge.style.padding = '2px 8px';
		badge.style.borderRadius = '4px';
		badge.style.fontSize = '10px';
		badge.style.fontWeight = '700';
		badge.style.letterSpacing = '0.04em';
		badge.style.background = colors.bg;
		badge.style.color = colors.text;
		headerRow.append(badge);
	}

	if (feature.newsType) {
		const badge = document.createElement('span');
		badge.textContent = feature.newsType;
		badge.style.padding = '2px 8px';
		badge.style.borderRadius = '4px';
		badge.style.fontSize = '10px';
		badge.style.fontWeight = '600';
		badge.style.background = '#f4f4f4';
		badge.style.color = '#393939';
		badge.style.border = '1px solid #e0e0e0';
		headerRow.append(badge);
	}

	if (headerRow.childElementCount) root.append(headerRow);

	// --- Title: article topic, prominent ---
	const articleTitle = extractArticleTitle(feature.url);
	const titleEl = document.createElement('div');
	titleEl.textContent = articleTitle ?? feature.title;
	titleEl.style.fontSize = '15px';
	titleEl.style.fontWeight = '600';
	titleEl.style.lineHeight = '1.3';
	titleEl.style.color = '#161616';
	titleEl.style.display = '-webkit-box';
	titleEl.style.overflow = 'hidden';
	titleEl.style.setProperty('-webkit-line-clamp', '3');
	titleEl.style.setProperty('-webkit-box-orient', 'vertical');
	root.append(titleEl);

	// --- Tone + mentions ---
	root.append(createDivider());
	const gdelt = parseGdeltSummary(feature.summary);
	if (gdelt) {
		const toneLine = document.createElement('div');
		toneLine.style.fontSize = '12px';
		toneLine.style.color = '#525252';

		const chips: string[] = [];
		if (gdelt.tone) {
			const val = parseFloat(gdelt.tone);
			const label = val > 1 ? 'позит.' : val < -1 ? 'негат.' : 'нейтр.';
			chips.push(`Тон: ${label} (${gdelt.goldstein ?? gdelt.tone})`);
		}
		if (gdelt.mentions) chips.push(`Упомин.: ${gdelt.mentions}`);
		if (chips.length) {
			toneLine.textContent = chips.join(' \u00b7 ');
			root.append(toneLine);
		}
	} else if (feature.summary) {
		const summaryEl = document.createElement('div');
		summaryEl.textContent =
			feature.summary.length > 200 ? feature.summary.slice(0, 200) + '\u2026' : feature.summary;
		summaryEl.style.color = '#525252';
		summaryEl.style.fontSize = '12px';
		summaryEl.style.lineHeight = '1.4';
		root.append(summaryEl);
	}

	// --- Metadata block ---
	root.append(createDivider());
	const metaBlock = document.createElement('div');
	metaBlock.style.display = 'grid';
	metaBlock.style.gap = '3px';
	metaBlock.style.fontSize = '11px';
	metaBlock.style.color = '#525252';

	if (feature.region) metaBlock.append(createMetaLine('\ud83d\udccd', feature.region));
	if (feature.countryCode)
		metaBlock.append(createMetaLine('\ud83c\udff3\ufe0f', feature.countryCode));
	metaBlock.append(createMetaLine('\ud83d\udcf0', feature.sourceName));
	metaBlock.append(createMetaLine('\ud83d\udd50', formatDate(feature.publishedAt)));
	if (feature.relatedObjectsCount > 0) {
		metaBlock.append(
			createMetaLine('\ud83d\udd17', `${feature.relatedObjectsCount} связ. объект.`)
		);
	}
	root.append(metaBlock);

	// --- Actors (geo title moved to bottom, small) ---
	const actors = extractActors(feature.title);
	if (actors) {
		root.append(createDivider());
		const actorsEl = document.createElement('div');
		actorsEl.style.fontSize = '11px';
		actorsEl.style.color = '#6f6f6f';
		actorsEl.textContent = `\u0410\u043a\u0442\u043e\u0440\u044b: ${actors}`;
		root.append(actorsEl);
	}

	// --- Action links ---
	root.append(createDivider());
	const actionsRow = document.createElement('div');
	actionsRow.style.display = 'flex';
	actionsRow.style.gap = '12px';
	actionsRow.style.flexWrap = 'wrap';

	if (feature.url) {
		actionsRow.append(createActionLink('Читать оригинал', feature.url, true));
	}
	actionsRow.append(createActionLink('Открыть карточку', `/emis/news/${feature.id}`));
	root.append(actionsRow);
}

function appendVesselPopupContent(root: HTMLElement, feature: EmisMapVesselFeatureProperties) {
	// --- Header: vessel type + flag ---
	const headerRow = document.createElement('div');
	headerRow.style.display = 'flex';
	headerRow.style.alignItems = 'center';
	headerRow.style.justifyContent = 'space-between';
	headerRow.style.gap = '8px';

	const typeLabel = document.createElement('span');
	typeLabel.textContent = feature.vesselType ?? 'Судно';
	typeLabel.style.fontSize = '11px';
	typeLabel.style.fontWeight = '600';
	typeLabel.style.color = '#525252';
	typeLabel.style.textTransform = 'uppercase';
	typeLabel.style.letterSpacing = '0.04em';
	headerRow.append(typeLabel);

	if (feature.flag) {
		const flagEl = document.createElement('span');
		flagEl.textContent = `\ud83c\udff3\ufe0f ${feature.flag}`;
		flagEl.style.fontSize = '11px';
		flagEl.style.color = '#525252';
		headerRow.append(flagEl);
	}

	root.append(headerRow);

	// --- Vessel name ---
	const titleEl = document.createElement('div');
	titleEl.textContent = feature.title;
	titleEl.style.fontSize = '15px';
	titleEl.style.fontWeight = '600';
	titleEl.style.lineHeight = '1.3';
	titleEl.style.color = '#161616';
	root.append(titleEl);

	// --- Identifiers ---
	root.append(createDivider());
	const ids: string[] = [];
	ids.push(`HBK ${feature.shipHbkId}`);
	if (feature.imo) ids.push(`IMO ${feature.imo}`);
	if (feature.mmsi) ids.push(`MMSI ${feature.mmsi}`);

	const idsEl = document.createElement('div');
	idsEl.textContent = `\ud83d\udd39 ${ids.join(' \u00b7 ')}`;
	idsEl.style.fontSize = '11px';
	idsEl.style.color = '#525252';
	root.append(idsEl);

	// --- Metadata ---
	root.append(createDivider());
	const metaBlock = document.createElement('div');
	metaBlock.style.display = 'grid';
	metaBlock.style.gap = '3px';
	metaBlock.style.fontSize = '11px';
	metaBlock.style.color = '#525252';

	metaBlock.append(
		createMetaLine(
			'\ud83d\udccd',
			`${feature.lastLatitude.toFixed(4)}, ${feature.lastLongitude.toFixed(4)}`
		)
	);
	metaBlock.append(createMetaLine('\ud83d\udd50', formatDate(feature.lastFetchedAt)));
	root.append(metaBlock);

	// --- Action links ---
	root.append(createDivider());
	const actionsRow = document.createElement('div');
	actionsRow.style.display = 'flex';
	actionsRow.style.gap = '12px';
	actionsRow.style.flexWrap = 'wrap';

	const routeHref = feature.imo
		? `/dashboard/emis/ship-routes?vessel=${feature.imo}`
		: `/dashboard/emis/ship-routes?vessel=${feature.shipHbkId}`;
	actionsRow.append(createActionLink('Открыть маршрут', routeHref));
	actionsRow.append(
		createActionLink('В workspace', `/dashboard/emis/vessel-positions?vessel=${feature.shipHbkId}`)
	);
	root.append(actionsRow);
}

export function renderVesselTooltipContent(feature: EmisMapVesselFeatureProperties): HTMLElement {
	const root = document.createElement('div');
	root.style.display = 'grid';
	root.style.gap = '2px';
	root.style.fontFamily = 'IBM Plex Sans, system-ui, sans-serif';
	root.style.fontSize = '12px';
	root.style.lineHeight = '1.3';
	root.style.pointerEvents = 'none';

	const nameEl = document.createElement('div');
	nameEl.textContent = `\ud83d\udea2 ${feature.title}`;
	nameEl.style.fontWeight = '600';
	nameEl.style.color = '#161616';
	root.append(nameEl);

	const subtitleParts = [
		feature.vesselType,
		feature.flag ? `\ud83c\udff3\ufe0f ${feature.flag}` : null
	].filter(Boolean);
	if (subtitleParts.length) {
		const subEl = document.createElement('div');
		subEl.textContent = subtitleParts.join(' \u00b7 ');
		subEl.style.fontSize = '11px';
		subEl.style.color = '#6f6f6f';
		root.append(subEl);
	}

	return root;
}

export function renderFeaturePopupContent(feature: EmisMapSelectedFeature) {
	const isNews = feature.kind === 'news';
	const isVessel = feature.kind === 'vessel';

	const root = document.createElement('div');
	root.style.minWidth = '220px';
	root.style.maxWidth = isNews ? '320px' : isVessel ? '300px' : '280px';
	root.style.display = 'grid';
	root.style.gap = '8px';
	root.style.fontFamily = 'IBM Plex Sans, system-ui, sans-serif';
	root.style.fontSize = '12px';
	root.style.lineHeight = '1.45';

	if (isNews) {
		appendNewsPopupContent(root, feature);
		return root;
	}

	if (isVessel) {
		appendVesselPopupContent(root, feature);
		return root;
	}

	const badge = document.createElement('div');
	const badgeLabels: Record<string, string> = { object: 'ОБЪЕКТ' };
	const badgeColors: Record<string, string> = { object: '#d9f0e0' };
	badge.textContent = badgeLabels[feature.kind] ?? feature.kind.toUpperCase();
	badge.style.display = 'inline-flex';
	badge.style.width = 'fit-content';
	badge.style.padding = '2px 8px';
	badge.style.borderRadius = '999px';
	badge.style.fontSize = '10px';
	badge.style.letterSpacing = '0.16em';
	badge.style.fontWeight = '700';
	badge.style.background = badgeColors[feature.kind] ?? '#e0e0e0';
	badge.style.color = '#161616';

	const title = document.createElement('div');
	title.textContent = feature.title;
	title.style.fontSize = '14px';
	title.style.fontWeight = '700';
	title.style.color = '#161616';

	root.append(badge, title);

	if (feature.subtitle) {
		const subtitle = document.createElement('div');
		subtitle.textContent = feature.subtitle;
		subtitle.style.color = '#6f6f6f';
		root.append(subtitle);
	}

	if (feature.kind === 'object') {
		root.append(createLine('Статус', feature.status));
		root.append(createLine('Обновлён', formatDate(feature.updatedAt)));
	}

	const detailLink = createDetailLink(feature);
	if (detailLink) root.append(detailLink);

	return root;
}

export function renderRoutePopupContent(feature: EmisMapSelectedRouteFeature) {
	const root = document.createElement('div');
	root.style.minWidth = '220px';
	root.style.maxWidth = '280px';
	root.style.display = 'grid';
	root.style.gap = '8px';
	root.style.fontFamily = 'IBM Plex Sans, system-ui, sans-serif';
	root.style.fontSize = '12px';
	root.style.lineHeight = '1.45';

	const badge = document.createElement('div');
	badge.textContent = feature.kind === 'route-point' ? 'ТОЧКА МАРШРУТА' : 'СЕГМЕНТ МАРШРУТА';
	badge.style.display = 'inline-flex';
	badge.style.width = 'fit-content';
	badge.style.padding = '2px 8px';
	badge.style.borderRadius = '999px';
	badge.style.fontSize = '10px';
	badge.style.letterSpacing = '0.16em';
	badge.style.fontWeight = '700';
	badge.style.background = feature.kind === 'route-point' ? '#fff1b8' : '#d0e2ff';
	badge.style.color = '#161616';

	const title = document.createElement('div');
	title.textContent =
		feature.kind === 'route-point'
			? `Seq #${feature.pointSeqShip}`
			: `Segment #${feature.segmentSeqShip}`;
	title.style.fontSize = '14px';
	title.style.fontWeight = '700';
	title.style.color = '#161616';

	root.append(badge, title);
	root.append(createLine('Судно', feature.vesselName));
	root.append(
		createLine(
			feature.kind === 'route-point' ? 'Получено' : 'Начало',
			formatDate(feature.kind === 'route-point' ? feature.fetchedAt : feature.fromFetchedAt)
		)
	);

	if (feature.kind === 'route-point') {
		root.append(
			createLine('Координаты', `${feature.latitude.toFixed(4)}, ${feature.longitude.toFixed(4)}`)
		);
		root.append(
			createLine('Скорость', feature.speed === null ? 'н/д' : `${feature.speed.toFixed(1)} уз`)
		);
	} else {
		root.append(
			createLine(
				'Откуда',
				`${feature.fromLatitude.toFixed(4)}, ${feature.fromLongitude.toFixed(4)}`
			)
		);
		root.append(
			createLine('Куда', `${feature.toLatitude.toFixed(4)}, ${feature.toLongitude.toFixed(4)}`)
		);
		root.append(
			createLine(
				'Интервал',
				feature.gapMinutes === null ? 'н/д' : `${feature.gapMinutes.toFixed(1)} мин`
			)
		);
	}

	return root;
}
