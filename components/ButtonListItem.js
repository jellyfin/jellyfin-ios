/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, ListItem } from 'react-native-elements';

const ButtonListItem = ({ item, index }) => {
	const { key, ...buttonProps } = item;
	return (
		<ListItem
			topDivider={index === 0}
			bottomDivider
		>
			<ListItem.Content>
				<Button
					testID='button'
					{...buttonProps}
					type='clear'
					buttonStyle={{ ...styles.button, ...item.buttonStyle }}
					titleStyle={{ ...styles.title, ...item.titleStyle }}
				/>
			</ListItem.Content>
		</ListItem>
	);
};

ButtonListItem.propTypes = {
	item: PropTypes.object.isRequired,
	index: PropTypes.number.isRequired
};

const styles = StyleSheet.create({
	button: {
		padding: 0
	},
	title: {
		textAlign: 'auto',
		width: '100%'
	}
});

export default ButtonListItem;
