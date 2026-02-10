/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// import '@testing-library/jest-dom'

/* AsyncStorage Mock */
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

/* Fetch and AbortController Mocks */
import { enableFetchMocks } from 'jest-fetch-mock';
import { AbortController } from 'node-abort-controller';

// DOMException is not polyfilled in released version of jest-fetch-mock
// refs: https://github.com/jefflau/jest-fetch-mock/pull/160
if (typeof DOMException === 'undefined') {
	global.DOMException = require('domexception');
}

global.AbortController = AbortController;

enableFetchMocks();

/* WebView Mock */
jest.mock('react-native-webview', () => {
	const React = require('react');
	return {
		__esModule: true,
		WebView: React.forwardRef((props, ref) =>
			React.createElement('WebView', { ...props, ref })
		),
		default: React.forwardRef((props, ref) =>
			React.createElement('WebView', { ...props, ref })
		)
	};
});

/* expo-video Mock */
jest.mock('expo-video', () => {
	const React = require('react');
	return {
		__esModule: true,
		VideoView: React.forwardRef((props, ref) =>
			React.createElement('VideoView', { ...props, ref })
		),
		useVideoPlayer: () => ({
			replace: jest.fn(),
			replaceAsync: jest.fn(() => Promise.resolve()),
			play: jest.fn(),
			pause: jest.fn(),
			addListener: jest.fn(() => ({ remove: jest.fn() })),
			playing: false,
			currentTime: 0
		})
	};
});

/* expo-audio Mock */
jest.mock('expo-audio', () => ({
	__esModule: true,
	useAudioPlayer: () => ({
		replace: jest.fn(),
		seekTo: jest.fn(() => Promise.resolve()),
		play: jest.fn(),
		pause: jest.fn(),
		remove: jest.fn(),
		addListener: jest.fn(() => ({ remove: jest.fn() })),
		playing: false,
		isLoaded: false,
		currentTime: 0
	}),
	setAudioModeAsync: jest.fn(() => Promise.resolve())
}));

/* expo-file-system/legacy Mock */
jest.mock('expo-file-system/legacy', () => ({
	documentDirectory: 'file:///mock/',
	cacheDirectory: 'file:///mock-cache/',
	getInfoAsync: jest.fn(() => Promise.resolve({ exists: false, isDirectory: false })),
	readAsStringAsync: jest.fn(() => Promise.resolve('')),
	writeAsStringAsync: jest.fn(() => Promise.resolve()),
	deleteAsync: jest.fn(() => Promise.resolve()),
	makeDirectoryAsync: jest.fn(() => Promise.resolve()),
	readDirectoryAsync: jest.fn(() => Promise.resolve([])),
	downloadAsync: jest.fn(() => Promise.resolve({ uri: '' })),
	createDownloadResumable: jest.fn()
}));

/* React Navigation Mocks */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
	const Reanimated = require('react-native-reanimated/mock');

	// The mock for `call` immediately calls the callback which is incorrect
	// So we override it with a no-op
	Reanimated.default.call = () => { /* no-op */ };

	return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
jest.mock('react-native/src/private/animated/NativeAnimatedHelper');

// Workaround for process failing: https://github.com/react-navigation/react-navigation/issues/9568
jest.mock('@react-navigation/native/lib/commonjs/useLinking.native', () => ({
	default: () => ({ getInitialState: { then: jest.fn() } }),
	__esModule: true
}));

/* Safe Area Context Mocks */
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

/* UUID Mocks */
jest.mock('uuid', () => {
	let value = 0;
	return {
		v4: () => `uuid-${value++}`
	};
});

/* React Native Menu Mocks */
jest.mock('@react-native-menu/menu', () => ({
	MenuView: jest.fn((props) => {
		const React = require('react');

		class MockMenuView extends React.Component {
			render() {
				return React.createElement(
					'View',
					{ testID: props.testID },
					// Dynamically mock each action
					props.actions.map(action =>
						React.createElement('Button', {
							key: action.id,
							title: action.title,
							onPress: () => {
								if (action.id && props?.onPressAction) {
									props.onPressAction({ nativeEvent: { event: action.id } });
								}
							},
							testID: action.id
						})
					),
					// eslint-disable-next-line react/prop-types
					this.props.children
				);
			}
		}

		return React.createElement(MockMenuView, props);
	})
}));
