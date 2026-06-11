/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useNavigation } from '@react-navigation/native';
import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application';
import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, ThemeContext } from 'react-native-elements';

import { Screens } from '../constants/Screens';
import { getAppDisplayName } from '../utils/Device';
import { openBrowser } from '../utils/WebBrowser';

// NOTE: eslint randomly started blowing up with this inline in the JSX
const getDisplayVersion = (appVersion: string, buildVersion: string) => `${appVersion} (${buildVersion})`;

const getReleaseUrl = (version: string) => encodeURI(`https://github.com/jellyfin/jellyfin-ios/releases/v${version}`);

const AppInfoFooter = () => {
	const navigation = useNavigation();
	const { theme } = useContext(ThemeContext);

	const textStyle = {
		...styles.text,
		color: theme.colors?.grey1
	};

	return (
		<View style={styles.container}>
			<Text
				testID='app-name'
				style={textStyle}
			>
				{getAppDisplayName()}
			</Text>
			<Text
				testID='app-version'
				style={textStyle}

				onPress={() => openBrowser(getReleaseUrl(nativeBuildVersion!))}
				onLongPress={() => navigation.navigate(Screens.DevSettingsScreen)}
			>
				{ }
				{getDisplayVersion(nativeApplicationVersion!, nativeBuildVersion!)}
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		margin: 15
	},
	text: {
		fontSize: 15
	}
});

export default AppInfoFooter;
