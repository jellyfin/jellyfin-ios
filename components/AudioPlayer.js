/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import React, { useEffect, useState } from 'react';

import { useStores } from '../hooks/useStores';
import { msToTicks } from '../utils/Time';

const AudioPlayer = () => {
	const { mediaStore } = useStores();

	const [ player, setPlayer ] = useState();

	// Set the audio mode when the audio player is created
	useEffect(() => {
		Audio.setAudioModeAsync({
			staysActiveInBackground: true,
			interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
			playThroughEarpieceAndroid: false,
			shouldDuckAndroid: true,
			interruptionModeIOS: InterruptionModeIOS.DoNotMix,
			playsInSilentModeIOS: true
		}).catch(console.warn);

		return () => {
			player?.stopAsync();
			player?.unloadAsync();
		};
	}, []);

	// Update the player when media type or uri changes
	useEffect(() => {
		const createPlayer = async ({ uri, positionMillis }) => {
			const { isLoaded } = await player?.getStatusAsync() || { isLoaded: false };
			if (player && isLoaded) {
				// If the player is already loaded, seek to the correct position
				player.setPositionAsync(positionMillis);
			} else {
				// Create the player if not already loaded
				const { sound } = await Audio.Sound.createAsync({
					uri
				}, {
					positionMillis,
					shouldPlay: true
				}, ({
					isPlaying,
					positionMillis: positionMs,
					didJustFinish
				}) => {
					if (
						didJustFinish === undefined ||
						isPlaying === undefined ||
						positionMs === undefined ||
						mediaStore.isFinished
					) {
						return;
					}
					mediaStore.set({
						isFinished: didJustFinish,
						isPlaying: isPlaying,
						positionTicks: msToTicks(positionMs)
					});
				});
				setPlayer(sound);
			}
		};

		if (mediaStore.type === MediaType.Audio) {
			createPlayer({
				uri: mediaStore.uri,
				positionMillis: mediaStore.getPositionMillis()
			});
		}
	}, [ mediaStore.type, mediaStore.uri ]);

	// Update the play/pause state when the store indicates it should
	useEffect(() => {
		if (mediaStore.type === MediaType.Audio && mediaStore.shouldPlayPause) {
			if (mediaStore.isPlaying) {
				player?.pauseAsync();
			} else {
				player?.playAsync();
			}
			mediaStore.set({ shouldPlayPause: false });
		}
	}, [ mediaStore.shouldPlayPause ]);

	// Stop the player when the store indicates it should stop playback
	useEffect(() => {
		if (mediaStore.type === MediaType.Audio && mediaStore.shouldStop) {
			player?.stopAsync();
			player?.unloadAsync();
			mediaStore.set({ shouldStop: false });
		}
	}, [ mediaStore.shouldStop ]);

	return <></>;
};

export default AudioPlayer;
