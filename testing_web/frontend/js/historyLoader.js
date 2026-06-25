import { prependOlderBars } from './bars.js';
import { debugLog } from './debug.js';

const HISTORY_EDGE_BARS = 80;
const HISTORY_CHUNK = 500;
const MAX_BARS = 10_000;

/**
 * @param {object} opts
 * @param {import("lightweight-charts").IChartApi} opts.chart
 * @param {import("lightweight-charts").ISeriesApi} opts.series
 * @param {() => object[]} opts.getBars
 * @param {(bars: object[]) => void} opts.setBars
 * @param {() => number} opts.getBarSec
 * @param {() => number} opts.getSeed
 * @param {(loading: boolean) => void} [opts.onLoading]
 * @param {(info: { total: number, added: number }) => void} [opts.onUpdate]
 */
export function mountHistoryLoader(opts) {
	const { chart, series, getBars, setBars, getBarSec, getSeed, onLoading, onUpdate } = opts;

	let loading = false;
	let exhausted = false;
	let prefetchTimer = null;
	let panning = false;

	function prependChunk() {
		const bars = getBars();
		if (!bars.length || loading || exhausted || bars.length >= MAX_BARS) {return 0;}

		const barSec = getBarSec();
		const chunk = Math.min(HISTORY_CHUNK, MAX_BARS - bars.length);
		const older = prependOlderBars(bars, { count: chunk, barSec, seed: getSeed() + bars[0].time });
		if (older.length <= bars.length) {
			exhausted = true;
			return 0;
		}

		const added = older.length - bars.length;
		const logical = chart.timeScale().getVisibleLogicalRange();

		series.setData(older);
		setBars(older);

		if (logical) {
			chart.timeScale().setVisibleLogicalRange({
				from: logical.from + added,
				to: logical.to + added,
			});
		}

		onUpdate?.({ total: older.length, added });
		debugLog('data', 'history prepended', { added, total: older.length });
		return added;
	}

	async function loadMore() {
		if (loading || exhausted) {return false;}
		loading = true;
		onLoading?.(true);
		await new Promise(r => setTimeout(r, 120));
		try {
			const added = prependChunk();
			if (added <= 0) {exhausted = true;}
			return added > 0;
		} finally {
			loading = false;
			onLoading?.(false);
		}
	}

	function maybePrefetch() {
		if (panning || loading || exhausted) {return;}
		const range = chart.timeScale().getVisibleLogicalRange();
		if (!range || range.from >= HISTORY_EDGE_BARS) {return;}
		const info = series.barsInLogicalRange(range);
		if (info && info.barsBefore < HISTORY_EDGE_BARS) {
			void loadMore();
		}
	}

	function schedulePrefetch() {
		if (prefetchTimer != null) {clearTimeout(prefetchTimer);}
		prefetchTimer = setTimeout(() => {
			prefetchTimer = null;
			maybePrefetch();
		}, 150);
	}

	const onRange = () => schedulePrefetch();

	chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

	return {
		loadMore,
		setPanning(value) {
			panning = Boolean(value);
			if (!panning) {schedulePrefetch();}
		},
		reset() {
			exhausted = false;
		},
		isLoading: () => loading,
		isExhausted: () => exhausted,
		destroy() {
			if (prefetchTimer != null) {clearTimeout(prefetchTimer);}
			chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
		},
	};
}
