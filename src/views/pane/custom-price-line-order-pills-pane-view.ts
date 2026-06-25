import { Coordinate } from '../../model/coordinate';
import { CustomPriceLine } from '../../model/custom-price-line';
import { ISeries } from '../../model/iseries';
import { priceLinePillsDefaults } from '../../model/price-line-options';
import { SeriesType } from '../../model/series-options';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { OrderPillsRenderer, OrderPillsRendererData } from '../../renderers/order-pills-renderer';

import { IPaneView } from './ipane-view';

export class CustomPriceLineOrderPillsPaneView implements IPaneView {
	private readonly _priceLine: CustomPriceLine;
	private readonly _series: ISeries<SeriesType>;
	private readonly _renderer: OrderPillsRenderer = new OrderPillsRenderer();
	private readonly _rendererData: OrderPillsRendererData;
	private _invalidated: boolean = true;
	private _layoutKey: string = '';

	public constructor(series: ISeries<SeriesType>, priceLine: CustomPriceLine) {
		this._series = series;
		this._priceLine = priceLine;
		this._rendererData = {
			y: 0 as Coordinate,
			accentColor: '#089981',
			pills: priceLinePillsDefaults,
			paneWidth: 0,
			visible: false,
			isMoving: false,
		};
	}

	public update(): void {
		this._invalidated = true;
	}

	public renderer(): IPaneRenderer | null {
		if (!this._series.visible()) {
			return null;
		}

		if (this._invalidated) {
			this._updateImpl();
			this._invalidated = false;
		}

		return this._rendererData.visible ? this._renderer : null;
	}

	private _updateImpl(): void {
		const options = this._priceLine.options();
		const data = this._rendererData;
		data.visible = false;

		if (!this._priceLine.isOrderLine() || !options.pills?.visible) {
			return;
		}

		const y = this._priceLine.yCoord();
		if (y === null) {
			return;
		}

		const pane = this._series.model().paneForSource(this._series);
		const paneWidth = this._series.model().timeScale().width() || pane?.width() || 0;
		const pills = options.pills ?? data.pills;
		const layoutKey = [
			paneWidth,
			pills.side,
			pills.offset,
			pills.body?.text,
			pills.body?.fontWeight,
			pills.body?.fontSize,
			pills.quantity?.text,
			pills.quantity?.fontWeight,
			pills.quantity?.fontSize,
			Boolean(pills.cancel?.visible),
		].join('\0');

		data.y = y;
		data.accentColor = options.color;
		data.paneWidth = paneWidth;
		data.isMoving = Boolean(pills?.moving);

		if (layoutKey !== this._layoutKey) {
			this._layoutKey = layoutKey;
			data.pills = pills;
			data.visible = true;
			this._renderer.setData(data);
			return;
		}

		data.visible = true;
		this._renderer.updateY(y);
	}
}
