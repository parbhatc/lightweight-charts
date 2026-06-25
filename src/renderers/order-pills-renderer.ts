/* eslint-disable max-params, @typescript-eslint/member-ordering, complexity */
import { CanvasRenderingTarget2D, MediaCoordinatesRenderingScope } from 'fancy-canvas';

import { Coordinate } from '../model/coordinate';
import { PriceLinePillsOptions } from '../model/price-line-options';

import { LineStyle, setLineStyle } from './draw-line';
import { IPaneRenderer } from './ipane-renderer';

const ROW_H = 18;
const CANCEL_W = 18;
const GAP = 0;
const PAD_X = 6;
const MIN_BODY_W = 36;
const MIN_QTY_W = 22;
const PILL_INSET = 4;
const DEFAULT_FONT = "'Trebuchet MS', Roboto, Ubuntu, sans-serif";

export interface OrderPillsRendererData {
	y: Coordinate;
	accentColor: string;
	pills: PriceLinePillsOptions;
	paneWidth: number;
	visible: boolean;
	isMoving?: boolean;
	lineVisible?: boolean;
	lineWidth?: number;
	lineStyle?: LineStyle;
}

interface RowLayout {
	bodyText: string;
	qtyText: string;
	bodyW: number;
	qtyW: number;
	totalW: number;
	rowLeft: number;
}

function resolveFontFamily(family: string): string {
	const s = family.trim();
	return s || DEFAULT_FONT;
}

function resolveFontSize(size: number): number {
	if (!Number.isFinite(size)) {return 12;}
	return Math.min(16, Math.max(9, Math.round(size)));
}

function resolveFontWeight(weight: number): number {
	if (!Number.isFinite(weight)) {return 900;}
	return Math.min(900, Math.max(100, Math.round(weight)));
}

function measureTextWidth(
	ctx: CanvasRenderingContext2D,
	text: string,
	weight: number,
	size: number,
	family: string
): number {
	ctx.font = `${resolveFontWeight(weight)} ${resolveFontSize(size)}px ${resolveFontFamily(family)}`;
	return ctx.measureText(text).width;
}

function dividerColor(color: string): string {
	return color && color !== 'transparent' ? color : '';
}

function hasShellBorder(bodyBorderColor: string): boolean {
	return Boolean(bodyBorderColor && bodyBorderColor !== 'transparent');
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	rtl: number,
	rtr: number,
	rbr: number,
	rbl: number
): void {
	const maxR = Math.min(w / 2, h / 2);
	const tl = Math.min(rtl, maxR);
	const tr = Math.min(rtr, maxR);
	const br = Math.min(rbr, maxR);
	const bl = Math.min(rbl, maxR);
	ctx.beginPath();
	ctx.moveTo(x + tl, y);
	ctx.lineTo(x + w - tr, y);
	if (tr) {ctx.quadraticCurveTo(x + w, y, x + w, y + tr);} else {ctx.lineTo(x + w, y);}
	ctx.lineTo(x + w, y + h - br);
	if (br) {ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);} else {ctx.lineTo(x + w, y + h);}
	ctx.lineTo(x + bl, y + h);
	if (bl) {ctx.quadraticCurveTo(x, y + h, x, y + h - bl);} else {ctx.lineTo(x, y + h);}
	ctx.lineTo(x, y + tl);
	if (tl) {ctx.quadraticCurveTo(x, y, x + tl, y);} else {ctx.lineTo(x, y);}
	ctx.closePath();
}

function fillBoldText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
	ctx.fillText(text, x, y);
}

function drawRowContents(
	ctx: CanvasRenderingContext2D,
	row: RowLayout,
	data: OrderPillsRendererData,
	localTop: number
): void {
	const pills = data.pills;
	const body = pills.body;
	const quantity = pills.quantity;
	const cancel = pills.cancel;
	const x = 0;
	const accent = data.accentColor;
	const bodyBg = body.backgroundColor || accent;
	const qtyBg = quantity.backgroundColor || accent;
	const cancelLeft = x + row.totalW - CANCEL_W;
	const shellBorder = hasShellBorder(body.borderColor);
	const qtyDiv = dividerColor(quantity.borderColor) || dividerColor(body.borderColor);

	roundRect(ctx, x, localTop, row.totalW, ROW_H, 2, 2, 2, 2);
	ctx.fillStyle = bodyBg;
	ctx.fill();

	if (shellBorder) {
		ctx.strokeStyle = body.borderColor;
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	if (row.bodyW > 0) {
		ctx.fillStyle = body.textColor || '#ffffff';
		ctx.font = `${resolveFontWeight(body.fontWeight)} ${resolveFontSize(body.fontSize)}px ${resolveFontFamily(body.fontFamily)}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		fillBoldText(ctx, row.bodyText, x + row.bodyW / 2, localTop + ROW_H / 2);
	}

	if (row.qtyW > 0) {
		ctx.fillStyle = qtyBg;
		const qtyLeft = x + row.bodyW + (row.bodyW ? GAP : 0);
		ctx.fillRect(qtyLeft, localTop, row.qtyW, ROW_H);
		if (qtyDiv) {
			ctx.fillStyle = qtyDiv;
			ctx.fillRect(qtyLeft, localTop, 1, ROW_H);
		}
		ctx.fillStyle = quantity.textColor || '#ffffff';
		ctx.font = `${resolveFontWeight(quantity.fontWeight)} ${resolveFontSize(quantity.fontSize)}px ${resolveFontFamily(quantity.fontFamily)}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		fillBoldText(ctx, row.qtyText, qtyLeft + row.qtyW / 2, localTop + ROW_H / 2);
	}

	if (cancel.visible) {
		ctx.fillStyle = cancel.backgroundColor;
		ctx.fillRect(cancelLeft, localTop, CANCEL_W, ROW_H);
		if (shellBorder) {
			ctx.fillStyle = body.borderColor;
			ctx.fillRect(cancelLeft, localTop, 1, ROW_H);
		}
		drawCancelIcon(ctx, cancelLeft + CANCEL_W / 2, localTop + ROW_H / 2, cancel.iconColor || '#000000');
	}
}

function layoutRow(
	ctx: CanvasRenderingContext2D,
	data: OrderPillsRendererData
): RowLayout | null {
	const pills = data.pills;
	if (!pills.visible) {
		return null;
	}

	const body = pills.body;
	const quantity = pills.quantity;
	const cancel = pills.cancel;

	const rawBody = body.visible ? body.text.trim() : '';
	const qtyText = quantity.visible ? quantity.text.trim() : '';

	const bodyInner = rawBody
		? measureTextWidth(ctx, rawBody, body.fontWeight, body.fontSize, body.fontFamily)
		: 0;
	const qtyInner = qtyText
		? measureTextWidth(ctx, qtyText, quantity.fontWeight, quantity.fontSize, quantity.fontFamily)
		: 0;

	const bodyW = rawBody
		? Math.max(MIN_BODY_W, Math.ceil(bodyInner + PAD_X * 2))
		: 0;
	const qtyW = qtyText
		? Math.max(MIN_QTY_W, Math.ceil(qtyInner + PAD_X * 2))
		: 0;
	const cancelW = cancel.visible ? CANCEL_W : 0;
	const totalW = bodyW + (qtyW ? GAP + qtyW : 0) + (cancelW ? GAP + cancelW : 0);
	if (totalW <= 0) {
		return null;
	}

	const offset = Math.max(0, pills.offset);
	const rowLeft =
		pills.side === 'left'
			? PILL_INSET + offset
			: Math.max(0, data.paneWidth - totalW - offset);

	return { bodyText: rawBody, qtyText, bodyW, qtyW, totalW, rowLeft };
}

function drawCancelIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
	const half = 4;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(cx - half, cy - half);
	ctx.lineTo(cx + half, cy + half);
	ctx.moveTo(cx + half, cy - half);
	ctx.lineTo(cx - half, cy + half);
	ctx.stroke();
}

export class OrderPillsRenderer implements IPaneRenderer {
	private _data: OrderPillsRendererData | null = null;
	private _cachedLayout: RowLayout | null = null;
	private _layoutCacheKey: string = '';
	private _bitmap: HTMLCanvasElement | null = null;
	private _bitmapKey: string = '';

	public setData(data: OrderPillsRendererData): void {
		this._data = data;
		this._cachedLayout = null;
		this._layoutCacheKey = '';
		this._bitmap = null;
		this._bitmapKey = '';
	}

	/** Update vertical position only (pan/zoom) without invalidating text layout. */
	public updateY(y: Coordinate): void {
		if (this._data !== null) {
			this._data.y = y;
		}
	}

	private _layoutCacheKeyFor(data: OrderPillsRendererData): string {
		const pills = data.pills;
		const body = pills.body;
		const quantity = pills.quantity;
		return [
			data.paneWidth,
			pills.side,
			pills.offset,
			body.visible,
			body.text,
			body.fontWeight,
			body.fontSize,
			body.fontFamily,
			quantity.visible,
			quantity.text,
			quantity.fontWeight,
			quantity.fontSize,
			quantity.fontFamily,
			pills.cancel.visible,
		].join('\0');
	}

	private _resolveLayout(ctx: CanvasRenderingContext2D, data: OrderPillsRendererData): RowLayout | null {
		const key = this._layoutCacheKeyFor(data);
		if (key === this._layoutCacheKey && this._cachedLayout !== null) {
			return this._cachedLayout;
		}
		const row = layoutRow(ctx, data);
		this._layoutCacheKey = key;
		this._cachedLayout = row;
		return row;
	}

	private _ensureBitmap(
		row: RowLayout,
		data: OrderPillsRendererData,
		horizontalPixelRatio: number
	): HTMLCanvasElement {
		const ratio = Math.max(1, horizontalPixelRatio || 1);
		const mediaW = row.totalW;
		const mediaH = ROW_H;
		const bmpW = Math.max(1, Math.ceil(mediaW * ratio));
		const bmpH = Math.max(1, Math.ceil(mediaH * ratio));
		const key = this._layoutCacheKeyFor(data) + '\0' + mediaW + '\0' + ratio;

		if (
			this._bitmap !== null &&
			key === this._bitmapKey &&
			this._bitmap.width === bmpW &&
			this._bitmap.height === bmpH
		) {
			return this._bitmap;
		}

		let canvas = this._bitmap;
		if (canvas === null || canvas.width !== bmpW || canvas.height !== bmpH) {
			canvas = document.createElement('canvas');
			this._bitmap = canvas;
		}

		canvas.width = bmpW;
		canvas.height = bmpH;
		const bctx = canvas.getContext('2d');
		if (bctx !== null) {
			bctx.setTransform(1, 0, 0, 1, 0, 0);
			bctx.clearRect(0, 0, bmpW, bmpH);
			bctx.scale(ratio, ratio);
			bctx.imageSmoothingEnabled = true;
			drawRowContents(bctx, row, data, 0);
		}

		this._bitmapKey = key;
		return canvas;
	}

	public draw(target: CanvasRenderingTarget2D, isHovered: boolean, hitTestData?: unknown): void {
		if (this._data === null || !this._data.visible) {
			return;
		}

		target.useMediaCoordinateSpace((scope: MediaCoordinatesRenderingScope) => {
			const ctx = scope.context;
			const data = this._data as OrderPillsRendererData;
			const y = Math.round(data.y);
			const ratio = window.devicePixelRatio || 1;

			if (data.lineVisible !== false && data.paneWidth > 0) {
				ctx.save();
				ctx.strokeStyle = data.accentColor;
				ctx.lineWidth = data.lineWidth ?? 1;
				setLineStyle(ctx, data.lineStyle ?? LineStyle.Solid);
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(data.paneWidth, y);
				ctx.stroke();
				ctx.restore();
			}

			const row = this._resolveLayout(ctx, data);
			if (row === null) {
				return;
			}

			const top = Math.round(data.y - ROW_H / 2);
			const x = Math.round(row.rowLeft);
			const bitmap = this._ensureBitmap(row, data, ratio);

			ctx.save();
			if (data.pills.moving) {
				ctx.globalAlpha = 0.92;
			}
			ctx.drawImage(bitmap, x, top, row.totalW, ROW_H);
			ctx.restore();
		});
	}
}
