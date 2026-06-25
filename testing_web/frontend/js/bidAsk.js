import { LineStyle } from 'lightweight-charts';

/** @typedef {"bid" | "ask"} QuoteSide */

const BID_COLOR = '#2962FF';
const ASK_COLOR = '#F23645';
const SPREAD = 0.5;

/**
 * Bid/ask lines via createPriceLine (testing harness).
 * @param {object} opts
 * @param {import("lightweight-charts").ISeriesApi} opts.series
 * @param {() => { enabled: boolean, bid?: number, ask?: number }} opts.getQuote
 */
export function attachBidAskLines(opts) {
	/** @type {Map<QuoteSide, import("lightweight-charts").IPriceLine>} */
	const lines = new Map();

	/** @param {QuoteSide} side */
	function removeSide(side) {
		const line = lines.get(side);
		if (!line) {return;}
		try {
			opts.series.removePriceLine(line);
		} catch {
			//
		}
		lines.delete(side);
	}

	const fmt = price => Number(price).toFixed(2);

	function sync() {
		const quote = opts.getQuote();
		if (!quote?.enabled) {
			for (const side of /** @type {QuoteSide[]} */ (['bid', 'ask'])) {removeSide(side);}
			return;
		}

		const bid = quote.bid;
		const ask = quote.ask;
		const sides = /** @type {const} */ ([
			{ side: 'bid', price: bid, color: BID_COLOR, label: 'Bid' },
			{ side: 'ask', price: ask, color: ASK_COLOR, label: 'Ask' },
		]);

		for (const { side, price, color, label } of sides) {
			if (price == null || !Number.isFinite(price)) {
				removeSide(side);
				continue;
			}
			const lineOptions = {
				price,
				color,
				lineVisible: true,
				axisLabelVisible: true,
				axisLabelColor: color,
				axisLabelTextColor: '#ffffff',
				axisLabelText: fmt(price),
				lineWidth: 1,
				lineStyle: LineStyle.Dotted,
				title: label,
			};
			const existing = lines.get(side);
			if (existing) {existing.applyOptions(lineOptions);} else {lines.set(side, opts.series.createPriceLine(lineOptions));}
		}
	}

	sync();
	return {
		requestRefresh: () => sync(),
		destroy: () => {
			for (const side of /** @type {QuoteSide[]} */ (['bid', 'ask'])) {removeSide(side);}
		},
	};
}

/** @param {number | null | undefined} close */
export function quoteFromClose(close) {
	if (close == null || !Number.isFinite(close)) {return null;}
	return { bid: close - SPREAD, ask: close + SPREAD };
}
