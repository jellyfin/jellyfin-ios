/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { MenuAction } from '@react-native-menu/menu';
import React, { useCallback, useContext, useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { ListItem, ThemeContext } from 'react-native-elements';

import MenuViewButton from '../../../components/MenuViewButton/index.ios';
import { MenuPressEvent } from '../../../components/MenuViewButton/types';
import { useStores } from '../../../hooks/useStores';
import type DownloadModel from '../../../models/DownloadModel';
import { getIconName } from '../../../utils/Icons';
import { DownloadAction } from '../constants/DownloadAction';
import { DownloadStatus } from '../constants/DownloadStatus';
import type { DownloadItemAction } from '../types/downloadItemAction';

/** Renders a status icon for a download item. */
const StatusIcon: FC<{ status: DownloadStatus }> = ({
	status
}) => {
	const { theme } = useContext(ThemeContext);

	switch (status) {
		case DownloadStatus.Complete:
			return null;
		case DownloadStatus.Downloading:
			return (
				<ActivityIndicator
					testID='loading-indicator'
					style={{
						alignSelf: 'center'
					}}
				/>
			);
		case DownloadStatus.Failed:
			return (
				<ListItem.Chevron
					testID='failed-icon'
					type='ionicon'
					name={getIconName('warning')}
					color={theme.colors?.error}
					style={{
						marginEnd: 8
					}}
				/>
			);
		case DownloadStatus.Pending:
			return (
				<ListItem.Chevron
					type='ionicon'
					name='cloud-download-outline'
					color={theme.colors?.black}
					style={{
						marginEnd: 8
					}}
				/>
			);
		default:
			return (
				<ListItem.Chevron
					type='ionicon'
					name={getIconName('help-circle')}
					color={theme.colors?.black}
					style={{
						marginEnd: 8
					}}
				/>
			);
	}
};

interface DownloadStatusIndicatorProps {
	download: DownloadModel;
	isEditMode?: boolean;
	actions: DownloadItemAction[];
	onAction: (action: DownloadAction) => void;
}

/** Status icon and menu (when supported) for download list items. */
const DownloadStatusIndicator: FC<DownloadStatusIndicatorProps> = ({
	download,
	isEditMode = false,
	actions,
	onAction
}) => {
	const { settingStore } = useStores();
	const { t } = useTranslation();

	/** Map DownloadItemActions to MenuActions. */
	const menuActions = useMemo<MenuAction[]>(() => {
		const _menuActions: MenuAction[] = [];

		actions.forEach(({
			id,
			title,
			image,
			isEnabled,
			isDestructive,
			isSupported
		}) => {
			if (isSupported) {
				_menuActions.push({
					id,
					title: t(title),
					image,
					attributes: {
						disabled: !isEnabled,
						destructive: isDestructive
					}
				});
			}
		});

		return _menuActions;
	}, [ actions, t ]);

	const onMenuPress = useCallback(({ nativeEvent }: MenuPressEvent) => {
		const action = Object.values(DownloadAction).find(a => a === nativeEvent.event);
		if (action) onAction(action);
		else console.warn('[DownloadStatusIndicator.onMenuPress] unhandled menu press action', nativeEvent.event);
	}, [ onAction ]);

	if (!download.isComplete) {
		return (
			<StatusIcon status={download.status} />
		);
	}

	return (
		<>
			<StatusIcon status={download.status} />
			<MenuViewButton
				testID='menu-view'
				actions={menuActions}
				onPressAction={onMenuPress}
				shouldOpenOnLongPress={false}
				themeVariant={
					settingStore.getTheme().dark ? 'dark' : 'light'
				}
				disabled={isEditMode}
			/>
		</>
	);
};

DownloadStatusIndicator.displayName = 'DownloadStatusIndicator';
export default DownloadStatusIndicator;
