/** @param {number | { year: number, month: number, day: number }} t */
export function toDate(t) {
	if (typeof t === 'number') {return new Date(t * 1000);}
	if (t && typeof t === 'object' && 'year' in t) {
		return new Date(t.year, t.month - 1, t.day);
	}
	return new Date(0);
}

/** @param {Date} d */
export function dateTime12h(d) {
	return d.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
}

/** @param {number} time UTC seconds */
export function formatTime12h(time) {
	return dateTime12h(toDate(time));
}

/** LWC localization.timeFormatter */
export function chartTimeFormatter(time) {
	return formatTime12h(/** @type {number} */ (time));
}
