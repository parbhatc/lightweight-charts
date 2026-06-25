import { LineStyle } from 'lightweight-charts';

/** @type {import("lightweight-charts").IOrderLine[]} */
const active = [];

const BUY = '#089981';
const SELL = '#f23645';

/** @param {import("lightweight-charts").ISeriesApi} series */
function clear(series) {
	for (const line of active.splice(0)) {
		try {
			series.removeOrderLine(line);
		} catch {
			//
		}
	}
}

/** @param {object[]} bars */
function lastClose(bars) {
	const last = bars.at(-1);
	if (!last) {return null;}
	return Number.isFinite(last.close) ? last.close : null;
}

/**
 * @param {import("lightweight-charts").ISeriesApi} series
 * @param {"buy" | "sell"} side
 * @param {number} price
 * @param {number} pillOffset
 */
function styleLine(series, side, price, pillOffset) {
	const isBuy = side === 'buy';
	const color = isBuy ? BUY : SELL;
	if (!series.createOrderLine) {
		console.warn('[LWC:test-order] series.createOrderLine missing — run npm run build');
		return null;
	}
	const line = series.createOrderLine({
		price,
		color,
		lineVisible: true,
		axisLabelVisible: true,
		axisLabelColor: color,
		axisLabelTextColor: '#ffffff',
		axisLabelText: String(price),
		lineWidth: 1,
		lineStyle: LineStyle.Solid,
		pills: {
			visible: true,
			side: 'right',
			offset: pillOffset,
			body: {
				text: isBuy ? 'Limit Buy' : 'Limit Sell',
				backgroundColor: color,
				textColor: '#ffffff',
				visible: true,
			},
			quantity: {
				text: '1',
				backgroundColor: color,
				textColor: '#ffffff',
				visible: true,
			},
			cancel: {
				visible: true,
				backgroundColor: 'rgba(255, 255, 255, 0.96)',
				borderColor: '#000000',
				iconColor: '#000000',
				tooltip: 'Cancel',
			},
		},
	});
	active.push(line);
	debugOrderLine(line, 'created');
	return line;
}

/** @param {import("lightweight-charts").IOrderLine} line @param {string} action */
function debugOrderLine(line, action) {
	const opts = line.options();
	console.info(`[LWC:test-order] ${action}`, {
		price: opts.price,
		pills: opts.pills,
		bodyText: opts.pills?.body?.text,
		qtyText: opts.pills?.quantity?.text,
	});
}

/**
 * @param {import("lightweight-charts").ISeriesApi} series
 * @param {() => object[]} getBars
 */
export function mountOrderLineTest(series, getBars) {
	const api = {
		buy: priceOrOffset => {
			const close = lastClose(getBars());
			if (close == null) {return null;}
			let price = close * 0.998;
			const pillOffset = 20;
			if (typeof priceOrOffset === 'number' && Number.isFinite(priceOrOffset)) {
				price = priceOrOffset;
			}
			return styleLine(series, 'buy', price, pillOffset);
		},
		sell: priceOrOffset => {
			const close = lastClose(getBars());
			if (close == null) {return null;}
			let price = close * 1.002;
			const pillOffset = 20;
			if (typeof priceOrOffset === 'number' && Number.isFinite(priceOrOffset)) {
				price = priceOrOffset;
			}
			return styleLine(series, 'sell', price, pillOffset);
		},
		clear: () => clear(series),
		list: () => series.orderLines?.() ?? [],
		log: () => {
			for (const line of series.orderLines?.() ?? []) {debugOrderLine(line, 'list');}
		},
	};

	if (typeof window !== 'undefined') {
		window.__LWC_TEST_ORDER__ = api;
	}

	console.info('[LWC:test-order] .buy() | .sell(price) | .clear() | .log()');
	return api;
}
