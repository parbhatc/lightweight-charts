/* eslint-disable @typescript-eslint/no-floating-promises */
import * as chai from 'chai';
import { expect } from 'chai';
import chaiExclude from 'chai-exclude';
import { describe, it } from 'node:test';

chai.use(chaiExclude);

import { timeScaleOptionsDefaults } from '../../src/api/options/time-scale-options-defaults';
import { ChartModel } from '../../src/model/chart-model';
import { Coordinate } from '../../src/model/coordinate';
import { HorzScaleBehaviorTime } from '../../src/model/horz-scale-behavior-time/horz-scale-behavior-time';
import { Time, UTCTimestamp } from '../../src/model/horz-scale-behavior-time/types';
import { InternalHorzScaleItem } from '../../src/model/ihorz-scale-behavior';
import { LocalizationOptions } from '../../src/model/localization-options';
import { TickMarkWeightValue, TimePointIndex, TimeScalePoint } from '../../src/model/time-data';
import { TimeScale } from '../../src/model/time-scale';

function chartModelMock(): ChartModel<Time> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return {
		recalculateAllPanes: () => {},
		lightUpdate: () => {},
		options: () => ({
			layout: { fontSize: 12 },
			handleScroll: {
				horzTouchDrag: true,
				mouseWheel: true,
				pressedMouseMove: true,
				vertTouchDrag: true,
			},
			handleScale: {
				axisDoubleClickReset: { time: true, price: true },
				axisPressedMouseMove: { time: true, price: true },
				mouseWheel: true,
				pinch: true,
			},
		}),
	} as ChartModel<Time>;
}

function tsUpdate(to: number): Parameters<TimeScale<Time>['update']> {
	const points: TimeScalePoint[] = [];

	const startIndex = 0;
	for (let i = startIndex; i <= to; ++i) {
		points.push({ time: { timestamp: i as UTCTimestamp } as unknown as InternalHorzScaleItem, timeWeight: 20 as TickMarkWeightValue, originalTime: i as UTCTimestamp });
	}

	return [points, 0];
}

const behavior = new HorzScaleBehaviorTime();

describe('TimeScale', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fakeLocalizationOptions: LocalizationOptions<Time> = {} as any;

	it('indexToCoordinate and coordinateToIndex inverse', () => {
		const lastIndex = 499 as TimePointIndex;

		const ts = new TimeScale<Time>(chartModelMock(), { ...timeScaleOptionsDefaults, barSpacing: 1, rightOffset: 0 }, fakeLocalizationOptions, behavior);
		ts.setWidth(500);
		ts.update(...tsUpdate(lastIndex));
		ts.setBaseIndex(lastIndex);

		expect(ts.indexToCoordinate(ts.coordinateToIndex(499.5 as Coordinate))).to.be.equal(499.5 as Coordinate);
	});

	it('all *ToCoordinate functions should return same coordinate for the same index', () => {
		const lastIndex = 499 as TimePointIndex;

		const ts = new TimeScale<Time>(chartModelMock(), { ...timeScaleOptionsDefaults, barSpacing: 1, rightOffset: 0 }, fakeLocalizationOptions, behavior);
		ts.setWidth(500);
		ts.update(...tsUpdate(lastIndex));
		ts.setBaseIndex(lastIndex);

		const index = 1 as TimePointIndex;
		const expectedValue = 0.5 as Coordinate;

		expect(ts.indexToCoordinate(index)).to.be.equal(expectedValue, 'indexToCoordinate');

		{
			const indexes = [{ time: index, x: 0 as Coordinate }];
			ts.indexesToCoordinates(indexes);
			expect(indexes[0].x).to.be.equal(expectedValue, 'indexesToCoordinates');
		}
	});

	describe('timeToIndex', () => {
		it('should return index for time on scale', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);

			ts.update(...tsUpdate(2));

			expect(ts.timeToIndex({ timestamp: 0 as UTCTimestamp } as unknown as InternalHorzScaleItem, false)).to.be.equal(0);
			expect(ts.timeToIndex({ timestamp: 1 as UTCTimestamp } as unknown as InternalHorzScaleItem, false)).to.be.equal(1);
			expect(ts.timeToIndex({ timestamp: 2 as UTCTimestamp } as unknown as InternalHorzScaleItem, false)).to.be.equal(2);
		});

		it('should return null for time not on scale', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);

			ts.update(...tsUpdate(2));

			expect(ts.timeToIndex({ timestamp: -1 as UTCTimestamp } as unknown as InternalHorzScaleItem, false)).to.be.equal(null);
			expect(ts.timeToIndex({ timestamp: 3 as UTCTimestamp } as unknown as InternalHorzScaleItem, false)).to.be.equal(null);
		});

		it('should return null if time scale is empty', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);

			expect(ts.timeToIndex({ timestamp: 123 as UTCTimestamp } as unknown as InternalHorzScaleItem, false)).to.be.equal(null);
		});

		it('should return null if timestamp is between two values on the scale', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);

			ts.update(...tsUpdate(1));

			expect(ts.timeToIndex({ timestamp: 0.5 as UTCTimestamp } as unknown as InternalHorzScaleItem, false)).to.be.equal(null);
		});

		it('should extrapolate index when timestamp is beyond the last bar and findNearest is true', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);

			ts.update(...tsUpdate(2));

			expect(ts.timeToIndex({ timestamp: 3 as UTCTimestamp } as unknown as InternalHorzScaleItem, true)).to.be.equal(3);
		});

		it('should extrapolate index when timestamp is before the first bar and findNearest is true', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);

			ts.update(...tsUpdate(2));

			expect(ts.timeToIndex({ timestamp: -1 as UTCTimestamp } as unknown as InternalHorzScaleItem, true)).to.be.equal(-1);
		});

		it('should return next index if timestamp is between two values on the scale and findNearest parameter is true', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);

			ts.update(...tsUpdate(1));

			expect(ts.timeToIndex({ timestamp: 0.5 as UTCTimestamp } as unknown as InternalHorzScaleItem, true)).to.be.equal(1);
		});
	});

	describe('virtual future time extrapolation', () => {
		it('should project indexToTime beyond the last loaded point', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);
			ts.update(...tsUpdate(1));

			const future = ts.indexToTime(3 as TimePointIndex) as unknown as { timestamp: number };
			expect(future.timestamp).to.be.equal(3);
		});

		it('should return extrapolated time scale point for virtual future index', () => {
			const ts = new TimeScale<Time>(chartModelMock(), timeScaleOptionsDefaults, fakeLocalizationOptions, behavior);
			ts.update(...tsUpdate(60 as number));

			const point = ts.indexToTimeScalePoint(65 as TimePointIndex);
			expect(point).not.to.be.equal(null);
			expect(point?.originalTime).to.be.equal(65);
			const time = ts.indexToTime(65 as TimePointIndex) as unknown as { timestamp: number };
			expect(time.timestamp).to.be.equal(65);
		});

		it('should resolve coordinate in future whitespace to a virtual index', () => {
			const lastIndex = 100 as TimePointIndex;
			const ts = new TimeScale<Time>(
				chartModelMock(),
				{ ...timeScaleOptionsDefaults, barSpacing: 8, rightOffset: 10 },
				fakeLocalizationOptions,
				behavior
			);
			ts.setWidth(800);
			ts.update(...tsUpdate(lastIndex));
			ts.setBaseIndex(lastIndex);

			const futureCoord = ts.indexToCoordinate(105 as TimePointIndex);
			const resolvedIndex = ts.coordinateToIndex(futureCoord);
			expect(resolvedIndex).to.be.equal(105);
			const time = ts.indexToTime(resolvedIndex) as unknown as { timestamp: number };
			expect(time.timestamp).to.be.equal(105);
		});

		it('should include virtual future indices in time axis marks', () => {
			const lastIndex = 100 as TimePointIndex;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			behavior.setOptions({
				timeScale: { ...timeScaleOptionsDefaults, timeVisible: true, secondsVisible: false },
				localization: { locale: 'en-US', dateFormat: 'yyyy-MM-dd' },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any);
			const ts = new TimeScale<Time>(
				chartModelMock(),
				{ ...timeScaleOptionsDefaults, barSpacing: 6, rightOffset: 20, timeVisible: true },
				fakeLocalizationOptions,
				behavior
			);
			ts.setWidth(600);
			ts.update(...tsUpdate(lastIndex));
			ts.setBaseIndex(lastIndex);

			const marks = ts.marks();
			expect(marks).not.to.be.equal(null);
			expect((marks ?? []).length).to.be.greaterThan(0);
			const lastBarCoord = ts.indexToCoordinate(lastIndex);
			const hasFutureMark = (marks ?? []).some((m: { coord: number }) => m.coord > lastBarCoord);
			expect(hasFutureMark).to.be.equal(true);
		});
	});

	describe('scroll logical range notifications', () => {
		it('should defer logicalRangeChanged until endScroll', () => {
			const ts = new TimeScale<Time>(chartModelMock(), { ...timeScaleOptionsDefaults, barSpacing: 6, rightOffset: 0 }, fakeLocalizationOptions, behavior);
			ts.setWidth(600);
			ts.update(...tsUpdate(100 as number));
			ts.setBaseIndex(100 as TimePointIndex);

			let fires = 0;
			ts.logicalRangeChanged().subscribe(() => {
				fires += 1;
			});

			ts.startScroll(300 as Coordinate);
			ts.scrollTo(200 as Coordinate);
			ts.visibleLogicalRange();
			expect(fires).to.be.equal(0);

			ts.endScroll();
			expect(fires).to.be.equal(1);
		});
	});
});
