/**
 * Live render FPS + pan FPS in the test toolbar.
 * @param {HTMLElement} root
 */
export function mountToolbarFps(root) {
	let frameCount = 0;
	let windowStart = performance.now();
	let liveFps = 0;
	/** @type {number | null} */
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

	return {
		/** @param {{ fps?: number, panning?: boolean }} stats */
		setPanStats(stats) {
			if (stats.panning != null) {panning = Boolean(stats.panning);}
			if (stats.fps != null) {panFps = stats.fps;}
			render();
		},
		destroy() {
			cancelAnimationFrame(rafId);
		},
	};
}
