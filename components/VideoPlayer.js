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
import { Alert } from 'react-native';

import { syncDownloadProgress } from '../features/downloads/utils/progressSync';
import { useStores } from '../hooks/useStores';
import { msToTicks } from '../utils/Time';

const PROGRESS_SAVE_THRESHOLD_MS = 5000;

const VideoPlayer = () => {
	const { rootStore, mediaStore, downloadStore } = useStores();

	const player = useRef(null);
	// Local player fullscreen state
	const [ isPresenting, setIsPresenting ] = useState(false);
	const [ isDismissing, setIsDismissing ] = useState(false);
	const lastSavedPositionMillis = useRef(0);

	const saveDownloadProgress = (positionMillis) => {
		if (!mediaStore.isLocalFile || !mediaStore.downloadKey) return;

		const download = downloadStore.downloads.get(mediaStore.downloadKey);
		if (!download) return;

		download.positionTicks = msToTicks(positionMillis);
		download.lastPlayedDate = new Date().toISOString();
		download.needsPositionSync = true;
		downloadStore.update(download);
		lastSavedPositionMillis.current = positionMillis;

		return download;
	};

	const stopDownloadPlayback = (positionMillis) => {
		const download = saveDownloadProgress(positionMillis);
		if (download) void syncDownloadProgress(download, rootStore.getSdk, downloadStore);
	};

	// Set the audio mode when the video player is created
	useEffect(() => {
		Audio.setAudioModeAsync({
			interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
			interruptionModeIOS: InterruptionModeIOS.DoNotMix,
			playsInSilentModeIOS: true
		});
	}, []);

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
					stopDownloadPlayback(0);
					rootStore.set({ didPlayerCloseManually: false });
					closeFullscreen();
					return;
				}
				mediaStore.set({
					isPlaying: isPlaying,
					positionTicks: msToTicks(positionMillis)
				});
				if (Math.abs(positionMillis - lastSavedPositionMillis.current) >= PROGRESS_SAVE_THRESHOLD_MS) {
					saveDownloadProgress(positionMillis);
				}
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
						break;
					case VideoFullscreenUpdate.PLAYER_DID_DISMISS:
						setIsDismissing(false);
						rootStore.set({ isFullscreen: false });
						stopDownloadPlayback(mediaStore.getPositionMillis());
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
