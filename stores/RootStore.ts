/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// polyfill crypto.getRandomValues
import 'react-native-get-random-values';

import { Jellyfin } from '@jellyfin/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nativeApplicationVersion } from 'expo-application';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import pkg from '../package.json';
import { getAppName, getSafeDeviceName } from '../utils/Device';

import { logger } from './middleware/logger';

type State = {
	deviceId: string,
	isFullscreen: boolean,
	isReloadRequired: boolean,
	didPlayerCloseManually: boolean,
};

type Actions = {
	set: (v: Partial<State>) => void,
	getSdk: () => Jellyfin,
	reset: () => void,
};

export type RootStore = State & Actions;

const STORE_NAME = 'RootStore';

const initialState: State = {
	/** Generate a random unique device id */
	deviceId: uuidv4(),

	/** Is the fullscreen interface active */
	isFullscreen: false,

	/** Does the webview require a reload */
	isReloadRequired: false,

	/** Was the native player closed manually */
	didPlayerCloseManually: true
};

export const useRootStore = create<State & Actions>()(
	logger(
		persist(
			(_set, _get) => ({
				...initialState,
				set: state => _set(prev => ({
					...prev,
					...state
				})),
				getSdk: () => new Jellyfin({
					clientInfo: {
						name: getAppName(),
						version: nativeApplicationVersion || pkg.version
					},
					deviceInfo: {
						name: getSafeDeviceName(),
						id: _get().deviceId
					}
				}),
				reset: () => {
					_set({
						...initialState,
						deviceId: uuidv4()
					});
				}
			}), {
				name: STORE_NAME,
				storage: createJSONStorage(() => AsyncStorage),
				partialize: state => ({ deviceId: state.deviceId })
			}
		),
		STORE_NAME
	)
);
