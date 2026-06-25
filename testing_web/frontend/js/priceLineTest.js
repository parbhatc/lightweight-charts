import { LineStyle } from 'lightweight-charts';

/** @type {import("lightweight-charts").IPriceLine | null} */
let nativeLine = null;
/** @type {import("lightweight-charts").IOrderLine | null} */
let orderLine = null;

const NATIVE = '#9B9B9B';
const ORDER = '#089981';
const OFFSET = 200;

/** @param {object[]} bars */
function lastClose(bars) {
	const last = bars.at(-1);
	if (!last || !Number.isFinite(last.close)) {return null;}
	return last.close;
}

/** @param {number} price @param {string} color */
function priceOpts(price, color) {
	return {
		price,
		color,
		lineVisible: true,
		axisLabelVisible: true,
		axisLabelColor: color,
		axisLabelTextColor: '#ffffff',
		axisLabelText: price.toFixed(2),
		lineWidth: 1,
		lineStyle: LineStyle.Dotted,
	};
}

/** @param {number} price */
function orderOpts(price) {
	return {
		...priceOpts(price, ORDER),
		pills: {
			visible: true,
			side: 'right',
			offset: 20,
			body: {
				text: 'Limit Buy',
				backgroundColor: ORDER,
				textColor: '#ffffff',
				visible: true,
			},
			quantity: {
				text: '1',
				backgroundColor: ORDER,
				textColor: '#ffffff',
				visible: true,
			},
			cancel: { visible: true },
		},
	};
}

/** @param {import("lightweight-charts").ISeriesApi} series */
function clear(series) {
	if (nativeLine) {
		try {
			series.removePriceLine(nativeLine);
		} catch {
			//
		}
		nativeLine = null;
	}
	if (orderLine) {
		try {
			series.removeOrderLine(orderLine);
		} catch {
			//
		}
		orderLine = null;
	}
}

/**
 * @param {import("lightweight-charts").ISeriesApi} series
 * @param {() => object[]} getBars
 */
export function mountPriceLineTest(series, getBars) {
	const api = {
		compare: () => {
			const base = lastClose(getBars());
			if (base == null) {return null;}
			clear(series);
			nativeLine = series.createPriceLine(priceOpts(base + OFFSET, NATIVE));
			orderLine = series.createOrderLine(orderOpts(base - OFFSET));
			const opts = orderLine.options();
			console.info('[LWC:price-line-test] compare', {
				nativePrice: base + OFFSET,
				orderPrice: base - OFFSET,
				pills: opts.pills,
				bodyText: opts.pills?.body?.text,
			});
			return opts;
		},
		native: () => {
			const base = lastClose(getBars());
			if (base == null) {return null;}
			clear(series);
			nativeLine = series.createPriceLine(priceOpts(base, NATIVE));
			return base;
		},
		order: () => {
			const base = lastClose(getBars());
			if (base == null) {return null;}
			clear(series);
			orderLine = series.createOrderLine(orderOpts(base));
			const opts = orderLine.options();
			console.info('[LWC:price-line-test] order', opts.pills);
			return opts;
		},
		clear: () => clear(series),
	};

	if (typeof window !== 'undefined') {
		window.__LWC_PRICE_LINE_TEST__ = api;
	}

	console.info('[LWC:price-line-test] .compare() | .native() | .order() | .clear()');
	return api;
}
