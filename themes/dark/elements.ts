/**
 * Copyright (c) 2026 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Colors from '../../constants/Colors';
import BaseTheme from '../base/elements';

export default {
	...BaseTheme,
	colors: {
		// Default values from base theme
		...BaseTheme.colors,
		// Manually assign defaults values for dark theme,
		// because it is not exported from react-native-elements
		grey2: '#86939e',
		grey3: '#5e6977',
		grey4: '#43484d',
		grey5: '#393e42',
		greyOutline: '#bbb',
		disabled: 'hsl(208, 8%, 90%)',
		// Custom colors
		background: Colors.blackish,
		primary: Colors.blue,
		secondary: Colors.purple,
		black: Colors.white,
		white: Colors.grey0,
		grey0: Colors.grey0,
		grey1: Colors.grey1,
		searchBg: Colors.grey6
	},
	ListItemSubtitle: {
		style: {
			...BaseTheme.ListItemSubtitle.style,
			color: Colors.grey1
		}
	}
};
