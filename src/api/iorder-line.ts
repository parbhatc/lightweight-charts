import { OrderLineOptions } from '../model/order-line-options';

/**
 * Represents the interface for interacting with order lines.
 */
export interface IOrderLine {
	applyOptions(options: Partial<OrderLineOptions>): void;
	options(): Readonly<OrderLineOptions>;
}
