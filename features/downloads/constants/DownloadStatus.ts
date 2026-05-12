/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/** The different statuses a download can be in. */
export const DownloadStatus = {
	/** The download is complete. */
	Complete: 'complete',
	/** The download is in progress. */
	Downloading: 'downloading',
	/** The download has failed. */
	Failed: 'failed',
	/** The download is missing (has been deleted from storage). */
	Missing: 'missing',
	/** The download is pending download. */
	Pending: 'pending',
	/** The download has been paused and can be resumed. */
	Paused: 'paused'
} as const;

export type DownloadStatus = typeof DownloadStatus[keyof typeof DownloadStatus];
