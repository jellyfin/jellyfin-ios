/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/// <reference types="@types/jest" />;

import { act } from '@testing-library/react';
import type * as ZustandExportedTypes from 'zustand';
export * from 'zustand';

const { create: actualCreate, createStore: actualCreateStore } =
  jest.requireActual<typeof ZustandExportedTypes>('zustand');

// a variable to hold reset functions for all stores declared in the app
export const storeResetFns = new Set<() => void>();

const createUncurried = <T>(
	stateCreator: ZustandExportedTypes.StateCreator<T>
) => {
	const store = actualCreate(stateCreator);
	const initialState = store.getInitialState();
	storeResetFns.add(() => {
		store.setState(initialState, true);
	});
	return store;
};

// when creating a store, we get its initial state, create a reset function and add it in the set
export const create = (<T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
	console.log('zustand create mock');

	// to support curried version of create
	return typeof stateCreator === 'function'
		? createUncurried(stateCreator)
		: createUncurried;
}) as typeof ZustandExportedTypes.create;

const createStoreUncurried = <T>(
	stateCreator: ZustandExportedTypes.StateCreator<T>
) => {
	const store = actualCreateStore(stateCreator);
	const initialState = store.getInitialState();
	storeResetFns.add(() => {
		store.setState(initialState, true);
	});
	return store;
};

// when creating a store, we get its initial state, create a reset function and add it in the set
export const createStore = (<T>(
	stateCreator: ZustandExportedTypes.StateCreator<T>
) => {
	console.log('zustand createStore mock');

	// to support curried version of createStore
	return typeof stateCreator === 'function'
		? createStoreUncurried(stateCreator)
		: createStoreUncurried;
}) as typeof ZustandExportedTypes.createStore;

// reset all stores after each test run
afterEach(() => {
	act(() => {
		storeResetFns.forEach((resetFn) => {
			resetFn();
		});
	});
});
