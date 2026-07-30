/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { DeviceProfile } from '@jellyfin/sdk/lib/generated-client/models/device-profile';
import { compareVersions } from '@jellyfin/sdk/lib/utils/versioning';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import iOS10Profile from './profiles/ios-10';
import iOS11Profile from './profiles/ios-11';
import iOS13Profile from './profiles/ios-13';
import iOS13Fmp4Profile from './profiles/ios-13-fmp4';

/** Gets the app name used for API requests. */
export function getAppName() {
	return `Jellyfin ${Device.osName}`;
}

/** Gets the app name used for display within the app. */
export function getAppDisplayName() {
	return `Jellyfin for ${Device.osName}`;
}

export function getSafeDeviceName() {
	// FIXME: This character replacement hasn't been needed for awhile.
	// The SDK will properly encode special characters.
	// Need verification that web will encode values from the NativeShell.
	const safeName = (Constants.deviceName || '')
	// Replace non-ascii apostrophe with single quote (default on iOS)
		.replace(/’/g, '\'')
	// Remove all other non-ascii characters
		.replace(/[^\x20-\x7E]/g, '')
	// Trim whitespace
		.trim();
	if (safeName) {
		return safeName;
	}

	return Device.modelName || 'Jellyfin iOS Device';
}

export function getDeviceProfile({ enableFmp4 = false } = {}): DeviceProfile {
	if (Platform.OS === 'ios') {
		if (compareVersions(String(Platform.Version), '11') < 0) {
			return iOS10Profile;
		} else if (compareVersions(String(Platform.Version), '13') < 0) {
			return iOS11Profile;
		} else if (enableFmp4) {
			return iOS13Fmp4Profile;
		} else {
			return iOS13Profile;
		}
	}
	// NOTE: Other platforms are not supported
	return {};
}

export function isCompact({ height = 500 } = {}) {
	return height < 480;
}

// Does the platform support system level themes: https://docs.expo.io/versions/latest/sdk/appearance/
export function isSystemThemeSupported() {
	return (Platform.OS === 'ios' && compareVersions(String(Platform.Version), '12') > 0) ||
		(Platform.OS === 'android' && compareVersions(String(Platform.Version), '9') > 0);
}
