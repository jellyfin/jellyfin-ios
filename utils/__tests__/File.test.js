/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Directory } from 'expo-file-system';

import { ensurePathExists, getFilesUri, sanitizeFileName } from '../File';

jest.mock('expo-file-system', () => ({ Directory: jest.fn() }));

describe('File', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	describe('ensurePathExists', () => {
		it('should not try to create an existing directory', () => {
			const create = jest.fn();
			Directory.mockImplementation(() => ({ exists: true, create }));

			ensurePathExists('test');

			expect(Directory).toHaveBeenCalledWith('test');
			expect(create).not.toHaveBeenCalled();
		});

		it('should create a directory if it does not exist', () => {
			const create = jest.fn();
			Directory.mockImplementation(() => ({ exists: false, create }));

			ensurePathExists('test');

			expect(Directory).toHaveBeenCalledWith('test');
			expect(create).toHaveBeenCalledWith({ intermediates: true });
		});
	});

	describe('getFilesUri', () => {
		it('should get a valid Files app uri', () => {
			expect(getFilesUri('file://foobar')).toBe('shareddocuments://foobar');
		});
	});

	describe('sanitizeFileName', () => {
		it('should sanitize file names', () => {
			let name = sanitizeFileName(' Q: A.? ');
			expect(name).toBe('Q- A');

			name = sanitizeFileName('AC/DC');
			expect(name).toBe('AC-DC');
		});

		it('should collapse multiple invalid characters and trim safely', () => {
			expect(sanitizeFileName('A:::B???///')).toBe('A-B');
			expect(sanitizeFileName('---???.')).toBeUndefined();
			expect(sanitizeFileName('   ')).toBeUndefined();
		});

		it('should normalize Unicode to NFC', () => {
			// "e" + combining accent (NFD) should normalize equivalently
			const nfd = 'Cafe\u0301'; // Café
			const nfc = 'Café';
			expect(sanitizeFileName(nfd)).toBe(nfc);
		});
	});
});
