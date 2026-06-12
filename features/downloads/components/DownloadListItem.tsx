/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo, useContext, type FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ListItem, ThemeContext } from 'react-native-elements';

import type DownloadModel from '../../../models/DownloadModel';
import { getItemSubtitle } from '../../../utils/baseItem';
import type { DownloadAction } from '../constants/DownloadAction';
import { DownloadStatus } from '../constants/DownloadStatus';
import type { DownloadItemAction } from '../types/downloadItemAction';

import DownloadStatusIndicator from './DownloadStatusIndicator';

const formatSpeed = (bytesPerSec: number): string => {
	if (bytesPerSec <= 0) return '0 B/s';
	const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
	const index = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(1024)), units.length - 1);
	const speed = bytesPerSec / Math.pow(1024, index);
	return `${speed.toFixed(1)} ${units[index]}`;
};

interface DownloadListItemProps {
	item: DownloadModel;
	index: number;
	onSelect: () => void;
	isEditMode?: boolean;
	isSelected?: boolean;
	actions: DownloadItemAction[];
	onAction: (action: DownloadAction) => void;
}

const DownloadListItem: FC<DownloadListItemProps> = ({
	item,
	index,
	actions,
	onAction,
	onSelect,
	isEditMode = false,
	isSelected = false
}) => {
	const { theme } = useContext(ThemeContext);
	const subtitle = useMemo(() => getItemSubtitle(item.item), [ item.item ]);

	const onItemPress = useCallback(() => {
		// Call select callback if in edit mode
		if (isEditMode) onSelect();
		// Otherwise try calling the first default action
		else {
			const action = actions.find(a => a.isDefault && a.isEnabled && a.isSupported);
			if (action) onAction(action.id);
		}
	}, [ actions, isEditMode, onAction, onSelect ]);

	return (
		<ListItem
			testID='list-item'
			topDivider={index === 0}
			bottomDivider
			onPress={item.isComplete ? onItemPress : undefined}
		>
			{isEditMode &&
				<ListItem.CheckBox
					testID='select-checkbox'
					onPress={onSelect}
					checked={isSelected}
					disabled={!item.isComplete}
					accessibilityRole='checkbox'
					accessibilityState={{ checked: isSelected, disabled: !item.isComplete }}
				/>
			}
			<ListItem.Content>
				<ListItem.Title
					testID='title'
					numberOfLines={1}
					ellipsizeMode='tail'
				>
					{item.title}
				</ListItem.Title>
				<ListItem.Subtitle
					testID='subtitle'
					numberOfLines={1}
					ellipsizeMode='tail'
				>
					{subtitle || item.localFilename}
				</ListItem.Subtitle>
				{item.status === DownloadStatus.Downloading && (
					<View style={styles.progressContainer} testID='progress-container'>
						<View style={[styles.progressBarTrack, { backgroundColor: theme.colors?.grey5 || '#e0e0e0' }]}>
							<View
								testID='progress-bar-fill'
								style={[
									styles.progressBarFill,
									{
										width: `${Math.min(Math.max(item.progress || 0, 0), 1) * 100}%`,
										backgroundColor: theme.colors?.primary || '#00a4dc'
									}
								]}
							/>
						</View>
						<View style={styles.progressTextContainer}>
							<Text style={[styles.progressText, { color: theme.colors?.grey3 || '#757575' }]} testID='progress-percent'>
								{`${((item.progress || 0) * 100).toFixed(0)}%`}
							</Text>
							{typeof item.speed === 'number' && item.speed > 0 && (
								<Text style={[styles.progressText, { color: theme.colors?.grey3 || '#757575' }]} testID='progress-speed'>
									{formatSpeed(item.speed)}
								</Text>
							)}
						</View>
					</View>
				)}
			</ListItem.Content>

			<DownloadStatusIndicator
				download={item}
				isEditMode={isEditMode}
				actions={actions}
				onAction={onAction}
			/>
		</ListItem>
	);
};

const styles = StyleSheet.create({
	progressContainer: {
		width: '100%',
		marginTop: 8
	},
	progressBarTrack: {
		height: 4,
		width: '100%',
		borderRadius: 2,
		overflow: 'hidden',
		marginBottom: 4
	},
	progressBarFill: {
		height: '100%'
	},
	progressTextContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	progressText: {
		fontSize: 12
	}
});

DownloadListItem.displayName = 'DownloadListItem';
export default DownloadListItem;
