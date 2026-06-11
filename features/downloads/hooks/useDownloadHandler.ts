/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Api } from '@jellyfin/sdk/lib/api';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useStores } from '../../../hooks/useStores';
import type DownloadModel from '../../../models/DownloadModel';
import { getDeviceProfile } from '../../../utils/Device';
import { ensurePathExists } from '../../../utils/File';
import { DownloadStatus } from '../constants/DownloadStatus';
import { toDownloadProfile } from '../utils/profile';

interface DownloadMetadata {
	url: URL;
	isTranscoding: boolean;
}

// Configurable concurrent download limit
const MAX_CONCURRENT_DOWNLOADS = 3;
// Media types that support the stream API for download/transcoding
const STREAMING_MEDIA_TYPES: MediaType[] = [ MediaType.Audio, MediaType.Video ];

const getDownloadMetadata = async (
	api: Api,
	download: DownloadModel
): Promise<DownloadMetadata | undefined> => {
	const { data: playbackInfo } = await getMediaInfoApi(api)
		.getPostedPlaybackInfo({
			itemId: download.item.Id,
			playbackInfoDto: {
				DeviceProfile: toDownloadProfile(getDeviceProfile())
			}
		});

	// Check that playback info returned at least one source
	if (!playbackInfo.MediaSources || playbackInfo.MediaSources.length < 1) {
		console.warn('[useDownloadHandler] no media sources found; fallback to direct file download');
		return;
	}

	// Update the download session id if provided
	if (playbackInfo.PlaySessionId) download.sessionId = playbackInfo.PlaySessionId;

	// The server sorts media sources, so the first _should_ be the best.
	const firstMediaSource = playbackInfo.MediaSources[0];

	if (firstMediaSource.SupportsDirectPlay || firstMediaSource.SupportsDirectStream) {
		// For direct play we must build the URL ourselves
		console.debug('[useDownloadHandler] media source will direct play/stream', firstMediaSource);
		const endpoint = download.item.MediaType === MediaType.Video ? 'Videos' : 'Audio';
		download.canPlay = true;
		download.extension = `.${firstMediaSource.Container || ''}`;

		const streamParams = new URLSearchParams({
			deviceId: api.deviceInfo.id,
			ApiKey: download.apiKey,
			playSessionId: download.sessionId,
			mediaSourceId: firstMediaSource.Id || '',
			Tag: firstMediaSource.ETag || '',
			Static: 'true'
		});

		return {
			isTranscoding: false,
			url: new URL(
				`/${endpoint}/${download.item.Id}/stream${download.extension}?${streamParams.toString()}`,
				api.basePath
			)
		};
	} else if (firstMediaSource.SupportsTranscoding && firstMediaSource.TranscodingUrl) {
		// For transcoding the server returns the URL
		console.debug('[useDownloadHandler] media source will transcode', firstMediaSource);

		download.canPlay = true;
		download.extension = `.${firstMediaSource.TranscodingContainer || ''}`;

		return {
			isTranscoding: true,
			url: new URL(firstMediaSource.TranscodingUrl, api.basePath)
		};
	} else {
		// If we can't direct play or transcode, then we should fallback to using the direct file download
		console.warn(
			'[useDownloadHandler] server returned incompatible media source; fallback to direct file download',
			firstMediaSource
		);
	}
};

export const useDownloadHandler = (enabled = false) => {
	const { downloadStore, rootStore, settingStore } = useStores();
	const { t } = useTranslation();
	const inFlightRef = useRef<Set<string>>(new Set());

	const downloadFile = useCallback(async (download: DownloadModel) => {
		console.debug('[useDownloadHandler] downloading "%s"', download.item.Name || download.item.Path);

		try {
			// Update the status
			download.status = DownloadStatus.Downloading;
			downloadStore.update(download);

			// Create the download folder if it doesn't exist
			await ensurePathExists(download.localPathUri);

			// Get an API instance
			const serverUrl = download.serverUrl.endsWith('/') ? download.serverUrl.slice(0, -1) : download.serverUrl;
			const api = rootStore.getSdk().createApi(serverUrl, download.apiKey);

			let downloadMetadata: DownloadMetadata | undefined;
			if (
				// Check that transcoded downloads are enabled
				settingStore.isExperimentalDownloadsEnabled &&
				// Only Audio or Video types can be transcoded
				download.item.MediaType &&
				STREAMING_MEDIA_TYPES.includes(download.item.MediaType)
			) {
				downloadMetadata = await getDownloadMetadata(api, download);
			}

			if (!downloadMetadata) {
				downloadMetadata = {
					isTranscoding: false,
					url: new URL(download.downloadUrl, serverUrl)
				};
			}

			console.debug('[useDownloadHandler] downloading from url', downloadMetadata.url);

			await File.downloadFileAsync(
				downloadMetadata.url.toString(),
				new File(download.uri),
				{ idempotent: true }
			);
			download.status = DownloadStatus.Complete;

			// Report transcoding download has stopped so the server will cleanup temp files
			if (downloadMetadata.isTranscoding) {
				console.debug('[useDownloadHandler] Reporting transcoding download stopped', download.sessionId);
				await getPlaystateApi(api)
					.reportPlaybackStopped({
						playbackStopInfo: {
							ItemId: download.item.Id,
							PlaySessionId: download.sessionId,
							PositionTicks: download.item.UserData?.PlaybackPositionTicks || 0
						}
					})
					.catch(err => {
						console.warn('[useDownloadHandler] Failed reporting download stopped', err.response || err.request || err.message);
					});
			}
		} catch (e) {
			console.error('[useDownloadHandler] Download failed', e);
			Alert.alert(
				t('alerts.downloadFailed.title'),
				t('alerts.downloadFailed.description', { title: download.title })
			);

			download.status = DownloadStatus.Failed;
		} finally {
			// Push the state update to the store
			downloadStore.update(download);
		}
	}, [ rootStore.deviceId, rootStore.getSdk, settingStore.isExperimentalDownloadsEnabled, t ]);

	const startNextDownload = useCallback(() => {
		// Find next pending download that's not already in flight
		const pendingDownloads = Array.from(downloadStore.downloads.entries())
			.filter(([ key, download ]) =>
				download.status === DownloadStatus.Pending && !inFlightRef.current.has(key)
			);

		// Start downloads up to the limit
		const availableSlots = MAX_CONCURRENT_DOWNLOADS - inFlightRef.current.size;
		if (availableSlots <= 0) return;
		const downloadsToStart = pendingDownloads.slice(0, availableSlots);

		downloadsToStart.forEach(([ key, download ]) => {
			inFlightRef.current.add(key);
			void downloadFile(download)
				.finally(() => {
					inFlightRef.current.delete(key);
					// Try to start next download when this one finishes
					startNextDownload();
				});
		});
	}, [ downloadFile, downloadStore.downloads ]);

	useEffect(() => {
		if (!enabled) return;

		startNextDownload();
	}, [ enabled, startNextDownload ]);
};
