/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://jestjs.io/"}
 */

import { URL } from 'url';

import { renderHook } from '@testing-library/react';

import { act } from '@testing-library/react-native';

import ServerModel from '../../models/ServerModel';

import { reviver, useServerStore } from '../ServerStore';

const mockFetchInfo = jest.fn();
jest.mock('../../models/ServerModel', () => {
	return class {
		id;
		url;
		fetchInfo = mockFetchInfo;

		constructor(id, url) {
			this.id = id;
			this.url = url;
		}
	};
});

describe('ServerStore', () => {
	it('should initialize with an empty array', () => {
		const store = renderHook(() => useServerStore());
		expect(store.result.current.servers).toHaveLength(0);
	});

	it('should allow servers to be added', () => {
		const store = renderHook(() => useServerStore());
		act(() => {
			store.result.current.reset();
			store.result.current.addServer({ url: new URL('https://foobar') });
		});
		expect(store.result.current.servers).toHaveLength(1);
		expect(store.result.current.servers[0].id).toBeDefined();
		expect(store.result.current.servers[0].url.host).toBe('foobar');

		act(() => {
			store.result.current.addServer({ url: new URL('https://baz') });
		});
		expect(store.result.current.servers).toHaveLength(2);
	});

	it('should remove servers by index', () => {
		const store = renderHook(() => useServerStore());
		act(() => {
			store.result.current.reset();
			store.result.current.addServer({ url: new URL('https://foobar') });
			store.result.current.addServer({ url: new URL('https://baz') });
		});

		expect(store.result.current.servers).toHaveLength(2);

		act(() => {
			store.result.current.removeServer(0);
		});

		expect(store.result.current.servers).toHaveLength(1);
		expect(store.result.current.servers[0].id).toBeDefined();
		expect(store.result.current.servers[0].url.host).toBe('baz');
	});

	it('should reset to an empty array', () => {
		const store = renderHook(() => useServerStore());
		act(() => {
			store.result.current.reset();
			store.result.current.addServer({ url: new URL('https://foobar') });
		});
		expect(store.result.current.servers).toHaveLength(1);

		act(() => {
			store.result.current.reset();
		});

		expect(store.result.current.servers).toHaveLength(0);
	});

	it('should call fetchInfo for each server', () => {
		const store = renderHook(() => useServerStore());
		act(() => {
			store.result.current.addServer({ url: new URL('https://foobar') });
			store.result.current.addServer({ url: new URL('https://baz') });
			store.result.current.fetchInfo();
		});

		expect(mockFetchInfo).toHaveBeenCalledTimes(2);
	});
});

describe('reviver', () => {
	it('should convert values to the appropriate objects', () => {
		const url = reviver('url', 'https://example.com');
		expect(url.href).toBe('https://example.com/');

		const serverValue = {
			id: 'TEST',
			url: new URL('https://example.com')
		};
		const server = reviver('0', serverValue);
		expect(server).toBeInstanceOf(ServerModel);
		expect(server.id).toBe(serverValue.id);
		expect(server.url.href).toBe(serverValue.url.href);
		expect(server.info).toBeUndefined();

		const other = reviver('foo', 'bar');
		expect(other).toBe('bar');
	});
});
