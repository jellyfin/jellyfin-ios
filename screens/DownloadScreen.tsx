/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Button, ThemeContext } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorView from '../components/ErrorView';
import { Screens } from '../constants/Screens';
import DownloadListItem from '../features/downloads/components/DownloadListItem';
import { DownloadAction } from '../features/downloads/constants/DownloadAction';
import { DownloadStatus } from '../features/downloads/constants/DownloadStatus';
import { getDownloadItemActions } from '../features/downloads/utils/downloadItemActions';
import { deleteSubtitles } from '../features/downloads/utils/subtitles';
import { useStores } from '../hooks/useStores';
import type DownloadModel from '../models/DownloadModel';
import { getFilesUri } from '../utils/File';

const Hairline = () => <View style={{ height: StyleSheet.hairlineWidth }} />;

const DownloadScreen = () => {
	const navigation = useNavigation();
	const { downloadStore, mediaStore } = useStores();
	const { t } = useTranslation();
	const { theme } = useContext(ThemeContext);
	const [ isEditMode, setIsEditMode ] = useState(false);
	const [ selectedItems, setSelectedItems ] = useState<DownloadModel[]>([]);

	const exitEditMode = useCallback(() => {
		setIsEditMode(false);
		setSelectedItems([]);
	}, []);

	const deleteItem = useCallback(async (download: DownloadModel) => {
		// TODO: Add user messaging on errors
		try {
			// Delete the download file
			await FileSystem.deleteAsync(download.uri, { idempotent: true });

			// Delete any subtitle files downloaded alongside the video
			await deleteSubtitles(download);

			// Get the path for each subdirectory the item exists in descending order
			// i.e. [ 'Downloads/Series Name/Season 1/', 'Downloads/Series Name/', 'Downloads/' ]
			const pathParts = download.relativePath.split('/').filter(p => p);
			const checkPaths: string[] = [];
			for (let i = pathParts.length; i > 0; i--) {
				checkPaths.push(pathParts.slice(0, i).join('/') + '/');
			}
			// Iterate over each subdirectory
			for (const p of checkPaths) {
				const uri = encodeURI(`${FileSystem.documentDirectory}${p}`);
				const info = await FileSystem.getInfoAsync(uri);
				// Verify the subdirectory exists and is a directory
				if (info.exists && info.isDirectory) {
					// Delete the subdirectory if it is empty
					const contents = await FileSystem.readDirectoryAsync(uri);
					if (!contents.length) {
						console.debug('Deleting empty subdirectory', p);
						await FileSystem.deleteAsync(uri, { idempotent: true });
					} else {
						// If a subdirectory has content do not continue checking parents
						console.debug('Skipping subdirectory with content', p, contents);
						break;
					}
				}
			}

			// Delete the store value
			downloadStore.delete(download);
			console.log('[DownloadScreen] download "%s" deleted', download.title);
		} catch (e) {
			console.error('[DownloadScreen] Failed to delete download', e);
		}
	}, [ downloadStore ]);

	const onDeleteItems = useCallback((downloads: DownloadModel[]) => {
		Alert.alert(
			t('alerts.deleteDownloads.title'),
			t('alerts.deleteDownloads.description'),
			[
				{
					text: t('common.cancel'),
					onPress: exitEditMode
				},
				{
					text: t('alerts.deleteDownloads.confirm', { downloadCount: downloads.length }),
					onPress: () => {
						Promise.allSettled(downloads.map(deleteItem))
							.finally(exitEditMode)
							.catch(err => {
								console.warn('[DownloadScreen] failed deleting items', err);
							});
					},
					style: 'destructive'
				}
			]
		);
	}, [ deleteItem, exitEditMode, t ]);

	const onAction = useCallback(async (action: DownloadAction, item: DownloadModel) => {
		// TODO: Allow retrying/removing failed downloads
		if (item.status === DownloadStatus.Failed) return;

		// Verify the download has not been removed from the file system
		const info = await FileSystem.getInfoAsync(item.uri);
		if (!info.exists) {
			if (item.status !== DownloadStatus.Missing) {
				item.status = DownloadStatus.Missing;
				downloadStore.update(item);
			}
			Alert.alert(
				t('alerts.missingDownload.title'),
				t('alerts.missingDownload.description')
			);
			return;
		} else if (item.status === DownloadStatus.Missing) {
			// The download exists so update the status
			item.status = DownloadStatus.Complete;
			downloadStore.update(item);
		}

		switch (action) {
			case DownloadAction.Delete:
				return onDeleteItems([ item ]);
			case DownloadAction.PlayInApp:
				item.isNew = false;
				downloadStore.update(item);
				mediaStore.set({
					isLocalFile: true,
					type: MediaType.Video,
					uri: item.uri
				});
				return;
			case DownloadAction.Share: {
				console.debug('[DownloadScreen] sharing download uri', item.uri);
				Sharing.shareAsync(item.uri)
					.catch(err => {
						console.warn('[DownloadScreen] failed to share', err);
					});
				return;
			}
			case DownloadAction.OpenInFiles: {
				const uri = getFilesUri(item.uri);
				console.debug('[DownloadScreen] opening Files uri', uri);
				Linking.openURL(uri)
					.catch(err => {
						console.warn('[DownloadScreen] failed to open Files', err);
					});
			}
		}
	}, [ downloadStore, mediaStore, onDeleteItems, t ]);

	React.useLayoutEffect(() => {
		navigation.setOptions({
			headerLeft: () => (
				isEditMode ?
					<Button
						title={t('common.cancel')}
						type='clear'
						onPress={exitEditMode}
						style={styles.leftButton}
					/> :
					null
			),
			headerRight: () => (
				isEditMode ?
					<Button
						title={t('common.delete')}
						type='clear'
						style={styles.rightButton}
						disabled={selectedItems.length < 1}
						onPress={() => {
							onDeleteItems(selectedItems);
						}}
					/> :
					<Button
						title={t('common.edit')}
						type='clear'
						style={styles.rightButton}
						disabled={downloadStore.downloads.size < 1}
						onPress={() => {
							setIsEditMode(true);
						}}
					/>
			)
		});
	}, [ navigation, isEditMode, onDeleteItems, selectedItems, downloadStore.downloads, t ]);

	useFocusEffect(
		useCallback(() => {
			downloadStore.downloads
				.forEach(download => {
					if (download.isNew && download.isNew !== !download.isComplete) {
						download.isNew = !download.isComplete;
						downloadStore.update(download);
					}
				});
		}, [ downloadStore.downloads ])
	);

	const toggleSelectedItem = useCallback((item: DownloadModel) => (
		setSelectedItems(prev => (
			prev.some(s => s.key === item.key)
				? prev.filter(s => s.key !== item.key)
				: [ ...prev, item ])
		)
	), []);

	const renderDownloadItem = useCallback(({ item, index }: { item: DownloadModel, index: number }) => (
		<DownloadListItem
			item={item}
			index={index}
			actions={getDownloadItemActions(item)}
			onAction={a => onAction(a, item)}
			isEditMode={isEditMode}
			isSelected={selectedItems.some(s => s.key === item.key)}
			onSelect={() => toggleSelectedItem(item)}
		/>
	), [ isEditMode, onAction, selectedItems, toggleSelectedItem ]);

	return (
		<SafeAreaView
			style={{
				...styles.container,
				backgroundColor: theme.colors?.background
			}}
			edges={[ 'right', 'left' ]}
		>
			{downloadStore.downloads.size > 0 ? (
				<FlatList
					data={Array.from(downloadStore.downloads.values())}
					extraData={downloadStore.downloads}
					renderItem={renderDownloadItem}
					keyExtractor={item => `download-${item.key}`}
					// Add header/footer spacing to avoid list item border overlap
					ListHeaderComponent={Hairline}
					ListFooterComponent={Hairline}
				/>
			) : (
				<ErrorView
					icon={{
						name: 'download-circle-outline',
						type: 'material-community'
					}}
					heading={t('downloads.noDownloads.heading')}
					message={t('downloads.noDownloads.description')}
				/>
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	leftButton: {
		marginLeft: 8
	},
	rightButton: {
		marginRight: 8
	}
});

DownloadScreen.displayName = Screens.DownloadsTab;

export default DownloadScreen;
