/**
 * Copyright (c) 2026 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { URL } from 'url';

import ServerModel from '../ServerModel';

describe('ServerModel', () => {
	beforeEach(() => {
		fetch.resetMocks();
		jest.clearAllMocks();
	});

	it('should create a ServerModel with computed properties', () => {
		const server = new ServerModel(
			'testId',
			new URL('https://foobar'),
			{
				ServerName: 'Test Server',
				Version: '12.0.0'
			}
		);

		expect(server.id).toBe('testId');
		expect(server.online).toBe(false);
		expect(server.urlString).toBe('https://foobar/');
		expect(server.name).toBe('Test Server');
		expect(server.version).toBe('12.0');
	});

	it('should fallback to the url if server name is unavailable', () => {
		const server = new ServerModel(
			'testId',
			new URL('https://foobar')
		);

		expect(server.name).toBe('foobar');
	});

	it('should fallback to an empty string when the url is invalid', () => {
		const server = new ServerModel('testId');

		expect(server.urlString).toBe('');
	});

	it('should set the online status and info when fetchInfo is called', async () => {
		fetch.mockResponse(JSON.stringify({ ServerName: 'Test Server' }));

		const server = new ServerModel(
			'testId',
			new URL('https://foobar')
		);
		await server.fetchInfo();

		expect(server.online).toBe(true);
		expect(server.name).toBe('Test Server');
	});

	it('should keep the offline status when fetchInfo fails', async () => {
		fetch.mockResponse(JSON.stringify({ error: 'test' }), { status: 500 });

		const server = new ServerModel(
			'testId',
			new URL('https://foobar')
		);
		await server.fetchInfo();

		expect(server.online).toBe(false);
	});

	it('should update the online status when fetchInfo fails', async () => {
		const server = new ServerModel(
			'testId',
			new URL('https://foobar')
		);

		fetch.mockResponse(JSON.stringify({ ServerName: 'Test Server' }));
		await server.fetchInfo();
		expect(server.online).toBe(true);

		fetch.mockResponse(JSON.stringify({ error: 'test' }), { status: 500 });
		await server.fetchInfo();
		expect(server.online).toBe(false);
	});
});
