/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import React, { useEffect } from 'react';

import { useStores } from '../hooks/useStores';
import { msToTicks } from '../utils/Time';

const AudioPlayer = () => {
	const { mediaStore } = useStores();

	const player = useAudioPlayer(null, { updateInterval: 500 });

	// Set the audio mode when the audio player is created
	useEffect(() => {
		setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: true,
			interruptionMode: 'doNotMix',
			shouldRouteThroughEarpiece: false,
			allowsRecording: false
		});
	}, []);

	// Track playback status
	useEffect(() => {
		const subscription = player.addListener('playbackStatusUpdate', (status) => {
			if (
				status.didJustFinish === undefined ||
				status.playing === undefined ||
				status.currentTime === undefined ||
				mediaStore.isFinished
			) {
				return;
			}
			mediaStore.set({
				isFinished: status.didJustFinish,
				isPlaying: status.playing,
				positionTicks: msToTicks(status.currentTime * 1000)
			});
		});
		return () => subscription.remove();
	}, [ player, mediaStore ]);

	// Update the player when media type or uri changes
	useEffect(() => {
		if (mediaStore.type === MediaType.Audio && mediaStore.uri) {
			const positionSeconds = mediaStore.getPositionMillis() / 1000;
			player.replace({ uri: mediaStore.uri });
			if (positionSeconds > 0) {
				player.seekTo(positionSeconds);
			}
			player.play();
		}
	}, [ mediaStore.type, mediaStore.uri ]);

	// Update the play/pause state when the store indicates it should
	useEffect(() => {
		if (mediaStore.type === MediaType.Audio && mediaStore.shouldPlayPause) {
			if (player.playing) {
				player.pause();
			} else {
				player.play();
			}
			mediaStore.set({ shouldPlayPause: false });
		}
	}, [ mediaStore.shouldPlayPause ]);

	// Stop the player when the store indicates it should stop playback
	useEffect(() => {
		if (mediaStore.type === MediaType.Audio && mediaStore.shouldStop) {
			player.pause();
			player.replace(null);
			mediaStore.set({ shouldStop: false });
		}
	}, [ mediaStore.shouldStop ]);

	return <></>;
};

export default AudioPlayer;
