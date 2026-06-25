import { merge } from '../helpers/strict-type-checks';

import { CustomPriceLineOrderPillsPaneView } from '../views/pane/custom-price-line-order-pills-pane-view';
import { CustomPriceLinePaneView } from '../views/pane/custom-price-line-pane-view';
import { IPaneView } from '../views/pane/ipane-view';
import { PanePriceAxisView } from '../views/pane/pane-price-axis-view';
import { CustomPriceLinePriceAxisView } from '../views/price-axis/custom-price-line-price-axis-view';
import { IPriceAxisView } from '../views/price-axis/iprice-axis-view';

import { Coordinate } from './coordinate';
import { ISeries } from './iseries';
import { PriceLineOptions, PriceLinePillsOptions } from './price-line-options';
import { SeriesType } from './series-options';

type StoredPriceLineOptions = PriceLineOptions & {
	order?: boolean;
	pills?: PriceLinePillsOptions;
};

/** Keep public API keys (`pills`, `order`) in sync with compiled `_internal_*` readers. */
function syncOrderLineOptionKeys(target: StoredPriceLineOptions): void {
	const rec = target as StoredPriceLineOptions & Record<string, unknown>;
	const pills = (rec.pills ?? rec._internal_pills) as PriceLinePillsOptions | undefined;
	if (pills != null) {
		rec.pills = pills;
		rec._internal_pills = pills;
	}
	const order = (rec.order ?? rec._internal_order) as boolean | undefined;
	if (order != null) {
		rec.order = order;
		rec._internal_order = order;
	}
}

export class CustomPriceLine {
	private readonly _series: ISeries<SeriesType>;
	private readonly _priceLineView: CustomPriceLinePaneView;
	private readonly _orderPillsPaneView: CustomPriceLineOrderPillsPaneView;
	private readonly _priceAxisView: CustomPriceLinePriceAxisView;
	private readonly _panePriceAxisView: PanePriceAxisView;
	private readonly _options: StoredPriceLineOptions;

	public constructor(series: ISeries<SeriesType>, options: StoredPriceLineOptions) {
		this._series = series;
		this._options = options;
		syncOrderLineOptionKeys(this._options);
		this._priceLineView = new CustomPriceLinePaneView(series, this);
		this._orderPillsPaneView = new CustomPriceLineOrderPillsPaneView(series, this);
		this._priceAxisView = new CustomPriceLinePriceAxisView(series, this);
		this._panePriceAxisView = new PanePriceAxisView(this._priceAxisView, series, series.model());
	}

	public applyOptions(options: Partial<StoredPriceLineOptions>): void {
		merge(this._options, options);
		syncOrderLineOptionKeys(this._options);
		this.update();
		this._series.model().lightUpdate();
	}

	public options(): StoredPriceLineOptions {
		return this._options;
	}

	public isOrderLine(): boolean {
		return Boolean(this._options.order);
	}

	public paneView(): IPaneView {
		return this._priceLineView;
	}

	public orderPillsPaneView(): IPaneView {
		return this._orderPillsPaneView;
	}

	public labelPaneView(): IPaneView {
		return this._panePriceAxisView;
	}

	public priceAxisView(): IPriceAxisView {
		return this._priceAxisView;
	}

	public update(): void {
		this._priceLineView.update();
		this._orderPillsPaneView.update();
		this._priceAxisView.update();
	}

	public yCoord(): Coordinate | null {
		const series = this._series;
		const priceScale = series.priceScale();
		const timeScale = series.model().timeScale();

		if (timeScale.isEmpty() || priceScale.isEmpty()) {
			return null;
		}

		const firstValue = series.firstValue();
		if (firstValue === null) {
			return null;
		}

		return priceScale.priceToCoordinate(this._options.price, firstValue.value);
	}
}
