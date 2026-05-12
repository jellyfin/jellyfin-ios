/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

import { DownloadStatus } from '../features/downloads/constants/DownloadStatus';
import { getItemDirectory, getItemFileName } from '../utils/baseItem';

export interface DownloadItem extends BaseItemDto {
	Id: string;
	ServerId: string;
}

export interface MobxDownloadModel {
	itemId: string;
	serverId: string;
	serverUrl: string;
	apiKey: string;
	title?: string;
	filename: string;
	downloadUrl: string;
	isComplete: boolean;
	isNew: boolean;
}

/** Statuses that a finished download can be in. */
const COMPLETE_STATUSES: DownloadStatus[] = [
	DownloadStatus.Complete,
	DownloadStatus.Failed,
	DownloadStatus.Missing
];

const DOWNLOADS_DIRECTORY = 'Downloads/';

export default class DownloadModel {
	status: DownloadStatus = DownloadStatus.Pending
	progress = 0
	isNew = true
	canPlay = false

	apiKey: string
	readonly item: Readonly<DownloadItem>
	/** The "play" session ID for reporting a download has stopped. */
	sessionId = uuidv4()
	serverUrl: string

	/** @deprecated Use item.Path and extension instead. */
	filename: string
	/**
	 * Extension override for transcoded files. e.g. `.mkv`
	 * By default the original file extension from `item.Path` is used.
	 */
	extension?: string

	downloadUrl: string

	constructor(
		item: DownloadItem,
		serverUrl: string,
		apiKey: string,
		filename: string,
		downloadUrl: string
	) {
		this.item = item;
		this.serverUrl = serverUrl;
		this.apiKey = apiKey;
		this.filename = filename;
		this.downloadUrl = downloadUrl;
	}

	/**
	 * Returns true if a download has completed.
	 * e.g. The status is not Pending or Downloading.
	 */
	get isComplete() {
		return COMPLETE_STATUSES.includes(this.status);
	}

	/**
	 * Returns true if the download's localPath could be shared with other downloads.
	 * e.g. Multiple episodes or songs could exist in the same directory.
	 */
	get isSharedPath() {
		return !!(this.item.SeriesName || this.item.Album);
	}

	/** @deprecated Use item.Id instead. */
	get itemId() {
		return this.item.Id;
	}

	get key() {
		return `${this.item.ServerId}_${this.item.Id}`;
	}

	/** Returns the downloads filename. */
	get localFilename() {
		let ext = this.extension;
		// If no extension override is set, try to get the original from the item.Path
		if (!ext) {
			const path = this.item.Path;
			if (path && path.lastIndexOf('.') > 0) {
				ext = path.slice(path.lastIndexOf('.'));
			}
		}
		// Ensure the extension starts with a "."
		if (ext && ext[0] !== '.') {
			ext = `.${ext}`;
		}
		const name = getItemFileName(this.item);
		if (name && ext) return `${name}${ext}`;

		// Fallback for legacy downloads
		return this.filename.slice(0, this.filename.lastIndexOf('.')) + '.mp4';
	}

	/** Returns the absolute directory path. */
	get localPath() {
		return `${FileSystem.documentDirectory}${this.relativePath}`;
	}

	/** Returns the URI encoded absolute directory path. */
	get localPathUri() {
		return encodeURI(this.localPath);
	}

	/** Returns the relative directory path (document directory should be the base). */
	get relativePath() {
		// Legacy downloads will not have a path set
		if (this.item.Path) {
			const itemDirectory = getItemDirectory(this.item);
			if (itemDirectory) {
				return `${DOWNLOADS_DIRECTORY}${itemDirectory}`;
			}
		}

		// Fallback for legacy downloads
		return `${this.item.ServerId}/${this.item.Id}/`;
	}

	/** @deprecated Use item.ServerId instead. */
	get serverId() {
		return this.item.ServerId;
	}

	get title() {
		return this.item.Name || undefined;
	}

	/** Returns the URI encoded absolute file path. */
	get uri() {
		return encodeURI(this.localPath + this.localFilename);
	}
}

/** Helper function to migrate download models saved by mobx. */
export function fromStorageObject({
	itemId,
	serverId,
	title,
	serverUrl,
	apiKey,
	filename,
	downloadUrl,
	isComplete,
	isNew
}: MobxDownloadModel): DownloadModel {
	const model = new DownloadModel(
		{
			Id: itemId,
			ServerId: serverId,
			Name: title,
			MediaType: MediaType.Video
		},
		serverUrl,
		apiKey,
		filename,
		downloadUrl
	);
	if (isComplete) model.status = DownloadStatus.Complete;
	model.isNew = isNew;
	// Any downloads from the mobx store should be playable
	model.canPlay = true;
	return model;
}
