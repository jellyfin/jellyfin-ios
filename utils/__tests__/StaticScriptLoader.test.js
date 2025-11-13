/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Asset } from 'expo-asset';
import { readAsStringAsync } from 'expo-file-system';

import StaticScriptLoader from '../StaticScriptLoader';

jest.mock('expo-asset');
jest.mock('expo-file-system');

describe('StaticScriptLoader', () => {
	beforeEach(() => {
		global.postExpoEvent = jest.fn();
		global.window = global.window || global;
		global.window.chrome = global.window.chrome || {};
	});

	afterEach(() => {
		delete global.postExpoEvent;
	});

	it('should initialize to empty values', () => {
		expect(StaticScriptLoader.scripts.ExpoRouterShim).toBe('');
		expect(StaticScriptLoader.scripts.NativeShell).toBe('');
	});

	it('should load scripts successfully', async () => {
		Asset.loadAsync.mockResolvedValue([{ localUri: 'uri' }]);
		readAsStringAsync.mockResolvedValue('test');

		const scripts = await StaticScriptLoader.load();
		expect(scripts.ExpoRouterShim).toBe('test');
		expect(scripts.NativeShell).toBe('test');

		expect(StaticScriptLoader.scripts.ExpoRouterShim).toBe('test');
		expect(StaticScriptLoader.scripts.NativeShell).toBe('test');
	});
});
