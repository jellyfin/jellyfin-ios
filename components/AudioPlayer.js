/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import React, { useEffect, useRef } from 'react';

import { useStores } from '../hooks/useStores';
import { msToTicks } from '../utils/Time';

const AudioPlayer = () => {
	const { mediaStore } = useStores();

	const playerRef = useRef(null);

	useEffect(() => {
		setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: true,
			interruptionMode: 'doNotMix'
		});

		return () => {
			playerRef.current?.remove();
			playerRef.current = null;
		};
	}, []);

	// Update the player when media type or uri changes
	useEffect(() => {
		if (mediaStore.type !== MediaType.Audio || !mediaStore.uri) {
			return;
		}

		const positionSeconds = mediaStore.getPositionMillis() / 1000;
		const source = { uri: mediaStore.uri };

		if (playerRef.current) {
			// Swap the source on the existing player (track change)
			playerRef.current.replace(source);
		} else {
			const player = createAudioPlayer(source);
			player.addListener('playbackStatusUpdate', status => {
				if (!status.isLoaded || mediaStore.isFinished) {
					return;
				}
				mediaStore.set({
					isFinished: status.didJustFinish,
					isPlaying: status.playing,
					positionTicks: msToTicks((status.currentTime || 0) * 1000)
				});
			});
			playerRef.current = player;
		}

		playerRef.current.seekTo(positionSeconds).catch(() => { /* not loaded yet */ });
		playerRef.current.play();
	}, [ mediaStore.type, mediaStore.uri ]);

	// Update the play/pause state when the store indicates it should
	useEffect(() => {
		if (mediaStore.type === MediaType.Audio && mediaStore.shouldPlayPause) {
			if (mediaStore.isPlaying) {
				playerRef.current?.pause();
			} else {
				playerRef.current?.play();
			}
			mediaStore.set({ shouldPlayPause: false });
		}
	}, [ mediaStore.shouldPlayPause ]);

	// Stop the player when the store indicates it should stop playback
	useEffect(() => {
		if (mediaStore.type === MediaType.Audio && mediaStore.shouldStop) {
			playerRef.current?.remove();
			playerRef.current = null;
			mediaStore.set({ shouldStop: false });
		}
	}, [ mediaStore.shouldStop ]);

	return <></>;
};

export default AudioPlayer;
