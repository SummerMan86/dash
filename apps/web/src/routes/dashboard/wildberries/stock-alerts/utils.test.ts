import { describe, it, expect } from 'vitest';
import type { ScenarioParams } from './types';
import { calculateStatus, getStatusColor, getStatusTextColor, getStatusLabel } from './utils';

const BALANCED: ScenarioParams = { L: 20, S: 10, R: 7, W: 28 };

// -- calculateStatus --

describe('calculateStatus', () => {
	it('returns DEFICIT when stock_count is 0', () => {
		expect(calculateStatus(0, 40, BALANCED)).toBe('DEFICIT');
	});

	it('returns DEFICIT when stock_count is negative', () => {
		expect(calculateStatus(-5, 40, BALANCED)).toBe('DEFICIT');
	});

	it('returns DEFICIT when stock_count is NaN', () => {
		expect(calculateStatus(NaN, 40, BALANCED)).toBe('DEFICIT');
	});

	it('returns RISK when coverage_days is at the threshold (L + S)', () => {
		// threshold = 20 + 10 = 30
		expect(calculateStatus(10, 30, BALANCED)).toBe('RISK');
	});

	it('returns RISK when coverage_days is below the threshold', () => {
		expect(calculateStatus(10, 20, BALANCED)).toBe('RISK');
	});

	it('returns RISK when coverage_days is 0', () => {
		expect(calculateStatus(10, 0, BALANCED)).toBe('RISK');
	});

	it('returns OK when coverage_days is above the threshold', () => {
		expect(calculateStatus(10, 31, BALANCED)).toBe('OK');
	});

	it('returns OK when coverage_days is null (no coverage data)', () => {
		expect(calculateStatus(10, null, BALANCED)).toBe('OK');
	});

	it('returns OK when coverage_days is negative (treated as invalid)', () => {
		// Negative coverage is treated as null (invalid)
		expect(calculateStatus(10, -5, BALANCED)).toBe('OK');
	});

	it('respects different scenario params', () => {
		const aggressive: ScenarioParams = { L: 20, S: 5, R: 5, W: 21 };
		// threshold = 25
		expect(calculateStatus(10, 26, aggressive)).toBe('OK');
		expect(calculateStatus(10, 25, aggressive)).toBe('RISK');

		const conservative: ScenarioParams = { L: 20, S: 15, R: 10, W: 35 };
		// threshold = 35
		expect(calculateStatus(10, 35, conservative)).toBe('RISK');
		expect(calculateStatus(10, 36, conservative)).toBe('OK');
	});
});

// -- getStatusColor --

describe('getStatusColor', () => {
	it('returns error classes for DEFICIT', () => {
		const cls = getStatusColor('DEFICIT');
		expect(cls).toContain('text-error');
		expect(cls).toContain('bg-error-muted');
	});

	it('returns warning classes for RISK', () => {
		const cls = getStatusColor('RISK');
		expect(cls).toContain('text-warning');
		expect(cls).toContain('bg-warning-muted');
	});

	it('returns success classes for OK', () => {
		const cls = getStatusColor('OK');
		expect(cls).toContain('text-success');
		expect(cls).toContain('bg-success-muted');
	});
});

// -- getStatusTextColor --

describe('getStatusTextColor', () => {
	it('returns text-error for DEFICIT', () => {
		expect(getStatusTextColor('DEFICIT')).toBe('text-error');
	});

	it('returns text-warning for RISK', () => {
		expect(getStatusTextColor('RISK')).toBe('text-warning');
	});

	it('returns text-success for OK', () => {
		expect(getStatusTextColor('OK')).toBe('text-success');
	});
});

// -- getStatusLabel --

describe('getStatusLabel', () => {
	it('returns localized label for DEFICIT', () => {
		expect(getStatusLabel('DEFICIT')).toBe('Дефицит');
	});

	it('returns localized label for RISK', () => {
		expect(getStatusLabel('RISK')).toBe('Риск');
	});

	it('returns localized label for OK', () => {
		expect(getStatusLabel('OK')).toBe('Норма');
	});
});
