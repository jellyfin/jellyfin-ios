/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import normalizeUrl from 'normalize-url';

import { fetchWithTimeout } from './Fetch';

const TIMEOUT_DURATION = 5000; // timeout request after 5s

export const parseUrl = (host = '', port = '') => {
	if (!host?.trim()) {
		throw new Error('host cannot be blank');
	}

	// Normalize the entered url, defaulting to https when no scheme is provided
	host = normalizeUrl(host, { stripWWW: false, defaultProtocol: 'https:' });

	// Parse the host as a url
	const url = new URL(host);

	// Override the port if provided
	if (port) {
		url.port = port;
	}
	return url;
};

export const fetchServerInfo = async (server = {}) => {
	const serverUrl = server.urlString || getServerUrl(server);
	const infoUrl = `${serverUrl}system/info/public`;
	console.log('info url', infoUrl);

	const responseJson = await fetchWithTimeout(infoUrl, TIMEOUT_DURATION)
		.then(response => {
			if (!response.ok) {
				throw new Error(`Error response status [${response.status}] received from ${infoUrl}`);
			}
			return response.json();
		});
	console.log('response', responseJson);

	return responseJson;
};

export const getServerUrl = (server = {}) => {
	if (!server?.url?.href) {
		throw new Error('Cannot get server url for invalid server', server);
	}

	// Strip the query string or hash if present
	let serverUrl = server.url.href;
	if (server.url.search || server.url.hash) {
		const endUrl = server.url.search || server.url.hash;
		serverUrl = serverUrl.substring(0, serverUrl.indexOf(endUrl));
	}

	// Ensure the url ends with /
	if (!serverUrl.endsWith('/')) {
		serverUrl += '/';
	}

	console.log('getServerUrl:', serverUrl);
	return serverUrl;
};

export const validateServer = async (server = {}) => {
	try {
		// Does the server have a valid url?
		getServerUrl(server);
	} catch {
		return {
			isValid: false,
			message: 'invalid'
		};
	}

	try {
		const responseJson = await fetchServerInfo(server);
		const isValid = responseJson.ProductName === 'Jellyfin Server';
		const answer = {
			isValid
		};
		if (!isValid) {
			answer.message = 'invalidProduct';
		}
		return answer;
	} catch {
		return {
			isValid: false,
			message: 'noConnection'
		};
	}
};
