/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { WebView } from 'react-native-webview';

import RefreshWebView from '../RefreshWebView';

describe('RefreshWebView', () => {
	it('should render', () => {
		const { toJSON } = render(
			<RefreshWebView
				isRefreshing={false}
			/>
		);

		expect(toJSON()).toMatchSnapshot();
	});

	it('disables both scrolling layers and removes refresh until fullscreen ends', () => {
		const onRefresh = jest.fn();
		const { container, rerender } = render(
			<RefreshWebView isRefreshing={false} onRefresh={onRefresh} />
		);
		expect(container.findByType(RefreshControl).props.enabled).toBe(true);
		fireEvent(container.findByType(WebView), 'scroll', { nativeEvent: { contentOffset: { y: 100 } } });
		expect(container.findByType(RefreshControl).props.enabled).toBe(false);
		fireEvent(container.findByType(WebView), 'scroll', { nativeEvent: { contentOffset: { y: 0 } } });
		rerender(<RefreshWebView isRefreshing={false} scrollEnabled={false} bounces={false} />);
		expect(container.findAllByType(RefreshControl)).toHaveLength(0);
		for (const component of [ ScrollView, WebView ]) {
			expect(container.findByType(component).props.scrollEnabled).toBe(false);
			expect(container.findByType(component).props.bounces).toBe(false);
		}
		rerender(<RefreshWebView isRefreshing={false} onRefresh={onRefresh} scrollEnabled bounces />);
		for (const component of [ ScrollView, WebView ]) {
			expect(container.findByType(component).props.scrollEnabled).toBe(true);
			expect(container.findByType(component).props.bounces).toBe(true);
		}
		expect(container.findByType(RefreshControl).props.enabled).toBe(true);
		fireEvent(container.findByType(RefreshControl), 'refresh');
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});
});
