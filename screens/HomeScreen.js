/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { ThemeContext } from 'react-native-elements';
import { CastButton } from 'react-native-google-cast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioPlayer from '../components/AudioPlayer';
import ErrorView from '../components/ErrorView';
import NativeShellWebView from '../components/NativeShellWebView';
import VideoPlayer from '../components/VideoPlayer';
import Colors from '../constants/Colors';
import { Screens } from '../constants/Screens';
import { useStores } from '../hooks/useStores';
import { getIconName } from '../utils/Icons';

const HomeScreen = () => {
	const { rootStore, serverStore, mediaStore, settingStore } = useStores();
	const navigation = useNavigation();
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();
	const { theme } = useContext(ThemeContext);

	const [ isLoading, setIsLoading ] = useState(true);
	const [ httpErrorStatus, setHttpErrorStatus ] = useState(null);

	const webview = useRef(null);

	useEffect(() => {
		// Pressing the Home tab when it is already active navigates to home screen in webview
		navigation.getParent()?.addListener('tabPress', e => {
			if (navigation.isFocused()) {
				// Prevent default behavior
				e.preventDefault();
				// Call the web router to navigate home
				webview.current?.injectJavaScript('window.ExpoRouterShim && window.ExpoRouterShim.home();');
			}
		});
	}, []);

	useFocusEffect(
		useCallback(() => {
			const onBackPress = () => {
				webview.current?.injectJavaScript('window.ExpoRouterShim && window.ExpoRouterShim.back();');
				return true;
			};

			BackHandler.addEventListener('hardwareBackPress', onBackPress);

			return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
		}, [ webview ])
	);

	// Report media updates to the audio/video plugin
	useEffect(() => {
		if (!mediaStore.isLocalFile) {
			const status = {
				didPlayerCloseManually: rootStore.didPlayerCloseManually,
				uri: mediaStore.uri,
				isFinished: mediaStore.isFinished,
				isPlaying: mediaStore.isPlaying,
				positionTicks: mediaStore.positionTicks,
				positionMillis: mediaStore.getPositionMillis()
			};

			if (mediaStore.type === MediaType.Audio) {
				webview.current?.injectJavaScript(`window.ExpoAudioPlayer && window.ExpoAudioPlayer._reportStatus(${JSON.stringify(status)});`);
			} else if (mediaStore.type === MediaType.Video) {
				webview.current?.injectJavaScript(`window.ExpoVideoPlayer && window.ExpoVideoPlayer._reportStatus(${JSON.stringify(status)});`);
			}
		}
	}, [
		mediaStore.type,
		mediaStore.uri,
		mediaStore.isFinished,
		mediaStore.isLocalFile,
		mediaStore.isPlaying,
		mediaStore.positionTicks
	]);

	// Clear the error state when the active server changes
	useEffect(() => {
		setIsLoading(true);
	}, [ settingStore.activeServer ]);

	useEffect(() => {
		if (rootStore.isReloadRequired) {
			webview.current?.reload();
			rootStore.set({ isReloadRequired: false });
		}
	}, [ rootStore.isReloadRequired ]);

	useEffect(() => {
		if (httpErrorStatus) {
			const errorCode = httpErrorStatus.description || httpErrorStatus.statusCode;
			navigation.replace(Screens.ErrorScreen, {
				icon: {
					name: 'cloud-off',
					type: 'material'
				},
				heading: t([ `home.errors.${errorCode}.heading`, 'home.errors.http.heading' ]),
				message: t([ `home.errors.${errorCode}.description`, 'home.errors.http.description' ]),
				details: [
					t('home.errorCode', { errorCode }),
					t('home.errorUrl', { url: httpErrorStatus.url })
				],
				buttonIcon: {
					name: getIconName('refresh'),
					type: 'ionicon'
				},
				buttonTitle: t('home.retry')
			});
		}
	}, [ httpErrorStatus ]);

	// NOTE: We use a standard View and insets to workaround https://github.com/AppAndFlow/react-native-safe-area-context/issues/204
	const safeAreaPadding = {};
	if (!rootStore.isFullscreen) {
		safeAreaPadding.paddingLeft = insets.left;
		safeAreaPadding.paddingRight = insets.right;

		// When not in fullscreen, the top adjustment is handled by the spacer View for iOS
		if (Platform.OS !== 'ios') {
			safeAreaPadding.paddingTop = insets.top;
		}
	}

	const castButtonTopOffset = (() => {
		if (rootStore.isFullscreen) {
			return 0;
		}
		if (Platform.OS === 'ios') {
			return insets.top;
		}
		return safeAreaPadding.paddingTop ?? insets.top;
	})();

	// Hide webview until loaded
	const webviewStyle = (isLoading || httpErrorStatus) ? StyleSheet.compose(styles.container, styles.loading) : styles.container;

	if (!serverStore.servers || serverStore.servers.length === 0) {
		return null;
	}
	const server = serverStore.servers[settingStore.activeServer];

	return (
		<View
			style={{
				...styles.container,
				...safeAreaPadding,
				backgroundColor: rootStore.isFullscreen ? Colors.blue : theme.colors.background
			}}
		>
			{Platform.OS === 'ios' && !rootStore.isFullscreen && (
				<View style={{
					backgroundColor: theme.colors.grey0,
					height: insets.top
				}} />
			)}
			{!rootStore.isFullscreen && (
				<View
					pointerEvents='box-none'
					style={[
						styles.nativeCastButtonWrapper,
						{
							top: castButtonTopOffset + 8
						}
					]}>
					{/* react-native-google-cast expects a CastButton in the view hierarchy, but Jellyfin renders its own icon inside the WebView. We keep this hidden button mounted so the native SDK can manage discovery/dialogs while the WebView handles user interaction. */}
					<CastButton
						pointerEvents='none'
						style={[
							styles.castButton,
							styles.hiddenCastButton,
							{
								tintColor: theme?.colors?.white ?? Colors.white
							}
						]}
					/>
				</View>
			)}
			{server && server.urlString ? (
				<>
					<NativeShellWebView
						ref={webview}
						style={webviewStyle}
						containerStyle={webviewStyle}
						refreshControlProps={{
							// iOS colors
							tintColor: theme.colors.grey1,
							backgroundColor: theme.colors.grey0,
							// Android colors
							colors: [ theme.colors.primary, theme.colors.secondary ],
							progressBackgroundColor: theme.colors.background
						}}
						// Error screen is displayed if loading fails
						renderError={errorCode => (
							<ErrorView
								icon={{
									name: 'cloud-off',
									type: 'material'
								}}
								heading={t([ `home.errors.${errorCode}.heading`, 'home.errors.offline.heading' ])}
								message={t([ `home.errors.${errorCode}.description`, 'home.errors.offline.description' ])}
								details={[
									t('home.errorCode', { errorCode }),
									t('home.errorUrl', { url: server.urlString })
								]}
								buttonIcon={{
									name: getIconName('refresh'),
									type: 'ionicon'
								}}
								buttonTitle={t('home.retry')}
								onPress={() => webview.current?.reload()}
							/>
						)}
						// Loading screen is displayed when refreshing
						renderLoading={() => <View style={styles.container} />}
						// Update state on loading error
						onError={({ nativeEvent: state }) => {
							console.warn('Error', state);
						}}
						onHttpError={({ nativeEvent: state }) => {
							console.warn('HTTP Error', state);
							setHttpErrorStatus(state);
						}}
						onLoadStart={() => {
							setIsLoading(true);
							setHttpErrorStatus(null);
						}}
						// Update state when loading is complete
						onLoadEnd={() => {
							setIsLoading(false);
						}}
						// Reload the webview if the process terminated in the background
						// refs: https://github.com/react-native-webview/react-native-webview/blob/1d8205af06dbb0bad0d8f208bb2a37ce5f732fd3/docs/Reference.md#oncontentprocessdidterminate
						onContentProcessDidTerminate={() => {
							webview.current?.reload();
						}}
					/>
					<AudioPlayer/>
					<VideoPlayer/>
				</>
			) : (
				<ErrorView
					heading={t('home.errors.invalidServer.heading')}
					message={t('home.errors.invalidServer.description')}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	loading: {
		opacity: 0
	},
	nativeCastButtonWrapper: {
		position: 'absolute',
		right: 16,
		zIndex: 10
	},
	castButton: {
		width: 24,
		height: 24
	},
	hiddenCastButton: {
		opacity: 0,
		width: 0,
		height: 0
	}
});

HomeScreen.displayName = Screens.HomeScreen;

export default HomeScreen;
