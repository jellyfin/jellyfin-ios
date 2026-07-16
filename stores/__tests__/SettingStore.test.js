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
import { Platform } from 'react-native';

import Themes from '../../themes';
import { useSettingStore } from '../SettingStore';

jest.mock('react-native/Libraries/Utilities/Platform');

describe('SettingStore', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	it('should initialize with default values', () => {
		const store = renderHook(() => useSettingStore((state) => state));
		act(() => {
			store.result.current.reset();
		});
		expect(store.result.current.activeServer).toBe(0);
		expect(store.result.current.isRotationLockEnabled).toBe(true);
		expect(store.result.current.isScreenLockEnabled).toBe(false);
		expect(store.result.current.isTabLabelsEnabled).toBe(true);
		expect(store.result.current.themeId).toBe('dark');
		expect(store.result.current.systemThemeId).toBeNull();
		expect(store.result.current.isSystemThemeEnabled).toBe(false);
		expect(store.result.current.getTheme()).toBe(Themes.dark);
		expect(store.result.current.isNativeVideoPlayerEnabled).toBe(false);
		expect(store.result.current.isFmp4Enabled).toBe(true);
		expect(store.result.current.isExperimentalNativeAudioPlayerEnabled).toBe(true);
		expect(store.result.current.isExperimentalDownloadsEnabled).toBe(false);

		act(store.unmount);
	});

	it('should disable rotation lock for iPad devices', () => {
		Platform.isPad = true;
		const store = renderHook(() => useSettingStore((state) => state));
		act(() => {
			store.result.current.reset();
		});
		store.rerender();

		expect(store.result.current.isRotationLockEnabled).toBe(false);
	});

	it('should enable screen lock on older iOS versions', () => {
		Platform.Version = '13';
		const store = renderHook(() => useSettingStore((state) => state));
		act(() => {
			store.result.current.reset();
		});

		expect(store.result.current.isScreenLockEnabled).toBe(true);
	});

	it('should enable screen lock on non-iOS platforms', () => {
		Platform.OS = 'android';
		const store = renderHook(() => useSettingStore((state) => state));
		act(() => {
			store.result.current.reset();
		});

		expect(store.result.current.isScreenLockEnabled).toBe(true);
	});

	it('should use the system theme when enabled', () => {
		const store = renderHook(() => useSettingStore((state) => state));
		act(() => {
			store.result.current.reset();
		});
		act(() => {
			store.result.current.set({ isSystemThemeEnabled: true });
		});

		expect(store.result.current.getTheme()).toBe(Themes.dark);

		act(() => {
			store.result.current.set({ systemThemeId: 'light' });
		});
		expect(store.result.current.getTheme()).toBe(Themes.light);
	});

	it('should use the app theme if system theme is "no-preference"', () => {
		const store = renderHook(() => useSettingStore((state) => state));
		act(() => {
			store.result.current.reset();
		});

		act(() => {
			store.result.current.set({
				isSystemThemeEnabled: true,
				systemThemeId: 'no-preference',
				themeId: 'light'
			});
		});

		expect(store.result.current.getTheme()).toBe(Themes.light);
	});

	it('should return the default theme if an invalid theme id is specified', () => {
		const store = renderHook(() => useSettingStore((state) => state));
		act(() => {
			store.result.current.reset();
		});
		act(() => {
			store.result.current.themeId = 'invalid';
		});
		expect(store.result.current.getTheme()).toBe(Themes.dark);
	});

	it('should reset to the default values', () => {
		const store = renderHook(() => useSettingStore((state) => state));
		act(() => {
			store.result.current.reset();
		});

		act(() => {
			store.result.current.set({
				activeServer: 99,
				isRotationLockEnabled: false,
				isScreenLockEnabled: true,
				isTabLabelsEnabled: false,
				themeId: 'light',
				systemThemeId: 'dark',
				isSystemThemeEnabled: true,
				isNativeVideoPlayerEnabled: true,
				isFmp4Enabled: false,
				isExperimentalNativeAudioPlayerEnabled: false,
				isExperimentalDownloadsEnabled: true
			});
		});

		expect(store.result.current.activeServer).toBe(99);
		expect(store.result.current.isRotationLockEnabled).toBe(false);
		expect(store.result.current.isScreenLockEnabled).toBe(true);
		expect(store.result.current.isTabLabelsEnabled).toBe(false);
		expect(store.result.current.themeId).toBe('light');
		expect(store.result.current.systemThemeId).toBe('dark');
		expect(store.result.current.isSystemThemeEnabled).toBe(true);
		expect(store.result.current.getTheme()).toBe(Themes.dark);
		expect(store.result.current.isNativeVideoPlayerEnabled).toBe(true);
		expect(store.result.current.isFmp4Enabled).toBe(false);
		expect(store.result.current.isExperimentalNativeAudioPlayerEnabled).toBe(false);
		expect(store.result.current.isExperimentalDownloadsEnabled).toBe(true);

		act(() => {
			store.result.current.reset();
		});

		expect(store.result.current.activeServer).toBe(0);
		expect(store.result.current.isRotationLockEnabled).toBe(true);
		expect(store.result.current.isScreenLockEnabled).toBe(false);
		expect(store.result.current.isTabLabelsEnabled).toBe(true);
		expect(store.result.current.themeId).toBe('dark');
		expect(store.result.current.systemThemeId).toBeNull();
		expect(store.result.current.isSystemThemeEnabled).toBe(false);
		expect(store.result.current.getTheme()).toBe(Themes.dark);
		expect(store.result.current.isNativeVideoPlayerEnabled).toBe(false);
		expect(store.result.current.isFmp4Enabled).toBe(true);
		expect(store.result.current.isExperimentalNativeAudioPlayerEnabled).toBe(true);
		expect(store.result.current.isExperimentalDownloadsEnabled).toBe(false);
	});
});
