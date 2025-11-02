/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// import '@testing-library/jest-dom'

/* Polyfill setImmediate for Jest 29 */
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

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

/* React Navigation Mocks */
import 'react-native-gesture-handler/jestSetup';

// Mock gesture handler components to prevent ref bloat in snapshots
jest.mock('react-native-gesture-handler', () => {
	const RN = jest.requireActual('react-native');
	const GH = jest.requireActual('react-native-gesture-handler');
	return {
		...GH,
		ScrollView: RN.ScrollView,
		NativeViewGestureHandler: ({ children }) => children,
		PanGestureHandler: ({ children }) => children,
		TapGestureHandler: ({ children }) => children,
		LongPressGestureHandler: ({ children }) => children,
		FlingGestureHandler: ({ children }) => children,
	};
});

jest.mock('react-native-reanimated', () => {
	const React = require('react');
	const { View, Text, Image, ScrollView, Animated } = require('react-native');

	// Mock createAnimatedComponent to return a component that doesn't use hooks problematically
	const createAnimatedComponent = (Component) => {
		// Return a wrapper that forwards refs properly without using problematic hooks
		return React.forwardRef((props, ref) => {
			// Filter out animated props and just pass regular props
			const { animatedProps, ...restProps } = props;
			return React.createElement(Component, { ...restProps, ref });
		});
	};

	const Reanimated = {
		default: {
			call: () => { /* no-op */ },
			createAnimatedComponent
		},
		useSharedValue: jest.fn((value) => ({ value })),
		useAnimatedStyle: jest.fn((fn) => fn()),
		useAnimatedProps: jest.fn((fn) => fn()),
		useAnimatedScrollHandler: jest.fn(() => ({})),
		useAnimatedGestureHandler: jest.fn(() => ({})),
		useAnimatedRef: jest.fn(() => React.createRef()),
		useDerivedValue: jest.fn((fn) => ({ value: fn() })),
		withTiming: jest.fn((value) => value),
		withSpring: jest.fn((value) => value),
		withDecay: jest.fn((value) => value),
		withDelay: jest.fn((_, value) => value),
		withSequence: jest.fn((...values) => values[values.length - 1]),
		withRepeat: jest.fn((value) => value),
		cancelAnimation: jest.fn(),
		runOnJS: jest.fn((fn) => fn),
		runOnUI: jest.fn((fn) => fn),
		interpolate: jest.fn(),
		Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
		Easing: {
			linear: jest.fn(),
			ease: jest.fn(),
			quad: jest.fn(),
			cubic: jest.fn(),
			bezier: jest.fn(() => ({ factory: jest.fn() }))
		},
		createAnimatedPropAdapter: jest.fn(),
		useAnimatedReaction: jest.fn(),
		useScrollViewOffset: jest.fn(() => ({ value: 0 })),
		createAnimatedComponent,
	};

	// Create animated versions of components using the mock
	Reanimated.View = createAnimatedComponent(View);
	Reanimated.Text = createAnimatedComponent(Text);
	Reanimated.Image = createAnimatedComponent(Image);
	Reanimated.ScrollView = createAnimatedComponent(ScrollView);

	return Reanimated;
});

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

/* Expo Font Mocks */
jest.mock('expo-font', () => ({
	isLoaded: jest.fn(() => true),
	isLoading: jest.fn(() => false),
	loadAsync: jest.fn(() => Promise.resolve())
}));

/* React Native WebView Mocks */
jest.mock('react-native-webview', () => {
	const { View } = require('react-native');
	return {
		WebView: View
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
