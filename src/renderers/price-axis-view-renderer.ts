import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D, MediaCoordinatesRenderingScope } from 'fancy-canvas';

import { drawRoundRectWithBorder } from '../helpers/canvas-helpers';

import { TextWidthCache } from '../model/text-width-cache';

import {
	IPriceAxisViewRenderer,
	PriceAxisViewRendererCommonData,
	PriceAxisViewRendererData,
	PriceAxisViewRendererOptions,
} from './iprice-axis-view-renderer';

const STACKED_LABEL_LINE_GAP = 0;
const STACKED_SUBTITLE_FONT_SIZE = 11;
const STACKED_LABEL_BOTTOM_PAD = 2;

function stackedAxisLabelExtraHeight(rendererOptions: PriceAxisViewRendererOptions): number {
	return STACKED_LABEL_LINE_GAP + STACKED_SUBTITLE_FONT_SIZE + STACKED_LABEL_BOTTOM_PAD;
}

function standardAxisLabelHeight(rendererOptions: PriceAxisViewRendererOptions): number {
	return rendererOptions.fontSize + rendererOptions.paddingTop + rendererOptions.paddingBottom;
}

function subtitleFont(rendererOptions: PriceAxisViewRendererOptions): string {
	return `${STACKED_SUBTITLE_FONT_SIZE}px ${rendererOptions.fontFamily}`;
}

interface Geometry {
	alignRight: boolean;

	// bitmap coordinate space geometry
	bitmap: {
		yTop: number;
		yMid: number;
		yBottom: number;
		totalWidth: number;
		totalHeight: number;
		radius: number;
		horzBorder: number;
		xOutside: number;
		xInside: number;
		xTick: number;
		tickHeight: number;
		right: number;
	};

	// media coordinate space geometry
	media: {
		yTop: number;
		yBottom: number;
		xText: number;
		textMidCorrection: number;
	};
}

export class PriceAxisViewRenderer implements IPriceAxisViewRenderer {
	private _data!: PriceAxisViewRendererData;
	private _commonData!: PriceAxisViewRendererCommonData;

	public constructor(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData) {
		this.setData(data, commonData);
	}

	public setData(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData): void {
		this._data = data;
		this._commonData = commonData;
	}

	public height(rendererOptions: PriceAxisViewRendererOptions, useSecondLine: boolean): number {
		if (!this._data.visible) {
			return 0;
		}

		const subtitle = this._data.subtitleText ?? '';
		if (subtitle.length > 0 || useSecondLine) {
			return standardAxisLabelHeight(rendererOptions) + stackedAxisLabelExtraHeight(rendererOptions);
		}

		return rendererOptions.fontSize + rendererOptions.paddingTop + rendererOptions.paddingBottom;
	}

	public draw(
		target: CanvasRenderingTarget2D,
		rendererOptions: PriceAxisViewRendererOptions,
		textWidthCache: TextWidthCache,
		align: 'left' | 'right'
	): void {
		if (!this._data.visible || this._data.text.length === 0) {
			return;
		}

		const subtitle = this._data.subtitleText ?? '';
		if (subtitle.length > 0) {
			this._drawStackedLabel(target, rendererOptions, textWidthCache, align, subtitle);
			return;
		}

		const textColor = this._data.color;
		const backgroundColor = this._commonData.background;

		const geometry = target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
			const ctx = scope.context;
			ctx.font = rendererOptions.font;
			const geom = this._calculateGeometry(scope, rendererOptions, textWidthCache, align);
			const gb = geom.bitmap;

			/*
			 draw label. backgroundColor will always be a solid color (no alpha) [see generateContrastColors in color.ts].
			 Therefore we can draw the rounded label using simplified code (drawRoundRectWithBorder) that doesn't need to ensure the background and the border don't overlap.
			*/
			if (geom.alignRight) {
				drawRoundRectWithBorder(
					ctx,
					gb.xOutside,
					gb.yTop,
					gb.totalWidth,
					gb.totalHeight,
					backgroundColor,
					gb.horzBorder,
					[gb.radius, 0, 0, gb.radius],
					backgroundColor
				);
			} else {
				drawRoundRectWithBorder(
					ctx,
					gb.xInside,
					gb.yTop,
					gb.totalWidth,
					gb.totalHeight,
					backgroundColor,
					gb.horzBorder,
					[0, gb.radius, gb.radius, 0],
					backgroundColor
				);
			}
			// draw tick
			if (this._data.tickVisible) {
				ctx.fillStyle = textColor;
				ctx.fillRect(gb.xInside, gb.yMid, gb.xTick - gb.xInside, gb.tickHeight);
			}

			// draw separator
			if (this._data.borderVisible) {
				ctx.fillStyle = rendererOptions.paneBackgroundColor;
				ctx.fillRect(
					geom.alignRight ? gb.right - gb.horzBorder : 0,
					gb.yTop,
					gb.horzBorder,
					gb.yBottom - gb.yTop
				);
			}

			return geom;
		});

		target.useMediaCoordinateSpace(({ context: ctx }: MediaCoordinatesRenderingScope) => {
			const gm = geometry.media;
			ctx.font = rendererOptions.font;
			ctx.textAlign = geometry.alignRight ? 'right' : 'left';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = textColor;
			ctx.fillText(this._data.text, gm.xText, (gm.yTop + gm.yBottom) / 2 + gm.textMidCorrection);
		});
	}

	private _drawStackedLabel(
		target: CanvasRenderingTarget2D,
		rendererOptions: PriceAxisViewRendererOptions,
		textWidthCache: TextWidthCache,
		align: 'left' | 'right',
		subtitle: string
	): void {
		const textColor = this._data.color;
		const backgroundColor = this._commonData.background;
		const lineY = this._commonData.coordinate;
		const singleH = standardAxisLabelHeight(rendererOptions);
		const topY = lineY - singleH / 2;
		const subtitleTop = topY + singleH + STACKED_LABEL_LINE_GAP;
		const totalH = singleH + stackedAxisLabelExtraHeight(rendererOptions);
		const alignRight = align === 'right';

		const layout = target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
			const { context: ctx, horizontalPixelRatio, verticalPixelRatio } = scope;
			ctx.font = rendererOptions.font;
			const priceWidth = Math.ceil(textWidthCache.measureText(ctx, this._data.text));
			ctx.font = subtitleFont(rendererOptions);
			const subtitleWidth = Math.ceil(textWidthCache.measureText(ctx, subtitle));
			ctx.font = rendererOptions.font;

			const geom = this._calculateGeometry(scope, rendererOptions, textWidthCache, align, {
				text: this._data.text,
				textWidth: Math.max(priceWidth, subtitleWidth),
				coordinate: lineY,
			});
			const gb = geom.bitmap;
			const blockTopBitmap = Math.round(topY * verticalPixelRatio);
			const blockHeightBitmap = Math.round(totalH * verticalPixelRatio);
			const blockXBitmap = alignRight ? gb.xOutside : gb.xInside;
			const cornerRadii: [number, number, number, number] = alignRight
				? [gb.radius, 0, 0, gb.radius]
				: [0, gb.radius, gb.radius, 0];

			drawRoundRectWithBorder(
				ctx,
				blockXBitmap,
				blockTopBitmap,
				gb.totalWidth,
				blockHeightBitmap,
				backgroundColor,
				gb.horzBorder,
				cornerRadii,
				backgroundColor
			);

			if (this._data.tickVisible) {
				ctx.fillStyle = textColor;
				ctx.fillRect(gb.xInside, gb.yMid, gb.xTick - gb.xInside, gb.tickHeight);
			}

			if (this._data.borderVisible) {
				ctx.fillStyle = rendererOptions.paneBackgroundColor;
				ctx.fillRect(
					alignRight ? gb.right - gb.horzBorder : 0,
					blockTopBitmap,
					gb.horzBorder,
					blockHeightBitmap
				);
			}

			const blockLeft = blockXBitmap / horizontalPixelRatio;
			const blockRight = blockLeft + gb.totalWidth / horizontalPixelRatio;

			return {
				priceX: geom.media.xText,
				priceY: (geom.media.yTop + geom.media.yBottom) / 2 + geom.media.textMidCorrection,
				subtitleCenterX: (blockLeft + blockRight) / 2,
				subtitleTop,
			};
		});

		target.useMediaCoordinateSpace(({ context: ctx }: MediaCoordinatesRenderingScope) => {
			ctx.fillStyle = textColor;
			ctx.font = rendererOptions.font;
			ctx.textAlign = alignRight ? 'right' : 'left';
			ctx.textBaseline = 'middle';
			ctx.fillText(this._data.text, layout.priceX, layout.priceY);

			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.font = subtitleFont(rendererOptions);
			ctx.fillText(subtitle, layout.subtitleCenterX, layout.subtitleTop);
		});
	}

	// eslint-disable-next-line complexity
	private _calculateGeometry(
		scope: BitmapCoordinatesRenderingScope,
		rendererOptions: PriceAxisViewRendererOptions,
		textWidthCache: TextWidthCache,
		align: 'left' | 'right',
		overrides?: {
			text?: string;
			textWidth?: number;
			coordinate?: number;
			tickVisible?: boolean;
			moveTextToInvisibleTick?: boolean;
			separatorVisible?: boolean;
		}
	): Geometry {
		const { context: ctx, bitmapSize, mediaSize, horizontalPixelRatio, verticalPixelRatio } = scope;
		const tickVisible = overrides?.tickVisible ?? (this._data.tickVisible || !this._data.moveTextToInvisibleTick);
		const tickSize = tickVisible ? rendererOptions.tickLength : 0;
		const horzBorder = (overrides?.separatorVisible ?? this._data.separatorVisible) ? rendererOptions.borderSize : 0;
		const paddingTop = rendererOptions.paddingTop + this._commonData.additionalPaddingTop;
		const paddingBottom = rendererOptions.paddingBottom + this._commonData.additionalPaddingBottom;
		const paddingInner = rendererOptions.paddingInner;
		const paddingOuter = rendererOptions.paddingOuter;
		const text = overrides?.text ?? this._data.text;
		const actualTextHeight = rendererOptions.fontSize;
		const textMidCorrection = textWidthCache.yMidCorrection(ctx, text);

		const textWidth = overrides?.textWidth ?? Math.ceil(textWidthCache.measureText(ctx, text));

		const totalHeight = actualTextHeight + paddingTop + paddingBottom;

		const totalWidth = rendererOptions.borderSize + paddingInner + paddingOuter + textWidth + tickSize;

		const tickHeightBitmap = Math.max(1, Math.floor(verticalPixelRatio));
		let totalHeightBitmap = Math.round(totalHeight * verticalPixelRatio);
		if (totalHeightBitmap % 2 !== tickHeightBitmap % 2) {
			totalHeightBitmap += 1;
		}
		const horzBorderBitmap = horzBorder > 0 ? Math.max(1, Math.floor(horzBorder * horizontalPixelRatio)) : 0;
		const totalWidthBitmap = Math.round(totalWidth * horizontalPixelRatio);
		// tick overlaps scale border
		const tickSizeBitmap = Math.round(tickSize * horizontalPixelRatio);

		const yMid = overrides?.coordinate ?? this._commonData.fixedCoordinate ?? this._commonData.renderCoordinate ?? this._commonData.coordinate;
		const yMidBitmap = Math.round(yMid * verticalPixelRatio) - Math.floor(verticalPixelRatio * 0.5);
		const yTopBitmap = Math.floor(yMidBitmap + tickHeightBitmap / 2 - totalHeightBitmap / 2);
		const yBottomBitmap = yTopBitmap + totalHeightBitmap;

		const alignRight = align === 'right';

		const xInside = alignRight ? mediaSize.width - horzBorder : horzBorder;
		const xInsideBitmap = alignRight ? bitmapSize.width - horzBorderBitmap : horzBorderBitmap;

		let xOutsideBitmap: number;
		let xTickBitmap: number;
		let xText: number;

		if (alignRight) {
			// 2               1
			//
			//              6  5
			//
			// 3               4
			xOutsideBitmap = xInsideBitmap - totalWidthBitmap;
			xTickBitmap = xInsideBitmap - tickSizeBitmap;
			xText = xInside - tickSize - paddingInner - horzBorder;
		} else {
			// 1               2
			//
			// 6  5
			//
			// 4               3
			xOutsideBitmap = xInsideBitmap + totalWidthBitmap;
			xTickBitmap = xInsideBitmap + tickSizeBitmap;
			xText = xInside + tickSize + paddingInner;
		}

		return {
			alignRight,
			bitmap: {
				yTop: yTopBitmap,
				yMid: yMidBitmap,
				yBottom: yBottomBitmap,
				totalWidth: totalWidthBitmap,
				totalHeight: totalHeightBitmap,
				// TODO: it is better to have different horizontal and vertical radii
				radius: 2 * horizontalPixelRatio,
				horzBorder: horzBorderBitmap,
				xOutside: xOutsideBitmap,
				xInside: xInsideBitmap,
				xTick: xTickBitmap,
				tickHeight: tickHeightBitmap,
				right: bitmapSize.width,
			},
			media: {
				yTop: yTopBitmap / verticalPixelRatio,
				yBottom: yBottomBitmap / verticalPixelRatio,
				xText,
				textMidCorrection,
			},
		};
	}
}
