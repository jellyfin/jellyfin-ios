/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import { useStores } from '../../hooks/useStores';
import { getAppName, getDeviceProfile, getSafeDeviceName } from '../../utils/Device';
import NativeShellWebView from '../NativeShellWebView';

jest.mock('../../hooks/useStores');

jest.mock('../../adapters/ChromecastAdapter', () => ({
	__esModule: true,
	default: {
		init: jest.fn(),
		handleExecCast: jest.fn()
	}
}));

const mockedUseStores = useStores;

mockedUseStores.mockImplementation(() => ({
	rootStore: {
	},
	settingStore: {
		activeServer: 0,
		isNativeVideoPlayerEnabled: true,
		isExperimentalNativeAudioPlayerEnabled: false,
		isFmp4Enabled: true
	},
	serverStore: {
		servers: [{
			info: {
				Version: '10.8.0'
			}
		}]
	}
}
));

jest.mock('../../utils/Device');
getAppName.mockReturnValue('Jellyfin iOS');
getDeviceProfile.mockImplementation(() => ({}));
getSafeDeviceName.mockImplementation(() => 'Test Device');

describe('NativeShellWebView', () => {
	it('should render correctly', () => {
		const { toJSON } = render(
			<NativeShellWebView />
		);

		expect(toJSON()).toMatchSnapshot();
	});
});
