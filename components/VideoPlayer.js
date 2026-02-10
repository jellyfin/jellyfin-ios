/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { useStores } from '../hooks/useStores';
import { msToTicks } from '../utils/Time';

const VideoPlayer = () => {
	const { rootStore, mediaStore } = useStores();
	const viewRef = useRef(null);

	const player = useVideoPlayer(null, p => {
		p.audioMixingMode = 'doNotMix';
		p.timeUpdateEventInterval = 1;
	});

	// Auto-open fullscreen when player is ready and handle errors
	useEffect(() => {
		const subscription = player.addListener('statusChange', ({ status, error }) => {
			if (status === 'readyToPlay') {
				viewRef.current?.enterFullscreen();
			}
			if (status === 'error' && error) {
				console.error('[VideoPlayer]', error.message);
				Alert.alert('Playback Error', error.message);
			}
		});
		return () => subscription.remove();
	}, [ player ]);

	// Track position updates
	useEffect(() => {
		const subscription = player.addListener('timeUpdate', ({ currentTime }) => {
			mediaStore.set({
				positionTicks: msToTicks(currentTime * 1000)
			});
		});
		return () => subscription.remove();
	}, [ player, mediaStore ]);

	// Track playing state
	useEffect(() => {
		const subscription = player.addListener('playingChange', ({ isPlaying }) => {
			mediaStore.set({ isPlaying });
		});
		return () => subscription.remove();
	}, [ player, mediaStore ]);

	// Handle play to end
	useEffect(() => {
		const subscription = player.addListener('playToEnd', () => {
			rootStore.set({ didPlayerCloseManually: false });
			viewRef.current?.exitFullscreen();
		});
		return () => subscription.remove();
	}, [ player, rootStore ]);

	// Update the player when media type or uri changes
	useEffect(() => {
		if (mediaStore.type === MediaType.Video && mediaStore.uri) {
			rootStore.set({ didPlayerCloseManually: true });
			const positionSeconds = mediaStore.getPositionMillis() / 1000;
			player.replaceAsync({ uri: mediaStore.uri })
				.then(() => {
					if (positionSeconds > 0) {
						player.currentTime = positionSeconds;
					}
					player.play();
					return undefined;
				})
				.catch(e => {
					console.error('[VideoPlayer] failed to load source', e);
				});
		}
	}, [ mediaStore.type, mediaStore.uri ]);

	// Update the play/pause state when the store indicates it should
	useEffect(() => {
		if (mediaStore.type === MediaType.Video && mediaStore.shouldPlayPause) {
			if (player.playing) {
				player.pause();
			} else {
				player.play();
			}
			mediaStore.set({ shouldPlayPause: false });
		}
	}, [ mediaStore.shouldPlayPause ]);

	// Close the player when the store indicates it should stop playback
	useEffect(() => {
		if (mediaStore.type === MediaType.Video && mediaStore.shouldStop) {
			rootStore.set({ didPlayerCloseManually: false });
			viewRef.current?.exitFullscreen();
			mediaStore.set({ shouldStop: false });
		}
	}, [ mediaStore.shouldStop ]);

	const onFullscreenEnter = useCallback(() => {
		rootStore.set({ isFullscreen: true });
	}, [ rootStore ]);

	const onFullscreenExit = useCallback(() => {
		rootStore.set({ isFullscreen: false });
		mediaStore.reset();
		player.replace(null);
	}, [ rootStore, mediaStore, player ]);

	return (
		<VideoView
			ref={viewRef}
			player={player}
			style={styles.player}
			contentFit='contain'
			nativeControls
			onFullscreenEnter={onFullscreenEnter}
			onFullscreenExit={onFullscreenExit}
		/>
	);
};

const styles = StyleSheet.create({
	player: {
		width: 0,
		height: 0
	}
});

export default VideoPlayer;
