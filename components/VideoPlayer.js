/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { useStores } from '../hooks/useStores';
import { msToTicks } from '../utils/Time';

const VideoPlayer = () => {
	const { rootStore, mediaStore } = useStores();

	const viewRef = useRef(null);

	const player = useVideoPlayer(null, p => {
		p.timeUpdateEventInterval = 1;
		p.showNowPlayingNotification = true;
	});

	// Bridge player events to the media store
	useEffect(() => {
		const subscriptions = [
			player.addListener('statusChange', ({ error }) => {
				if (error) {
					console.error(error);
					Alert.alert(error.message);
				}
			}),
			player.addListener('playingChange', ({ isPlaying }) => {
				mediaStore.set({ isPlaying });
			}),
			player.addListener('timeUpdate', ({ currentTime }) => {
				mediaStore.set({ positionTicks: msToTicks((currentTime || 0) * 1000) });
			}),
			player.addListener('playToEnd', () => {
				rootStore.set({ didPlayerCloseManually: false });
				viewRef.current?.exitFullscreen();
			})
		];

		return () => {
			subscriptions.forEach(subscription => subscription.remove());
		};
	}, [ player ]);

	// Update the player when media type or uri changes
	useEffect(() => {
		if (mediaStore.type === MediaType.Video && mediaStore.uri) {
			rootStore.set({ didPlayerCloseManually: true });
			player.replace({ uri: mediaStore.uri });
			player.currentTime = mediaStore.getPositionMillis() / 1000;
			player.play();
			viewRef.current?.enterFullscreen();
		}
	}, [ mediaStore.type, mediaStore.uri ]);

	// Update the play/pause state when the store indicates it should
	useEffect(() => {
		if (mediaStore.type === MediaType.Video && mediaStore.shouldPlayPause) {
			if (mediaStore.isPlaying) {
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
			player.pause();
			viewRef.current?.exitFullscreen();
			mediaStore.set({ shouldStop: false });
		}
	}, [ mediaStore.shouldStop ]);

	return (
		<VideoView
			ref={viewRef}
			player={player}
			style={styles.hidden}
			nativeControls
			allowsPictureInPicture
			onFullscreenEnter={() => {
				rootStore.set({ isFullscreen: true });
			}}
			onFullscreenExit={() => {
				rootStore.set({ isFullscreen: false });
				mediaStore.reset();
			}}
		/>
	);
};

const styles = StyleSheet.create({
	hidden: {
		position: 'absolute',
		width: 1,
		height: 1,
		opacity: 0
	}
});

export default VideoPlayer;
