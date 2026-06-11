/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import ErrorView from '../ErrorView';

describe('ErrorView', () => {
	it('should render correctly', () => {
		const { getByTestId, queryByTestId } = render(
			<ErrorView
				heading='Error Heading'
				message='Error Message'
			/>
		);

		expect(getByTestId('error-view-heading')).toHaveTextContent('Error Heading');
		expect(getByTestId('error-view-message')).toHaveTextContent('Error Message');
		expect(getByTestId('error-view-details')).toBeEmptyElement();
		expect(queryByTestId('error-view-icon')).not.toBeNull();
		expect(queryByTestId('error-view-button')).toBeNull();
	});

	it('should render button and handle presses', () => {
		const onPress = jest.fn();

		const { getByTestId } = render(
			<ErrorView
				heading='Error Heading'
				message='Error Message'
				buttonTitle='Test Button'
				onPress={onPress}
			/>
		);

		const button = getByTestId('error-view-button');
		expect(button).toHaveTextContent('Test Button');
		expect(onPress).not.toHaveBeenCalled();
		fireEvent.press(button);
		expect(onPress).toHaveBeenCalled();
	});

	it('should render details', () => {
		const { getAllByTestId, getByTestId } = render(
			<ErrorView
				heading='Error Heading'
				message='Error Message'
				details={[
					'Detail 0',
					'Detail 1',
					'Detail 2'
				]}
			/>
		);

		expect(getByTestId('error-view-details')).not.toBeEmptyElement();

		const details = getAllByTestId('error-view-detail');
		expect(details).toHaveLength(3);
		expect(details[0]).toHaveTextContent('Detail 0');
		expect(details[1]).toHaveTextContent('Detail 1');
		expect(details[2]).toHaveTextContent('Detail 2');
	});
});
