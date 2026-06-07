/* tslint:disable */
/* eslint-disable */

/**
 * Engine + vendored upstream version, for diagnostics.
 */
export function engine_version(): string;

/**
 * Format `input` JSON text using FracturedJson.
 *
 * `options_json` is a JSON object string of option overrides (may be empty or
 * `"{}"`). Returns the formatted string, or rejects with an error message.
 */
export function format(input: string, options_json: string): string;
