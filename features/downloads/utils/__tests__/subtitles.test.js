/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MediaStreamType } from '@jellyfin/sdk/lib/generated-client/models/media-stream-type';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import * as FileSystem from 'expo-file-system';

import DownloadModel from '../../../../models/DownloadModel';
import { deleteSubtitles, getSubtitleFileName, getSubtitleStreams } from '../subtitles';

jest.mock('expo-file-system');

describe('getSubtitleStreams', () => {
	it('should return subtitle streams from the first media source', () => {
		const streams = getSubtitleStreams([{
			Id: 'media-source-id',
			MediaStreams: [
				{ Type: MediaStreamType.Video, Index: 0 },
				{ Type: MediaStreamType.Audio, Index: 1 },
				{ Type: MediaStreamType.Subtitle, Index: 2 },
				{ Type: MediaStreamType.Subtitle, Index: 3, Language: 'spa' }
			]
		}]);

		expect(streams).toEqual([
			{ Type: MediaStreamType.Subtitle, Index: 2 },
			{ Type: MediaStreamType.Subtitle, Index: 3, Language: 'spa' }
		]);
	});

	it('should return an empty array when there are no media sources', () => {
		expect(getSubtitleStreams(undefined)).toEqual([]);
	});
});

describe('getSubtitleFileName', () => {
	it('should use the stream language when available', () => {
		expect(getSubtitleFileName('Movie (2020)', { Type: MediaStreamType.Subtitle, Index: 2, Language: 'eng' }))
			.toBe('Movie (2020).eng.srt');
	});

	it('should fall back to the stream index without a language', () => {
		expect(getSubtitleFileName('Movie (2020)', { Type: MediaStreamType.Subtitle, Index: 2 }))
			.toBe('Movie (2020).2.srt');
	});
});

describe('deleteSubtitles', () => {
	let model;

	beforeEach(() => {
		jest.clearAllMocks();

		model = new DownloadModel(
			{
				Id: 'item-id',
				ServerId: 'server-id',
				Name: 'Movie (2020)',
				MediaType: MediaType.Video,
				Path: '/movies/Movie (2020).mkv'
			},
			'https://example.com/',
			'api-key',
			'Movie (2020).mkv',
			'https://example.com/download'
		);
	});

	it('should delete only the subtitle files that match the video file name', async () => {
		FileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
		FileSystem.readDirectoryAsync.mockResolvedValue([
			'Movie (2020).mkv',
			'Movie (2020).eng.srt',
			'Movie (2020).spa.srt',
			'other.txt'
		]);

		await deleteSubtitles(model);

		const expected = [
			encodeURI(model.localPath + 'Movie (2020).eng.srt'),
			encodeURI(model.localPath + 'Movie (2020).spa.srt')
		];
		expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
		expect(FileSystem.deleteAsync.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining(expected));
	});

	it('should not delete when the download is missing', async () => {
		FileSystem.getInfoAsync.mockResolvedValue({ exists: false });

		await deleteSubtitles(model);

		expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
	});
});
