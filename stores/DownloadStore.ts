/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';

import { DownloadStatus } from '../features/downloads/constants/DownloadStatus';
import DownloadModel, { type DownloadItem } from '../models/DownloadModel';

import { logger } from './middleware/logger';

type State = {
	downloads: Map<string, DownloadModel>,
};

type Actions = {
	set: (value: Partial<State>) => void,
	getNewDownloadCount: () => number,
	add: (download: DownloadModel) => void,
	delete: (download: DownloadModel) => boolean,
	update: (download: DownloadModel) => void,
	reset: () => void
};

export type DownloadStore = State & Actions;

interface SerializedDownload {
	item?: DownloadItem
	itemId?: string;
	serverId?: string;
	serverUrl: string;
	apiKey: string;
	title?: string;
	filename: string;
	extension?: string;
	downloadUrl: string;
	/** @deprecated Use status instead. */
	isComplete?: boolean;
	isNew: boolean;
	canPlay?: boolean;
	status?: DownloadStatus;
	progress?: number;
	speedBytesPerSecond?: number;
	etaSeconds?: number;
}

const STORE_NAME = 'DownloadStore';

export const deserialize = (valueString: string | null): StorageValue<State> => {
	if (!valueString) {
		return {
			state: initialState
		};
	}
	const value = JSON.parse(valueString);
	const downloads = new Map<string, DownloadModel>();

	if (Array.isArray(value.state.downloads)) {
		value.state.downloads.forEach(([ key, obj ]: [ string, SerializedDownload ]) => {
			if (!obj.item && (!obj.itemId || !obj.serverId)) {
				console.error(
					`[${STORE_NAME}] Skipping invalid serialized download (missing itemId/serverId).`,
					key,
					obj
				);
				return;
			}

			// The base item was not saved in previous versions, so reconstruct it from the available information.
			const item: DownloadItem = obj.item || {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				Id: obj.itemId!,
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				ServerId: obj.serverId!,
				Name: obj.title
			};

			const model = new DownloadModel(
				item,
				obj.serverUrl,
				obj.apiKey,
				obj.filename,
				obj.downloadUrl
			);
			if (obj.status) {
				// Restore the status unless it was downloading since resuming downloads is not implemented.
				if (obj.status !== DownloadStatus.Downloading) {
					model.status = obj.status;
				}
			} else if (obj.isComplete) {
				// Migrate legacy completed status.
				model.status = DownloadStatus.Complete;
			}
			// Any pre-existing download without canPlay defined should be playable
			model.canPlay = typeof obj.canPlay === 'boolean' ? obj.canPlay : true;
			model.extension = obj.extension;
			model.isNew = obj.isNew;
			model.speedBytesPerSecond = typeof obj.speedBytesPerSecond === 'number'
				? Math.max(0, obj.speedBytesPerSecond)
				: 0;
			model.etaSeconds = typeof obj.etaSeconds === 'number'
				? Math.max(0, obj.etaSeconds)
				: undefined;
			if (obj.status !== DownloadStatus.Downloading) {
				if (typeof obj.progress === 'number') {
					model.progress = Math.max(0, Math.min(1, obj.progress));
				} else if (model.status === DownloadStatus.Complete) {
					model.progress = 1;
				} else {
					model.progress = 0;
				}
			}

			downloads.set(key, model);
		});
	}

	return {
		...value,
		state: {
			...value.state,
			downloads
		}
	};
};

// This is needed to properly serialize/deserialize Map<String, DownloadModel>
const storage: PersistStorage<unknown> = {
	getItem: async (name: string): Promise<StorageValue<State>> => {
		const data = await AsyncStorage.getItem(name);
		return deserialize(data);
	},
	setItem: function(name, value): void {
		const state = value.state as State;
		const str = JSON.stringify({
			...value,
			state: {
				...state,
				downloads: Array.from(state.downloads.entries())
			}
		});
		AsyncStorage.setItem(name, str);
	},
	removeItem: (name: string) => AsyncStorage.removeItem(name)
};

const initialState: State = {
	downloads: new Map()
};

const persistKeys = Object.keys(initialState);

export const useDownloadStore = create<State & Actions>()(
	logger(
		persist(
			(_set, _get) => ({
				...initialState,
				set: state => _set(prev => ({
					...prev,
					...state
				})),
				getNewDownloadCount: () => Array
					.from(_get().downloads.values())
					.filter(d => d.isNew)
					.length,
				add: (download) => {
					const downloads = _get().downloads;
					if (!downloads.has(download.key)) {
						_set({ downloads: new Map(downloads).set(download.key, download) });
					}
				},
				delete: (download) => {
					const downloads = new Map(_get().downloads);
					const isDeleted = downloads.delete(download.key);

					// If the item was deleted, push the state change
					if (isDeleted) _set({ downloads });

					return isDeleted;
				},
				update: (download) => {
					const downloads = new Map(_get().downloads)
						.set(download.key, download);
					_set({ downloads });
				},
				reset: () => _set({ downloads: new Map() })
			}), {
				name: STORE_NAME,
				storage,
				partialize: (state) => Object.fromEntries(
					Object.entries(state).filter(([ key ]) => persistKeys.includes(key))
				)
			}
		),
		STORE_NAME
	)
);
