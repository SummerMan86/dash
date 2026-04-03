/**
 * Generic JSON value types.
 *
 * These are foundation-level types used across the codebase wherever
 * arbitrary JSON data needs to be typed (dataset rows, query params,
 * filter values, etc.).
 *
 * Canonical home: @dashboard-builder/platform-core
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
