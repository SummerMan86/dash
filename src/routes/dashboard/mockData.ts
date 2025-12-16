/**
 * Mock Data for Payment Monitoring Dashboard
 *
 * Based on FCT_PAYMENTS and FCT_RDM_IPS data marts
 * Simplified version for MVP implementation
 */

// ============================================================================
// KPI Summary Data
// ============================================================================
export interface KpiSummary {
	period_label: string;
	date_from: string;
	date_to: string;
	total_amount: number;
	total_count: number;
	avg_ticket: number;
	rejected_count: number;
	rejected_share_pct: number;
	active_clients_count: number;
	avg_proc_time_sec: number;
}

export const kpiSummary: KpiSummary[] = [
	{
		period_label: 'Сегодня',
		date_from: '2025-03-01',
		date_to: '2025-03-01',
		total_amount: 1250000.5,
		total_count: 18420,
		avg_ticket: 67.87,
		rejected_count: 320,
		rejected_share_pct: 1.74,
		active_clients_count: 942,
		avg_proc_time_sec: 12.4
	}
];

// ============================================================================
// Timeseries Daily Data
// ============================================================================
export interface TimeseriesDaily {
	date: string;
	status: 'SUCCESS' | 'REJECTED';
	trx_count: number;
	trx_amount: number;
	avg_ticket: number;
	rejected_count: number;
	rejected_share_pct: number;
}

export const timeseriesDaily: TimeseriesDaily[] = [
	// Feb 25
	{
		date: '2025-02-25',
		status: 'SUCCESS',
		trx_count: 17500,
		trx_amount: 1180000.0,
		avg_ticket: 67.43,
		rejected_count: 0,
		rejected_share_pct: 0.0
	},
	{
		date: '2025-02-25',
		status: 'REJECTED',
		trx_count: 285,
		trx_amount: 14200.0,
		avg_ticket: 49.82,
		rejected_count: 285,
		rejected_share_pct: 100.0
	},
	// Feb 26
	{
		date: '2025-02-26',
		status: 'SUCCESS',
		trx_count: 18100,
		trx_amount: 1220000.0,
		avg_ticket: 67.4,
		rejected_count: 0,
		rejected_share_pct: 0.0
	},
	{
		date: '2025-02-26',
		status: 'REJECTED',
		trx_count: 295,
		trx_amount: 14800.0,
		avg_ticket: 50.17,
		rejected_count: 295,
		rejected_share_pct: 100.0
	},
	// Feb 27
	{
		date: '2025-02-27',
		status: 'SUCCESS',
		trx_count: 17800,
		trx_amount: 1195000.0,
		avg_ticket: 67.13,
		rejected_count: 0,
		rejected_share_pct: 0.0
	},
	{
		date: '2025-02-27',
		status: 'REJECTED',
		trx_count: 310,
		trx_amount: 15500.0,
		avg_ticket: 50.0,
		rejected_count: 310,
		rejected_share_pct: 100.0
	},
	// Feb 28
	{
		date: '2025-02-28',
		status: 'SUCCESS',
		trx_count: 17500,
		trx_amount: 1185000.1,
		avg_ticket: 67.71,
		rejected_count: 0,
		rejected_share_pct: 0.0
	},
	{
		date: '2025-02-28',
		status: 'REJECTED',
		trx_count: 290,
		trx_amount: 14500.0,
		avg_ticket: 50.0,
		rejected_count: 290,
		rejected_share_pct: 100.0
	},
	// Mar 1
	{
		date: '2025-03-01',
		status: 'SUCCESS',
		trx_count: 18240,
		trx_amount: 1238000.4,
		avg_ticket: 67.87,
		rejected_count: 0,
		rejected_share_pct: 0.0
	},
	{
		date: '2025-03-01',
		status: 'REJECTED',
		trx_count: 180,
		trx_amount: 9200.1,
		avg_ticket: 51.11,
		rejected_count: 180,
		rejected_share_pct: 100.0
	},
	// Mar 2
	{
		date: '2025-03-02',
		status: 'SUCCESS',
		trx_count: 19120,
		trx_amount: 1310500.0,
		avg_ticket: 68.57,
		rejected_count: 0,
		rejected_share_pct: 0.0
	},
	{
		date: '2025-03-02',
		status: 'REJECTED',
		trx_count: 210,
		trx_amount: 10450.3,
		avg_ticket: 49.76,
		rejected_count: 210,
		rejected_share_pct: 100.0
	},
	// Mar 3
	{
		date: '2025-03-03',
		status: 'SUCCESS',
		trx_count: 18900,
		trx_amount: 1285000.0,
		avg_ticket: 68.0,
		rejected_count: 0,
		rejected_share_pct: 0.0
	},
	{
		date: '2025-03-03',
		status: 'REJECTED',
		trx_count: 195,
		trx_amount: 9750.0,
		avg_ticket: 50.0,
		rejected_count: 195,
		rejected_share_pct: 100.0
	}
];

// ============================================================================
// Top Clients Data
// ============================================================================
export interface TopClient {
	role: 'DEBTOR' | 'CREDITOR';
	client_name: string;
	client_account: string;
	trx_count: number;
	trx_amount: number;
	avg_ticket: number;
	rejected_count: number;
	rejected_share_pct: number;
}

export const topClients: TopClient[] = [
	{
		role: 'DEBTOR',
		client_name: 'Alpha Trading House LLC',
		client_account: '40702810900000001234',
		trx_count: 540,
		trx_amount: 780000.0,
		avg_ticket: 1444.44,
		rejected_count: 6,
		rejected_share_pct: 1.11
	},
	{
		role: 'DEBTOR',
		client_name: 'Beta Logistics LLC',
		client_account: '40702810400000005678',
		trx_count: 430,
		trx_amount: 520000.5,
		avg_ticket: 1209.3,
		rejected_count: 4,
		rejected_share_pct: 0.93
	},
	{
		role: 'DEBTOR',
		client_name: 'Gamma Retail LLC',
		client_account: '40702810100000009012',
		trx_count: 385,
		trx_amount: 465000.0,
		avg_ticket: 1207.79,
		rejected_count: 5,
		rejected_share_pct: 1.3
	},
	{
		role: 'DEBTOR',
		client_name: 'Delta Group LLC',
		client_account: '40702810200000003456',
		trx_count: 350,
		trx_amount: 420000.0,
		avg_ticket: 1200.0,
		rejected_count: 3,
		rejected_share_pct: 0.86
	},
	{
		role: 'DEBTOR',
		client_name: 'Epsilon Trade LLC',
		client_account: '40702810300000007890',
		trx_count: 320,
		trx_amount: 380000.0,
		avg_ticket: 1187.5,
		rejected_count: 4,
		rejected_share_pct: 1.25
	},
	{
		role: 'CREDITOR',
		client_name: 'Petrov Sole Proprietorship',
		client_account: '40802810900000009876',
		trx_count: 320,
		trx_amount: 150000.0,
		avg_ticket: 468.75,
		rejected_count: 2,
		rejected_share_pct: 0.63
	},
	{
		role: 'CREDITOR',
		client_name: 'Ivanov Sole Proprietorship',
		client_account: '40802810800000008765',
		trx_count: 280,
		trx_amount: 132000.0,
		avg_ticket: 471.43,
		rejected_count: 1,
		rejected_share_pct: 0.36
	},
	{
		role: 'CREDITOR',
		client_name: 'Sidorov Sole Proprietorship',
		client_account: '40802810700000007654',
		trx_count: 250,
		trx_amount: 118000.0,
		avg_ticket: 472.0,
		rejected_count: 2,
		rejected_share_pct: 0.8
	}
];

// ============================================================================
// MCC Summary Data
// ============================================================================
export interface MccSummary {
	mcc: string;
	mcc_name: string;
	trx_count: number;
	trx_amount: number;
	avg_ticket: number;
	rejected_count: number;
	rejected_share_pct: number;
}

export const mccSummary: MccSummary[] = [
	{
		mcc: '5411',
		mcc_name: 'Grocery Stores',
		trx_count: 4200,
		trx_amount: 210000.0,
		avg_ticket: 50.0,
		rejected_count: 40,
		rejected_share_pct: 0.95
	},
	{
		mcc: '5812',
		mcc_name: 'Restaurants',
		trx_count: 3100,
		trx_amount: 260000.0,
		avg_ticket: 83.87,
		rejected_count: 25,
		rejected_share_pct: 0.81
	},
	{
		mcc: '5311',
		mcc_name: 'Department Stores',
		trx_count: 2800,
		trx_amount: 350000.0,
		avg_ticket: 125.0,
		rejected_count: 30,
		rejected_share_pct: 1.07
	},
	{
		mcc: '5912',
		mcc_name: 'Drug Stores',
		trx_count: 2400,
		trx_amount: 120000.0,
		avg_ticket: 50.0,
		rejected_count: 20,
		rejected_share_pct: 0.83
	},
	{
		mcc: '5541',
		mcc_name: 'Service Stations',
		trx_count: 2100,
		trx_amount: 189000.0,
		avg_ticket: 90.0,
		rejected_count: 18,
		rejected_share_pct: 0.86
	},
	{
		mcc: '6011',
		mcc_name: 'ATMs',
		trx_count: 1200,
		trx_amount: 60000.0,
		avg_ticket: 50.0,
		rejected_count: 5,
		rejected_share_pct: 0.42
	},
	{
		mcc: '5732',
		mcc_name: 'Electronics',
		trx_count: 980,
		trx_amount: 245000.0,
		avg_ticket: 250.0,
		rejected_count: 12,
		rejected_share_pct: 1.22
	},
	{
		mcc: '7011',
		mcc_name: 'Hotels',
		trx_count: 850,
		trx_amount: 425000.0,
		avg_ticket: 500.0,
		rejected_count: 8,
		rejected_share_pct: 0.94
	}
];
