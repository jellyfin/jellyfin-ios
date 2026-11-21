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
import RefreshWebView from '../RefreshWebView';

jest.mock('../../hooks/useStores');
useStores.mockImplementation(() => ({
	rootStore: {
	},
	settingStore: {
		activeServer: 0
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

	it('disables scrolling and refresh only while fullscreen', () => {
		const stores = useStores();
		useStores.mockReturnValue(stores);
		const { container, rerender } = render(<NativeShellWebView />);
		expect(container.findByType(RefreshWebView).props.onRefresh).toEqual(expect.any(Function));
		stores.rootStore.isFullscreen = true;
		rerender(<NativeShellWebView />);
		expect(container.findByType(RefreshWebView).props).toMatchObject({
			scrollEnabled: false, bounces: false, onRefresh: undefined
		});
		stores.rootStore.isFullscreen = false;
		rerender(<NativeShellWebView />);
		expect(container.findByType(RefreshWebView).props).toMatchObject({
			scrollEnabled: true, bounces: true, onRefresh: expect.any(Function)
		});
	});
});
