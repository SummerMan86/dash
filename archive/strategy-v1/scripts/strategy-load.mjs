import 'dotenv/config';

import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

import pg from 'pg';

const { Client } = pg;

const DEFAULT_SOURCE_ROOT = '/home/orl/Shl/КА/MS BI/bsc_model';
const LOADER_VERSION = 'strategy-dwh-v1';
const RU_MONTHS = {
	январь: '01',
	февраль: '02',
	март: '03',
	апрель: '04',
	май: '05',
	июнь: '06',
	июль: '07',
	август: '08',
	сентябрь: '09',
	октябрь: '10',
	ноябрь: '11',
	декабрь: '12'
};

function printUsage() {
	console.log('Usage:');
	console.log('  pnpm strategy:load');
	console.log(
		'  pnpm strategy:load -- --batch-id strategy_curated_v1 --source-root "/home/orl/Shl/КА/MS BI/bsc_model"'
	);
}

function readOption(name) {
	const index = process.argv.findIndex((arg) => arg === name);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
}

function requireDatabaseUrl() {
	const url = process.env.DATABASE_URL?.trim();
	if (!url) throw new Error('DATABASE_URL is required for strategy load');
	return url;
}

function resolveSourceRoot() {
	const cli = readOption('--source-root');
	const env = process.env.STRATEGY_BSC_MODEL_ROOT?.trim();
	return cli || env || DEFAULT_SOURCE_ROOT;
}

function resolveBatchId() {
	return readOption('--batch-id') || 'strategy_curated_v1';
}

async function ensureFileExists(filePath) {
	try {
		await access(filePath);
	} catch {
		throw new Error(`Missing required input file: ${filePath}`);
	}
}

async function firstExisting(filePaths) {
	for (const filePath of filePaths) {
		try {
			await access(filePath);
			return filePath;
		} catch {
			// keep searching
		}
	}
	return null;
}

function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		const next = text[i + 1];

		if (char === '\ufeff' && rows.length === 0 && row.length === 0 && field.length === 0) continue;

		if (inQuotes) {
			if (char === '"' && next === '"') {
				field += '"';
				i += 1;
				continue;
			}
			if (char === '"') {
				inQuotes = false;
				continue;
			}
			field += char;
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			continue;
		}
		if (char === ',') {
			row.push(field);
			field = '';
			continue;
		}
		if (char === '\n') {
			row.push(field.replace(/\r$/, ''));
			rows.push(row);
			row = [];
			field = '';
			continue;
		}

		field += char;
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field.replace(/\r$/, ''));
		rows.push(row);
	}

	const [header = [], ...body] = rows;
	return body
		.filter((values) => values.some((value) => value !== ''))
		.map((values) => {
			const entry = {};
			for (let i = 0; i < header.length; i += 1) {
				entry[header[i]] = values[i] ?? '';
			}
			return entry;
		});
}

async function readCsv(filePath) {
	const text = await readFile(filePath, 'utf8');
	return parseCsv(text);
}

async function readOptionalCsv(filePath) {
	try {
		const text = await readFile(filePath, 'utf8');
		return parseCsv(text);
	} catch {
		return [];
	}
}

function normalizeString(value) {
	if (value === undefined || value === null) return null;
	const trimmed = String(value).trim();
	return trimmed ? trimmed : null;
}

function toBoolean(value) {
	const normalized = normalizeString(value)?.toLowerCase();
	if (!normalized) return null;
	if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
	if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
	return null;
}

function toNumber(value) {
	const normalized = normalizeString(value);
	if (!normalized || normalized === '-') return null;
	const parsed = Number(normalized.replace(/\s+/g, '').replace(',', '.'));
	return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value) {
	const normalized = normalizeString(value);
	if (!normalized) return null;

	if (/^\d{4}$/.test(normalized)) return `${normalized}-01-01`;
	if (/^\d{4}-\d{2}$/.test(normalized)) return `${normalized}-01`;
	if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
	if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(normalized)) {
		const [day, month, year] = normalized.split('.');
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	const rangeStart = normalized.match(/^(\d{4})(?:[-/]\d{4})$/);
	if (rangeStart) return `${rangeStart[1]}-01-01`;

	const monthRangeStart = normalized.match(/^(\d{4}-\d{2})(?:[-/]\d{4}-\d{2})$/);
	if (monthRangeStart) return `${monthRangeStart[1]}-01`;

	const monthYear = normalized.match(/^([А-Яа-яA-Za-z]+)\s+(\d{4})$/);
	if (monthYear) {
		const month = RU_MONTHS[monthYear[1].toLowerCase()];
		if (month) return `${monthYear[2]}-${month}-01`;
	}

	return null;
}

function canonicalizeBscPerspectiveCode(value) {
	const normalized = normalizeString(value);
	if (!normalized) return null;

	// Accept both legacy and RU codes, but persist RU-only vocabulary.
	switch (normalized.toUpperCase()) {
		case 'FIN':
			return 'Финансы';
		case 'OPS':
			return 'Операции';
		case 'RISK':
			return 'Риски';
		case 'PEOPLE':
			return 'Люди';
		default:
			return normalized;
	}
}

function inferSourceSystem(documentCode) {
	if (!documentCode) return 'unknown';
	return /^\d+$/.test(documentCode) ? 'powerbi_workbook' : 'project_documents';
}

function inferDocumentCodeFromSourceFile(sourceFile) {
	const normalized = sourceFile?.toLowerCase() ?? '';
	if (!normalized) return null;
	if (normalized.includes('ltf25')) return 'LTF25';
	if (normalized.includes('среднесрочный прогноз производства')) return 'MTF_2026_2028';
	if (normalized.includes('stds') || normalized.includes('краткосрочная программа буровых работ')) {
		return 'STDS_2025_06_11';
	}

	return path.basename(sourceFile, path.extname(sourceFile)).replace(/\s+/g, '_');
}

function inferDocumentNameFromSourceFile(sourceFile) {
	if (!sourceFile) return null;
	return path.basename(sourceFile, path.extname(sourceFile));
}

function inferDepartmentCodeFromSourceFile(sourceFile) {
	const normalized = sourceFile?.toLowerCase() ?? '';
	if (normalized.includes('01. технический директорат')) return 'TD';
	if (normalized.includes('02. производственные директорат')) return 'PrD';
	return null;
}

function inferEntityCode(entityLevel, subjectArea) {
	const level = normalizeString(entityLevel);
	const subject = normalizeString(subjectArea);

	if (!level) return null;
	if (level === 'company') return 'ALL';
	return subject || level;
}

function buildInventoryLookup(inventoryRows) {
	const byCode = new Map();
	const byFile = new Map();
	const byName = new Map();

	for (const row of inventoryRows) {
		const doc = {
			documentCode: normalizeString(row.document_code),
			documentName: normalizeString(row.document_name),
			documentFile: normalizeString(row.document_file),
			horizonCode: normalizeString(row.horizon_code),
			departmentCode: normalizeString(row.department_code),
			perspectiveCode: normalizeString(row.perspective_code),
			sourceSystem: normalizeString(row.source_system),
			sourceKind: normalizeString(row.source_kind),
			recordOrigin: normalizeString(row.record_origin),
			versionLabel: normalizeString(row.version_label),
			status: normalizeString(row.status),
			currentFlag: toBoolean(row.current_flag) ?? true,
			sourceLocator: normalizeString(row.source_locator),
			comment: normalizeString(row.comment)
		};

		if (doc.documentCode) byCode.set(doc.documentCode, doc);
		if (doc.documentFile && !byFile.has(doc.documentFile)) byFile.set(doc.documentFile, doc);
		if (doc.documentName && !byName.has(doc.documentName)) byName.set(doc.documentName, doc);
	}

	return { byCode, byFile, byName };
}

function resolveCanonicalDocument({ sourceFile, documentCode, documentName }, inventoryLookup) {
	if (documentCode && inventoryLookup.byCode.has(documentCode)) {
		return inventoryLookup.byCode.get(documentCode);
	}
	if (sourceFile && inventoryLookup.byFile.has(sourceFile)) {
		return inventoryLookup.byFile.get(sourceFile);
	}
	if (documentName && inventoryLookup.byName.has(documentName)) {
		return inventoryLookup.byName.get(documentName);
	}
	return null;
}

function buildDocumentSeeds({ inventoryRows, cascadeRows, kpiRows, sourceRows, autoRows }) {
	const documents = new Map();
	const inventoryLookup = buildInventoryLookup(inventoryRows);

	function upsertDocument(doc) {
		if (!doc.documentCode || !doc.documentName) return;
		const existing = documents.get(doc.documentCode) ?? {
			documentCode: doc.documentCode,
			documentName: doc.documentName,
			documentFile: null,
			horizonCode: null,
			departmentCode: null,
			perspectiveCode: null,
			sourceSystem: inferSourceSystem(doc.documentCode),
			sourceKind: doc.sourceKind || 'curated_csv',
			recordOrigin: doc.recordOrigin || 'derived_document',
			versionLabel: doc.versionLabel || 'current',
			status: doc.status || 'current',
			currentFlag: true,
			sourceLocator: null,
			comment: null
		};

		documents.set(doc.documentCode, {
			...existing,
			documentName: existing.documentName || doc.documentName,
			documentFile: existing.documentFile || doc.documentFile || null,
			horizonCode: existing.horizonCode || doc.horizonCode || null,
			departmentCode: existing.departmentCode || doc.departmentCode || null,
			perspectiveCode: existing.perspectiveCode || doc.perspectiveCode || null,
			sourceSystem:
				existing.sourceSystem || doc.sourceSystem || inferSourceSystem(doc.documentCode),
			sourceKind: existing.sourceKind || doc.sourceKind || 'curated_csv',
			recordOrigin: existing.recordOrigin || doc.recordOrigin || 'derived_document',
			versionLabel: existing.versionLabel || doc.versionLabel || 'current',
			status: existing.status || doc.status || 'current',
			currentFlag: existing.currentFlag ?? doc.currentFlag ?? true,
			sourceLocator: existing.sourceLocator || doc.sourceLocator || null,
			comment: existing.comment || doc.comment || null
		});
	}

	for (const row of inventoryRows) {
		upsertDocument({
			documentCode: normalizeString(row.document_code),
			documentName: normalizeString(row.document_name),
			documentFile: normalizeString(row.document_file),
			horizonCode: normalizeString(row.horizon_code),
			departmentCode: normalizeString(row.department_code),
			perspectiveCode: normalizeString(row.perspective_code),
			sourceSystem: normalizeString(row.source_system),
			sourceKind: normalizeString(row.source_kind),
			recordOrigin: normalizeString(row.record_origin) || 'document_inventory_full',
			versionLabel: normalizeString(row.version_label),
			status: normalizeString(row.status),
			currentFlag: toBoolean(row.current_flag) ?? true,
			sourceLocator: normalizeString(row.source_locator),
			comment: normalizeString(row.comment)
		});
	}

	for (const row of cascadeRows) {
		upsertDocument({
			documentCode: normalizeString(row.parent_document_id),
			documentName: normalizeString(row.parent_document_name),
			horizonCode: normalizeString(row.parent_horizon_code),
			departmentCode: normalizeString(row.department_code),
			recordOrigin: 'fact_planning_cascade_seed'
		});
		upsertDocument({
			documentCode: normalizeString(row.child_document_id),
			documentName: normalizeString(row.child_document_name),
			horizonCode: normalizeString(row.child_horizon_code),
			departmentCode: normalizeString(row.department_code),
			recordOrigin: 'fact_planning_cascade_seed'
		});
	}

	for (const row of kpiRows) {
		upsertDocument({
			documentCode: normalizeString(row.document_id),
			documentName: normalizeString(row.document_name),
			horizonCode: normalizeString(row.horizon_code),
			departmentCode: normalizeString(row.department_code),
			perspectiveCode: normalizeString(row.perspective_code),
			recordOrigin: 'fact_kpi_decomposition_template'
		});
	}

	for (const row of sourceRows) {
		const sourceFile = normalizeString(row.source_file);
		const sourceName = normalizeString(row.source_name);
		const canonical = resolveCanonicalDocument(
			{ sourceFile, documentName: sourceName, documentCode: null },
			inventoryLookup
		);
		upsertDocument({
			documentCode: canonical?.documentCode || sourceName,
			documentName: canonical?.documentName || sourceName,
			documentFile: canonical?.documentFile || sourceFile,
			horizonCode: canonical?.horizonCode || normalizeString(row.horizon_code),
			departmentCode: canonical?.departmentCode || inferDepartmentCodeFromSourceFile(sourceFile),
			perspectiveCode: canonical?.perspectiveCode || null,
			recordOrigin: 'data_source_map',
			sourceLocator: normalizeString(row.source_locator),
			comment: normalizeString(row.notes)
		});
	}

	for (const row of autoRows) {
		const sourceFile = normalizeString(row.source_file);
		const rowDocumentCode = normalizeString(row.document_code);
		const rowDocumentName = normalizeString(row.document_name);
		const canonical = resolveCanonicalDocument(
			{ sourceFile, documentCode: rowDocumentCode, documentName: rowDocumentName },
			inventoryLookup
		);
		upsertDocument({
			documentCode:
				canonical?.documentCode || rowDocumentCode || inferDocumentCodeFromSourceFile(sourceFile),
			documentName:
				canonical?.documentName ||
				rowDocumentName ||
				inferDocumentNameFromSourceFile(sourceFile) ||
				inferDocumentCodeFromSourceFile(sourceFile),
			documentFile: canonical?.documentFile || sourceFile,
			horizonCode: canonical?.horizonCode || normalizeString(row.horizon_code),
			departmentCode:
				normalizeString(row.department_code) ||
				canonical?.departmentCode ||
				inferDepartmentCodeFromSourceFile(sourceFile),
			perspectiveCode: normalizeString(row.perspective_code) || canonical?.perspectiveCode || null,
			recordOrigin: 'auto_extracted_facts',
			sourceLocator: normalizeString(row.source_locator),
			comment: normalizeString(row.note)
		});
	}

	return [...documents.values()];
}

async function upsertBatch(client, batchId, sourceRoot) {
	await client.query(
		`
			INSERT INTO staging.strategy_load_batch (
				batch_id,
				source_root,
				batch_label,
				status,
				loader_version,
				started_at,
				completed_at
			)
			VALUES ($1, $2, $3, 'loading', $4, now(), NULL)
			ON CONFLICT (batch_id) DO UPDATE
			SET source_root = EXCLUDED.source_root,
				batch_label = EXCLUDED.batch_label,
				status = 'loading',
				loader_version = EXCLUDED.loader_version,
				started_at = now(),
				completed_at = NULL
		`,
		[batchId, sourceRoot, batchId, LOADER_VERSION]
	);
}

async function clearBatch(client, batchId) {
	await client.query('DELETE FROM staging.strategy_cascade_raw WHERE batch_id = $1', [batchId]);
	await client.query('DELETE FROM staging.strategy_metric_raw WHERE batch_id = $1', [batchId]);
	await client.query('DELETE FROM staging.strategy_document_raw WHERE batch_id = $1', [batchId]);
}

async function seedPerspectives(client, rows) {
	for (const row of rows) {
		await client.query(
			`
				INSERT INTO mart.strategy_perspectives_dim (
					perspective_code,
					perspective_name,
					default_weight_pct,
					corporate_vector_map,
					score_direction,
					active_flag
				)
				VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (perspective_code) DO UPDATE
				SET perspective_name = EXCLUDED.perspective_name,
					default_weight_pct = EXCLUDED.default_weight_pct,
					corporate_vector_map = EXCLUDED.corporate_vector_map,
					score_direction = EXCLUDED.score_direction,
					active_flag = EXCLUDED.active_flag
			`,
			[
				normalizeString(row.perspective_code),
				normalizeString(row.perspective_name),
				toNumber(row.default_weight_pct),
				normalizeString(row.corporate_vector_map),
				normalizeString(row.score_direction),
				toBoolean(row.active_flag) ?? true
			]
		);
	}
}

async function seedHorizons(client, rows) {
	for (const row of rows) {
		await client.query(
			`
				INSERT INTO mart.strategy_horizons_dim (
					horizon_code,
					horizon_name,
					horizon_order,
					expected_period_grain,
					parent_horizon_code,
					expected_child_horizon_code
				)
				VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (horizon_code) DO UPDATE
				SET horizon_name = EXCLUDED.horizon_name,
					horizon_order = EXCLUDED.horizon_order,
					expected_period_grain = EXCLUDED.expected_period_grain,
					parent_horizon_code = EXCLUDED.parent_horizon_code,
					expected_child_horizon_code = EXCLUDED.expected_child_horizon_code
			`,
			[
				normalizeString(row.horizon_code),
				normalizeString(row.horizon_name),
				toNumber(row.horizon_order),
				normalizeString(row.expected_period_grain),
				normalizeString(row.parent_horizon_code),
				normalizeString(row.expected_child_horizon_code)
			]
		);
	}
}

async function seedMetrics(client, rows) {
	for (const row of rows) {
		await client.query(
			`
				INSERT INTO mart.strategy_metrics_dim (
					metric_code,
					metric_name,
					metric_type,
					perspective_code,
					aggregation_rule,
					unit,
					higher_is_better_flag,
					default_grain,
					default_tolerance_abs,
					default_tolerance_pct,
					requires_actual_flag,
					metric_status,
					comment
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
				ON CONFLICT (metric_code) DO UPDATE
				SET metric_name = EXCLUDED.metric_name,
					metric_type = EXCLUDED.metric_type,
					perspective_code = EXCLUDED.perspective_code,
					aggregation_rule = EXCLUDED.aggregation_rule,
					unit = EXCLUDED.unit,
					higher_is_better_flag = EXCLUDED.higher_is_better_flag,
					default_grain = EXCLUDED.default_grain,
					default_tolerance_abs = EXCLUDED.default_tolerance_abs,
					default_tolerance_pct = EXCLUDED.default_tolerance_pct,
					requires_actual_flag = EXCLUDED.requires_actual_flag,
					metric_status = EXCLUDED.metric_status,
					comment = EXCLUDED.comment
			`,
			[
				normalizeString(row.metric_code),
				normalizeString(row.metric_name),
				normalizeString(row.metric_type),
				normalizeString(row.perspective_code),
				normalizeString(row.aggregation_rule),
				normalizeString(row.unit),
				toBoolean(row.higher_is_better_flag) ?? true,
				normalizeString(row.default_grain),
				toNumber(row.default_tolerance_abs),
				toNumber(row.default_tolerance_pct),
				toBoolean(row.requires_actual_flag) ?? false,
				normalizeString(row.metric_status),
				normalizeString(row.comment)
			]
		);
	}
}

async function seedWeights(client, rows) {
	for (const row of rows) {
		await client.query(
			`
				INSERT INTO mart.strategy_bsc_weights (
					version_id,
					entity_level,
					entity_code,
					perspective_code,
					weight_pct,
					valid_from,
					valid_to,
					comment
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT (version_id, entity_level, entity_code, perspective_code, valid_from) DO UPDATE
				SET weight_pct = EXCLUDED.weight_pct,
					valid_to = EXCLUDED.valid_to,
					comment = EXCLUDED.comment
			`,
			[
				normalizeString(row.version_id),
				normalizeString(row.entity_level),
				normalizeString(row.entity_code),
				canonicalizeBscPerspectiveCode(row.perspective_code),
				toNumber(row.weight_pct),
				toDate(row.valid_from),
				toDate(row.valid_to),
				normalizeString(row.comment)
			]
		);
	}
}

async function seedExecutiveKpiRegistry(client, rows) {
	for (const row of rows) {
		await client.query(
			`
				INSERT INTO mart.strategy_executive_kpi_registry (
					registry_version,
					curated_kpi_id,
					display_order,
					chain_id,
					executive_label,
					dashboard_group,
					department_code,
					perspective_code,
					readiness_status,
					can_show_to_management,
					management_note,
					required_action,
					current_flag,
					show_numeric_value_flag,
					display_value_override,
					display_value_text_override,
					display_unit_override,
					display_horizon_code_override,
					display_period_key_override,
					value_confidence_status
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
				ON CONFLICT (registry_version, curated_kpi_id) DO UPDATE
				SET display_order = EXCLUDED.display_order,
					chain_id = EXCLUDED.chain_id,
					executive_label = EXCLUDED.executive_label,
					dashboard_group = EXCLUDED.dashboard_group,
					department_code = EXCLUDED.department_code,
					perspective_code = EXCLUDED.perspective_code,
					readiness_status = EXCLUDED.readiness_status,
					can_show_to_management = EXCLUDED.can_show_to_management,
					management_note = EXCLUDED.management_note,
					required_action = EXCLUDED.required_action,
					current_flag = EXCLUDED.current_flag,
					show_numeric_value_flag = EXCLUDED.show_numeric_value_flag,
					display_value_override = EXCLUDED.display_value_override,
					display_value_text_override = EXCLUDED.display_value_text_override,
					display_unit_override = EXCLUDED.display_unit_override,
					display_horizon_code_override = EXCLUDED.display_horizon_code_override,
					display_period_key_override = EXCLUDED.display_period_key_override,
					value_confidence_status = EXCLUDED.value_confidence_status
			`,
			[
				normalizeString(row.registry_version),
				normalizeString(row.curated_kpi_id),
				toNumber(row.display_order),
				normalizeString(row.chain_id),
				normalizeString(row.executive_label),
				normalizeString(row.dashboard_group),
				normalizeString(row.department_code),
				normalizeString(row.perspective_code),
				normalizeString(row.readiness_status),
				toBoolean(row.can_show_to_management) ?? false,
				normalizeString(row.management_note),
				normalizeString(row.required_action),
				toBoolean(row.current_flag) ?? true,
				toBoolean(row.show_numeric_value_flag) ?? true,
				toNumber(row.display_value_override),
				normalizeString(row.display_value_text_override),
				normalizeString(row.display_unit_override),
				normalizeString(row.display_horizon_code_override),
				normalizeString(row.display_period_key_override),
				normalizeString(row.value_confidence_status) ?? 'derived_latest'
			]
		);
	}
}

async function loadDocuments(client, batchId, rows) {
	for (const row of rows) {
		await client.query(
			`
				INSERT INTO staging.strategy_document_raw (
					batch_id,
					document_code,
					document_name,
					document_file,
					horizon_code,
					department_code,
					perspective_code,
					source_system,
					source_kind,
					record_origin,
					version_label,
					status,
					current_flag,
					source_locator,
					comment
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
				ON CONFLICT (batch_id, document_code) DO UPDATE
				SET document_name = EXCLUDED.document_name,
					document_file = COALESCE(EXCLUDED.document_file, staging.strategy_document_raw.document_file),
					horizon_code = COALESCE(EXCLUDED.horizon_code, staging.strategy_document_raw.horizon_code),
					department_code = COALESCE(EXCLUDED.department_code, staging.strategy_document_raw.department_code),
					perspective_code = COALESCE(EXCLUDED.perspective_code, staging.strategy_document_raw.perspective_code),
					source_system = COALESCE(EXCLUDED.source_system, staging.strategy_document_raw.source_system),
					source_kind = EXCLUDED.source_kind,
					record_origin = EXCLUDED.record_origin,
					version_label = COALESCE(EXCLUDED.version_label, staging.strategy_document_raw.version_label),
					status = EXCLUDED.status,
					current_flag = EXCLUDED.current_flag,
					source_locator = COALESCE(EXCLUDED.source_locator, staging.strategy_document_raw.source_locator),
					comment = COALESCE(EXCLUDED.comment, staging.strategy_document_raw.comment),
					loaded_at = now()
			`,
			[
				batchId,
				row.documentCode,
				row.documentName,
				row.documentFile,
				row.horizonCode,
				row.departmentCode,
				row.perspectiveCode,
				row.sourceSystem,
				row.sourceKind,
				row.recordOrigin,
				row.versionLabel,
				row.status,
				row.currentFlag,
				row.sourceLocator,
				row.comment
			]
		);
	}
}

async function loadMetrics(client, batchId, kpiRows, sourceRows, autoRows, inventoryRows) {
	const inventoryLookup = buildInventoryLookup(inventoryRows);

	for (const row of kpiRows) {
		await client.query(
			`
				INSERT INTO staging.strategy_metric_raw (
					batch_id,
					record_id,
					record_source,
					node_id,
					parent_node_id,
					chain_id,
					document_code,
					document_name,
					horizon_code,
					perspective_code,
					metric_code,
					metric_name,
					period_key,
					period_date,
					department_code,
					project_code,
					object_code,
					target_value,
					actual_value,
					unit,
					aggregation_rule,
					weight_pct,
					tolerance_abs,
					tolerance_pct,
					source_page,
					comment
				)
				VALUES ($1, $2, 'kpi_decomposition', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
				ON CONFLICT (batch_id, record_id) DO UPDATE
				SET parent_node_id = EXCLUDED.parent_node_id,
					chain_id = EXCLUDED.chain_id,
					document_code = EXCLUDED.document_code,
					document_name = EXCLUDED.document_name,
					horizon_code = EXCLUDED.horizon_code,
					perspective_code = EXCLUDED.perspective_code,
					metric_code = EXCLUDED.metric_code,
					metric_name = EXCLUDED.metric_name,
					period_key = EXCLUDED.period_key,
					period_date = EXCLUDED.period_date,
					department_code = EXCLUDED.department_code,
					project_code = EXCLUDED.project_code,
					object_code = EXCLUDED.object_code,
					target_value = EXCLUDED.target_value,
					actual_value = EXCLUDED.actual_value,
					unit = EXCLUDED.unit,
					aggregation_rule = EXCLUDED.aggregation_rule,
					weight_pct = EXCLUDED.weight_pct,
					tolerance_abs = EXCLUDED.tolerance_abs,
					tolerance_pct = EXCLUDED.tolerance_pct,
					source_page = EXCLUDED.source_page,
					comment = EXCLUDED.comment,
					loaded_at = now()
			`,
			[
				batchId,
				normalizeString(row.node_id),
				normalizeString(row.node_id),
				normalizeString(row.parent_node_id),
				normalizeString(row.chain_id),
				normalizeString(row.document_id),
				normalizeString(row.document_name),
				normalizeString(row.horizon_code),
				normalizeString(row.perspective_code),
				normalizeString(row.metric_code),
				normalizeString(row.metric_name),
				normalizeString(row.period_key),
				toDate(row.period_key),
				normalizeString(row.department_code),
				normalizeString(row.project_code),
				normalizeString(row.object_code),
				toNumber(row.target_value),
				toNumber(row.actual_value),
				normalizeString(row.unit),
				normalizeString(row.aggregation_rule),
				toNumber(row.weight_pct),
				toNumber(row.tolerance_abs),
				toNumber(row.tolerance_pct),
				normalizeString(row.source_page),
				normalizeString(row.comment)
			]
		);
	}

	for (const row of sourceRows) {
		const sourceFile = normalizeString(row.source_file);
		const sourceName = normalizeString(row.source_name);
		const canonical = resolveCanonicalDocument(
			{ sourceFile, documentName: sourceName, documentCode: null },
			inventoryLookup
		);

		await client.query(
			`
				INSERT INTO staging.strategy_metric_raw (
					batch_id,
					record_id,
					record_source,
					source_id,
					document_code,
					document_name,
					document_file,
					horizon_code,
					perspective_code,
					metric_code,
					metric_name,
					period_key,
					period_date,
					entity_level,
					entity_code,
					subject_area,
					department_code,
					metric_value,
					metric_value_text,
					unit,
					extractability,
					source_locator,
					comment
				)
				VALUES ($1, $2, 'data_source_map', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
				ON CONFLICT (batch_id, record_id) DO UPDATE
				SET source_id = EXCLUDED.source_id,
					document_code = EXCLUDED.document_code,
					document_name = EXCLUDED.document_name,
					document_file = EXCLUDED.document_file,
					horizon_code = EXCLUDED.horizon_code,
					perspective_code = EXCLUDED.perspective_code,
					metric_code = EXCLUDED.metric_code,
					metric_name = EXCLUDED.metric_name,
					period_key = EXCLUDED.period_key,
					period_date = EXCLUDED.period_date,
					entity_level = EXCLUDED.entity_level,
					entity_code = EXCLUDED.entity_code,
					subject_area = EXCLUDED.subject_area,
					department_code = EXCLUDED.department_code,
					metric_value = EXCLUDED.metric_value,
					metric_value_text = EXCLUDED.metric_value_text,
					unit = EXCLUDED.unit,
					extractability = EXCLUDED.extractability,
					source_locator = EXCLUDED.source_locator,
					comment = EXCLUDED.comment,
					loaded_at = now()
			`,
			[
				batchId,
				normalizeString(row.source_id),
				normalizeString(row.source_id),
				canonical?.documentCode || sourceName,
				canonical?.documentName || sourceName,
				canonical?.documentFile || sourceFile,
				canonical?.horizonCode || normalizeString(row.horizon_code),
				canonical?.perspectiveCode || null,
				normalizeString(row.metric_code),
				normalizeString(row.metric_name),
				normalizeString(row.period_key),
				toDate(row.period_key),
				normalizeString(row.entity_level),
				normalizeString(row.entity_level),
				normalizeString(row.subject_area),
				canonical?.departmentCode || inferDepartmentCodeFromSourceFile(sourceFile),
				toNumber(row.metric_value),
				normalizeString(row.metric_value),
				normalizeString(row.unit),
				normalizeString(row.extractability),
				normalizeString(row.source_locator),
				normalizeString(row.notes)
			]
		);
	}

	for (const row of autoRows) {
		const sourceFile = normalizeString(row.source_file);
		const rowDocumentCode = normalizeString(row.document_code);
		const rowDocumentName = normalizeString(row.document_name);
		const canonical = resolveCanonicalDocument(
			{ sourceFile, documentCode: rowDocumentCode, documentName: rowDocumentName },
			inventoryLookup
		);
		const rawMetricValue = normalizeString(row.metric_value);
		const numericMetricValue = toNumber(row.metric_value);
		const unit = normalizeString(row.unit);
		const periodKey = normalizeString(row.period_key);
		const periodDate = toDate(periodKey) || toDate(rawMetricValue);

		await client.query(
			`
				INSERT INTO staging.strategy_metric_raw (
					batch_id,
					record_id,
					record_source,
					source_id,
					document_code,
					document_name,
					document_file,
					horizon_code,
					perspective_code,
					metric_code,
					metric_name,
					period_key,
					period_date,
					entity_level,
					entity_code,
					subject_area,
					department_code,
					target_value,
					metric_value,
					metric_value_text,
					unit,
					extractability,
					source_locator,
					comment
				)
				VALUES ($1, $2, 'auto_extracted_facts', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
				ON CONFLICT (batch_id, record_id) DO UPDATE
				SET source_id = EXCLUDED.source_id,
					document_code = EXCLUDED.document_code,
					document_name = EXCLUDED.document_name,
					document_file = EXCLUDED.document_file,
					horizon_code = EXCLUDED.horizon_code,
					perspective_code = EXCLUDED.perspective_code,
					metric_code = EXCLUDED.metric_code,
					metric_name = EXCLUDED.metric_name,
					period_key = EXCLUDED.period_key,
					period_date = EXCLUDED.period_date,
					entity_level = EXCLUDED.entity_level,
					entity_code = EXCLUDED.entity_code,
					subject_area = EXCLUDED.subject_area,
					department_code = EXCLUDED.department_code,
					target_value = EXCLUDED.target_value,
					metric_value = EXCLUDED.metric_value,
					metric_value_text = EXCLUDED.metric_value_text,
					unit = EXCLUDED.unit,
					extractability = EXCLUDED.extractability,
					source_locator = EXCLUDED.source_locator,
					comment = EXCLUDED.comment,
					loaded_at = now()
			`,
			[
				batchId,
				normalizeString(row.record_id),
				normalizeString(row.record_id),
				canonical?.documentCode || rowDocumentCode || inferDocumentCodeFromSourceFile(sourceFile),
				canonical?.documentName ||
					rowDocumentName ||
					inferDocumentNameFromSourceFile(sourceFile) ||
					inferDocumentCodeFromSourceFile(sourceFile),
				canonical?.documentFile || sourceFile,
				canonical?.horizonCode || normalizeString(row.horizon_code),
				normalizeString(row.perspective_code) || canonical?.perspectiveCode || null,
				normalizeString(row.metric_code),
				normalizeString(row.metric_name),
				periodKey,
				periodDate,
				normalizeString(row.entity_level),
				inferEntityCode(row.entity_level, row.subject_area),
				normalizeString(row.subject_area),
				normalizeString(row.department_code) ||
					canonical?.departmentCode ||
					inferDepartmentCodeFromSourceFile(sourceFile),
				unit === 'date' ? null : numericMetricValue,
				numericMetricValue,
				rawMetricValue,
				unit,
				normalizeString(row.confidence),
				normalizeString(row.source_locator),
				normalizeString(row.note)
			]
		);
	}
}

async function loadCascade(client, batchId, rows) {
	for (const row of rows) {
		await client.query(
			`
				INSERT INTO staging.strategy_cascade_raw (
					batch_id,
					cascade_link_id,
					chain_id,
					parent_document_code,
					parent_document_name,
					parent_horizon_code,
					child_document_code,
					child_document_name,
					child_horizon_code,
					department_code,
					project_code,
					object_code,
					cascade_subject,
					transition_required,
					transition_exists,
					coverage_status,
					source_page,
					comment
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
				ON CONFLICT (batch_id, cascade_link_id) DO UPDATE
				SET chain_id = EXCLUDED.chain_id,
					parent_document_code = EXCLUDED.parent_document_code,
					parent_document_name = EXCLUDED.parent_document_name,
					parent_horizon_code = EXCLUDED.parent_horizon_code,
					child_document_code = EXCLUDED.child_document_code,
					child_document_name = EXCLUDED.child_document_name,
					child_horizon_code = EXCLUDED.child_horizon_code,
					department_code = EXCLUDED.department_code,
					project_code = EXCLUDED.project_code,
					object_code = EXCLUDED.object_code,
					cascade_subject = EXCLUDED.cascade_subject,
					transition_required = EXCLUDED.transition_required,
					transition_exists = EXCLUDED.transition_exists,
					coverage_status = EXCLUDED.coverage_status,
					source_page = EXCLUDED.source_page,
					comment = EXCLUDED.comment,
					loaded_at = now()
			`,
			[
				batchId,
				normalizeString(row.cascade_link_id),
				normalizeString(row.chain_id),
				normalizeString(row.parent_document_id),
				normalizeString(row.parent_document_name),
				normalizeString(row.parent_horizon_code),
				normalizeString(row.child_document_id),
				normalizeString(row.child_document_name),
				normalizeString(row.child_horizon_code),
				normalizeString(row.department_code),
				normalizeString(row.project_code),
				normalizeString(row.object_code),
				normalizeString(row.cascade_subject),
				toBoolean(row.transition_required) ?? false,
				toBoolean(row.transition_exists) ?? false,
				normalizeString(row.coverage_status),
				normalizeString(row.source_page),
				normalizeString(row.comment)
			]
		);
	}
}

async function markBatchLoaded(client, batchId) {
	await client.query(
		`
			UPDATE staging.strategy_load_batch
			SET status = 'loaded',
				completed_at = now()
			WHERE batch_id = $1
		`,
		[batchId]
	);
}

async function markBatchFailed(client, batchId, error) {
	await client.query(
		`
			UPDATE staging.strategy_load_batch
			SET status = 'failed',
				note = $2,
				completed_at = now()
			WHERE batch_id = $1
		`,
		[batchId, error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000)]
	);
}

async function main() {
	if (process.argv.includes('--help')) {
		printUsage();
		return;
	}

	const sourceRoot = resolveSourceRoot();
	const batchId = resolveBatchId();
	const resolvedMetrics = await firstExisting([
		path.join(sourceRoot, 'dim_metric_dictionary_full.csv'),
		path.join(sourceRoot, 'dim_metric_dictionary_template.csv')
	]);
	const resolvedKpi = await firstExisting([
		path.join(sourceRoot, 'fact_kpi_decomposition_full.csv'),
		path.join(sourceRoot, 'fact_kpi_decomposition_template.csv')
	]);
	const resolvedCascade = await firstExisting([
		path.join(sourceRoot, 'fact_planning_cascade_full.csv'),
		path.join(sourceRoot, 'fact_planning_cascade_seed.csv')
	]);
	const resolvedAutoFacts =
		(await firstExisting([
			path.join(sourceRoot, 'auto_extracted_facts_full.csv'),
			path.join(sourceRoot, 'auto_extracted_facts_demo.csv')
		])) || path.join(sourceRoot, 'auto_extracted_facts_demo.csv');

	const files = {
		perspectives: path.join(sourceRoot, 'dim_bsc_perspectives.csv'),
		horizons: path.join(sourceRoot, 'dim_horizons.csv'),
		metrics: resolvedMetrics,
		weights: path.join(sourceRoot, 'fact_bsc_weights.csv'),
		kpi: resolvedKpi,
		cascade: resolvedCascade,
		sourceMap: path.join(sourceRoot, 'data_source_map.csv'),
		autoFacts: resolvedAutoFacts,
		inventory: path.join(sourceRoot, 'document_inventory_full.csv'),
		executiveRegistry: path.join(sourceRoot, 'executive_kpi_registry_v2.csv')
	};

	for (const filePath of [
		files.perspectives,
		files.horizons,
		files.metrics,
		files.weights,
		files.kpi,
		files.cascade,
		files.sourceMap
	]) {
		await ensureFileExists(filePath);
	}

	const [
		perspectives,
		horizons,
		metrics,
		weights,
		kpiRows,
		cascadeRows,
		sourceRows,
		autoRows,
		inventoryRows,
		executiveRegistryRows
	] = await Promise.all([
		readCsv(files.perspectives),
		readCsv(files.horizons),
		readCsv(files.metrics),
		readCsv(files.weights),
		readCsv(files.kpi),
		readCsv(files.cascade),
		readCsv(files.sourceMap),
		readOptionalCsv(files.autoFacts),
		readOptionalCsv(files.inventory),
		readOptionalCsv(files.executiveRegistry)
	]);

	const documentRows = buildDocumentSeeds({
		inventoryRows,
		cascadeRows,
		kpiRows,
		sourceRows,
		autoRows
	});

	const client = new Client({ connectionString: requireDatabaseUrl() });
	await client.connect();

	try {
		await upsertBatch(client, batchId, sourceRoot);
		await client.query('BEGIN');
		await clearBatch(client, batchId);

		await seedPerspectives(client, perspectives);
		await seedHorizons(client, horizons);
		await seedMetrics(client, metrics);
		await seedWeights(client, weights);
		await seedExecutiveKpiRegistry(client, executiveRegistryRows);

		await loadDocuments(client, batchId, documentRows);
		await loadMetrics(client, batchId, kpiRows, sourceRows, autoRows, inventoryRows);
		await loadCascade(client, batchId, cascadeRows);
		await markBatchLoaded(client, batchId);

		await client.query('COMMIT');
		console.log(`[strategy:load] batch=${batchId} sourceRoot=${sourceRoot}`);
		console.log(
			`[strategy:load] loaded documents=${documentRows.length} metrics=${kpiRows.length + sourceRows.length + autoRows.length} cascadeLinks=${cascadeRows.length}`
		);
	} catch (error) {
		await client.query('ROLLBACK');
		try {
			await markBatchFailed(client, batchId, error);
		} catch {
			// Ignore secondary failure to keep the original error visible.
		}
		throw error;
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
