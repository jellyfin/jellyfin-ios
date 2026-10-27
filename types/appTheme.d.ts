/*
 * Copyright (c) 2026 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Theme as RNTheme } from '@react-navigation/native';
import type { Theme as RNETheme } from 'react-native-elements';

export interface AppTheme {
	dark: boolean
	Elements: RNETheme
	Navigation: RNTheme
}
