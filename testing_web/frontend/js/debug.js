const LS_KEY = 'lwc-debug';

/** @type {Set<string>} */
let tags = new Set();
let enabled = false;

function parseTags(raw) {
	if (!raw || raw === '1' || raw === 'true') {return new Set(['*']);}
	return new Set(
		raw
			.split(/[,;\s]+/)
			.map(t => t.trim().toLowerCase())
			.filter(Boolean)
	);
}

function tagAllowed(category) {
	if (!enabled) {return false;}
	if (tags.has('*')) {return true;}
	return tags.has(category.toLowerCase());
}

/** @param {object} [opts] */
export function configureDebug(opts = {}) {
	if (opts.tags != null) {tags = parseTags(opts.tags);}
	if (opts.force != null) {
		enabled = Boolean(opts.force);
		return enabled;
	}
	if (typeof window !== 'undefined') {
		try {
			const stored = localStorage.getItem(LS_KEY);
			if (stored) {
				enabled = true;
				tags = parseTags(stored);
				return true;
			}
		} catch {
			//
		}
		const q = new URLSearchParams(window.location.search).get('debug');
		if (q != null && q !== '0' && q !== 'false') {
			enabled = true;
			tags = parseTags(q);
			try {
				localStorage.setItem(LS_KEY, q === '1' ? '1' : q);
			} catch {
				//
			}
			return true;
		}
	}
	enabled = false;
	return false;
}

export function isDebugEnabled() {
	return enabled;
}

/**
 * @param {string} category
 * @param {string} message
 * @param {unknown} [detail]
 */
export function debugLog(category, message, detail) {
	if (!tagAllowed(category)) {return;}
	const prefix = `%c[LWC:${category}]`;
	const style = 'color:#7b9cff;font-weight:600';
	if (detail !== undefined) {console.log(prefix, style, message, detail);} else {console.log(prefix, style, message);}
}

/** @type {ReturnType<typeof mountDebugHud> | null} */
let activeHud = null;

export function mountDebugHud() {
	const root = document.createElement('div');
	root.className = 'lwc-debug-hud';
	root.setAttribute('aria-live', 'polite');
	document.body.appendChild(root);

	let frameCount = 0;
	let windowStart = performance.now();
	let liveFps = 0;
	let panFps = null;
	let panning = false;
	let rafId = 0;

	function render() {
		if (panning) {
			const pan = panFps == null ? '—' : String(panFps);
			root.textContent = `Pan ${pan} fps · Render ${liveFps}`;
			return;
		}
		root.textContent = `FPS ${liveFps}`;
	}

	function tick() {
		frameCount += 1;
		const now = performance.now();
		if (now - windowStart >= 1000) {
			liveFps = frameCount;
			frameCount = 0;
			windowStart = now;
			render();
		}
		rafId = requestAnimationFrame(tick);
	}

	render();
	rafId = requestAnimationFrame(tick);

	const api = {
		/** @param {{ fps?: number, panning?: boolean }} stats */
		setPanStats(stats) {
			if (stats.panning != null) {panning = Boolean(stats.panning);}
			if (stats.fps != null) {panFps = stats.fps;}
			render();
		},
		destroy() {
			cancelAnimationFrame(rafId);
			root.remove();
			if (activeHud === api) {activeHud = null;}
		},
	};

	activeHud = api;
	return api;
}

export function ensureDebugHud() {
	if (!activeHud) {activeHud = mountDebugHud();}
	return activeHud;
}

/** @param {() => void} [onSample] */
export function createPanFpsMonitor(onSample) {
	let rafId = 0;
	let frames = 0;
	let windowStart = 0;

	function fpsNow(now) {
		const elapsed = now - windowStart;
		if (elapsed <= 0 || frames <= 0) {return 0;}
		return Math.round((frames / elapsed) * 1000);
	}

	function tick() {
		frames += 1;
		const now = performance.now();
		if (onSample && now - windowStart >= 100) {
			onSample({ fps: fpsNow(now), panning: true });
		}
		if (now - windowStart >= 1000) {
			debugLog('pan', `fps ${frames}`);
			frames = 0;
			windowStart = now;
		}
		rafId = requestAnimationFrame(tick);
	}

	return {
		start() {
			if (rafId) {return;}
			frames = 0;
			windowStart = performance.now();
			onSample?.({ fps: 0, panning: true });
			debugLog('pan', 'pan start');
			rafId = requestAnimationFrame(tick);
		},
		stop() {
			if (!rafId) {return;}
			cancelAnimationFrame(rafId);
			rafId = 0;
			const fps = fpsNow(performance.now());
			debugLog('pan', 'pan end', { fps });
			onSample?.({ fps, panning: false });
		},
	};
}

export function installDebugGlobal() {
	if (typeof window === 'undefined' || window.__LWC_DEBUG__) {return;}
	window.__LWC_DEBUG__ = {
		enable: (tagList = '1') => {
			try {
				localStorage.setItem(LS_KEY, tagList);
			} catch {
				//
			}
			configureDebug({ force: true, tags: tagList });
			ensureDebugHud();
			debugLog('boot', 'debug enabled', { tags: [...tags] });
		},
		disable: () => {
			enabled = false;
			activeHud?.destroy();
			activeHud = null;
			try {
				localStorage.removeItem(LS_KEY);
			} catch {
				//
			}
		},
		log: debugLog,
		isEnabled: isDebugEnabled,
	};
}
