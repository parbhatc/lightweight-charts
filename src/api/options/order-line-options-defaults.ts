import { OrderLineOptions } from '../../model/order-line-options';
import { LineStyle } from '../../renderers/draw-line';

import { priceLineOptionsDefaults } from './price-line-options-defaults';
import { priceLinePillsDefaults } from './price-line-pills-defaults';

export const orderLineOptionsDefaults: OrderLineOptions = {
	...priceLineOptionsDefaults,
	color: '#089981',
	lineStyle: LineStyle.Solid,
	axisLabelText: '',
	pills: {
		...priceLinePillsDefaults,
		body: { ...priceLinePillsDefaults.body },
		quantity: { ...priceLinePillsDefaults.quantity },
		cancel: { ...priceLinePillsDefaults.cancel },
	},
};
