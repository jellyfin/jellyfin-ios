/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// polyfill whatwg URL globals
import 'react-native-url-polyfill/auto';

import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeContext, ThemeProvider } from 'react-native-elements';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ThemeSwitcher from './components/ThemeSwitcher';
import { useDownloadHandler } from './features/downloads/hooks/useDownloadHandler';
import { useIsHydrated } from './hooks/useHydrated';
import { useMobxMigration } from './hooks/useMobxMigration';
import { useStores } from './hooks/useStores';
import RootNavigator from './navigation/RootNavigator';
import StaticScriptLoader from './utils/StaticScriptLoader';

// Import i18n configuration
import './i18n';

// Prevent splash screen from auto-hiding before resources are loaded
SplashScreen.preventAutoHideAsync();

const App = ({ skipLoadingScreen }) => {
	const [ isSplashReady, setIsSplashReady ] = useState(false);
	const { rootStore, settingStore } = useStores();
	const { theme } = useContext(ThemeContext);
	const isHydrated = useIsHydrated();
	const colorScheme = useColorScheme();
	const { isMigrated, migrateStores } = useMobxMigration();

	// Initialize download hook
	useDownloadHandler(isMigrated);

	// Store the system color scheme for automatic theme switching
	useEffect(() => {
		// Don't set state while hydrating
		if (!isMigrated) return;

		console.debug('system theme changed:', colorScheme);
		settingStore.set({
			systemThemeId: colorScheme
		});
	}, [ colorScheme, isMigrated ]);

	const loadImages = () => {
		const images = [
			require('@jellyfin/ux-ios/splash.png'),
			require('@jellyfin/ux-ios/logo-dark.png')
		];
		return images.map(image => Asset.fromModule(image).downloadAsync());
	};

	const loadResources = async () => {
		try {
			await Promise.all([
				Font.loadAsync({
					// This is the font that we are using for our tab bar
					...Ionicons.font
				}),
				...loadImages(),
				StaticScriptLoader.load()
			]);
		} catch (err) {
			console.warn('[App] Failed loading resources', err);
		}

		setIsSplashReady(true);
	};

	useEffect(() => {
		if (isHydrated) {
			// Migrate mobx data stores
			migrateStores();

			// Load app resources
			loadResources();
		}
	}, [ isHydrated ]);

	useEffect(() => {
		console.info('rotation lock setting changed!', settingStore.isRotationLockEnabled);
		if (settingStore.isRotationLockEnabled) {
			ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
		} else {
			ScreenOrientation.unlockAsync();
		}
	}, [ settingStore.isRotationLockEnabled ]);

	const updateScreenOrientation = async () => {
		if (settingStore.isRotationLockEnabled) {
			if (rootStore.isFullscreen) {
				// Lock to landscape orientation
				// For some reason video apps on iPhone use LANDSCAPE_RIGHT ¯\_(ツ)_/¯
				await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
				// Allow either landscape orientation after forcing initial rotation
				ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
			} else {
				// Restore portrait orientation lock
				ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
			}
		}
	};

	useEffect(() => {
		// Update the screen orientation
		updateScreenOrientation();
	}, [ rootStore.isFullscreen ]);

	if (!(isSplashReady && isMigrated) && !skipLoadingScreen) {
		return null;
	}

	return (
		<SafeAreaProvider>
			<ThemeProvider theme={settingStore.getTheme().Elements}>
				<ThemeSwitcher />
				<StatusBar
					style='light'
					backgroundColor={theme.colors.grey0}
					hidden={rootStore.isFullscreen}
				/>
				<NavigationContainer theme={settingStore.getTheme().Navigation}>
					<RootNavigator />
				</NavigationContainer>
			</ThemeProvider>
		</SafeAreaProvider>
	);
};

App.propTypes = {
	skipLoadingScreen: PropTypes.bool
};

export default App;
