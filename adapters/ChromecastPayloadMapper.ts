/**
 * Translates between Jellyfin's chrome.cast-style payloads in the WebView and
 * the enums/types expected by react-native-google-cast. Keeps the WebView shim
 * backwards-compatible while letting the native shell speak idiomatic Cast SDK.
 */

import {
	MediaPlayerIdleReason,
	MediaPlayerState,
	MediaRepeatMode,
	MediaStreamType,
	type MediaInfo,
	type MediaLoadRequest,
	type MediaQueueItem,
	type MediaStatus,
	type MediaTrack
} from 'react-native-google-cast';

type ClientStreamType = 'buffered' | 'live' | 'none' | 'other' | 'unknown';

export const mapStreamType = (streamType?: string): MediaInfo['streamType'] | undefined => {
	if (!streamType) return undefined;
	const normalized = streamType.toLowerCase() as ClientStreamType;
	switch (normalized) {
		case 'buffered':
			return MediaStreamType.BUFFERED;
		case 'live':
			return MediaStreamType.LIVE;
		case 'none':
		case 'other':
		case 'unknown':
			return MediaStreamType.OTHER;
		default:
			console.warn('[ChromecastMessageSerializer] Unknown stream type', streamType);
			return undefined;
	}
};

// -- Cast state mappers -------------------------------------------------

export const mapPlayerState = (state?: MediaPlayerState | null) => {
	switch (state) {
		case MediaPlayerState.BUFFERING:
		case MediaPlayerState.LOADING:
			return 'BUFFERING';
		case MediaPlayerState.PLAYING:
			return 'PLAYING';
		case MediaPlayerState.PAUSED:
			return 'PAUSED';
		case MediaPlayerState.IDLE:
			return 'IDLE';
		default:
			return 'UNKNOWN';
	}
};

export const mapIdleReason = (reason?: MediaPlayerIdleReason | null) => {
	switch (reason) {
		case MediaPlayerIdleReason.CANCELLED:
			return 'CANCELLED';
		case MediaPlayerIdleReason.ERROR:
			return 'ERROR';
		case MediaPlayerIdleReason.FINISHED:
			return 'FINISHED';
		case MediaPlayerIdleReason.INTERRUPTED:
			return 'INTERRUPTED';
		default:
			return undefined;
	}
};

export const mapRepeatMode = (mode?: MediaRepeatMode | null) => {
	switch (mode) {
		case MediaRepeatMode.ALL:
			return 'REPEAT_ALL';
		case MediaRepeatMode.ALL_AND_SHUFFLE:
			return 'REPEAT_ALL_AND_SHUFFLE';
		case MediaRepeatMode.SINGLE:
			return 'REPEAT_SINGLE';
		case MediaRepeatMode.OFF:
		default:
			return 'REPEAT_OFF';
	}
};

type ClientRepeatMode = 'REPEAT_ALL' | 'REPEAT_ALL_AND_SHUFFLE' | 'REPEAT_SINGLE' | 'REPEAT_OFF';

export const repeatModeFromClient = (mode?: string | null) => {
	const normalized = mode as ClientRepeatMode | undefined;
	switch (normalized) {
		case 'REPEAT_ALL':
			return MediaRepeatMode.ALL;
		case 'REPEAT_ALL_AND_SHUFFLE':
			return MediaRepeatMode.ALL_AND_SHUFFLE;
		case 'REPEAT_SINGLE':
			return MediaRepeatMode.SINGLE;
		case 'REPEAT_OFF':
			return MediaRepeatMode.OFF;
		default:
			return undefined;
	}
};

const metadataTypeFromNumber = (type?: number) => {
	switch (type) {
		case 1:
			return 'movie';
		case 2:
			return 'tvShow';
		case 3:
			return 'musicTrack';
		case 4:
			return 'photo';
		case 5:
			return 'user';
		default:
			return 'generic';
	}
};

const transformMetadata = (meta?: Record<string, unknown>): MediaInfo['metadata'] => {
	if (!meta) return undefined;
	const { metadataType, images, ...rest } = meta;
	const type = metadataTypeFromNumber(metadataType as number | undefined);
	const metadata: Record<string, unknown> = {
		type,
		...rest
	};

	if (Array.isArray(images)) {
		const sanitizedImages = images
			.map(img => (img && typeof img.url === 'string' ? { url: img.url } : null))
			.filter((img): img is { url: string } => !!img);
		if (sanitizedImages.length) {
			metadata.images = sanitizedImages;
		}
	}

	return metadata as MediaInfo['metadata'];
};

export const buildMediaInfo = (params: {
	contentId: string;
	customData?: Record<string, unknown>;
	contentType?: string;
	duration?: number;
	streamType?: string;
	metadata?: Record<string, unknown>;
	textTrackStyle?: Record<string, unknown>;
	mediaTracks?: MediaTrack[];
}): MediaInfo => ({
	contentUrl: params.contentId,
	contentId: params.contentId,
	contentType: params.contentType,
	customData: params.customData,
	streamType: mapStreamType(params.streamType),
	streamDuration: params.duration ?? undefined,
	metadata: transformMetadata(params.metadata),
	textTrackStyle: params.textTrackStyle as MediaInfo['textTrackStyle'],
	mediaTracks: params.mediaTracks
});

export const mediaInfoToJson = (media: MediaInfo) => ({
	contentId: media.contentId ?? media.contentUrl,
	contentUrl: media.contentUrl,
	contentType: media.contentType,
	customData: media.customData,
	entity: media.entity,
	metadata: media.metadata,
	streamDuration: media.streamDuration,
	streamType: media.streamType,
	textTrackStyle: media.textTrackStyle,
	tracks: media.mediaTracks?.map(mediaTrackToJson)
});

export const mediaTrackToJson = (track: MediaTrack) => ({
	trackId: track.id,
	customData: track.customData,
	language: track.language,
	name: track.name,
	subtype: track.subtype,
	trackContentId: track.contentId,
	trackContentType: track.contentType,
	type: track.type
});

export const queueItemToJson = (item: MediaQueueItem, orderId: number) => ({
	activeTrackIds: item.activeTrackIds ?? undefined,
	autoplay: item.autoplay ?? true,
	customData: item.customData ?? undefined,
	itemId: item.itemId ?? null,
	media: mediaInfoToJson(item.mediaInfo),
	orderId,
	playbackDuration: item.playbackDuration,
	preloadTime: item.preloadTime,
	startTime: item.startTime
});

export const queueDataFromStatus = (status: MediaStatus) => {
	if (!status.queueRepeatMode) return null;
	return {
		repeatMode: mapRepeatMode(status.queueRepeatMode),
		shuffle: status.queueRepeatMode === MediaRepeatMode.ALL_AND_SHUFFLE
	};
};

export const queueLoadRequestFromChrome = (raw: Record<string, unknown>): MediaLoadRequest => {
	const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
	if (!itemsRaw.length) {
		throw new Error('QueueLoad requires at least one item');
	}

	const items = itemsRaw.map(item => queueItemFromChrome(item));
	const queueData: NonNullable<MediaLoadRequest['queueData']> = {
		items
	};

	if (typeof raw.startIndex === 'number' && Number.isFinite(raw.startIndex)) {
		queueData.startIndex = raw.startIndex;
	}
	if (typeof raw.currentTime === 'number' && Number.isFinite(raw.currentTime)) {
		queueData.startTime = raw.currentTime;
	}
	if (typeof raw.repeatMode === 'string') {
		const repeat = repeatModeFromClient(raw.repeatMode);
		if (repeat) {
			queueData.repeatMode = repeat;
		}
	}
	if (typeof raw.name === 'string') {
		queueData.name = raw.name;
	}
	if (typeof raw.id === 'string') {
		queueData.id = raw.id;
	}
	if (typeof raw.entity === 'string') {
		queueData.entity = raw.entity;
	}
	const containerMetadata = asRecord(raw.containerMetadata);
	if (containerMetadata) {
		queueData.containerMetadata = containerMetadata as NonNullable<MediaLoadRequest['queueData']>['containerMetadata'];
	}

	const request: MediaLoadRequest = {
		queueData
	};

	if (typeof raw.autoplay === 'boolean' || raw.autoplay === null) {
		request.autoplay = raw.autoplay as boolean | null;
	}
	if (typeof raw.currentTime === 'number' && Number.isFinite(raw.currentTime)) {
		request.startTime = raw.currentTime;
	}
	const loadCustomData = asRecord(raw.customData);
	if (loadCustomData) {
		request.customData = loadCustomData;
	}

	return request;
};

export const queueItemFromChrome = (raw: unknown): MediaQueueItem => {
	const record = asRecord(raw);
	if (!record) {
		throw new Error('Queue item must be an object');
	}

	const media = asRecord(record.media);
	if (!media) {
		throw new Error('Queue item missing media');
	}

	const item: MediaQueueItem = {
		mediaInfo: mediaInfoFromChrome(media)
	};

	if (typeof record.autoplay === 'boolean') {
		item.autoplay = record.autoplay;
	} else if (record.autoplay === null) {
		item.autoplay = undefined;
	}

	if (typeof record.preloadTime === 'number' && Number.isFinite(record.preloadTime)) {
		item.preloadTime = record.preloadTime;
	}

	if (typeof record.startTime === 'number' && Number.isFinite(record.startTime)) {
		item.startTime = record.startTime;
	}

	if (typeof record.playbackDuration === 'number' && Number.isFinite(record.playbackDuration)) {
		item.playbackDuration = record.playbackDuration;
	}

	if (typeof record.activeTrackIds === 'number') {
		item.activeTrackIds = [ record.activeTrackIds ];
	} else if (Array.isArray(record.activeTrackIds)) {
		item.activeTrackIds = record.activeTrackIds.filter(id => typeof id === 'number') as number[];
	}

	if (typeof record.itemId === 'number') {
		item.itemId = record.itemId;
	}

	if (record.customData && typeof record.customData === 'object') {
		item.customData = record.customData as Record<string, unknown>;
	}

	return item;
};

export const mediaInfoFromChrome = (media: Record<string, unknown>): MediaInfo => {
	let contentId: string | null = null;
	if (typeof media.contentId === 'string') {
		contentId = media.contentId;
	} else if (typeof media.contentUrl === 'string') {
		contentId = media.contentUrl;
	}
	if (!contentId) {
		throw new Error('Queue item missing contentId');
	}

	const contentType = typeof media.contentType === 'string' ? media.contentType : undefined;
	const customData = asRecord(media.customData);
	const duration = typeof media.duration === 'number' && Number.isFinite(media.duration) ? media.duration : undefined;
	const streamType = typeof media.streamType === 'string' ? media.streamType : undefined;
	const metadata = asRecord(media.metadata);
	const textTrackStyle = asRecord(media.textTrackStyle);
	let mediaTracksRaw: unknown[] | undefined;
	if (Array.isArray(media.tracks)) {
		mediaTracksRaw = media.tracks;
	} else if (Array.isArray(media.mediaTracks)) {
		mediaTracksRaw = media.mediaTracks;
	}
	const mediaTracks = mediaTracksRaw
		?.map(track => mediaTrackFromChrome(track))
		.filter((track): track is MediaTrack => track !== null);

	return buildMediaInfo({
		contentId,
		contentType,
		customData,
		duration,
		streamType,
		metadata,
		textTrackStyle,
		mediaTracks
	});
};

export const mediaTrackFromChrome = (raw: unknown): MediaTrack | null => {
	const record = asRecord(raw);
	if (!record) {
		return null;
	}
	let trackId: number | undefined;
	if (typeof record.trackId === 'number') {
		trackId = record.trackId;
	} else if (typeof record.id === 'number') {
		trackId = record.id;
	}
	const typeRaw = typeof record.type === 'string' ? record.type : undefined;
	if (typeof trackId !== 'number' || !typeRaw) {
		return null;
	}

	const typeMap: Record<string, MediaTrack['type']> = {
		text: 'text',
		TEXT: 'text',
		audio: 'audio',
		AUDIO: 'audio',
		video: 'video',
		VIDEO: 'video'
	};
	const type = typeMap[typeRaw];
	if (!type) {
		return null;
	}

	const subtypeMap: Record<string, MediaTrack['subtype']> = {
		captions: 'captions',
		CAPTIONS: 'captions',
		chapters: 'chapters',
		CHAPTERS: 'chapters',
		descriptions: 'descriptions',
		DESCRIPTIONS: 'descriptions',
		metadata: 'metadata',
		METADATA: 'metadata',
		subtitles: 'subtitles',
		SUBTITLES: 'subtitles'
	};

	return {
		id: trackId,
		type,
		name: typeof record.name === 'string' ? record.name : undefined,
		language: typeof record.language === 'string' ? record.language : undefined,
		contentId: typeof record.trackContentId === 'string' ? record.trackContentId : undefined,
		contentType: typeof record.trackContentType === 'string' ? record.trackContentType : undefined,
		customData: asRecord(record.customData),
		subtype: typeof record.subtype === 'string' ? subtypeMap[record.subtype] : undefined
	};
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export const asRecord = (value: unknown): Record<string, unknown> | undefined =>
	(isRecord(value) ? value : undefined);
