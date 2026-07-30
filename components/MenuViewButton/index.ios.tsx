/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { compareVersions } from '@jellyfin/sdk/lib/utils/versioning';
import { MenuView } from '@react-native-menu/menu';
import React, { useCallback, useContext, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Platform } from 'react-native';
import { ListItem, ThemeContext } from 'react-native-elements';

import type { MenuViewButtonProps } from './types';

const isMenuSupported = !Platform.Version // Version is undefined in tests
	|| compareVersions(String(Platform.Version), '13') >= 0;

/**
 * A Button component that opens a MenuView with fallback to Action Sheet for iOS 12.
 */
const MenuViewButton: FC<MenuViewButtonProps> = ({
	disabled,
	...menuProps
}) => {
	const { theme } = useContext(ThemeContext);
	const { t } = useTranslation();

	const onPress = useCallback(() => {
		if (isMenuSupported || disabled) return;
		const actions = menuProps.actions || [];
		if (!actions.length) return;

		ActionSheetIOS.showActionSheetWithOptions(
			{
				options: [
					...actions.map(a => a.title),
					t('common.cancel')
				],
				destructiveButtonIndex: actions.findIndex(a => a.attributes?.destructive),
				cancelButtonIndex: actions.length,
				userInterfaceStyle: menuProps.themeVariant
			},
			index => {
				const action = actions[index];
				if (!action) return;

				return menuProps.onPressAction?.({
					nativeEvent: {
						event: action.id || action.title
					}
				});
			}
		);
	}, [ disabled, menuProps.actions, menuProps.onPressAction, menuProps.themeVariant, t ]);

	const button = (
		<ListItem.Chevron
			name='ellipsis-horizontal'
			type='ionicon'
			color={theme.colors?.black}
			disabled={disabled}
			// eslint-disable-next-line react-native/no-color-literals
			disabledStyle={{
				backgroundColor: 'transparent'
			}}
			onPress={onPress}
		/>
	);

	if (isMenuSupported && !disabled) {
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
