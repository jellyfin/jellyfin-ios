/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand';

type Logger = <
	T,
	Mps extends [StoreMutatorIdentifier, unknown][] = [],
	Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
	f: StateCreator<T, Mps, Mcs>,
	name?: string
) => StateCreator<T, Mps, Mcs>;

type LoggerImpl = <T>(
	f: StateCreator<T, [], []>,
	name?: string
) => StateCreator<T, [], []>;

const loggerImpl: LoggerImpl = (f, name) => (set, get, store) => {
	const loggedSet: typeof set = (...a) => {
		set(...(a as Parameters<typeof set>));
		console.debug(...(name ? [ `[${name}]` ] : []), get());
	};
	store.setState = loggedSet;

	return f(loggedSet, get, store);
};

/**
 * A simple logging middleware for Zustand.
 * @see https://docs.pmnd.rs/zustand/guides/typescript#middleware-that-doesn't-change-the-store-type
 */
export const logger = loggerImpl as unknown as Logger;
