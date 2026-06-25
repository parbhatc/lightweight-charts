/** @typedef {{ id: string, label: string, sec: number }} Timeframe */

/** @type {Timeframe[]} */
export const TIMEFRAMES = [
	{ id: '1', label: '1m', sec: 60 },
	{ id: '3', label: '3m', sec: 180 },
	{ id: '5', label: '5m', sec: 300 },
	{ id: '15', label: '15m', sec: 900 },
	{ id: '30', label: '30m', sec: 1800 },
	{ id: '60', label: '1h', sec: 3600 },
	{ id: '240', label: '4h', sec: 14_400 },
	{ id: 'D', label: '1D', sec: 86_400 },
];

/**
 * @param {HTMLElement} root
 * @param {{ initial: string, onChange: (tf: Timeframe) => void }} opts
 */
export function mountTimeframePicker(root, opts) {
	let active = opts.initial;

	root.classList.add('lwc-test-tf');
	root.setAttribute('role', 'group');
	root.setAttribute('aria-label', 'Timeframe');

	function render() {
		root.innerHTML = TIMEFRAMES.map(
			tf =>
				`<button type="button" class="lwc-test-tf__btn${tf.id === active ? ' is-active' : ''}" data-tf="${tf.id}" title="${tf.label}">${tf.label}</button>`
		).join('');
	}

	root.addEventListener('click', ev => {
		const btn = ev.target instanceof HTMLElement ? ev.target.closest('[data-tf]') : null;
		if (!(btn instanceof HTMLButtonElement)) {return;}
		const id = btn.dataset.tf;
		const tf = TIMEFRAMES.find(t => t.id === id);
		if (!tf || tf.id === active) {return;}
		active = tf.id;
		render();
		opts.onChange(tf);
	});

	render();

	return {
		getActive: () => TIMEFRAMES.find(t => t.id === active) ?? TIMEFRAMES[0],
		setActive(id) {
			if (!TIMEFRAMES.some(t => t.id === id)) {return;}
			active = id;
			render();
		},
	};
}
