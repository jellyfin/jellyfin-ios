/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { useNavigation } from '@react-navigation/native';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Icon, Text, ThemeContext } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';

import ServerInput from '../components/ServerInput';
import { Screens } from '../constants/Screens';
import { useStores } from '../hooks/useStores';

const AddServerScreen = () => {
	const navigation = useNavigation();
	const { t } = useTranslation();
	const { settingStore } = useStores();
	const { theme } = useContext(ThemeContext);

	return (
		<KeyboardAvoidingView
			style={{
				...styles.screen,
				backgroundColor: theme.colors.background
			}}
			behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
		>
			<SafeAreaView
				style={styles.container}
				edges={[ 'right', 'bottom', 'left' ]}
			>
				<View style={styles.logoContainer}>
					<Image
						style={styles.logoImage}
						source={
							settingStore.getTheme().dark ?
								require('@jellyfin/ux-ios/logo-dark.png') :
								require('@jellyfin/ux-ios/logo-light.png')
						}
						fadeDuration={0} // we need to adjust Android devices (https://facebook.github.io/react-native/docs/image#fadeduration) fadeDuration prop to `0` as it's default value is `300`
					/>
				</View>
				<View>
					<ServerInput
						label={
							<View style={styles.labelContainer}>
								<Text
									style={{
										...styles.label,
										color: theme.colors.grey1
									}}
								>
									{t('addServer.address')}
								</Text>
								<Icon
									type='ionicon'
									name={'help-circle'}
									containerStyle={styles.icon}
									color={theme.colors.black}
									onPress={() => {
										navigation.navigate(Screens.ServerHelpScreen);
									}}
								/>
							</View>
						}
						placeholder='https://jellyfin.org'
					/>
				</View>
			</SafeAreaView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1
	},
	container: {
		flex: 1,
		justifyContent: 'space-evenly'
	},
	logoContainer: {
		alignSelf: 'center',
		paddingVertical: 10,
		height: '40%',
		maxHeight: 151,
		maxWidth: '90%'
	},
	logoImage: {
		flex: 1,
		resizeMode: 'contain',
		maxWidth: '100%'
	},
	labelContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	label: {
		fontSize: 16,
		fontWeight: 'bold'
	},
	icon: {
		paddingHorizontal: 10
	}
});

AddServerScreen.displayName = Screens.AddServerScreen;

export default AddServerScreen;
