/**
 * Returns the current high resolution millisecond timestamp, where 0 represents
 * the start of the current `Bun` process.
 *
 * This function provides microsecond precision timing and is optimized for
 * performance measurement scenarios.
 *
 * @returns The millisecond timestamp with microsecond precision.
 */
export function bunPerformanceNow(): number {
	return Bun.nanoseconds() / 1_000_000;
}
