/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useNavigation, type NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState, useEffect } from 'react';

import { Screens } from '../constants/Screens';
import type { AppStackParams } from '../navigation/types';

import { useStores } from './useStores';

type RootScopeParams = {
	[Screens.App]: NavigatorScreenParams<AppStackParams>;
};

/** Update the active server and handle navigation based on changes to the list of added servers. */
export const useActiveServerHandler = () => {
	const navigation = useNavigation<NativeStackNavigationProp<RootScopeParams>>();
	const { serverStore, settingStore } = useStores();
	const [ serverCount, setServerCount ] = useState(serverStore.servers.length);

	// Handle server addition/removal
	useEffect(() => {
		if (serverCount < serverStore.servers.length) {
			// A server was added
			console.debug('[AppNavigator] server was added', serverCount, serverStore.servers.length);
			// Make the new server active
			const activeServer = serverStore.servers.length - 1;
			settingStore.set({ activeServer });

			// Navigate to the main screen
			navigation.replace(
				Screens.App,
				{
					screen: Screens.MainScreen,
					params: {
						screen: Screens.HomeTab,
						params: {
							screen: Screens.HomeScreen,
							params: { activeServer }
						}
					}
				}
			);
		} else if (serverCount > serverStore.servers.length) {
			// A server was removed
			console.debug('[AppNavigator] server was removed', serverCount, serverStore.servers.length);

			if (serverStore.servers.length > 0) {
				// Make the first server active
				settingStore.set({ activeServer: 0 });
				// More servers exist, navigate home
				navigation.replace(
					Screens.App,
					{
						screen: Screens.MainScreen,
						params: {
							screen: Screens.HomeTab,
							params: {
								screen: Screens.HomeScreen,
								params: { activeServer: 0 }
							}
						}
					}
				);
			} else {
				settingStore.set({ activeServer: -1 });
				// No servers are present, navigate to add server screen
				navigation.replace(Screens.App, { screen: Screens.AddServerScreen });
			}
		}
		setServerCount(serverStore.servers.length);
	}, [ navigation, serverCount, serverStore.servers.length ]);
};
