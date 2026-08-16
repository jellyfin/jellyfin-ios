/**
 * Copyright (c) 2026 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Api } from '@jellyfin/sdk/lib/api';
import { AUTHORIZATION_PARAMETER } from '@jellyfin/sdk/lib/constants';
import type { MediaSourceInfo } from '@jellyfin/sdk/lib/generated-client/models/media-source-info';
import type { MediaStream } from '@jellyfin/sdk/lib/generated-client/models/media-stream';
import { MediaStreamType } from '@jellyfin/sdk/lib/generated-client/models/media-stream-type';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import * as FileSystem from 'expo-file-system';

import type DownloadModel from '../../../models/DownloadModel';
import { getDeviceProfile } from '../../../utils/Device';

import { toDownloadProfile } from './profile';

/** Gets the subtitle streams for a video media source. */
export function getSubtitleStreams(mediaSources: MediaSourceInfo[] | null | undefined): MediaStream[] {
	const mediaStreams = mediaSources?.[0]?.MediaStreams || [];
	return mediaStreams.filter(
		stream => stream.Type === MediaStreamType.Subtitle && typeof stream.Index === 'number'
	);
}

/** Gets a subtitle file name derived from the video's file name. */
export function getSubtitleFileName(baseName: string, stream: MediaStream): string {
	const language = stream.Language?.trim();
	return `${baseName}.${language || stream.Index}.srt`;
}

/**
 * Deletes any downloaded subtitle files that share the given video file name.
 * Uses the item's downloaded folder, so this must only be called for video downloads.
 */
export const deleteSubtitles = async (download: DownloadModel): Promise<void> => {
	const dirInfo = await FileSystem.getInfoAsync(download.localPathUri);
	if (!dirInfo.exists || !dirInfo.isDirectory) return;

	const baseName = download.localFilename.slice(0, download.localFilename.lastIndexOf('.'));
	const entries = await FileSystem.readDirectoryAsync(download.localPathUri);

	await Promise.all(entries
		.filter(entry => entry.startsWith(`${baseName}.`) && entry.endsWith('.srt'))
		.map(entry => FileSystem.deleteAsync(
			encodeURI(download.localPath + entry),
			{ idempotent: true }
		)));
};

/** Downloads the subtitles for a video item into the same folder as the video. */
export const downloadSubtitles = async (api: Api, download: DownloadModel): Promise<void> => {
	// Fetch the media sources so we can enumerate the available subtitle tracks
	const { data: playbackInfo } = await getMediaInfoApi(api)
		.getPostedPlaybackInfo({
			itemId: download.item.Id,
			playbackInfoDto: {
				DeviceProfile: toDownloadProfile(getDeviceProfile())
			}
		});

	const mediaSources = playbackInfo.MediaSources || [];
	const mediaSourceId = mediaSources[0]?.Id;
	const streams = getSubtitleStreams(mediaSources);
	if (!mediaSourceId || streams.length < 1) return;

	const baseName = download.localFilename.slice(0, download.localFilename.lastIndexOf('.'));
	const serverUrl = download.serverUrl.endsWith('/') ? download.serverUrl.slice(0, -1) : download.serverUrl;
	const usedNames = new Set<string>();

	await Promise.all(streams.map(async stream => {
		// Avoid overwriting when a media source has multiple streams for the same language
		let fileName = getSubtitleFileName(baseName, stream);
		if (usedNames.has(fileName)) {
			fileName = `${baseName}.${stream.Language?.trim() || stream.Index}.${stream.Index}.srt`;
		}
		usedNames.add(fileName);

		const url = new URL(
			`/Videos/${download.item.Id}/${mediaSourceId}/Subtitles/${stream.Index}/Stream.srt`,
			serverUrl
		);
		url.searchParams.set(AUTHORIZATION_PARAMETER, download.apiKey);

		const fileUri = encodeURI(download.localPath + fileName);
		await FileSystem.downloadAsync(url.toString(), fileUri);

		console.debug('[subtitles] downloaded "%s"', fileName);
	}));
};
