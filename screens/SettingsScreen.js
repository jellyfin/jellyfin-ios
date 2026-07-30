/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { compareVersions } from '@jellyfin/sdk/lib/utils/versioning';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, SectionList, StyleSheet, View } from 'react-native';
import { Text, ThemeContext } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppInfoFooter from '../components/AppInfoFooter';
import BrowserListItem from '../components/BrowserListItem';
import ButtonListItem from '../components/ButtonListItem';
import ServerListItem from '../components/ServerListItem';
import SwitchListItem from '../components/SwitchListItem';
import Links from '../constants/Links';
import { Screens } from '../constants/Screens';
import { useStores } from '../hooks/useStores';
import { isSystemThemeSupported } from '../utils/Device';

const SettingsScreen = () => {
	const { rootStore, serverStore, settingStore, mediaStore, downloadStore } = useStores();
	const navigation = useNavigation();
	const { t } = useTranslation();
	const { theme } = useContext(ThemeContext);
	const [ isServerInfoPending, setIsServerInfoPending ] = useState(true);

	useEffect(() => {
		const fetchServerInfo = async () => {
			// Fetch server info
			await serverStore.fetchInfo();
			setIsServerInfoPending(false);
		};

		fetchServerInfo();
	}, []);

	const onAddServer = () => {
		navigation.navigate(Screens.AddServerScreen);
	};

	const onDeleteServer = index => {
		Alert.alert(
			t('alerts.deleteServer.title'),
			t('alerts.deleteServer.description', { serverName: serverStore.servers[index]?.name }),
			[
				{ text: t('common.cancel') },
				{
					text: t('alerts.deleteServer.confirm'),
					onPress: () => {
						// Remove the server
						serverStore.removeServer(index);
					},
					style: 'destructive'
				}
			]
		);
	};

	const onSelectServer = (index) => {
		settingStore.set({ activeServer: index });
		navigation.replace(Screens.HomeScreen);
		navigation.navigate(Screens.HomeTab);
	};

	const onResetApplication = () => {
		Alert.alert(
			t('alerts.resetApplication.title'),
			t('alerts.resetApplication.description'),
			[
				{ text: t('common.cancel') },
				{
					text: t('alerts.resetApplication.confirm'),
					onPress: () => {
						// Reset data in stores
						mediaStore.reset();
						downloadStore.reset();
						serverStore.reset();
						settingStore.reset();
						rootStore.reset();

						AsyncStorage.clear();

						// Navigate to the loading screen
						navigation.replace(Screens.AddServerScreen);
					},
					style: 'destructive'
				}
			]
		);
	};

	const AugmentedServerListItem = (props) => (
		<ServerListItem
			{...props}
			activeServer={settingStore.activeServer}
			onDelete={onDeleteServer}
			onPress={onSelectServer}
		/>
	);

	const getSections = () => {
		const settingsData = [{
			key: 'keep-awake-switch',
			title: t('settings.keepAwake'),
			value: settingStore.isScreenLockEnabled,
			onValueChange: (value) => settingStore.set({ isScreenLockEnabled: value })
		}];

		// Orientation lock is not supported on iPad without disabling multitasking
		// https://docs.expo.io/versions/latest/sdk/screen-orientation/#warning
		if (Platform.OS !== 'ios' || !Platform.isPad) {
			settingsData.push({
				key: 'rotation-lock-switch',
				title: t('settings.rotationLock'),
				value: settingStore.isRotationLockEnabled,
				onValueChange: (value) => settingStore.set({ isRotationLockEnabled: value })
			});
		}

		const playbackSettingsData = [];

		// TODO: Add Android support for native video player
		if (Platform.OS === 'ios') {
			playbackSettingsData.push({
				key: 'native-video-switch',
				title: t('settings.nativeVideoPlayer'),
				badge: {
					value: t('common.beta')
				},
				value: settingStore.isNativeVideoPlayerEnabled,
				onValueChange: (value) => {
					settingStore.set({ isNativeVideoPlayerEnabled: value });
					rootStore.set({ isReloadRequired: true });
				}
			});

			if (compareVersions(String(Platform.Version), '12') > 0) {
				playbackSettingsData.push({
					key: 'native-video-fmp4-switch',
					title: t('settings.fmp4Support'),
					value: settingStore.isFmp4Enabled,
					disabled: !settingStore.isNativeVideoPlayerEnabled,
					onValueChange: (value) => {
						settingStore.set({ isFmp4Enabled: value });
						rootStore.set({ isReloadRequired: true });
					}
				});
			}
		}

		const appearanceSettingsData = [{
			key: 'tab-labels-switch',
			title: t('settings.tabLabels'),
			value: settingStore.isTabLabelsEnabled,
			onValueChange: (value) => settingStore.set({ isTabLabelsEnabled: value })
		}];

		if (isSystemThemeSupported()) {
			appearanceSettingsData.push({
				key: 'system-theme-switch',
				title: t('settings.systemTheme'),
				value: settingStore.isSystemThemeEnabled,
				onValueChange: (value) => settingStore.set({ isSystemThemeEnabled: value })
			});
		}

		// TODO: This should be able to select from a list not just a switch
		appearanceSettingsData.push({
			key: 'theme-switch',
			title: t('settings.lightTheme'),
			disabled: settingStore.isSystemThemeEnabled,
			value: settingStore.themeId === 'light',
			onValueChange: (value) => settingStore.set({ themeId: value ? 'light' : 'dark' })
		});

		return [
			{
				title: t('headings.servers'),
				data: serverStore.servers.slice(),
				keyExtractor: (item, index) => `server-${index}`,
				renderItem: AugmentedServerListItem
			},
			{
				title: t('headings.addServer'),
				hideHeader: true,
				data: [{
					key: 'add-server-button',
					title: t('headings.addServer'),
					onPress: onAddServer
				}],
				renderItem: ButtonListItem
			},
			{
				title: t('headings.settings'),
				data: settingsData,
				renderItem: SwitchListItem
			},
			{
				title: t('headings.playback'),
				data: playbackSettingsData,
				renderItem: SwitchListItem
			},
			{
				title: t('headings.downloads'),
				data: [{
					key: 'experimental-downloads-switch',
					title: t('settings.downloadTranscoding'),
					badge: {
						value: t('common.alpha'),
						status: 'warning'
					},
					value: settingStore.isExperimentalDownloadsEnabled,
					onValueChange: (value) => {
						settingStore.set({ isExperimentalDownloadsEnabled: value });
						rootStore.set({ isReloadRequired: true });
					}
				}],
				renderItem: SwitchListItem
			},
			{
				title: t('headings.appearance'),
				data: appearanceSettingsData,
				renderItem: SwitchListItem
			},
			{
				title: t('headings.links'),
				data: Links.map(link => ({
					...link,
					name: t(link.name)
				})),
				renderItem: BrowserListItem
			},
			{
				title: t('alerts.resetApplication.title'),
				hideHeader: true,
				data: [{
					key: 'reset-app-button',
					title: t('alerts.resetApplication.title'),
					titleStyle: {
						color: theme.colors.error
					},
					onPress: onResetApplication
				}],
				renderItem: ButtonListItem
			}
		];
	};

	return (
		<SafeAreaView
			style={{
				...styles.container,
				backgroundColor: theme.colors.background
			}}
			edges={[ 'right', 'left' ]}
		>
			<SectionList
				sections={getSections()}
				extraData={{
					activeServer: settingStore.activeServer,
					isFetching: isServerInfoPending
				}}
				renderItem={({ item }) => <Text>{JSON.stringify(item)}</Text>}
				renderSectionHeader={({ section: { data, title, hideHeader } }) => {
					if (!data || data.length === 0) {
						return null;
					}
					if (hideHeader) {
						return <View style={styles.emptyHeader} />;
					}
					return (
						<Text style={{
							...styles.header,
							backgroundColor: theme.colors.background,
							color: theme.colors.grey1
						}}>{title}</Text>
					);
				}}
				renderSectionFooter={({ section: { data } }) => {
					if (!data || data.length === 0) {
						return null;
					}
					return <View style={styles.footer} />;
				}}
				ListFooterComponent={AppInfoFooter}
				showsVerticalScrollIndicator={false}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	header: {
		fontWeight: '600',
		paddingVertical: 8,
		paddingHorizontal: 15,
		marginBottom: 1
	},
	emptyHeader: {
		marginTop: 15
	},
	footer: {
		marginBottom: 15
	}
});

SettingsScreen.displayName = Screens.SettingsScreen;

export default SettingsScreen;
