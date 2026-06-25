import { CustomPriceLine } from '../model/custom-price-line';
import { OrderLineOptions } from '../model/order-line-options';
import { PriceLinePillsOptions } from '../model/price-line-options';

import { IOrderLine } from './iorder-line';
import { orderLineOptionsDefaults } from './options/order-line-options-defaults';

function toOrderLineOptions(options: ReturnType<CustomPriceLine['options']>): OrderLineOptions {
	const rec = options as ReturnType<CustomPriceLine['options']> & Record<string, unknown>;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const { order: _order, pills: _pills, axisSubtitleText: _subtitle, ...rest } = options;
	const pills = (rec.pills ?? rec._internal_pills ?? orderLineOptionsDefaults.pills) as PriceLinePillsOptions;
	return {
		...rest,
		pills,
	};
}

export class OrderLine implements IOrderLine {
	private readonly _orderLine: CustomPriceLine;

	public constructor(orderLine: CustomPriceLine) {
		this._orderLine = orderLine;
	}

	public applyOptions(options: Partial<OrderLineOptions>): void {
		this._orderLine.applyOptions({ ...options, order: true });
	}

	public options(): Readonly<OrderLineOptions> {
		return toOrderLineOptions(this._orderLine.options());
	}

	public orderLine(): CustomPriceLine {
		return this._orderLine;
	}
}
