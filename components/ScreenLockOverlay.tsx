/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-elements';

import Colors from '../constants/Colors';
import { useStores } from '../hooks/useStores';
import { getIconName } from '../utils/Icons';

/** How long the unlock button stays visible (in ms) */
const CONTROLS_TIMEOUT = 3000;

/**
 * An overlay that blocks touches to the player while the screen is locked.
 * The screen is locked by the button injected into the web player header.
 */
const ScreenLockOverlay = () => {
	const { rootStore } = useStores();
	const { t } = useTranslation();
	const [ isControlVisible, setIsControlVisible ] = useState(false);

	// Briefly show the unlock button when the screen is locked
	useEffect(() => {
		setIsControlVisible(rootStore.isScreenLocked);
	}, [ rootStore.isScreenLocked ]);

	// Hide the unlock button after a delay
	useEffect(() => {
		if (!isControlVisible) return;
		const timeout = setTimeout(() => setIsControlVisible(false), CONTROLS_TIMEOUT);
		return () => clearTimeout(timeout);
	}, [ isControlVisible ]);

	if (!rootStore.isScreenLocked) return null;

	// Covering the screen blocks touches to the player
	return (
		<View
			testID='screen-lock-overlay'
			style={styles.container}
			accessibilityViewIsModal
			onTouchStart={() => setIsControlVisible(true)}
		>
			{isControlVisible && (
				<Pressable
					testID='screen-unlock-button'
					style={styles.unlockButton}
					accessibilityRole='button'
					onPress={() => rootStore.set({ isScreenLocked: false })}
				>
					<Icon name={getIconName('lock-closed')} type='ionicon' color={Colors.white} />
					<Text style={styles.unlockText}>{t('player.tapToUnlock')}</Text>
				</Pressable>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center'
	},
	unlockButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 24,
		backgroundColor: Colors.translucentBlack
	},
	unlockText: {
		color: Colors.white,
		marginLeft: 8
	}
});

export default ScreenLockOverlay;
