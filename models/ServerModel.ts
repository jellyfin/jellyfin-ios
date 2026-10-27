/**
 * Copyright (c) 2026 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { PublicSystemInfo } from '@jellyfin/sdk/lib/generated-client/models/public-system-info';
import { getDisplayVersion } from '@jellyfin/sdk/lib/utils/versioning';

import { fetchServerInfo, getServerUrl } from '../utils/ServerValidator';

export default class ServerModel {
	id: string
	url: URL
	urlString: string
	online = false
	info?: PublicSystemInfo

	constructor(id: string, url: URL, info?: PublicSystemInfo) {
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
		} catch (ex) {
			return '';
		}
	}

	get version() {
		return getDisplayVersion(this.info?.Version);
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
