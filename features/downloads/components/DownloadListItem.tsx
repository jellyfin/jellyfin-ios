/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useContext, useMemo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { ListItem, Text, ThemeContext } from 'react-native-elements';

import type DownloadModel from '../../../models/DownloadModel';
import { getItemSubtitle } from '../../../utils/baseItem';
import type { DownloadAction } from '../constants/DownloadAction';
import { DownloadStatus } from '../constants/DownloadStatus';
import type { DownloadItemAction } from '../types/downloadItemAction';

import DownloadStatusIndicator from './DownloadStatusIndicator';

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
	const subtitle = useMemo(() => getItemSubtitle(item.item), [ item.item ]);
	const { theme } = useContext(ThemeContext);
	const progressPercent = Math.round(item.progress * 100);

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
					<View style={styles.progressContainer}>
						<View
							testID='download-progress-bar'
							style={[
								styles.progressTrack,
								{ backgroundColor: theme.colors?.grey5 }
							]}
						>
							<View
								style={[
									styles.progressFill,
									{
										backgroundColor: theme.colors?.primary,
										width: `${progressPercent}%`
									}
								]}
							/>
						</View>
						<Text testID='download-progress-label'>
							{`${progressPercent}%`}
						</Text>
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

DownloadListItem.displayName = 'DownloadListItem';

const styles = StyleSheet.create({
	progressContainer: {
		marginTop: 6
	},
	progressTrack: {
		borderRadius: 999,
		height: 4,
		marginBottom: 4,
		overflow: 'hidden'
	},
	progressFill: {
		height: '100%'
	}
});

export default DownloadListItem;
