/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// import '@testing-library/jest-dom'

/* Encoding polyfills (the jsdom test environment does not provide these) */
import { TextDecoder, TextEncoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
	global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
	global.TextDecoder = TextDecoder;
}

/* AsyncStorage Mock */
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

/* Fetch and AbortController Mocks */
import { enableFetchMocks } from 'jest-fetch-mock';
import { AbortController } from 'node-abort-controller';

global.AbortController = AbortController;

enableFetchMocks();

/* React Navigation Mocks */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
	const Reanimated = require('react-native-reanimated/mock');

	// The mock for `call` immediately calls the callback which is incorrect
	// So we override it with a no-op
	Reanimated.default.call = () => { /* no-op */ };

	return Reanimated;
});

/* Safe Area Context Mocks */
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

/* Animated passthrough: react-test-renderer 19 + RN 0.81's useAnimatedProps hook
   throws a null-dispatcher error, so render animated components without the wrapper. */
jest.mock('react-native/Libraries/Animated/createAnimatedComponent', () => ({
	__esModule: true,
	default: (Component) => Component
}));

/* WebView Mock */
jest.mock('react-native-webview', () => {
	const React = require('react');
	const { View } = require('react-native');
	const WebView = (props) => React.createElement(View, props);
	return { WebView, default: WebView };
});

/* react-native-gesture-handler ScrollView Mock — its ScrollView captures the
   refreshControl element as a prop, which the snapshot serializer recurses into
   and fails on (RangeError: Invalid string length, because React 19 elements are
   not recognized by the bundled pretty-format). Render a plain View and place the
   refreshControl as a rendered child so it still appears in the snapshot. */
jest.mock('react-native-gesture-handler', () => {
	const actual = jest.requireActual('react-native-gesture-handler');
	const React = require('react');
	const { View } = require('react-native');
	// eslint-disable-next-line react/prop-types
	const ScrollView = ({ refreshControl, children, ...props }) => React.createElement(View, props, refreshControl, children);
	return { ...actual, ScrollView };
});

/* expo-audio Mock */
jest.mock('expo-audio', () => ({
	setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
	createAudioPlayer: jest.fn(() => ({
		addListener: jest.fn(() => ({ remove: jest.fn() })),
		play: jest.fn(),
		pause: jest.fn(),
		replace: jest.fn(),
		seekTo: jest.fn().mockResolvedValue(undefined),
		remove: jest.fn()
	}))
}));

/* expo-video Mock */
jest.mock('expo-video', () => {
	const React = require('react');
	const { View } = require('react-native');
	const VideoView = (props) => React.createElement(View, props);
	return {
		useVideoPlayer: jest.fn((source, setup) => {
			const player = {
				addListener: jest.fn(() => ({ remove: jest.fn() })),
				replace: jest.fn(),
				play: jest.fn(),
				pause: jest.fn(),
				currentTime: 0,
				timeUpdateEventInterval: 0,
				showNowPlayingNotification: false
			};
			if (setup) setup(player);
			return player;
		}),
		VideoView
	};
});

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
