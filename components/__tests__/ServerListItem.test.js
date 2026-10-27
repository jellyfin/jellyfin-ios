/**
 * Copyright (c) 2026 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import ServerListItem from '../ServerListItem';
import '../../i18n';

describe('ServerListItem', () => {
	it('should render correctly and handle presses', () => {
		const onDelete = jest.fn();
		const onPress = jest.fn();

		const { getByTestId, queryByTestId } = render(
			<ServerListItem
				item={{
					name: 'Test Server',
					urlString: 'https://foobar',
					version: '10.0.0'
				}}
				index={0}
				activeServer={0}
				onDelete={onDelete}
				onPress={onPress}
			/>
		);

		expect(queryByTestId('active-icon')).not.toBeNull();

		expect(getByTestId('title')).toHaveTextContent('Test Server');
		expect(getByTestId('subtitle')).toHaveTextContent('Version: 10.0.0 https://foobar');

		expect(onDelete).not.toHaveBeenCalled();
		fireEvent.press(getByTestId('delete-button'));
		expect(onDelete).toHaveBeenCalledWith(0);

		expect(onPress).not.toHaveBeenCalled();
		fireEvent.press(getByTestId('server-list-item'));
		expect(onPress).toHaveBeenCalledWith(0);
	});

	it('should not render active icon for inactive server', () => {
		const { queryByTestId } = render(
			<ServerListItem
				item={{}}
				index={0}
				activeServer={1}
				onDelete={jest.fn()}
				onPress={jest.fn()}
			/>
		);

		expect(queryByTestId('active-icon')).toBeNull();
	});
});
