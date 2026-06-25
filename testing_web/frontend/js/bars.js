/** @typedef {{ time: number, open: number, high: number, low: number, close: number, volume?: number }} Bar */

/** @param {number} seed */
function rng(seed) {
	let s = seed >>> 0;
	return () => {
		s += 0x6d2b79f5;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * @param {{ count?: number, barSec?: number, base?: number, seed?: number, endTime?: number }} [opts]
 * @returns {Bar[]}
 */
export function generateBars(opts = {}) {
	const count = Math.min(Math.max(Number(opts.count) || 500, 50), 5000);
	const barSec = Number(opts.barSec) || 60;
	const base = Number(opts.base) || 21050;
	const rand = rng(Number(opts.seed) || 42);
	const to =
		opts.endTime != null
			? Math.floor(Number(opts.endTime) / barSec) * barSec
			: Math.floor(Date.now() / 1000 / barSec) * barSec;
	const from = to - (count - 1) * barSec;

	/** @type {Bar[]} */
	const bars = [];
	let price = base;

	for (let i = 0; i < count; i += 1) {
		const time = from + i * barSec;
		const shock = (rand() - 0.5) * 0.0028;
		const open = price;
		const close = Math.round(open * (1 + shock) * 4) / 4;
		const wick = Math.abs(close - open) + 0.5 + rand() * 2;
		const high = Math.round((Math.max(open, close) + wick * rand()) * 4) / 4;
		const low = Math.round((Math.min(open, close) - wick * rand()) * 4) / 4;
		bars.push({ time, open, high, low, close, volume: Math.floor(800 + rand() * 12000) });
		price = close;
	}

	return bars;
}

/**
 * @param {Bar[]} bars
 * @param {{ count?: number, barSec?: number, seed?: number }} [opts]
 * @returns {Bar[]}
 */
export function prependOlderBars(bars, opts = {}) {
	if (!bars.length) {return bars;}
	const chunk = Math.min(Math.max(Number(opts.count) || 500, 50), 5000);
	const barSec = Number(opts.barSec) || (bars.length >= 2 ? bars[1].time - bars[0].time : 60);
	const first = bars[0];
	const from = first.time - chunk * barSec;
	const older = generateBars({
		count: chunk,
		barSec,
		base: first.open * 0.998,
		seed: Number(opts.seed) || 42,
		endTime: from + (chunk - 1) * barSec,
	});
	if (!older.length) {return bars;}
	older[older.length - 1].close = first.open;
	older[older.length - 1].high = Math.max(older[older.length - 1].high, first.open);
	older[older.length - 1].low = Math.min(older[older.length - 1].low, first.open);
	return [...older, ...bars];
}

/**
 * Regenerate bars for a new timeframe while keeping the same time window.
 * @param {Bar[]} bars
 * @param {number} barSec
 * @param {{ seed?: number }} [opts]
 */
export function barsForTimeframe(bars, barSec, opts = {}) {
	if (!bars.length) {return generateBars({ barSec, seed: opts.seed });}
	const oldSec = bars.length >= 2 ? bars[1].time - bars[0].time : 60;
	const span = (bars.length - 1) * oldSec;
	const count = Math.min(5000, Math.max(50, Math.round(span / barSec) + 1));
	return generateBars({
		count,
		barSec,
		base: bars[0].open,
		seed: opts.seed ?? 42,
		endTime: bars.at(-1).time,
	});
}
