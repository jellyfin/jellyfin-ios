/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import ErrorScreen from '../ErrorScreen';

jest.mock('@react-navigation/native', () => ({
	useNavigation: () => ({ replace: jest.fn() }),
	useRoute: () => ({
		params: {
			icon: {
				name: 'cloud-off',
				type: 'material'
			},
			heading: 'Heading',
			message: 'Message',
			details: [ 'Details 1', 'Details 2' ],
			buttonIcon: {
				name: 'help',
				type: 'ionicon'
			},
			buttonTitle: 'Button Title'
		}
	})
}));

describe('ErrorScreen', () => {
	it('should render correctly', () => {
		const { toJSON } = render(<ErrorScreen />);

		expect(toJSON()).toMatchSnapshot();
	});
});
