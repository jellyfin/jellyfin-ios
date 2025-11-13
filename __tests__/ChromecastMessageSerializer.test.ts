jest.mock('react-native-google-cast', () => ({
	MediaStreamType: {
		BUFFERED: 'BUFFERED',
		LIVE: 'LIVE',
		OTHER: 'OTHER'
	},
	MediaRepeatMode: {
		OFF: 'REPEAT_OFF',
		ALL: 'REPEAT_ALL',
		ALL_AND_SHUFFLE: 'REPEAT_ALL_AND_SHUFFLE',
		SINGLE: 'REPEAT_SINGLE'
	},
	MediaPlayerState: {
		BUFFERING: 'BUFFERING',
		LOADING: 'LOADING',
		IDLE: 'IDLE',
		PAUSED: 'PAUSED',
		PLAYING: 'PLAYING'
	},
	MediaPlayerIdleReason: {
		CANCELLED: 'CANCELLED',
		ERROR: 'ERROR',
		FINISHED: 'FINISHED',
		INTERRUPTED: 'INTERRUPTED'
	}
}));

import {
	mapRepeatMode,
	mapStreamType,
	mediaInfoFromChrome,
	mediaTrackFromChrome,
	queueItemFromChrome,
	queueLoadRequestFromChrome,
	repeatModeFromClient
} from '../adapters/ChromecastPayloadMapper';

describe('ChromecastMessageSerializer', () => {
	it('maps stream types correctly', () => {
		expect(mapStreamType('buffered')).toBe('BUFFERED');
		expect(mapStreamType('live')).toBe('LIVE');
		expect(mapStreamType('other')).toBe('OTHER');
		expect(mapStreamType('unknown-type')).toBeUndefined();
	});

	it('builds queue load request from chrome payload', () => {
		const request = queueLoadRequestFromChrome({
			items: [
				{
					itemId: 5,
					activeTrackIds: [ 1 ],
					media: {
						contentId: 'https://demo/video/1.m3u8',
						contentType: 'video/mp4',
						metadata: {
							metadataType: 1,
							title: 'Test Movie'
						},
						tracks: [
							{
								trackId: 1,
								type: 'TEXT',
								language: 'en',
								name: 'English',
								subtype: 'SUBTITLES'
							}
						]
					},
					startTime: 5
				}
			],
			currentTime: 10,
			repeatMode: 'REPEAT_ALL',
			customData: { foo: 'bar' }
		});

		expect(request.queueData?.items?.length).toBe(1);
		expect(request.queueData?.repeatMode).toBe(repeatModeFromClient('REPEAT_ALL'));
		expect(request.startTime).toBe(10);
		expect(request.queueData?.items?.[0]?.mediaInfo?.contentId).toBe('https://demo/video/1.m3u8');
		expect(request.queueData?.items?.[0]?.activeTrackIds).toEqual([ 1 ]);
	});

	it('converts queue items from chrome payload', () => {
		const item = queueItemFromChrome({
			media: {
				contentUrl: 'https://demo/audio.mp3'
			},
			autoplay: false,
			playbackDuration: 120,
			customData: { quality: 'hd' }
		});

		expect(item.mediaInfo?.contentId).toBe('https://demo/audio.mp3');
		expect(item.autoplay).toBe(false);
		expect(item.customData).toEqual({ quality: 'hd' });
	});

	it('parses media tracks correctly', () => {
		const track = mediaTrackFromChrome({
			trackId: 3,
			type: 'TEXT',
			subtype: 'SUBTITLES',
			language: 'en'
		});
		expect(track).not.toBeNull();
		expect(track?.id).toBe(3);
		expect(track?.type).toBe('text');
		expect(track?.subtype).toBe('subtitles');
	});

	it('throws when media info lacks content id', () => {
		expect(() => mediaInfoFromChrome({ contentType: 'video/mp4' })).toThrow('Queue item missing contentId');
	});

	it('maps repeat mode to enums', () => {
		expect(mapRepeatMode(repeatModeFromClient('REPEAT_ALL_AND_SHUFFLE'))).toBe('REPEAT_ALL_AND_SHUFFLE');
		expect(mapRepeatMode(undefined)).toBe('REPEAT_OFF');
	});
});
