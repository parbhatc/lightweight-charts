import { LineStyle, LineWidth } from '../renderers/draw-line';

/**
 * Text segment in an order-line pill (body or quantity).
 */
export interface PriceLinePillSegmentOptions {
	/**
	 * Segment label text.
	 *
	 * @defaultValue `''`
	 */
	text: string;
	/**
	 * @defaultValue `''`
	 */
	backgroundColor: string;
	/**
	 * @defaultValue `'#ffffff'`
	 */
	textColor: string;
	/**
	 * @defaultValue `'transparent'`
	 */
	borderColor: string;
	/**
	 * @defaultValue `''`
	 */
	tooltip: string;
	/**
	 * @defaultValue `12`
	 */
	fontSize: number;
	/**
	 * @defaultValue `900`
	 */
	fontWeight: number;
	/**
	 * @defaultValue `''`
	 */
	fontFamily: string;
	/**
	 * @defaultValue `true`
	 */
	visible: boolean;
}

/**
 * Cancel button segment in an order-line pill.
 */
export interface PriceLinePillCancelOptions {
	/**
	 * @defaultValue `true`
	 */
	visible: boolean;
	/**
	 * @defaultValue `'rgba(255, 255, 255, 0.96)'`
	 */
	backgroundColor: string;
	/**
	 * @defaultValue `'#000000'`
	 */
	borderColor: string;
	/**
	 * @defaultValue `'#000000'`
	 */
	iconColor: string;
	/**
	 * @defaultValue `''`
	 */
	tooltip: string;
}

/**
 * TradingView-style order pill rendered on the chart pane when `order` is true.
 */
export interface PriceLinePillsOptions {
	/**
	 * @defaultValue `true`
	 */
	visible: boolean;
	/**
	 * Pill anchor edge on the chart pane.
	 *
	 * @defaultValue `'right'`
	 */
	side: 'left' | 'right';
	/**
	 * Inset from the anchored edge in media pixels.
	 *
	 * @defaultValue `20`
	 */
	offset: number;
	/**
	 * Dim pill while dragging (visual feedback).
	 *
	 * @defaultValue `false`
	 */
	moving: boolean;
	/**
	 * Main pill text (e.g. "Limit Buy", PnL).
	 */
	body: PriceLinePillSegmentOptions;
	/**
	 * Quantity segment text.
	 */
	quantity: PriceLinePillSegmentOptions;
	/**
	 * Cancel button segment.
	 */
	cancel: PriceLinePillCancelOptions;
}

/**
 * Represents a price line options.
 */
export interface PriceLineOptions {
	/**
	 * The optional ID of this price line.
	 */
	id?: string;
	/**
	 * Price line's value.
	 *
	 * @defaultValue `0`
	 */
	price: number;
	/**
	 * Price line's color.
	 *
	 * @defaultValue `''`
	 */
	color: string;
	/**
	 * Price line's width in pixels.
	 *
	 * @defaultValue `1`
	 */
	lineWidth: LineWidth;
	/**
	 * Price line's style.
	 *
	 * @defaultValue {@link LineStyle.Solid}
	 */
	lineStyle: LineStyle;
	/**
	 * Display line.
	 *
	 * @defaultValue `true`
	 */
	lineVisible: boolean;
	/**
	 * Display the current price value in on the price scale.
	 *
	 * @defaultValue `true`
	 */
	axisLabelVisible: boolean;
	/**
	 * Price line's on the chart pane.
	 *
	 * @defaultValue `''`
	 */
	title: string;
	/**
	 * Background color for the axis label.
	 * Will default to the price line color if unspecified.
	 *
	 * @defaultValue `''`
	 */
	axisLabelColor: string;
	/**
	 * Text color for the axis label.
	 *
	 * @defaultValue `''`
	 */
	axisLabelTextColor: string;
	/**
	 * Custom axis label text. When empty, the price is formatted automatically.
	 *
	 * @defaultValue `''`
	 */
	axisLabelText: string;
	/**
	 * Secondary line shown below the axis label (e.g. bar close countdown).
	 *
	 * @defaultValue `''`
	 */
	axisSubtitleText: string;
}

/**
 * Price line options for the {@link ISeriesApi.createPriceLine} method.
 *
 * `price` is required, while the rest of the options are optional.
 */
export type CreatePriceLineOptions = Partial<PriceLineOptions> & Pick<PriceLineOptions, 'price'>;

export const priceLinePillSegmentDefaults: PriceLinePillSegmentOptions = {
	text: '',
	backgroundColor: '',
	textColor: '#ffffff',
	borderColor: 'transparent',
	tooltip: '',
	fontSize: 12,
	fontWeight: 900,
	fontFamily: '',
	visible: true,
};

export const priceLinePillCancelDefaults: PriceLinePillCancelOptions = {
	visible: true,
	backgroundColor: 'rgba(255, 255, 255, 0.96)',
	borderColor: '#000000',
	iconColor: '#000000',
	tooltip: '',
};

export const priceLinePillsDefaults: PriceLinePillsOptions = {
	visible: true,
	side: 'right',
	offset: 20,
	moving: false,
	body: { ...priceLinePillSegmentDefaults },
	quantity: { ...priceLinePillSegmentDefaults },
	cancel: { ...priceLinePillCancelDefaults },
};
