/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { fetchServerInfo, getServerUrl } from '../utils/ServerValidator';

export default class ServerModel {
	id;

	url;

	online = false;

	info;

	constructor(id, url, info) {
		this.id = id;
		this.url = url;
		this.info = info;
		this.urlString = this.parseUrlString;
	}

	get name() {
		return this.info?.ServerName || this.url?.host;
	}

	get parseUrlString() {
		try {
			return getServerUrl(this);
		} catch {
			return '';
		}
	}

	fetchInfo = () => fetchServerInfo(this)
		.then((info) => {
			this.online = true;
			this.info = info;
			return;
		})
		.catch((err) => {
			console.warn(err);
			this.online = false;
		});
}
