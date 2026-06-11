/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, type ViewStyle } from 'react-native';
import { ThemeContext } from 'react-native-elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screens } from '../constants/Screens';
import { useStores } from '../hooks/useStores';
import DownloadScreen from '../screens/DownloadScreen';

import HomeNavigator from './HomeNavigator';
import SettingsNavigator from './SettingsNavigator';

export type TabNavigatorParams = {
	[Screens.HomeTab]: undefined;
	[Screens.DownloadsTab]: undefined;
	[Screens.SettingsTab]: undefined;
};

function TabIcon(routeName: string, focused: boolean, color: string, size: number) {
	let iconName = 'help-circle';
	if (routeName === Screens.HomeTab) {
		iconName = 'tv';
	} else if (routeName === Screens.DownloadsTab) {
		iconName = 'download';
	} else if (routeName === Screens.SettingsTab) {
		iconName = 'cog';
	}

	if (!focused) {
		iconName += '-outline';
	}

	return (
		<Ionicons
			name={iconName as keyof typeof Ionicons.glyphMap}
			color={color}
			size={size}
		/>
	);
}

const Tab = createBottomTabNavigator<TabNavigatorParams>();

const TabNavigator = () => {
	const { rootStore, downloadStore, settingStore } = useStores();
	const insets = useSafeAreaInsets();
	const { t } = useTranslation();
	const { theme } = useContext(ThemeContext);

	const tabBarStyle: ViewStyle = {};
	// Hide the bottom tab bar when in fullscreen view
	if (rootStore.isFullscreen) {
		tabBarStyle.display = 'none';
	}
	// Use a smaller height for the tab bar when labels are disabled
	if (!settingStore.isTabLabelsEnabled && !(Platform.OS === 'ios' && Platform.isPad)) {
		tabBarStyle.height = insets.bottom + 28;
	}

	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarIcon: ({ focused, color, size }) => TabIcon(route.name, focused, color, size),
				tabBarInactiveTintColor: theme.colors?.grey1,
				tabBarShowLabel: settingStore.isTabLabelsEnabled,
				tabBarStyle
			})}
		>
			<Tab.Screen
				name={Screens.HomeTab}
				component={HomeNavigator}
				options={{
					title: t('headings.home'),
					tabBarAccessibilityLabel: t('headings.home')
				}}
			/>
			<Tab.Screen
				name={Screens.DownloadsTab}
				component={DownloadScreen}
				options={{
					title: t('headings.downloads'),
					headerShown: true,
					tabBarAccessibilityLabel: t('headings.downloads'),
					tabBarBadge: downloadStore.getNewDownloadCount() > 0 ? downloadStore.getNewDownloadCount() : undefined
				}}
			/>
			<Tab.Screen
				name={Screens.SettingsTab}
				component={SettingsNavigator}
				options={{
					title: t('headings.settings'),
					tabBarAccessibilityLabel: t('headings.settings')
				}}
			/>
		</Tab.Navigator>
	);
};

TabNavigator.displayName = 'TabNavigator';

export default TabNavigator;
