import { describe, it, expect } from 'vitest';
import {
	iftsSystemParametersParams,
	iftsPaymentStatsParams,
	iftsMessageStatsParams,
	iftsOperdayStateParams,
} from './index';
import { getRegistryEntry } from './index';

// ---------------------------------------------------------------------------
// iftsSystemParametersParams (ifts.system_parameters)
// ---------------------------------------------------------------------------

describe('iftsSystemParametersParams', () => {
	it('accepts empty params', () => {
		const result = iftsSystemParametersParams.parse({});
		expect(result).toEqual({});
	});

	it('passes through unknown keys (passthrough)', () => {
		const result = iftsSystemParametersParams.parse({ extraKey: 'value' });
		expect(result.extraKey).toBe('value');
	});
});

// ---------------------------------------------------------------------------
// iftsPaymentStatsParams (ifts.payment_stats)
// ---------------------------------------------------------------------------

describe('iftsPaymentStatsParams', () => {
	it('accepts empty params and applies limit default', () => {
		const result = iftsPaymentStatsParams.parse({});
		expect(result.limit).toBe(500);
	});

	it('accepts all known params', () => {
		const result = iftsPaymentStatsParams.parse({ limit: 100, service: 'ACH' });
		expect(result.limit).toBe(100);
		expect(result.service).toBe('ACH');
	});

	it('coerces string limit to number', () => {
		const result = iftsPaymentStatsParams.parse({ limit: '200' });
		expect(result.limit).toBe(200);
		expect(typeof result.limit).toBe('number');
	});

	it('rejects limit exceeding max (50000)', () => {
		expect(() => iftsPaymentStatsParams.parse({ limit: 60_000 })).toThrow();
	});

	it('rejects negative limit', () => {
		expect(() => iftsPaymentStatsParams.parse({ limit: -1 })).toThrow();
	});

	it('rejects non-integer limit', () => {
		expect(() => iftsPaymentStatsParams.parse({ limit: 1.5 })).toThrow();
	});

	it('accepts limit of 0 (min boundary)', () => {
		const result = iftsPaymentStatsParams.parse({ limit: 0 });
		expect(result.limit).toBe(0);
	});

	it('trims whitespace from service', () => {
		const result = iftsPaymentStatsParams.parse({ service: '  ACH  ' });
		expect(result.service).toBe('ACH');
	});

	it('rejects empty-string service (min length 1 after trim)', () => {
		expect(() => iftsPaymentStatsParams.parse({ service: '' })).toThrow();
	});

	it('rejects whitespace-only service (min length 1 after trim)', () => {
		expect(() => iftsPaymentStatsParams.parse({ service: '   ' })).toThrow();
	});

	it('passes through unknown keys (passthrough)', () => {
		const result = iftsPaymentStatsParams.parse({ otherParam: 42 });
		expect(result.otherParam).toBe(42);
	});
});

// ---------------------------------------------------------------------------
// iftsMessageStatsParams (ifts.message_stats)
// ---------------------------------------------------------------------------

describe('iftsMessageStatsParams', () => {
	it('accepts empty params and applies limit default', () => {
		const result = iftsMessageStatsParams.parse({});
		expect(result.limit).toBe(500);
	});

	it('coerces string limit to number', () => {
		const result = iftsMessageStatsParams.parse({ limit: '300' });
		expect(result.limit).toBe(300);
		expect(typeof result.limit).toBe('number');
	});

	it('rejects limit exceeding max (50000)', () => {
		expect(() => iftsMessageStatsParams.parse({ limit: 60_000 })).toThrow();
	});

	it('rejects negative limit', () => {
		expect(() => iftsMessageStatsParams.parse({ limit: -1 })).toThrow();
	});

	it('rejects non-integer limit', () => {
		expect(() => iftsMessageStatsParams.parse({ limit: 2.5 })).toThrow();
	});

	it('passes through unknown keys (passthrough)', () => {
		const result = iftsMessageStatsParams.parse({ extraKey: 'value' });
		expect(result.extraKey).toBe('value');
	});
});

// ---------------------------------------------------------------------------
// iftsOperdayStateParams (ifts.operday_state)
// ---------------------------------------------------------------------------

describe('iftsOperdayStateParams', () => {
	it('accepts empty params', () => {
		const result = iftsOperdayStateParams.parse({});
		expect(result).toEqual({});
	});

	it('passes through unknown keys (passthrough)', () => {
		const result = iftsOperdayStateParams.parse({ extraKey: 'value' });
		expect(result.extraKey).toBe('value');
	});
});

// ---------------------------------------------------------------------------
// Registry integration — IFTS entries use explicit schemas
// ---------------------------------------------------------------------------

describe('IFTS registry entries use explicit schemas', () => {
	it('ifts.system_parameters uses iftsSystemParametersParams', () => {
		const entry = getRegistryEntry('ifts.system_parameters');
		expect(entry).toBeDefined();
		// Passes through unknown keys (passthrough schema)
		const result = entry!.paramsSchema.parse({ unknownKey: 'value' });
		expect(result.unknownKey).toBe('value');
	});

	it('ifts.payment_stats uses iftsPaymentStatsParams (applies limit default)', () => {
		const entry = getRegistryEntry('ifts.payment_stats');
		expect(entry).toBeDefined();
		const result = entry!.paramsSchema.parse({});
		expect(result.limit).toBe(500);
	});

	it('ifts.payment_stats validates service param', () => {
		const entry = getRegistryEntry('ifts.payment_stats');
		expect(entry).toBeDefined();
		const result = entry!.paramsSchema.parse({ service: 'ACH' });
		expect(result.service).toBe('ACH');
	});

	it('ifts.payment_stats rejects invalid limit', () => {
		const entry = getRegistryEntry('ifts.payment_stats');
		expect(entry).toBeDefined();
		expect(() => entry!.paramsSchema.parse({ limit: 60_000 })).toThrow();
	});

	it('ifts.message_stats uses iftsMessageStatsParams (applies limit default)', () => {
		const entry = getRegistryEntry('ifts.message_stats');
		expect(entry).toBeDefined();
		const result = entry!.paramsSchema.parse({});
		expect(result.limit).toBe(500);
	});

	it('ifts.message_stats rejects invalid limit', () => {
		const entry = getRegistryEntry('ifts.message_stats');
		expect(entry).toBeDefined();
		expect(() => entry!.paramsSchema.parse({ limit: -5 })).toThrow();
	});

	it('ifts.operday_state uses iftsOperdayStateParams', () => {
		const entry = getRegistryEntry('ifts.operday_state');
		expect(entry).toBeDefined();
		// Passes through unknown keys (passthrough schema)
		const result = entry!.paramsSchema.parse({ someParam: true });
		expect(result.someParam).toBe(true);
	});
});
