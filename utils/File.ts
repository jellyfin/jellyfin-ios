/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Directory } from 'expo-file-system';

const INVALID_PATH_CHARS = /[\\/:*?"<>|.]/g;

const reduceReplacements = (s: string) => (
	s.replace(/-+/g, '-') // collapse runs
		.replace(/(^-+)|(-+$)/g, '') // trim leading/trailing
);

/**
 * Checks if a path exists, and creates a directory (including missing intermediate directories) if it does not.
 * @param path A uri of a local directory
 */
export function ensurePathExists(path: string) {
	const directory = new Directory(path);
	if (!directory.exists) {
		directory.create({ intermediates: true });
	}
}

/** Gets a URI to open the Files app on iOS from a direct file:// URI */
export function getFilesUri(uri: string) {
	return uri.replace(/^file:\/\//, 'shareddocuments://');
}

/** Trim and replace any invalid characters in a file/directory name (extension excluded). */
export function sanitizeFileName(name?: string) {
	const trimmed = name?.trim();
	if (!trimmed) return;

	const sanitized = reduceReplacements(
		trimmed
			.normalize('NFC')
			.replace(INVALID_PATH_CHARS, '-'));
	return sanitized || undefined;
}
