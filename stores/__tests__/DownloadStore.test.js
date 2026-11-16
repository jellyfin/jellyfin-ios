/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://jestjs.io/"}
 */

import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react-native';

import DownloadModel from '../../models/DownloadModel';
import { deserialize, useDownloadStore } from '../DownloadStore';

const TEST_MODEL = new DownloadModel(
	{
		Id: 'item-id',
		ServerId: 'server-id',
		Name: 'title'
	},
	'https://example.com/',
	'api-key',
	'file name.mkv',
	'https://example.com/download'
);

const TEST_MODEL_2 = new DownloadModel(
	{
		Id: 'item-id-2',
		ServerId: 'server-id',
		Name: 'other title'
	},
	'https://test2.example.com/',
	'api-key',
	'other file name.mkv',
	'https://test2.example.com/download'
);

describe('DownloadStore', () => {
	let store;
	beforeEach(() => {
		store = renderHook(() => useDownloadStore((state => state)));
		act(() => {
			store.result.current.reset();
		});
	});

	it('should initialize with an empty map', () => {
		expect(store.result.current.downloads.size).toBe(0);
	});

	it('should reset', () => {
		act(() => {
			store.result.current.add(TEST_MODEL);
			store.result.current.add(TEST_MODEL_2);
		});

		expect(store.result.current.downloads.size).toBe(2);

		act(() => {
			store.result.current.reset();
		});

		expect(store.result.current.downloads.size).toBe(0);
	});

	it('should allow models to be added', () => {
		act(() => {
			store.result.current.add(TEST_MODEL);
		});

		expect(store.result.current.downloads.size).toBe(1);
		expect(store.result.current.downloads.get(TEST_MODEL.key)).toBe(TEST_MODEL);

		act(() => {
			store.result.current.add(TEST_MODEL_2);
		});
		expect(store.result.current.downloads.size).toBe(2);
		expect(store.result.current.downloads.get(TEST_MODEL_2.key)).toBe(TEST_MODEL_2);
	});

	it('should prevent duplicate entries', () => {
		act(() => {
			store.result.current.add(TEST_MODEL);
			store.result.current.add(TEST_MODEL_2);
		});

		expect(store.result.current.downloads.size).toBe(2);
		act(() => {
			store.result.current.add(TEST_MODEL);
		});
		expect(store.result.current.downloads.size).toBe(2);
	});

	it('should return the number of new downloads', () => {
		act(() => {
			store.result.current.add(TEST_MODEL);
			store.result.current.add(TEST_MODEL_2);
		});
		expect(store.result.current.getNewDownloadCount()).toBe(2);
		TEST_MODEL.isNew = false;
		expect(store.result.current.getNewDownloadCount()).toBe(1);
		TEST_MODEL_2.isNew = false;
		expect(store.result.current.getNewDownloadCount()).toBe(0);
	});
});

describe('deserialize', () => {
	it('should deserialize to a Map of DownloadModels', () => {
		const serialized = {
			state: {
				downloads: [[
					'server-id_item-id-1',
					{
						itemId: 'item-id-1',
						serverId: 'server-id',
						serverUrl: 'https://example.com/',
						apiKey: 'api-key',
						title: 'title 1',
						filename: 'file name 1.mkv',
						downloadUrl: 'https://example.com/download',
						isComplete: false,
						isNew: true
					}
				], [
					'server-id_item-id-2',
					{
						itemId: 'item-id-2',
						serverId: 'server-id',
						serverUrl: 'https://example.com/',
						apiKey: 'api-key',
						title: 'title 2',
						filename: 'file name 2.mkv',
						extension: '.mp4',
						downloadUrl: 'https://example.com/download',
						collectionName: 'collection name',
						isComplete: true,
						isNew: false
					}
				]]
			}
		};

		const deserialized = deserialize(JSON.stringify(serialized)).state.downloads;

		expect(deserialized.size).toBe(2);

		const model1 = deserialized.get('server-id_item-id-1');
		expect(model1).toBeInstanceOf(DownloadModel);
		expect(model1.itemId).toBe('item-id-1');
		expect(model1.serverId).toBe('server-id');
		expect(model1.serverUrl).toBe('https://example.com/');
		expect(model1.apiKey).toBe('api-key');
		expect(model1.title).toBe('title 1');
		expect(model1.filename).toBe('file name 1.mkv');
		expect(model1.downloadUrl).toBe('https://example.com/download');
		expect(model1.isComplete).toBe(false);
		expect(model1.isNew).toBe(true);
		expect(model1.collectionName).toBeUndefined();

		const model2 = deserialized.get('server-id_item-id-2');
		expect(model2).toBeInstanceOf(DownloadModel);
		expect(model2.itemId).toBe('item-id-2');
		expect(model2.serverId).toBe('server-id');
		expect(model2.serverUrl).toBe('https://example.com/');
		expect(model2.apiKey).toBe('api-key');
		expect(model2.title).toBe('title 2');
		expect(model2.filename).toBe('file name 2.mkv');
		expect(model2.extension).toBe('.mp4');
		expect(model2.collectionName).toBe('collection name');
		expect(model2.downloadUrl).toBe('https://example.com/download');
		expect(model2.isComplete).toBe(true);
		expect(model2.isNew).toBe(false);
	});
});
