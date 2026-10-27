/**
 * Copyright (c) 2026 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, ListItem, ThemeContext } from 'react-native-elements';

import { getIconName } from '../utils/Icons';

const ServerListItem = ({ item, index, activeServer, onDelete, onPress }) => {
	const { t } = useTranslation();
	const { theme } = useContext(ThemeContext);

	const title = item?.name;
	const version = item?.version || t('common.unknown');
	const subtitle = `${t('settings.version', { version })}\n${item.urlString}`;

	return (
		<ListItem
			testID='server-list-item'
			topDivider={index === 0}
			bottomDivider
			onPress={() => onPress(index)}
		>
			{(
				index === activeServer ? (
					<Icon
						testID='active-icon'
						name={getIconName('checkmark')}
						type='ionicon'
						size={24}
						containerStyle={styles.leftElement}
					/>
				) : (
					<View style={styles.leftElement} />
				)
			)}
			<ListItem.Content>
				<ListItem.Title
					testID='title'
					style={styles.title}
				>
					{title}
				</ListItem.Title>
				<ListItem.Subtitle
					testID='subtitle'
				>
					{subtitle}
				</ListItem.Subtitle>
			</ListItem.Content>
			<Button
				testID='delete-button'
				type='clear'
				icon={{
					name: getIconName('trash'),
					type: 'ionicon',
					iconStyle: {
						color: theme.colors.error
					}
				}}
				onPress={() => onDelete(index)}
			/>
		</ListItem>
	);
};

ServerListItem.propTypes = {
	item: PropTypes.object.isRequired,
	index: PropTypes.number.isRequired,
	activeServer: PropTypes.number.isRequired,
	onDelete: PropTypes.func.isRequired,
	onPress: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	title: {
		marginBottom: 2
	},
	leftElement: {
		width: 24
	}
});

export default ServerListItem;
