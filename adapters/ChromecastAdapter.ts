import CastContextModule, {
	CastChannel,
	MediaPlayerState,
	RemoteMediaClient,
	type Device,
	type MediaLoadRequest,
	type MediaSeekOptions,
	type MediaStatus
} from 'react-native-google-cast';

import {
	asRecord,
	buildMediaInfo,
	isRecord,
	mapIdleReason,
	mapPlayerState,
	mapRepeatMode,
	mediaInfoToJson,
	queueDataFromStatus,
	queueItemToJson,
	queueLoadRequestFromChrome
} from './ChromecastPayloadMapper';

const NOT_IMPLEMENTED_ERROR = 'not_implemented';
const SESSION_ERROR = 'session_error';
const CHANNEL_ERROR = 'channel_error';
const INVALID_PARAMETER = 'invalid_parameter';
const CANCEL_ERROR = 'cancel';

export type ChromecastCallbackSender = (
	action: string,
	keep: boolean,
	err: unknown,
	result: unknown
) => void;

const MEDIA_SESSION_ID = 1;
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Adapter that translates between the Chromecast shim loaded that exists inside the WebView and
 * our react-native-google-cast running in the native shell. The goal is to expose
 * the subset of Chromecast behavior Jellyfin Web expects while re-using the
 * modern Cast SDK bindings.
 *
 * The implementation here is based off the ChromeCast.staticjs file, rather than implementing everything
 * ourselves.
 * */
class ChromecastAdapter {
	private static sendCallback: ChromecastCallbackSender | null = null;
	private static initialized = false;
	private static chromeCastApiInitialized = false;
	private static pendingSessionSync = false;
	private static lastReceiverAvailability: boolean | null = null;
	private static castSession: import('react-native-google-cast').CastSession | null = null;
	private static remoteClient: RemoteMediaClient | null = null;
	private static mediaStatusSubscription?: { remove: () => void };
	private static pendingNamespaces = new Set<string>();
	private static channels = new Map<string, CastChannel>();
	private static requestSessionPending = false;
	private static requestSessionTimer?: ReturnType<typeof setTimeout>;
	private static lastKnownSessionJson: Record<string, unknown> | null = null;

	static init(sender: ChromecastCallbackSender) {
		ChromecastAdapter.sendCallback = sender;
		ChromecastAdapter.ensureListeners();
	}

	static async handleExecCast(action?: string, args: unknown[] = []) {
		if (!action) {
			return;
		}

		console.debug('[ChromecastAdapter] execCast', action, args);

		try {
			switch (action) {
				case 'setup':
					ChromecastAdapter.handleSetup();
					break;
				case 'initialize':
					ChromecastAdapter.handleInitialize();
					break;
				case 'requestSession':
					await ChromecastAdapter.handleRequestSession();
					break;
				case 'sessionLeave':
					await ChromecastAdapter.handleEndSession(false);
					break;
				case 'sessionStop':
					await ChromecastAdapter.handleEndSession(true);
					break;
				case 'setReceiverVolumeLevel':
					await ChromecastAdapter.handleSetReceiverVolume(args[0]);
					break;
				case 'setReceiverMuted':
					await ChromecastAdapter.handleSetReceiverMuted(args[0]);
					break;
				case 'sendMessage':
					await ChromecastAdapter.handleSendMessage(args[0], args[1]);
					break;
				case 'addMessageListener':
					await ChromecastAdapter.handleAddMessageListener(args[0]);
					break;
				case 'loadMedia':
					await ChromecastAdapter.handleLoadMedia(args);
					break;
				case 'queueLoad':
					await ChromecastAdapter.handleQueueLoad(args);
					break;
				case 'queueJumpToItem':
					await ChromecastAdapter.handleQueueJumpToItem(args);
					break;
				case 'mediaPlay':
					await ChromecastAdapter.invokeOnClient('play', action);
					break;
				case 'mediaPause':
					await ChromecastAdapter.invokeOnClient('pause', action);
					break;
				case 'mediaSeek':
					await ChromecastAdapter.handleMediaSeek(args as unknown[]);
					break;
				case 'mediaStop':
					await ChromecastAdapter.invokeOnClient('stop', action);
					break;
				case 'setMediaVolume':
					await ChromecastAdapter.handleSetMediaVolume(args as unknown[]);
					break;
				case 'mediaEditTracksInfo':
					await ChromecastAdapter.handleEditTracksInfo(args as unknown[]);
					break;
				default:
					ChromecastAdapter.respondWithError(action, NOT_IMPLEMENTED_ERROR);
			}
		} catch (err) {
			console.error('[ChromecastAdapter] execCast failed', action, err);
			ChromecastAdapter.respondWithError(action, SESSION_ERROR);
		}
	}

	// -- Setup / events -----------------------------------------------------

	private static handleSetup() {
		console.log('[ChromecastAdapter] Setup called');
		ChromecastAdapter.emitEvent('SETUP', []);
		CastContextModule.getCastState()
			.then(state => {
				console.log('[ChromecastAdapter] Cast state:', state);
				ChromecastAdapter.emitEvent('RECEIVER_LISTENER', [ ChromecastAdapter.isCastStateAvailable(state) ]);
				return state;
			})
			.catch(() => {
				ChromecastAdapter.emitEvent('RECEIVER_LISTENER', [ false ]);
				return undefined;
			});

		// Check for existing session
		CastContextModule.getSessionManager()
			.getCurrentCastSession()
			.then(async session => {
				if (session) {
					console.log('[ChromecastAdapter] Found existing Cast session on setup');
					await ChromecastAdapter.onSessionConnected(session);
				} else {
					console.log('[ChromecastAdapter] No existing Cast session');
				}
				return session;
			})
			.catch(err => {
				console.warn('[ChromecastAdapter] Failed to check for existing session:', err);
				return undefined;
			});

		ChromecastAdapter.sendCallback?.('setup', true, null, 'OK');
	}

	private static handleInitialize() {
		ChromecastAdapter.chromeCastApiInitialized = true;
		ChromecastAdapter.flushPendingSessionSync();
		ChromecastAdapter.respondSuccess('initialize');
	}

	private static async handleRequestSession() {
		if (ChromecastAdapter.castSession) {
			const sessionJson = await ChromecastAdapter.sessionToJson(ChromecastAdapter.castSession);
			ChromecastAdapter.lastKnownSessionJson = sessionJson;
			ChromecastAdapter.emitEvent('SESSION_LISTENER', [ sessionJson ]);
			ChromecastAdapter.emitEvent('SESSION_UPDATE', [ sessionJson ]);
			ChromecastAdapter.emitMediaState(sessionJson);
			ChromecastAdapter.respondSuccess('requestSession', sessionJson);

			// Still show the Cast dialog so the user can switch devices if desired.
			try {
				const shown = await CastContextModule.showCastDialog();
				console.debug('[ChromecastAdapter] showCastDialog (existing session) result', shown);
				if (!shown) {
					console.debug('[ChromecastAdapter] showCastDialog returned false, showing expanded controls instead');
					await CastContextModule.showExpandedControls().catch(err => {
						console.warn('[ChromecastAdapter] showExpandedControls failed', err);
					});
				}
			} catch (err) {
				console.warn('[ChromecastAdapter] showCastDialog failed while already connected', err);
			}
			return;
		}

		ChromecastAdapter.requestSessionPending = true;
		ChromecastAdapter.requestSessionTimer && clearTimeout(ChromecastAdapter.requestSessionTimer);
		ChromecastAdapter.requestSessionTimer = setTimeout(() => {
			if (ChromecastAdapter.requestSessionPending) {
				ChromecastAdapter.requestSessionPending = false;
				ChromecastAdapter.respondWithError('requestSession', CANCEL_ERROR);
			}
		}, REQUEST_TIMEOUT_MS);

		const shown = await CastContextModule.showCastDialog();
		console.debug('[ChromecastAdapter] showCastDialog result', shown, 'hasSession', !!ChromecastAdapter.castSession);
		if (!shown && !ChromecastAdapter.castSession) {
			ChromecastAdapter.clearPendingRequest(CANCEL_ERROR);
		}
	}

	private static async handleEndSession(stopCasting: boolean) {
		const sessionManager = CastContextModule.getSessionManager();
		await sessionManager.endCurrentSession(stopCasting).catch(() => {
			throw new Error(SESSION_ERROR);
		});
		ChromecastAdapter.respondSuccess(stopCasting ? 'sessionStop' : 'sessionLeave');
	}

	// -- Receiver volume ----------------------------------------------------

	private static async handleSetReceiverVolume(level: unknown) {
		if (typeof level !== 'number') {
			ChromecastAdapter.respondWithError('setReceiverVolumeLevel', INVALID_PARAMETER);
			return;
		}

		if (!ChromecastAdapter.castSession) {
			ChromecastAdapter.respondWithError('setReceiverVolumeLevel', SESSION_ERROR);
			return;
		}

		try {
			ChromecastAdapter.castSession.setVolume(level);
			await ChromecastAdapter.emitSessionUpdate();
			ChromecastAdapter.respondSuccess('setReceiverVolumeLevel');
		} catch (err) {
			console.warn('[ChromecastAdapter] setVolume failed', err);
			ChromecastAdapter.respondWithError('setReceiverVolumeLevel', SESSION_ERROR);
		}
	}

	private static async handleSetReceiverMuted(muted: unknown) {
		if (typeof muted !== 'boolean') {
			ChromecastAdapter.respondWithError('setReceiverMuted', INVALID_PARAMETER);
			return;
		}

		if (!ChromecastAdapter.castSession) {
			ChromecastAdapter.respondWithError('setReceiverMuted', SESSION_ERROR);
			return;
		}

		try {
			ChromecastAdapter.castSession.setMute(muted);
			await ChromecastAdapter.emitSessionUpdate();
			ChromecastAdapter.respondSuccess('setReceiverMuted');
		} catch (err) {
			console.warn('[ChromecastAdapter] setMute failed', err);
			ChromecastAdapter.respondWithError('setReceiverMuted', SESSION_ERROR);
		}
	}

	// -- Messaging ----------------------------------------------------------

	private static async handleSendMessage(namespace: unknown, message: unknown) {
		if (typeof namespace !== 'string') {
			ChromecastAdapter.respondWithError('sendMessage', INVALID_PARAMETER);
			return;
		}

		const channel = await ChromecastAdapter.ensureChannel(namespace);
		if (!channel) {
			ChromecastAdapter.respondWithError('sendMessage', CHANNEL_ERROR);
			return;
		}

		try {
			await channel.sendMessage(message as Record<string, unknown> | string);
			ChromecastAdapter.respondSuccess('sendMessage');
		} catch (err) {
			console.warn('[ChromecastAdapter] sendMessage failed', err);
			ChromecastAdapter.respondWithError('sendMessage', CHANNEL_ERROR);
		}
	}

	private static async handleAddMessageListener(namespace: unknown) {
		if (typeof namespace !== 'string') {
			ChromecastAdapter.respondWithError('addMessageListener', INVALID_PARAMETER);
			return;
		}

		await ChromecastAdapter.ensureChannel(namespace);
		ChromecastAdapter.pendingNamespaces.add(namespace);
		ChromecastAdapter.respondSuccess('addMessageListener');
	}

	// -- Media control ------------------------------------------------------

	private static async handleLoadMedia(args: unknown[]) {
		console.log('[ChromecastAdapter] loadMedia', args);
		if (!ChromecastAdapter.remoteClient) {
			ChromecastAdapter.respondWithError('loadMedia', SESSION_ERROR);
			return;
		}

		const [
			contentId,
			customData,
			contentType,
			duration,
			streamType,
			autoplay,
			startTime,
			metadata,
			textTrackStyle
		] = args as [
			string,
			Record<string, unknown>,
			string,
			number,
			string,
			boolean,
			number,
			Record<string, unknown>,
			Record<string, unknown>
		];

		const mediaInfo = buildMediaInfo({
			contentId,
			customData,
			contentType,
			duration,
			streamType,
			metadata,
			textTrackStyle
		});

		const loadRequest: MediaLoadRequest = {
			autoplay,
			startTime,
			mediaInfo
		};

		await ChromecastAdapter.remoteClient.loadMedia(loadRequest);
		const status = await ChromecastAdapter.remoteClient.getMediaStatus();
		const mediaObject = ChromecastAdapter.castSession && status
			? await ChromecastAdapter.mediaStatusToJson(ChromecastAdapter.castSession, status)
			: null;

		if (mediaObject) {
			ChromecastAdapter.emitEvent('MEDIA_LOAD', [ mediaObject ]);
		}

		ChromecastAdapter.respondSuccess('loadMedia', mediaObject);
	}

	private static async handleQueueLoad(args: unknown[]) {
		if (!ChromecastAdapter.remoteClient) {
			ChromecastAdapter.respondWithError('queueLoad', SESSION_ERROR);
			return;
		}

		const [ requestRaw ] = args as [Record<string, unknown> | undefined];
		if (!isRecord(requestRaw)) {
			ChromecastAdapter.respondWithError('queueLoad', INVALID_PARAMETER);
			return;
		}

		try {
			const request = queueLoadRequestFromChrome(requestRaw);
			await ChromecastAdapter.remoteClient.loadMedia(request);
			const status = await ChromecastAdapter.remoteClient.getMediaStatus();
			const mediaObject = ChromecastAdapter.castSession && status
				? await ChromecastAdapter.mediaStatusToJson(ChromecastAdapter.castSession, status)
				: null;

			if (mediaObject) {
				ChromecastAdapter.emitEvent('MEDIA_LOAD', [ mediaObject ]);
			}

			ChromecastAdapter.respondSuccess('queueLoad', mediaObject);
		} catch (err) {
			console.warn('[ChromecastAdapter] queueLoad failed', err);
			ChromecastAdapter.respondWithError('queueLoad', SESSION_ERROR);
		}
	}

	private static async handleQueueJumpToItem(args: unknown[]) {
		const [ itemIdRaw ] = args as [number | undefined];
		const itemId = typeof itemIdRaw === 'number' ? itemIdRaw : Number(itemIdRaw);
		if (!Number.isFinite(itemId)) {
			ChromecastAdapter.respondWithError('queueJumpToItem', INVALID_PARAMETER);
			return;
		}

		console.warn('[ChromecastAdapter] queueJumpToItem not supported on this platform (requested id:', itemId, ')');
		ChromecastAdapter.respondWithError('queueJumpToItem', NOT_IMPLEMENTED_ERROR);
	}

	private static async handleMediaSeek(args: unknown[]) {
		if (!ChromecastAdapter.remoteClient) {
			ChromecastAdapter.respondWithError('mediaSeek', SESSION_ERROR);
			return;
		}

		const [ position, resumeStateRaw ] = args as [number, string | undefined];
		const options: MediaSeekOptions = {
			position,
			resumeState: ChromecastAdapter.mapResumeState(resumeStateRaw)
		};

		await ChromecastAdapter.remoteClient.seek(options);
		ChromecastAdapter.respondSuccess('mediaSeek');
	}

	private static async handleSetMediaVolume(args: unknown[]) {
		if (!ChromecastAdapter.remoteClient) {
			ChromecastAdapter.respondWithError('setMediaVolume', SESSION_ERROR);
			return;
		}

		const [ level, muted ] = args as [number | undefined, boolean | undefined];

		try {
			if (typeof level === 'number') {
				await ChromecastAdapter.remoteClient.setStreamVolume(level);
			}
			if (typeof muted === 'boolean') {
				await ChromecastAdapter.remoteClient.setStreamMuted(muted);
			}
			ChromecastAdapter.respondSuccess('setMediaVolume');
		} catch (err) {
			console.warn('[ChromecastAdapter] setMediaVolume failed', err);
			ChromecastAdapter.respondWithError('setMediaVolume', SESSION_ERROR);
		}
	}

	private static async handleEditTracksInfo(args: unknown[]) {
		if (!ChromecastAdapter.remoteClient) {
			ChromecastAdapter.respondWithError('mediaEditTracksInfo', SESSION_ERROR);
			return;
		}

		const [ trackIdsRaw, textStyle ] = args as [number[] | null, Record<string, unknown> | null];

		try {
			if (Array.isArray(trackIdsRaw)) {
				await ChromecastAdapter.remoteClient.setActiveTrackIds(trackIdsRaw);
			}
			if (textStyle) {
				await ChromecastAdapter.remoteClient.setTextTrackStyle(textStyle);
			}
			ChromecastAdapter.respondSuccess('mediaEditTracksInfo');
		} catch (err) {
			console.warn('[ChromecastAdapter] mediaEditTracksInfo failed', err);
			ChromecastAdapter.respondWithError('mediaEditTracksInfo', SESSION_ERROR);
		}
	}

	private static async invokeOnClient(method: keyof RemoteMediaClient, action: string) {
		if (!ChromecastAdapter.remoteClient) {
			ChromecastAdapter.respondWithError(action, SESSION_ERROR);
			return;
		}

		const fn = ChromecastAdapter.remoteClient[method] as (() => Promise<void>);
		await fn.call(ChromecastAdapter.remoteClient);
		ChromecastAdapter.respondSuccess(action);
	}

	// -- Helpers ------------------------------------------------------------

	private static ensureListeners() {
		if (ChromecastAdapter.initialized) return;
		ChromecastAdapter.initialized = true;

		const sessionManager = CastContextModule.getSessionManager();

		sessionManager.onSessionStarted(async session => {
			await ChromecastAdapter.onSessionConnected(session);
		});

		sessionManager.onSessionResumed(async session => {
			await ChromecastAdapter.onSessionConnected(session);
		});

		sessionManager.onSessionStartFailed((_session, error) => {
			console.warn('[ChromecastAdapter] session start failed', error);
			ChromecastAdapter.clearPendingRequest(SESSION_ERROR);
		});

		sessionManager.onSessionEnded((session, error) => {
			ChromecastAdapter.onSessionEnded(session, error);
		});

		CastContextModule.onCastStateChanged(state => {
			const available = ChromecastAdapter.isCastStateAvailable(state);
			ChromecastAdapter.lastReceiverAvailability = available;
			ChromecastAdapter.emitEvent('RECEIVER_LISTENER', [ available ]);
		});
	}

	private static async onSessionConnected(session: import('react-native-google-cast').CastSession) {
		console.log('[ChromecastAdapter] Cast session connected');
		ChromecastAdapter.castSession = session;
		ChromecastAdapter.remoteClient = session.getClient();
		ChromecastAdapter.attachRemoteClientListeners();
		await ChromecastAdapter.ensurePendingChannels();

		const sessionJson = await ChromecastAdapter.sessionToJson(session);
		ChromecastAdapter.lastKnownSessionJson = sessionJson;
		console.log('[ChromecastAdapter] Notifying web client of Cast session:', sessionJson.sessionId);
		ChromecastAdapter.emitEvent('SESSION_LISTENER', [ sessionJson ]);
		ChromecastAdapter.emitEvent('SESSION_UPDATE', [ sessionJson ]);
		ChromecastAdapter.emitMediaState(sessionJson);
		ChromecastAdapter.pendingSessionSync = false;
		ChromecastAdapter.clearPendingRequest(null, sessionJson);
	}

	private static onSessionEnded(
		session: import('react-native-google-cast').CastSession,
		error?: string
	) {
		void session;
		ChromecastAdapter.detachRemoteClientListeners();
		ChromecastAdapter.castSession = null;
		ChromecastAdapter.remoteClient = null;
		ChromecastAdapter.channels.forEach(channel => channel.remove().catch(() => undefined));
		ChromecastAdapter.channels.clear();

		if (ChromecastAdapter.lastKnownSessionJson) {
			const sessionJson = {
				...ChromecastAdapter.lastKnownSessionJson,
				status: 'stopped'
			};
			ChromecastAdapter.emitEvent('SESSION_UPDATE', [ sessionJson ]);
		}
		ChromecastAdapter.lastKnownSessionJson = null;

		if (ChromecastAdapter.requestSessionPending) {
			ChromecastAdapter.clearPendingRequest(error ?? CANCEL_ERROR);
		}
	}

	private static attachRemoteClientListeners() {
		if (!ChromecastAdapter.remoteClient || !ChromecastAdapter.castSession) return;

		ChromecastAdapter.detachRemoteClientListeners();
		ChromecastAdapter.mediaStatusSubscription = ChromecastAdapter.remoteClient.onMediaStatusUpdated(async status => {
			if (!status || !ChromecastAdapter.castSession) return;
			const mediaJson = await ChromecastAdapter.mediaStatusToJson(ChromecastAdapter.castSession, status);
			if (mediaJson) {
				ChromecastAdapter.emitEvent('MEDIA_UPDATE', [ mediaJson ]);
			}
		});
	}

	private static detachRemoteClientListeners() {
		ChromecastAdapter.mediaStatusSubscription?.remove();
		ChromecastAdapter.mediaStatusSubscription = undefined;
	}

	private static async ensurePendingChannels() {
		if (!ChromecastAdapter.castSession) return;

		for (const namespace of ChromecastAdapter.pendingNamespaces) {
			await ChromecastAdapter.ensureChannel(namespace);
		}
	}

	private static async ensureChannel(namespace: string): Promise<CastChannel | null> {
		if (ChromecastAdapter.channels.has(namespace)) {
			return ChromecastAdapter.channels.get(namespace) ?? null;
		}

		if (!ChromecastAdapter.castSession) {
			return null;
		}

		try {
			const channel = await ChromecastAdapter.castSession.addChannel(namespace);
			channel.onMessage(message => {
				ChromecastAdapter.emitEvent('RECEIVER_MESSAGE', [ namespace, message ]);
			});
			ChromecastAdapter.channels.set(namespace, channel);
			return channel;
		} catch (err) {
			console.warn('[ChromecastAdapter] ensureChannel failed', namespace, err);
			return null;
		}
	}

	private static clearPendingRequest(error: string | null, sessionJson?: Record<string, unknown>) {
		if (!ChromecastAdapter.requestSessionPending) return;
		ChromecastAdapter.requestSessionPending = false;
		ChromecastAdapter.requestSessionTimer && clearTimeout(ChromecastAdapter.requestSessionTimer);
		ChromecastAdapter.requestSessionTimer = undefined;

		if (sessionJson) {
			ChromecastAdapter.respondSuccess('requestSession', sessionJson);
		} else {
			ChromecastAdapter.respondWithError('requestSession', error ?? CANCEL_ERROR);
		}
	}

	private static async emitSessionUpdate() {
		if (!ChromecastAdapter.castSession) return;
		const sessionJson = await ChromecastAdapter.sessionToJson(ChromecastAdapter.castSession);
		ChromecastAdapter.lastKnownSessionJson = sessionJson;
		ChromecastAdapter.emitEvent('SESSION_UPDATE', [ sessionJson ]);
	}

	private static emitEvent(event: string, args: unknown[]) {
		ChromecastAdapter.sendCallback?.('setup', true, null, [ event, args ]);
	}

	private static respondSuccess(action: string, result: unknown = null) {
		ChromecastAdapter.sendCallback?.(action, false, null, result);
	}

	private static respondWithError(action: string, error: unknown) {
		ChromecastAdapter.sendCallback?.(action, false, error, null);
	}

	private static mapResumeState(state?: string): MediaSeekOptions['resumeState'] {
		switch (state) {
			case 'PLAYBACK_START':
				return 'play';
			case 'PLAYBACK_PAUSE':
				return 'pause';
			default:
				return undefined;
		}
	}

	private static async sessionToJson(session: import('react-native-google-cast').CastSession) {
		const [ metadata, device, volumeLevel, isMuted, mediaStatus ] = await Promise.all([
			session.getApplicationMetadata().catch(() => null as unknown),
			session.getCastDevice().catch(() => null as Device | null),
			session.getVolume().catch(() => null as number | null),
			session.isMute().catch(() => null as boolean | null),
			ChromecastAdapter.remoteClient?.getMediaStatus() ?? null
		]);
		const metadataRecord = asRecord(metadata);
		const metadataImages: Array<{ url: string }> = Array.isArray(metadataRecord?.images)
			? (metadataRecord.images as Array<{ url?: string }>)
				.filter((img): img is { url: string } => typeof img?.url === 'string')
				.map(img => ({ url: img.url }))
			: [];
		const metadataName = typeof metadataRecord?.name === 'string' ? metadataRecord.name : undefined;
		const metadataAppId = typeof metadataRecord?.applicationId === 'string' ? metadataRecord.applicationId : undefined;

		const receiver = device
			? {
				friendlyName: device.friendlyName,
				label: device.deviceId,
				volume: {
					level: volumeLevel ?? 1,
					muted: isMuted ?? false
				}
			}
			: (
				(asRecord(ChromecastAdapter.lastKnownSessionJson)?.receiver as Record<string, unknown> | undefined) ?? {
					friendlyName: metadataName ?? 'Chromecast',
					label: session.id,
					volume: {
						level: volumeLevel ?? 1,
						muted: isMuted ?? false
					}
				}
			);

		const mediaObjects = [] as Record<string, unknown>[];
		if (mediaStatus) {
			const mediaJson = await ChromecastAdapter.mediaStatusToJson(session, mediaStatus);
			if (mediaJson) {
				mediaObjects.push(mediaJson);
			}
		}

		return {
			appId: metadataAppId,
			appImages: metadataImages,
			displayName: metadataName,
			media: mediaObjects,
			receiver,
			sessionId: session.id
		};
	}

	private static async mediaStatusToJson(
		session: import('react-native-google-cast').CastSession,
		status: MediaStatus
	) {
		const mediaInfo = status.mediaInfo ? mediaInfoToJson(status.mediaInfo) : null;
		const queueItems = status.queueItems?.map((item, index) => queueItemToJson(item, index)) ?? [];

		return {
			activeTrackIds: status.activeTrackIds ?? undefined,
			currentItemId: status.currentItemId ?? null,
			currentTime: status.streamPosition ?? 0,
			customData: status.customData ?? undefined,
			idleReason: mapIdleReason(status.idleReason),
			items: queueItems,
			isAlive: status.playerState !== MediaPlayerState.IDLE,
			loadingItemId: status.loadingItemId ?? null,
			media: mediaInfo,
			mediaSessionId: MEDIA_SESSION_ID,
			playbackRate: status.playbackRate ?? 1,
			playerState: mapPlayerState(status.playerState),
			preloadedItemId: status.preloadedItemId ?? null,
			queueData: queueDataFromStatus(status),
			repeatMode: mapRepeatMode(status.queueRepeatMode),
			sessionId: session.id,
			volume: {
				level: status.volume ?? 1,
				muted: status.isMuted ?? false
			}
		};
	}

	static syncSessionWithWebView() {
		console.debug('[ChromecastAdapter] syncSessionWithWebView invoked');
		ChromecastAdapter.pendingSessionSync = true;
		ChromecastAdapter.flushPendingSessionSync();
	}

	static syncReceiverAvailabilityWithWebView() {
		if (typeof ChromecastAdapter.lastReceiverAvailability === 'boolean') {
			console.debug('[ChromecastAdapter] replaying receiver availability', ChromecastAdapter.lastReceiverAvailability);
			ChromecastAdapter.emitEvent('RECEIVER_LISTENER', [ ChromecastAdapter.lastReceiverAvailability ]);
		}
	}

	private static emitMediaState(sessionJson: Record<string, unknown> | null) {
		const record = asRecord(sessionJson);
		const media = Array.isArray(record?.media) ? record.media : null;
		if (media && media.length > 0 && media[0]) {
			ChromecastAdapter.emitEvent('MEDIA_LOAD', [ media[0] ]);
			ChromecastAdapter.emitEvent('MEDIA_UPDATE', [ media[0] ]);
		}
	}

	private static flushPendingSessionSync() {
		if (!ChromecastAdapter.pendingSessionSync) return;
		if (!ChromecastAdapter.chromeCastApiInitialized) {
			console.debug('[ChromecastAdapter] delaying session sync until Cast API initializes');
			return;
		}
		if (!ChromecastAdapter.lastKnownSessionJson) {
			console.debug('[ChromecastAdapter] no cached Cast session to sync');
			return;
		}
		ChromecastAdapter.pendingSessionSync = false;
		console.debug('[ChromecastAdapter] replaying Cast session to web client');
		ChromecastAdapter.emitEvent('SESSION_LISTENER', [ ChromecastAdapter.lastKnownSessionJson ]);
		ChromecastAdapter.emitEvent('SESSION_UPDATE', [ ChromecastAdapter.lastKnownSessionJson ]);
		ChromecastAdapter.emitMediaState(ChromecastAdapter.lastKnownSessionJson);
	}

	private static isCastStateAvailable(state: string | null) {
		// Receiver is available when Cast SDK is initialized and devices exist
		// Exclude NO_DEVICES_AVAILABLE state
		return state !== null && state !== 'no_devices_available';
	}

	static hasActiveSession() {
		return !!ChromecastAdapter.castSession;
	}
}

export default ChromecastAdapter;
