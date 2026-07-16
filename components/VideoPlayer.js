/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS, Video, VideoFullscreenUpdate } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { useStores } from '../hooks/useStores';
import { msToTicks } from '../utils/Time';

const VideoPlayer = () => {
	const { rootStore, mediaStore } = useStores();

	const player = useRef(null);
	const appState = useRef(AppState.currentState);
	const shouldRestoreFullscreen = useRef(false);
	// Local player fullscreen state
	const [ isPresenting, setIsPresenting ] = useState(false);
	const [ isDismissing, setIsDismissing ] = useState(false);

	const openFullscreen = () => {
		if (!isPresenting) {
			player.current?.presentFullscreenPlayer()
				.catch(e => {
					console.error(e);
					Alert.alert(e);
				});
		}
	};

	const closeFullscreen = () => {
		if (!isDismissing) {
			player.current?.dismissFullscreenPlayer()
				.catch(e => {
					console.debug(e);
				});
		}
	};

	// Set the audio mode when the video player is created
	useEffect(() => {
		Audio.setAudioModeAsync({
			staysActiveInBackground: true,
			interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
			interruptionModeIOS: InterruptionModeIOS.DoNotMix,
			playsInSilentModeIOS: true
		}).catch(console.warn);
	}, []);

	useEffect(() => {
		const subscription = AppState.addEventListener('change', nextAppState => {
			const wasBackgrounded = appState.current !== 'active';
			appState.current = nextAppState;

			if (
				wasBackgrounded &&
				nextAppState === 'active' &&
				shouldRestoreFullscreen.current &&
				mediaStore.type === MediaType.Video &&
				mediaStore.uri
			) {
				shouldRestoreFullscreen.current = false;
				openFullscreen();
			}
		});

		return () => subscription.remove();
	}, [ mediaStore.type, mediaStore.uri ]);

	// Update the player when media type or uri changes
	useEffect(() => {
		if (mediaStore.type === MediaType.Video) {
			rootStore.set({ didPlayerCloseManually: true });
			player.current?.loadAsync({
				uri: mediaStore.uri
			}, {
				positionMillis: mediaStore.getPositionMillis(),
				shouldPlay: true
			});
		}
	}, [ mediaStore.type, mediaStore.uri ]);

	// Update the play/pause state when the store indicates it should
	useEffect(() => {
		if (mediaStore.type === MediaType.Video && mediaStore.shouldPlayPause) {
			if (mediaStore.isPlaying) {
				player.current?.pauseAsync();
			} else {
				player.current?.playAsync();
			}
			mediaStore.set({ shouldPlayPause: false });
		}
	}, [ mediaStore.shouldPlayPause ]);

	// Close the player when the store indicates it should stop playback
	useEffect(() => {
		if (mediaStore.type === MediaType.Video && mediaStore.shouldStop) {
			rootStore.set({ didPlayerCloseManually: false });
			closeFullscreen();
			mediaStore.set({ shouldStop: false });
		}
	}, [ mediaStore.shouldStop ]);

	return (
		<Video
			ref={player}
			usePoster
			posterSource={{ uri: mediaStore.backdropUri }}
			resizeMode='contain'
			useNativeControls
			onReadyForDisplay={openFullscreen}
			onPlaybackStatusUpdate={({ isPlaying, positionMillis, didJustFinish }) => {
				if (didJustFinish) {
					rootStore.set({ didPlayerCloseManually: false });
					closeFullscreen();
					return;
				}
				mediaStore.set({
					isPlaying: isPlaying,
					positionTicks: msToTicks(positionMillis)
				});
			}}
			onFullscreenUpdate={({ fullscreenUpdate }) => {
				switch (fullscreenUpdate) {
					case VideoFullscreenUpdate.PLAYER_WILL_PRESENT:
						setIsPresenting(true);
						rootStore.set({ isFullscreen: true });
						break;
					case VideoFullscreenUpdate.PLAYER_DID_PRESENT:
						setIsPresenting(false);
						break;
					case VideoFullscreenUpdate.PLAYER_WILL_DISMISS:
						setIsDismissing(true);
						if (appState.current !== 'active') {
							shouldRestoreFullscreen.current = true;
						}
						break;
					case VideoFullscreenUpdate.PLAYER_DID_DISMISS:
						setIsDismissing(false);
						rootStore.set({ isFullscreen: false });
						// Locking or backgrounding can dismiss fullscreen without meaning playback should stop.
						if (appState.current !== 'active' || shouldRestoreFullscreen.current) {
							break;
						}
						mediaStore.reset();
						player.current?.unloadAsync()
							.catch(console.debug);
						break;
				}
			}}
			onError={e => {
				console.error(e);
				Alert.alert(e);
			}}
		/>
	);
};

export default VideoPlayer;
