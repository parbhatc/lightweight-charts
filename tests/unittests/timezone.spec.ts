/* eslint-disable @typescript-eslint/no-floating-promises */
import { expect } from 'chai';
import { describe, it } from 'node:test';

import { FastTimezoneProvider } from '../../src/model/timezone';

describe('FastTimezoneProvider', () => {
	it('should return offset via binary search on sorted transitions', () => {
		const provider = new FastTimezoneProvider('Test/Zone', [
			{ utcTimestamp: 0, offset: 0 },
			{ utcTimestamp: 100, offset: 3600 },
			{ utcTimestamp: 200, offset: 0 },
		]);

		expect(provider.zoneName()).to.equal('Test/Zone');
		expect(provider.getOffset(0)).to.equal(0);
		expect(provider.getOffset(50)).to.equal(0);
		expect(provider.getOffset(100)).to.equal(3600);
		expect(provider.getOffset(150)).to.equal(3600);
		expect(provider.getOffset(200)).to.equal(0);
		expect(provider.getOffset(500)).to.equal(0);
	});

	it('should return 0 when no transitions are provided', () => {
		const provider = new FastTimezoneProvider('Empty', []);
		expect(provider.getOffset(1_700_000_000)).to.equal(0);
	});
});
