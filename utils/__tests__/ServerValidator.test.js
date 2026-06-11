/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { URL } from 'url';

import { fetchServerInfo, getServerUrl, parseUrl, validateServer } from '../ServerValidator';

describe('ServerValidator', () => {
	beforeEach(() => {
		fetch.resetMocks();
		jest.clearAllMocks();
	});

	describe('parseUrl()', () => {
		it('should throw an error if called without host', () => {
			expect(parseUrl).toThrow('host cannot be blank');
			expect(() => parseUrl(' ')).toThrow('host cannot be blank');
		});

		it('should throw an error if hostname is invalid', () => {
			expect(() => parseUrl('/')).toThrow('Invalid URL');
		});

		it('should default to https protocol if not specified', () => {
			const url = parseUrl('foobar');
			expect(url.protocol).toBe('https:');
			expect(url.hostname).toBe('foobar');
		});

		it('should override port if specified', () => {
			const url = parseUrl('foobar', 8096);
			expect(url.protocol).toBe('https:');
			expect(url.hostname).toBe('foobar');
			expect(url.port).toBe('8096');
		});

		it('should use https protocol if specified', () => {
			const url = parseUrl('https://foobar');
			expect(url.protocol).toBe('https:');
			expect(url.hostname).toBe('foobar');
		});
	});

	describe('fetchServerInfo()', () => {
		it('should reject on an error response', async () => {
			fetch.mockResponse(JSON.stringify({ error: 'test' }), { status: 500 });

			await expect(fetchServerInfo({ urlString: 'https://foobar/' }))
				.rejects
				.toThrow('Error response status [500] received from https://foobar/system/info/public');
		});

		it('should return a successful response', async () => {
			fetch.mockResponse(JSON.stringify({ data: 'ok' }));
			const serverInfo = await fetchServerInfo({ urlString: 'https://foobar/' });

			expect(serverInfo.data).toBe('ok');
		});
	});

	describe('getServerUrl()', () => {
		it('should throw an error if called without server', () => {
			expect(getServerUrl).toThrow('Cannot get server url for invalid server');
		});

		it('should strip search part from the server url', () => {
			const server = { url: new URL('https://foobar/?search') };
			expect(getServerUrl(server)).toBe('https://foobar/');
		});

		it('should strip hash part from the server url', () => {
			const server = { url: new URL('https://foobar/#hash') };
			expect(getServerUrl(server)).toBe('https://foobar/');
		});

		it('should append a trailing slash to the server url', () => {
			const server = { url: { href: 'https://foobar' } };
			expect(getServerUrl(server)).toBe('https://foobar/');
		});

		it('should return the url if called with a valid server object', () => {
			const server = { url: new URL('https://foobar/') };
			expect(getServerUrl(server)).toBe('https://foobar/');
		});
	});

	describe('validateServer()', () => {
		it('should return invalid message when called without server', async () => {
			const result = await validateServer();
			expect(result.isValid).toBe(false);
			expect(result.message).toBe('invalid');
		});

		it('should return valid if product name is "Jellyfin Server"', async () => {
			fetch.mockResponse(JSON.stringify({ ProductName: 'Jellyfin Server' }));

			const result = await validateServer({ url: new URL('https://foobar/') });
			expect(result.isValid).toBe(true);
		});

		it('should return invalidProduct message if product name is not "Jellyfin Server"', async () => {
			fetch.mockResponse(JSON.stringify({ ProductName: 'test', Version: '3.5' }));

			const result = await validateServer({ url: new URL('https://foobar/') });
			expect(result.isValid).toBe(false);
			expect(result.message).toBe('invalidProduct');
		});

		it('should return noConnection message if fetch throws error', async () => {
			fetch.mockResponse(JSON.stringify({ error: 'test' }), { status: 500 });

			const result = await validateServer({ url: new URL('https://foobar/') });
			expect(result.isValid).toBe(false);
			expect(result.message).toBe('noConnection');
		});
	});
});
