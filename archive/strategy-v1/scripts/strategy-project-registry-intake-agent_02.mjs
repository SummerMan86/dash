import 'dotenv/config';

import { readFile } from 'node:fs/promises';

import pg from 'pg';

const { Client } = pg;

function usage() {
	console.log(`Usage:
  node ./scripts/strategy-project-registry-intake-agent_02.mjs dry-run --spec <path-to-json>
  node ./scripts/strategy-project-registry-intake-agent_02.mjs insert --spec <path-to-json>`);
}

function parseArgs(argv) {
	const command = argv[2];
	const options = {};

	for (let index = 3; index < argv.length; index += 1) {
		const token = argv[index];
		if (!token.startsWith('--')) continue;
		const key = token.slice(2);
		const value = argv[index + 1];
		if (value && !value.startsWith('--')) {
			options[key] = value;
			index += 1;
		} else {
			options[key] = 'true';
		}
	}

	return { command, options };
}

function requireDatabaseUrl() {
	const url = process.env.DATABASE_URL?.trim();
	if (!url) {
		throw new Error('DATABASE_URL is required');
	}
	return url;
}

async function createClient() {
	const client = new Client({
		connectionString: requireDatabaseUrl()
	});
	await client.connect();
	return client;
}

function normalizeString(value) {
	if (value === undefined || value === null) return null;
	const trimmed = String(value).trim();
	return trimmed ? trimmed : null;
}

function normalizeSourceSystem(value) {
	const normalized = normalizeString(value);
	if (!normalized) return 'PBIX_PROJECT_REGISTRY';
	return normalized.replace(/\s+/g, '_').toUpperCase();
}

function toBoolean(value) {
	if (typeof value === 'boolean') return value;
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

	if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
	if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(normalized)) {
		const [day, month, year] = normalized.split('.');
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	return normalized;
}

function asObject(value, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${label} must be an object`);
	}
	return value;
}

async function loadSpec(specPath) {
	if (!specPath) {
		throw new Error('--spec is required');
	}

	const raw = await readFile(specPath, 'utf8');
	const spec = JSON.parse(raw);
	const defaults = spec.defaults ? asObject(spec.defaults, 'defaults') : {};
	const registry = Array.isArray(spec.registry) ? spec.registry : [];
	const metrics = Array.isArray(spec.metrics) ? spec.metrics : [];

	if (registry.length === 0 && metrics.length === 0) {
		throw new Error('Spec must contain non-empty registry or metrics arrays');
	}

	return { defaults, registry, metrics };
}

function applyDefaults(defaults, row, label) {
	const rawRow = asObject(row, label);
	return { ...defaults, ...rawRow };
}

function requireField(value, field, label) {
	if (!value) {
		throw new Error(`${label}: ${field} is required`);
	}
	return value;
}

function normalizeRegistryRow(defaults, row, index) {
	const label = `registry[${index}]`;
	const merged = applyDefaults(defaults, row, label);

	const sourceSystem = normalizeSourceSystem(merged.source_system);
	const technicalSnapshotDate = toDate(merged.technical_snapshot_date);
	const projectNumber = normalizeString(merged.project_number);

	return {
		source_system: sourceSystem,
		source_snapshot_label: normalizeString(merged.source_snapshot_label),
		technical_snapshot_date: requireField(technicalSnapshotDate, 'technical_snapshot_date', label),
		business_snapshot_date: toDate(merged.business_snapshot_date),
		source_file: normalizeString(merged.source_file),
		source_table: normalizeString(merged.source_table),
		source_page: normalizeString(merged.source_page),
		project_number: requireField(projectNumber, 'project_number', label),
		project_name_ru: normalizeString(merged.project_name_ru),
		project_name_en: normalizeString(merged.project_name_en),
		project_type_code: normalizeString(merged.project_type_code),
		project_type_name: normalizeString(merged.project_type_name),
		object_name: normalizeString(merged.object_name),
		project_status_code: normalizeString(merged.project_status_code),
		project_status_name: normalizeString(merged.project_status_name),
		department_code: normalizeString(merged.department_code),
		department_name: normalizeString(merged.department_name),
		decision_level_code: normalizeString(merged.decision_level_code),
		decision_level_name: normalizeString(merged.decision_level_name),
		cost_type_code: normalizeString(merged.cost_type_code),
		cost_type_name: normalizeString(merged.cost_type_name),
		driver_text: normalizeString(merged.driver_text),
		tz_number: normalizeString(merged.tz_number),
		npv_priority: normalizeString(merged.npv_priority),
		construction_progress_pct: toNumber(merged.construction_progress_pct),
		passed_stage_gate_flag: toBoolean(merged.passed_stage_gate_flag),
		next_stage_gate_date: toDate(merged.next_stage_gate_date),
		gke_forecast_date: toDate(merged.gke_forecast_date),
		approved_spr2_date: toDate(merged.approved_spr2_date),
		approved_spr3_date: toDate(merged.approved_spr3_date),
		approved_spr4_date: toDate(merged.approved_spr4_date),
		approved_spr5_date: toDate(merged.approved_spr5_date),
		business_opportunity_manager: normalizeString(merged.business_opportunity_manager),
		project_engineer: normalizeString(merged.project_engineer),
		gi_comment: normalizeString(merged.gi_comment),
		prioritization_comment: normalizeString(merged.prioritization_comment),
		manually_verified_flag: toBoolean(merged.manually_verified_flag) ?? false,
		ready_for_dwh_flag: toBoolean(merged.ready_for_dwh_flag) ?? false,
		dq_comment: normalizeString(merged.dq_comment)
	};
}

function normalizeMetricRow(defaults, row, index) {
	const label = `metrics[${index}]`;
	const merged = applyDefaults(defaults, row, label);

	const sourceSystem = normalizeSourceSystem(merged.source_system);
	const technicalSnapshotDate = toDate(merged.technical_snapshot_date);
	const projectNumber = normalizeString(merged.project_number);
	const metricCode = normalizeString(merged.metric_code);
	const metricName = normalizeString(merged.metric_name);

	return {
		source_system: sourceSystem,
		source_snapshot_label: normalizeString(merged.source_snapshot_label),
		technical_snapshot_date: requireField(technicalSnapshotDate, 'technical_snapshot_date', label),
		business_snapshot_date: toDate(merged.business_snapshot_date),
		source_file: normalizeString(merged.source_file),
		source_table: normalizeString(merged.source_table),
		source_page: normalizeString(merged.source_page),
		project_number: requireField(projectNumber, 'project_number', label),
		metric_code: requireField(metricCode, 'metric_code', label),
		metric_name: requireField(metricName, 'metric_name', label),
		value_type: normalizeString(merged.value_type),
		numeric_value: toNumber(merged.numeric_value),
		unit: normalizeString(merged.unit),
		year_num: (() => {
			const value = normalizeString(merged.year_num);
			if (!value) return null;
			const parsed = Number(value);
			return Number.isInteger(parsed) ? parsed : null;
		})(),
		period_label: normalizeString(merged.period_label),
		scenario_version: normalizeString(merged.scenario_version),
		currency_code: normalizeString(merged.currency_code),
		manually_verified_flag: toBoolean(merged.manually_verified_flag) ?? false,
		ready_for_dwh_flag: toBoolean(merged.ready_for_dwh_flag) ?? false,
		dq_comment: normalizeString(merged.dq_comment)
	};
}

async function upsertRegistryRow(client, row) {
	await client.query(
		`INSERT INTO staging.strategy_project_registry_intake (
			source_system, source_snapshot_label, technical_snapshot_date, business_snapshot_date,
			source_file, source_table, source_page, project_number, project_name_ru, project_name_en,
			project_type_code, project_type_name, object_name, project_status_code, project_status_name,
			department_code, department_name, decision_level_code, decision_level_name,
			cost_type_code, cost_type_name, driver_text, tz_number, npv_priority,
			construction_progress_pct, passed_stage_gate_flag, next_stage_gate_date, gke_forecast_date,
			approved_spr2_date, approved_spr3_date, approved_spr4_date, approved_spr5_date,
			business_opportunity_manager, project_engineer, gi_comment, prioritization_comment,
			manually_verified_flag, ready_for_dwh_flag, dq_comment
		) VALUES (
			$1,$2,$3,$4,
			$5,$6,$7,$8,$9,$10,
			$11,$12,$13,$14,$15,
			$16,$17,$18,$19,
			$20,$21,$22,$23,$24,
			$25,$26,$27,$28,
			$29,$30,$31,$32,
			$33,$34,$35,$36,
			$37,$38,$39
		)
		ON CONFLICT (source_system, technical_snapshot_date, project_number) DO UPDATE SET
			source_snapshot_label = EXCLUDED.source_snapshot_label,
			business_snapshot_date = EXCLUDED.business_snapshot_date,
			source_file = EXCLUDED.source_file,
			source_table = EXCLUDED.source_table,
			source_page = EXCLUDED.source_page,
			project_name_ru = EXCLUDED.project_name_ru,
			project_name_en = EXCLUDED.project_name_en,
			project_type_code = EXCLUDED.project_type_code,
			project_type_name = EXCLUDED.project_type_name,
			object_name = EXCLUDED.object_name,
			project_status_code = EXCLUDED.project_status_code,
			project_status_name = EXCLUDED.project_status_name,
			department_code = EXCLUDED.department_code,
			department_name = EXCLUDED.department_name,
			decision_level_code = EXCLUDED.decision_level_code,
			decision_level_name = EXCLUDED.decision_level_name,
			cost_type_code = EXCLUDED.cost_type_code,
			cost_type_name = EXCLUDED.cost_type_name,
			driver_text = EXCLUDED.driver_text,
			tz_number = EXCLUDED.tz_number,
			npv_priority = EXCLUDED.npv_priority,
			construction_progress_pct = EXCLUDED.construction_progress_pct,
			passed_stage_gate_flag = EXCLUDED.passed_stage_gate_flag,
			next_stage_gate_date = EXCLUDED.next_stage_gate_date,
			gke_forecast_date = EXCLUDED.gke_forecast_date,
			approved_spr2_date = EXCLUDED.approved_spr2_date,
			approved_spr3_date = EXCLUDED.approved_spr3_date,
			approved_spr4_date = EXCLUDED.approved_spr4_date,
			approved_spr5_date = EXCLUDED.approved_spr5_date,
			business_opportunity_manager = EXCLUDED.business_opportunity_manager,
			project_engineer = EXCLUDED.project_engineer,
			gi_comment = EXCLUDED.gi_comment,
			prioritization_comment = EXCLUDED.prioritization_comment,
			manually_verified_flag = EXCLUDED.manually_verified_flag,
			ready_for_dwh_flag = EXCLUDED.ready_for_dwh_flag,
			dq_comment = EXCLUDED.dq_comment`,
		[
			row.source_system,
			row.source_snapshot_label,
			row.technical_snapshot_date,
			row.business_snapshot_date,
			row.source_file,
			row.source_table,
			row.source_page,
			row.project_number,
			row.project_name_ru,
			row.project_name_en,
			row.project_type_code,
			row.project_type_name,
			row.object_name,
			row.project_status_code,
			row.project_status_name,
			row.department_code,
			row.department_name,
			row.decision_level_code,
			row.decision_level_name,
			row.cost_type_code,
			row.cost_type_name,
			row.driver_text,
			row.tz_number,
			row.npv_priority,
			row.construction_progress_pct,
			row.passed_stage_gate_flag,
			row.next_stage_gate_date,
			row.gke_forecast_date,
			row.approved_spr2_date,
			row.approved_spr3_date,
			row.approved_spr4_date,
			row.approved_spr5_date,
			row.business_opportunity_manager,
			row.project_engineer,
			row.gi_comment,
			row.prioritization_comment,
			row.manually_verified_flag,
			row.ready_for_dwh_flag,
			row.dq_comment
		]
	);
}

async function updateMetricRow(client, row) {
	return client.query(
		`UPDATE staging.strategy_project_metric_intake
		SET
			source_snapshot_label = $7,
			business_snapshot_date = $8,
			source_file = $9,
			source_table = $10,
			source_page = $11,
			metric_name = $12,
			value_type = $13,
			numeric_value = $14,
			unit = $15,
			scenario_version = $16,
			currency_code = $17,
			manually_verified_flag = $18,
			ready_for_dwh_flag = $19,
			dq_comment = $20
		WHERE source_system = $1
		  AND technical_snapshot_date = $2
		  AND project_number = $3
		  AND metric_code = $4
		  AND COALESCE(year_num, -1) = COALESCE($5, -1)
		  AND COALESCE(period_label, '') = COALESCE($6, '')`,
		[
			row.source_system,
			row.technical_snapshot_date,
			row.project_number,
			row.metric_code,
			row.year_num,
			row.period_label,
			row.source_snapshot_label,
			row.business_snapshot_date,
			row.source_file,
			row.source_table,
			row.source_page,
			row.metric_name,
			row.value_type,
			row.numeric_value,
			row.unit,
			row.scenario_version,
			row.currency_code,
			row.manually_verified_flag,
			row.ready_for_dwh_flag,
			row.dq_comment
		]
	);
}

async function insertMetricRow(client, row) {
	await client.query(
		`INSERT INTO staging.strategy_project_metric_intake (
			source_system, source_snapshot_label, technical_snapshot_date, business_snapshot_date,
			source_file, source_table, source_page, project_number,
			metric_code, metric_name, value_type, numeric_value, unit,
			year_num, period_label, scenario_version, currency_code,
			manually_verified_flag, ready_for_dwh_flag, dq_comment
		) VALUES (
			$1,$2,$3,$4,
			$5,$6,$7,$8,
			$9,$10,$11,$12,$13,
			$14,$15,$16,$17,
			$18,$19,$20
		)`,
		[
			row.source_system,
			row.source_snapshot_label,
			row.technical_snapshot_date,
			row.business_snapshot_date,
			row.source_file,
			row.source_table,
			row.source_page,
			row.project_number,
			row.metric_code,
			row.metric_name,
			row.value_type,
			row.numeric_value,
			row.unit,
			row.year_num,
			row.period_label,
			row.scenario_version,
			row.currency_code,
			row.manually_verified_flag,
			row.ready_for_dwh_flag,
			row.dq_comment
		]
	);
}

async function upsertMetricRow(client, row) {
	const updated = await updateMetricRow(client, row);
	if (updated.rowCount === 0) {
		await insertMetricRow(client, row);
	}
}

function uniqueRegistryKeys(rows) {
	return [
		...new Map(
			rows.map((row) => [
				`${row.source_system}::${row.technical_snapshot_date}::${row.project_number}`,
				row
			])
		).values()
	];
}

function uniqueMetricKeys(rows) {
	return [
		...new Map(
			rows.map((row) => [
				[
					row.source_system,
					row.technical_snapshot_date,
					row.project_number,
					row.metric_code,
					row.year_num ?? '',
					row.period_label ?? ''
				].join('::'),
				row
			])
		).values()
	];
}

async function verifyRegistryRows(client, rows) {
	const keys = uniqueRegistryKeys(rows);
	let count = 0;

	for (const row of keys) {
		const result = await client.query(
			`SELECT count(*)::int AS count
			FROM staging.strategy_project_registry_intake
			WHERE source_system = $1
			  AND technical_snapshot_date = $2
			  AND project_number = $3`,
			[row.source_system, row.technical_snapshot_date, row.project_number]
		);
		count += result.rows[0]?.count ?? 0;
	}

	return count;
}

async function verifyMetricRows(client, rows) {
	const keys = uniqueMetricKeys(rows);
	let count = 0;

	for (const row of keys) {
		const result = await client.query(
			`SELECT count(*)::int AS count
			FROM staging.strategy_project_metric_intake
			WHERE source_system = $1
			  AND technical_snapshot_date = $2
			  AND project_number = $3
			  AND metric_code = $4
			  AND COALESCE(year_num, -1) = COALESCE($5, -1)
			  AND COALESCE(period_label, '') = COALESCE($6, '')`,
			[
				row.source_system,
				row.technical_snapshot_date,
				row.project_number,
				row.metric_code,
				row.year_num,
				row.period_label
			]
		);
		count += result.rows[0]?.count ?? 0;
	}

	return count;
}

function summarizeRows(registryRows, metricRows) {
	const registryKeys = uniqueRegistryKeys(registryRows);
	const metricKeys = uniqueMetricKeys(metricRows);
	return {
		registry_rows: registryRows.length,
		registry_unique_keys: registryKeys.length,
		metric_rows: metricRows.length,
		metric_unique_keys: metricKeys.length,
		source_systems: [
			...new Set([...registryRows, ...metricRows].map((row) => row.source_system))
		].sort(),
		technical_snapshot_dates: [
			...new Set([...registryRows, ...metricRows].map((row) => row.technical_snapshot_date))
		].sort(),
		projects: [...new Set([...registryRows, ...metricRows].map((row) => row.project_number))].sort()
	};
}

async function insert(options) {
	const spec = await loadSpec(options.spec);
	const registryRows = spec.registry.map((row, index) =>
		normalizeRegistryRow(spec.defaults, row, index)
	);
	const metricRows = spec.metrics.map((row, index) =>
		normalizeMetricRow(spec.defaults, row, index)
	);
	const summary = summarizeRows(registryRows, metricRows);

	if (options.command === 'dry-run') {
		console.log(
			JSON.stringify(
				{
					mode: 'dry-run',
					summary,
					first_registry_row: registryRows[0] ?? null,
					first_metric_row: metricRows[0] ?? null
				},
				null,
				2
			)
		);
		return;
	}

	const client = await createClient();

	try {
		await client.query('BEGIN');
		for (const row of registryRows) {
			await upsertRegistryRow(client, row);
		}
		for (const row of metricRows) {
			await upsertMetricRow(client, row);
		}
		await client.query('COMMIT');

		const verify = {
			registry_rows_present: await verifyRegistryRows(client, registryRows),
			metric_rows_present: await verifyMetricRows(client, metricRows)
		};

		console.log(
			JSON.stringify(
				{
					mode: 'insert',
					inserted: {
						registry: registryRows.length,
						metrics: metricRows.length
					},
					summary,
					verify
				},
				null,
				2
			)
		);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		await client.end();
	}
}

async function main() {
	const { command, options } = parseArgs(process.argv);

	if (command !== 'insert' && command !== 'dry-run') {
		usage();
		process.exitCode = 1;
		return;
	}

	await insert({ ...options, command });
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
