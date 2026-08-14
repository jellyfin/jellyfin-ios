/**
 * Copyright (c) 2026 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as Localization from 'expo-localization';
import i18next from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import languages from './languages';

// Ensure RTL layout is enabled for RTL locales
I18nManager.forceRTL(Localization.isRTL);

// eslint-disable-next-line import/no-named-as-default-member
i18next
	.use(initReactI18next)
	.use(resourcesToBackend((language: string) => languages[language]))
	.init({
		// debug: true,
		fallbackLng: 'en',
		// Use the fallback language for empty strings
		returnEmptyString: false,
		lng: Localization.locale,
		interpolation: {
			escapeValue: false
		}
	});

// Export i18next instance for use in tests
export default i18next;
