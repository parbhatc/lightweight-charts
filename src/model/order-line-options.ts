import { LineStyle, LineWidth } from '../renderers/draw-line';

import {
	PriceLinePillCancelOptions,
	PriceLinePillSegmentOptions,
	PriceLinePillsOptions,
} from './price-line-options';

export type {
	PriceLinePillCancelOptions,
	PriceLinePillSegmentOptions,
	PriceLinePillsOptions,
};

/**
 * Order line options for {@link ISeriesApi.createOrderLine}.
 * Same surface as price lines plus a `pills` section for the pane control pill.
 */
export interface OrderLineOptions {
	id?: string;
	price: number;
	color: string;
	lineWidth: LineWidth;
	lineStyle: LineStyle;
	lineVisible: boolean;
	axisLabelVisible: boolean;
	axisLabelColor: string;
	axisLabelTextColor: string;
	axisLabelText: string;
	/**
	 * @defaultValue `''`
	 */
	title: string;
	pills: PriceLinePillsOptions;
}

export type CreateOrderLineOptions = Partial<OrderLineOptions> & Pick<OrderLineOptions, 'price'>;
