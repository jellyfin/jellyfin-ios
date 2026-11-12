/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import '../../i18n';
import { useRootStore } from '../../stores/RootStore';
import ScreenLockOverlay from '../ScreenLockOverlay';

const setLocked = isScreenLocked => act(() => {
	useRootStore.getState().set({ isScreenLocked });
});

describe('ScreenLockOverlay', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should render nothing when not locked', () => {
		const { toJSON } = render(<ScreenLockOverlay />);

		expect(toJSON()).toBeNull();
	});

	it('should briefly show the unlock button when locked', () => {
		const { getByText, queryByTestId } = render(<ScreenLockOverlay />);

		setLocked(true);
		expect(queryByTestId('screen-lock-overlay')).not.toBeNull();
		expect(getByText('Tap to unlock')).not.toBeNull();

		act(() => jest.advanceTimersByTime(3000));
		expect(queryByTestId('screen-unlock-button')).toBeNull();
	});

	it('should show the unlock button when touched', () => {
		const { getByTestId, queryByTestId } = render(<ScreenLockOverlay />);

		setLocked(true);
		act(() => jest.advanceTimersByTime(3000));
		expect(queryByTestId('screen-unlock-button')).toBeNull();

		fireEvent(getByTestId('screen-lock-overlay'), 'touchStart');
		expect(queryByTestId('screen-unlock-button')).not.toBeNull();
	});

	it('should unlock when the unlock button is pressed', () => {
		const { getByTestId, queryByTestId } = render(<ScreenLockOverlay />);

		setLocked(true);
		fireEvent.press(getByTestId('screen-unlock-button'));

		expect(useRootStore.getState().isScreenLocked).toBe(false);
		expect(queryByTestId('screen-lock-overlay')).toBeNull();
	});
});
