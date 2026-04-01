import 'dotenv/config';

import { readFile } from 'node:fs/promises';

import pg from 'pg';

const { Client } = pg;

function usage() {
	console.log(`Usage:
  node ./scripts/strategy-agent-intake.mjs insert --spec <path-to-json>`);
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

async function loadSpec(specPath) {
	if (!specPath) {
		throw new Error('--spec is required');
	}

	const raw = await readFile(specPath, 'utf8');
	const spec = JSON.parse(raw);

	if (!spec.document) {
		throw new Error('Spec must contain document object');
	}

	return {
		document: spec.document,
		facts: Array.isArray(spec.facts) ? spec.facts : [],
		links: Array.isArray(spec.links) ? spec.links : [],
		gaps: Array.isArray(spec.gaps) ? spec.gaps : []
	};
}

async function upsertDocument(client, document) {
	await client.query(
		`INSERT INTO staging.strategy_document_intake (
			run_id, task_id, source_document_code, source_document_file, agent_code, agent_label, doc_id,
			document_short_name, document_full_name, document_type, document_kind, department_code, department_name,
			horizon_code, horizon_name, period_label, status_code, status_name, perspective_code, perspective_name,
			document_goal, key_tasks, main_objects, main_stages, main_projects, approved_by, actualization_date_raw,
			actualization_date, version_label, source_page, source_section, manually_verified_flag, ready_for_dwh_flag, dq_comment
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,
			$8,$9,$10,$11,$12,$13,
			$14,$15,$16,$17,$18,$19,$20,
			$21,$22,$23,$24,$25,$26,$27,
			$28,$29,$30,$31,$32,$33,$34
		)
		ON CONFLICT (run_id, source_document_code) DO UPDATE SET
			task_id = EXCLUDED.task_id,
			source_document_file = EXCLUDED.source_document_file,
			agent_code = EXCLUDED.agent_code,
			agent_label = EXCLUDED.agent_label,
			doc_id = EXCLUDED.doc_id,
			document_short_name = EXCLUDED.document_short_name,
			document_full_name = EXCLUDED.document_full_name,
			document_type = EXCLUDED.document_type,
			document_kind = EXCLUDED.document_kind,
			department_code = EXCLUDED.department_code,
			department_name = EXCLUDED.department_name,
			horizon_code = EXCLUDED.horizon_code,
			horizon_name = EXCLUDED.horizon_name,
			period_label = EXCLUDED.period_label,
			status_code = EXCLUDED.status_code,
			status_name = EXCLUDED.status_name,
			perspective_code = EXCLUDED.perspective_code,
			perspective_name = EXCLUDED.perspective_name,
			document_goal = EXCLUDED.document_goal,
			key_tasks = EXCLUDED.key_tasks,
			main_objects = EXCLUDED.main_objects,
			main_stages = EXCLUDED.main_stages,
			main_projects = EXCLUDED.main_projects,
			approved_by = EXCLUDED.approved_by,
			actualization_date_raw = EXCLUDED.actualization_date_raw,
			actualization_date = EXCLUDED.actualization_date,
			version_label = EXCLUDED.version_label,
			source_page = EXCLUDED.source_page,
			source_section = EXCLUDED.source_section,
			manually_verified_flag = EXCLUDED.manually_verified_flag,
			ready_for_dwh_flag = EXCLUDED.ready_for_dwh_flag,
			dq_comment = EXCLUDED.dq_comment`,
		[
			document.run_id,
			document.task_id,
			document.source_document_code,
			document.source_document_file,
			document.agent_code,
			document.agent_label,
			document.doc_id,
			document.document_short_name,
			document.document_full_name,
			document.document_type,
			document.document_kind,
			document.department_code,
			document.department_name,
			document.horizon_code,
			document.horizon_name,
			document.period_label,
			document.status_code,
			document.status_name,
			document.perspective_code,
			document.perspective_name,
			document.document_goal,
			document.key_tasks,
			document.main_objects,
			document.main_stages,
			document.main_projects,
			document.approved_by ?? null,
			document.actualization_date_raw ?? null,
			document.actualization_date ?? null,
			document.version_label ?? null,
			document.source_page ?? null,
			document.source_section ?? null,
			Boolean(document.manually_verified_flag),
			Boolean(document.ready_for_dwh_flag),
			document.dq_comment ?? null
		]
	);
}

async function upsertFact(client, fact) {
	await client.query(
		`INSERT INTO staging.strategy_fact_intake (
			run_id, task_id, source_document_code, source_document_file, agent_code, agent_label, fact_id, doc_id,
			fact_class, value_type, metric_code, fact_name, department_code, horizon_code, perspective_code,
			scenario_version, object_name, stage_name, project_name, discipline_name, period_label, year_num,
			period_part, unit, value_operator, numeric_value, text_value, raw_value, currency_code,
			aggregation_rule, score_direction, tolerance_abs, tolerance_pct, parent_fact_id, parent_kpi_id,
			chain_id, source_type, source_path, source_page, source_section, source_row_ref,
			extraction_method, confidence_label, manually_verified_flag, ready_for_dwh_flag, comment
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,
			$9,$10,$11,$12,$13,$14,$15,
			$16,$17,$18,$19,$20,$21,$22,
			$23,$24,$25,$26,$27,$28,$29,
			$30,$31,$32,$33,$34,$35,
			$36,$37,$38,$39,$40,$41,
			$42,$43,$44,$45,$46
		)
		ON CONFLICT (run_id, fact_id) DO UPDATE SET
			task_id = EXCLUDED.task_id,
			source_document_code = EXCLUDED.source_document_code,
			source_document_file = EXCLUDED.source_document_file,
			agent_code = EXCLUDED.agent_code,
			agent_label = EXCLUDED.agent_label,
			doc_id = EXCLUDED.doc_id,
			fact_class = EXCLUDED.fact_class,
			value_type = EXCLUDED.value_type,
			metric_code = EXCLUDED.metric_code,
			fact_name = EXCLUDED.fact_name,
			department_code = EXCLUDED.department_code,
			horizon_code = EXCLUDED.horizon_code,
			perspective_code = EXCLUDED.perspective_code,
			scenario_version = EXCLUDED.scenario_version,
			object_name = EXCLUDED.object_name,
			stage_name = EXCLUDED.stage_name,
			project_name = EXCLUDED.project_name,
			discipline_name = EXCLUDED.discipline_name,
			period_label = EXCLUDED.period_label,
			year_num = EXCLUDED.year_num,
			period_part = EXCLUDED.period_part,
			unit = EXCLUDED.unit,
			value_operator = EXCLUDED.value_operator,
			numeric_value = EXCLUDED.numeric_value,
			text_value = EXCLUDED.text_value,
			raw_value = EXCLUDED.raw_value,
			currency_code = EXCLUDED.currency_code,
			aggregation_rule = EXCLUDED.aggregation_rule,
			score_direction = EXCLUDED.score_direction,
			tolerance_abs = EXCLUDED.tolerance_abs,
			tolerance_pct = EXCLUDED.tolerance_pct,
			parent_fact_id = EXCLUDED.parent_fact_id,
			parent_kpi_id = EXCLUDED.parent_kpi_id,
			chain_id = EXCLUDED.chain_id,
			source_type = EXCLUDED.source_type,
			source_path = EXCLUDED.source_path,
			source_page = EXCLUDED.source_page,
			source_section = EXCLUDED.source_section,
			source_row_ref = EXCLUDED.source_row_ref,
			extraction_method = EXCLUDED.extraction_method,
			confidence_label = EXCLUDED.confidence_label,
			manually_verified_flag = EXCLUDED.manually_verified_flag,
			ready_for_dwh_flag = EXCLUDED.ready_for_dwh_flag,
			comment = EXCLUDED.comment`,
		[
			fact.run_id,
			fact.task_id ?? null,
			fact.source_document_code,
			fact.source_document_file ?? null,
			fact.agent_code ?? null,
			fact.agent_label ?? null,
			fact.fact_id,
			fact.doc_id ?? null,
			fact.fact_class ?? null,
			fact.value_type ?? null,
			fact.metric_code ?? null,
			fact.fact_name,
			fact.department_code ?? null,
			fact.horizon_code ?? null,
			fact.perspective_code ?? null,
			fact.scenario_version ?? null,
			fact.object_name ?? null,
			fact.stage_name ?? null,
			fact.project_name ?? null,
			fact.discipline_name ?? null,
			fact.period_label ?? null,
			fact.year_num ?? null,
			fact.period_part ?? null,
			fact.unit ?? null,
			fact.value_operator ?? null,
			fact.numeric_value ?? null,
			fact.text_value ?? null,
			fact.raw_value ?? null,
			fact.currency_code ?? null,
			fact.aggregation_rule ?? null,
			fact.score_direction ?? null,
			fact.tolerance_abs ?? null,
			fact.tolerance_pct ?? null,
			fact.parent_fact_id ?? null,
			fact.parent_kpi_id ?? null,
			fact.chain_id ?? null,
			fact.source_type ?? null,
			fact.source_path ?? null,
			fact.source_page ?? null,
			fact.source_section ?? null,
			fact.source_row_ref ?? null,
			fact.extraction_method ?? null,
			fact.confidence_label ?? null,
			Boolean(fact.manually_verified_flag),
			Boolean(fact.ready_for_dwh_flag),
			fact.comment ?? null
		]
	);
}

async function upsertLink(client, link) {
	await client.query(
		`INSERT INTO staging.strategy_link_intake (
			run_id, task_id, source_document_code, source_document_file, agent_code, agent_label, rel_id, relation_type,
			source_entity_type, source_entity_id, source_entity_name, target_entity_type, target_entity_id, target_entity_name,
			source_horizon_code, target_horizon_code, chain_id, link_status, structural_gap_flag, numeric_gap_flag,
			link_description, source_path, source_page, comment
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,
			$9,$10,$11,$12,$13,$14,
			$15,$16,$17,$18,$19,$20,
			$21,$22,$23,$24
		)
		ON CONFLICT (run_id, rel_id) DO UPDATE SET
			task_id = EXCLUDED.task_id,
			source_document_code = EXCLUDED.source_document_code,
			source_document_file = EXCLUDED.source_document_file,
			agent_code = EXCLUDED.agent_code,
			agent_label = EXCLUDED.agent_label,
			relation_type = EXCLUDED.relation_type,
			source_entity_type = EXCLUDED.source_entity_type,
			source_entity_id = EXCLUDED.source_entity_id,
			source_entity_name = EXCLUDED.source_entity_name,
			target_entity_type = EXCLUDED.target_entity_type,
			target_entity_id = EXCLUDED.target_entity_id,
			target_entity_name = EXCLUDED.target_entity_name,
			source_horizon_code = EXCLUDED.source_horizon_code,
			target_horizon_code = EXCLUDED.target_horizon_code,
			chain_id = EXCLUDED.chain_id,
			link_status = EXCLUDED.link_status,
			structural_gap_flag = EXCLUDED.structural_gap_flag,
			numeric_gap_flag = EXCLUDED.numeric_gap_flag,
			link_description = EXCLUDED.link_description,
			source_path = EXCLUDED.source_path,
			source_page = EXCLUDED.source_page,
			comment = EXCLUDED.comment`,
		[
			link.run_id,
			link.task_id ?? null,
			link.source_document_code,
			link.source_document_file ?? null,
			link.agent_code ?? null,
			link.agent_label ?? null,
			link.rel_id,
			link.relation_type,
			link.source_entity_type ?? null,
			link.source_entity_id ?? null,
			link.source_entity_name ?? null,
			link.target_entity_type ?? null,
			link.target_entity_id ?? null,
			link.target_entity_name ?? null,
			link.source_horizon_code ?? null,
			link.target_horizon_code ?? null,
			link.chain_id ?? null,
			link.link_status ?? null,
			Boolean(link.structural_gap_flag),
			Boolean(link.numeric_gap_flag),
			link.link_description ?? null,
			link.source_path ?? null,
			link.source_page ?? null,
			link.comment ?? null
		]
	);
}

async function upsertGap(client, gap) {
	await client.query(
		`INSERT INTO staging.strategy_gap_intake (
			run_id, task_id, source_document_code, source_document_file, agent_code, agent_label, gap_id,
			gap_category_code, gap_type_name, criticality_code, gap_status, doc_id_1, doc_id_2, fact_id, kpi_id, rel_id, chain_id,
			gap_description, impact_text, recommendation_text, owner_name, due_date, perspective_code, source_path, source_page, dq_comment
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,
			$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
			$18,$19,$20,$21,$22,$23,$24,$25,$26
		)
		ON CONFLICT (run_id, gap_id) DO UPDATE SET
			task_id = EXCLUDED.task_id,
			source_document_code = EXCLUDED.source_document_code,
			source_document_file = EXCLUDED.source_document_file,
			agent_code = EXCLUDED.agent_code,
			agent_label = EXCLUDED.agent_label,
			gap_category_code = EXCLUDED.gap_category_code,
			gap_type_name = EXCLUDED.gap_type_name,
			criticality_code = EXCLUDED.criticality_code,
			gap_status = EXCLUDED.gap_status,
			doc_id_1 = EXCLUDED.doc_id_1,
			doc_id_2 = EXCLUDED.doc_id_2,
			fact_id = EXCLUDED.fact_id,
			kpi_id = EXCLUDED.kpi_id,
			rel_id = EXCLUDED.rel_id,
			chain_id = EXCLUDED.chain_id,
			gap_description = EXCLUDED.gap_description,
			impact_text = EXCLUDED.impact_text,
			recommendation_text = EXCLUDED.recommendation_text,
			owner_name = EXCLUDED.owner_name,
			due_date = EXCLUDED.due_date,
			perspective_code = EXCLUDED.perspective_code,
			source_path = EXCLUDED.source_path,
			source_page = EXCLUDED.source_page,
			dq_comment = EXCLUDED.dq_comment`,
		[
			gap.run_id,
			gap.task_id ?? null,
			gap.source_document_code,
			gap.source_document_file ?? null,
			gap.agent_code ?? null,
			gap.agent_label ?? null,
			gap.gap_id,
			gap.gap_category_code,
			gap.gap_type_name ?? null,
			gap.criticality_code ?? null,
			gap.gap_status ?? null,
			gap.doc_id_1 ?? null,
			gap.doc_id_2 ?? null,
			gap.fact_id ?? null,
			gap.kpi_id ?? null,
			gap.rel_id ?? null,
			gap.chain_id ?? null,
			gap.gap_description,
			gap.impact_text ?? null,
			gap.recommendation_text ?? null,
			gap.owner_name ?? null,
			gap.due_date ?? null,
			gap.perspective_code ?? null,
			gap.source_path ?? null,
			gap.source_page ?? null,
			gap.dq_comment ?? null
		]
	);
}

async function insert(client, options) {
	const spec = await loadSpec(options.spec);

	await client.query('BEGIN');
	try {
		await upsertDocument(client, spec.document);
		for (const fact of spec.facts) {
			await upsertFact(client, fact);
		}
		for (const link of spec.links) {
			await upsertLink(client, link);
		}
		for (const gap of spec.gaps) {
			await upsertGap(client, gap);
		}

		await client.query('COMMIT');

		const verify = await client.query(
			`SELECT
				(SELECT count(*) FROM staging.strategy_document_intake WHERE run_id = $1 AND source_document_code = $2) AS document_rows,
				(SELECT count(*) FROM staging.strategy_fact_intake WHERE run_id = $1 AND doc_id = $3) AS fact_rows,
				(SELECT count(*) FROM staging.strategy_link_intake WHERE run_id = $1 AND source_document_code = $2) AS link_rows,
				(SELECT count(*) FROM staging.strategy_gap_intake WHERE run_id = $1 AND doc_id_1 = $3) AS gap_rows`,
			[spec.document.run_id, spec.document.source_document_code, spec.document.doc_id]
		);

		console.log(
			JSON.stringify(
				{
					inserted: {
						facts: spec.facts.length,
						links: spec.links.length,
						gaps: spec.gaps.length
					},
					verify: verify.rows[0] ?? null
				},
				null,
				2
			)
		);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	}
}

async function main() {
	const { command, options } = parseArgs(process.argv);

	if (command !== 'insert') {
		usage();
		process.exitCode = 1;
		return;
	}

	const client = await createClient();

	try {
		await insert(client, options);
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
