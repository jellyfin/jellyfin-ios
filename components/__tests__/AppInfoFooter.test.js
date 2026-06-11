/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import React from 'react';

import '../../i18n';
import Screens from '../../constants/Screens';
import { openBrowser } from '../../utils/WebBrowser';
import AppInfoFooter from '../AppInfoFooter';

jest.mock('expo-application');
jest.mock('expo-device');
jest.mock('../../utils/WebBrowser');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
	const actualNav = jest.requireActual('@react-navigation/native');
	return {
		...actualNav,
		useNavigation: () => ({
			navigate: mockNavigate
		})
	};
});

describe('AppInfoFooter', () => {
	it('should render correctly', () => {
		Application.nativeApplicationVersion = '1.0.0'; // eslint-disable-line no-import-assign
		Application.nativeBuildVersion = '1.0.0.0'; // eslint-disable-line no-import-assign
		Device.osName = 'Test OS'; // eslint-disable-line no-import-assign

		const { getByTestId } = render(
			<NavigationContainer>
				<AppInfoFooter />
			</NavigationContainer>
		);

		expect(getByTestId('app-name')).toHaveTextContent('Jellyfin for Test OS');

		const appVersion = getByTestId('app-version');
		expect(appVersion).toHaveTextContent('1.0.0 (1.0.0.0)');
		fireEvent.press(appVersion);
		expect(openBrowser).toHaveBeenCalledWith('https://github.com/jellyfin/jellyfin-ios/releases/v1.0.0.0');
		fireEvent(appVersion, 'onLongPress');
		expect(mockNavigate).toHaveBeenCalledWith(Screens.DevSettingsScreen);
	});
});
