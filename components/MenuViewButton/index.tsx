/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MenuView } from '@react-native-menu/menu';
import React, { useContext, type FC } from 'react';
import { ListItem, ThemeContext } from 'react-native-elements';

import type { MenuViewButtonProps } from './types';

/**
 * A Button component that opens a MenuView with fallback to Action Sheet for iOS 12.
 */
const MenuViewButton: FC<MenuViewButtonProps> = ({
	disabled,
	...menuProps
}) => {
	const { theme } = useContext(ThemeContext);

	const button = (
		<ListItem.Chevron
			name='ellipsis-horizontal'
			type='ionicon'
			color={theme.colors?.black}
			disabled={disabled}
			disabledStyle={{
				backgroundColor: 'transparent'
			}}
			onPress={() => { /* no-op */ }}
		/>
	);

	if (!disabled) {
		return (
			<MenuView {...menuProps}>
				{button}
			</MenuView>
		);
	}

	return button;
};

MenuViewButton.displayName = 'MenuViewButton';
export default MenuViewButton;
