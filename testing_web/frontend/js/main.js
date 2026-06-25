import {
	ColorType,
	CrosshairMode,
	LineStyle,
	createChart,
	CandlestickSeries,
} from 'lightweight-charts';
import { attachBidAskLines, quoteFromClose } from './bidAsk.js';
import { barsForTimeframe, generateBars } from './bars.js';
import {
	configureDebug,
	createPanFpsMonitor,
	debugLog,
	ensureDebugHud,
	installDebugGlobal,
} from './debug.js';
import { chartTimeFormatter } from './format.js';
import { mountHistoryLoader } from './historyLoader.js';
import { mountOrderLineTest } from './orderLineTest.js';
import { mountPriceLineTest } from './priceLineTest.js';
import { mountTimeframePicker } from './timeframe.js';
import { mountToolbarFps } from './toolbarFps.js';

const SEED = 42;
const DEFAULT_BAR_SEC = 60;

const debugOn = configureDebug();
installDebugGlobal();
if (debugOn) {ensureDebugHud();}

const fpsEl = document.getElementById('toolbar-fps');
const historyBtn = document.getElementById('load-history-btn');
const historyStatus = document.getElementById('history-status');
const bidAskToggle = document.getElementById('bid-ask-toggle');
const tfRoot = document.getElementById('timeframe-picker');

if (!(fpsEl instanceof HTMLElement)) {throw new Error('#toolbar-fps missing');}
if (!(historyBtn instanceof HTMLButtonElement)) {throw new Error('#load-history-btn missing');}
if (!(historyStatus instanceof HTMLElement)) {throw new Error('#history-status missing');}
if (!(bidAskToggle instanceof HTMLInputElement)) {throw new Error('#bid-ask-toggle missing');}
if (!(tfRoot instanceof HTMLElement)) {throw new Error('#timeframe-picker missing');}

const toolbarFps = mountToolbarFps(fpsEl);

const el = document.getElementById('chart');
if (!(el instanceof HTMLElement)) {
	throw new Error('#chart missing');
}

const chart = createChart(el, {
	autoSize: true,
	layout: {
		background: { type: ColorType.Solid, color: '#131722' },
		textColor: '#d1d4dc',
		fontSize: 12,
		fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
	},
	grid: {
		vertLines: { color: '#1e222d' },
		horzLines: { color: '#1e222d' },
	},
	crosshair: {
		mode: CrosshairMode.Normal,
		vertLine: { color: '#758696', width: 1, style: LineStyle.LargeDashed, labelBackgroundColor: '#363c4e' },
		horzLine: { color: '#758696', width: 1, style: LineStyle.LargeDashed, labelBackgroundColor: '#363c4e' },
	},
	rightPriceScale: {
		borderColor: '#2a2e39',
		scaleMargins: { top: 0.08, bottom: 0.12 },
	},
	timeScale: {
		borderColor: '#2a2e39',
		timeVisible: true,
		secondsVisible: false,
		rightOffset: 48,
		barSpacing: 8,
	},
	localization: {
		timeFormatter: chartTimeFormatter,
	},
});

const series = chart.addSeries(CandlestickSeries, {
	upColor: '#089981',
	downColor: '#f23645',
	borderVisible: false,
	wickUpColor: '#089981',
	wickDownColor: '#f23645',
});

let barSec = DEFAULT_BAR_SEC;
/** @type {import("./bars.js").Bar[]} */
let bars = generateBars({ count: 500, barSec, base: 21050, seed: SEED });

function setBars(next) {
	bars = next;
	refreshBidAsk();
}

function lastClose() {
	const last = bars.at(-1);
	return last && Number.isFinite(last.close) ? last.close : null;
}

let bidAskEnabled = bidAskToggle.checked;
const bidAskLines = attachBidAskLines({
	series,
	getQuote: () => {
		if (!bidAskEnabled) {return { enabled: false };}
		const q = quoteFromClose(lastClose());
		if (!q) {return { enabled: false };}
		return { enabled: true, ...q };
	},
});

function refreshBidAsk() {
	bidAskLines.requestRefresh();
}

bidAskToggle.addEventListener('change', () => {
	bidAskEnabled = bidAskToggle.checked;
	refreshBidAsk();
});

function updateHistoryStatus(total = bars.length, loading = false) {
	historyStatus.textContent = loading ? 'Loading…' : `${total.toLocaleString()} bars`;
	historyBtn.disabled = loading;
}

series.setData(bars);
chart.timeScale().scrollToRealTime();
updateHistoryStatus();

const historyLoader = mountHistoryLoader({
	chart,
	series,
	getBars: () => bars,
	setBars,
	getBarSec: () => barSec,
	getSeed: () => SEED,
	onLoading: loading => updateHistoryStatus(bars.length, loading),
	onUpdate: ({ total }) => updateHistoryStatus(total, false),
});

historyBtn.addEventListener('click', () => {
	void historyLoader.loadMore();
});

const tfPicker = mountTimeframePicker(tfRoot, {
	initial: '1',
	onChange: tf => {
		barSec = tf.sec;
		const next = barsForTimeframe(bars, barSec, { seed: SEED });
		setBars(next);
		series.setData(next);
		historyLoader.reset();
		chart.timeScale().scrollToRealTime();
		updateHistoryStatus(next.length);
		debugLog('boot', 'timeframe', { label: tf.label, barSec });
	},
});

debugLog('boot', 'chart ready', {
	bars: bars.length,
	createOrderLine: typeof series.createOrderLine === 'function',
	createPriceLine: typeof series.createPriceLine === 'function',
});

const hud = debugOn ? ensureDebugHud() : null;
const panMonitor = createPanFpsMonitor(stats => {
	toolbarFps.setPanStats(stats);
	hud?.setPanStats(stats);
});

let panning = false;
el.addEventListener(
	'pointerdown',
	ev => {
		if (ev.button !== 0) {return;}
		panning = true;
		historyLoader.setPanning(true);
		panMonitor.start();
	},
	true
);
window.addEventListener('pointerup', () => {
	if (!panning) {return;}
	panning = false;
	historyLoader.setPanning(false);
	panMonitor.stop();
});

const orderTest = mountOrderLineTest(series, () => bars);
const priceLineTest = mountPriceLineTest(series, () => bars);

const sp = new URLSearchParams(window.location.search);
if (sp.get('order') === '1' || sp.get('auto') === '1') {
	orderTest.buy();
}
if (sp.get('compare') === '1' || sp.get('priceLineTest') === '1') {
	priceLineTest.compare();
}

window.__LWC_TEST__ = {
	chart,
	series,
	get bars() {
		return bars;
	},
	getBars: () => bars,
	getBarSec: () => barSec,
	getTimeframe: () => tfPicker.getActive(),
	orderTest,
	priceLineTest,
	historyLoader,
	bidAskLines,
	loadMoreHistory: () => historyLoader.loadMore(),
	setTimeframe: id => {
		tfPicker.setActive(id);
		const btn = tfRoot.querySelector(`[data-tf="${id}"]`);
		if (btn instanceof HTMLButtonElement) {btn.click();}
	},
};

console.info('[LWC:test] ready — __LWC_TEST_ORDER__ · __LWC_PRICE_LINE_TEST__ · __LWC_TEST__');
