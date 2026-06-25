import { lowerBound } from '../helpers/algorithms';

/**
 * A timezone offset transition at a specific UTC instant.
 * `offset` is seconds east of UTC (e.g. -18000 for UTC-5).
 */
export interface TimezoneTransition {
	utcTimestamp: number;
	offset: number;
}

/**
 * Fast, allocation-free timezone lookup for render-time formatting.
 */
export interface ITimezoneProvider {
	zoneName(): string;
	getOffset(utcTimestamp: number): number;
}

export class FastTimezoneProvider implements ITimezoneProvider {
	private readonly _zoneName: string;
	private readonly _transitions: readonly TimezoneTransition[];

	public constructor(zoneName: string, transitions: readonly TimezoneTransition[]) {
		this._zoneName = zoneName;
		this._transitions = transitions;
	}

	public zoneName(): string {
		return this._zoneName;
	}

	public getOffset(utcTimestamp: number): number {
		const transitions = this._transitions;
		if (transitions.length === 0) {
			return 0;
		}

		const index = lowerBound(
			transitions,
			utcTimestamp,
			(t: TimezoneTransition, ts: number) => t.utcTimestamp <= ts
		) - 1;

		return transitions[index < 0 ? 0 : index].offset;
	}
}

/**
 * Shift a UTC unix timestamp by the provider offset for display formatting.
 */
export function shiftUtcTimestampForDisplay(utcTimestamp: number, provider: ITimezoneProvider | undefined): number {
	if (provider === undefined) {
		return utcTimestamp;
	}
	return utcTimestamp + provider.getOffset(utcTimestamp);
}

/**
 * Create a {@link FastTimezoneProvider} for use in chart options.
 */
export function createFastTimezoneProvider(zoneName: string, transitions: readonly TimezoneTransition[]): ITimezoneProvider {
	return new FastTimezoneProvider(zoneName, transitions);
}
