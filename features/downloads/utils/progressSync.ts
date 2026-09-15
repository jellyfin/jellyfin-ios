/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Jellyfin } from '@jellyfin/sdk';
import { getUserDataApi } from '@jellyfin/sdk/lib/utils/api/user-data-api';

import type DownloadModel from '../../../models/DownloadModel';
import type { DownloadStore } from '../../../stores/DownloadStore';

/** Uses UserData.LastPlayedDate to pick a direction so an offline watch can't clobber a newer one from elsewhere. */
export const syncDownloadProgress = async (
	download: DownloadModel,
	getSdk: () => Jellyfin,
	downloadStore: DownloadStore
): Promise<void> => {
	try {
		const serverUrl = download.serverUrl.endsWith('/') ? download.serverUrl.slice(0, -1) : download.serverUrl;
		const userDataApi = getUserDataApi(getSdk().createApi(serverUrl, download.apiKey));

		const { data: serverUserData } = await userDataApi.getItemUserData({ itemId: download.item.Id });
		const serverDate = serverUserData.LastPlayedDate ? new Date(serverUserData.LastPlayedDate).getTime() : 0;
		const localDate = download.lastPlayedDate ? new Date(download.lastPlayedDate).getTime() : 0;

		if (serverDate > localDate) {
			download.positionTicks = serverUserData.PlaybackPositionTicks || 0;
			download.lastPlayedDate = serverUserData.LastPlayedDate || null;
			download.needsPositionSync = false;
		} else if (download.needsPositionSync) {
			await userDataApi.updateItemUserData({
				itemId: download.item.Id,
				updateUserItemDataDto: {
					PlaybackPositionTicks: download.positionTicks,
					LastPlayedDate: download.lastPlayedDate
				}
			});
			download.needsPositionSync = false;
		} else {
			return;
		}

		downloadStore.update(download);
	} catch (err) {
		console.warn('[syncDownloadProgress] failed to sync playback progress for', download.item.Id, err);
	}
};
