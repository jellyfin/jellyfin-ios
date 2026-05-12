/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import DownloadModel from '../../../../models/DownloadModel';
import { DownloadAction } from '../../constants/DownloadAction';
import { DownloadStatus } from '../../constants/DownloadStatus';
import { getDownloadItemActions } from '../../utils/downloadItemActions';
import DownloadListItem from '../DownloadListItem';

describe('DownloadListItem', () => {
	let model;

	beforeEach(() => {
		jest.resetModules();

		model = new DownloadModel(
			{
				Id: 'item-id',
				ServerId: 'server-id',
				Name: 'title',
				MediaType: MediaType.Video
			},
			'https://example.com/',
			'api-key',
			'file name.mkv',
			'https://example.com/download'
		);
	});

	it('should render correctly', () => {
		model.status = DownloadStatus.Downloading;

		const { getByTestId, queryByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				actions={getDownloadItemActions(model)}
				onAction={jest.fn()}
				onSelect={jest.fn()}
			/>
		);

		expect(queryByTestId('select-checkbox')).toBeNull();
		expect(queryByTestId('failed-icon')).toBeNull();

		expect(getByTestId('title')).toHaveTextContent('title');
		expect(getByTestId('subtitle')).toHaveTextContent('file name.mp4');

		expect(queryByTestId('loading-indicator')).not.toBeNull();
	});

	it('should display the menu and handle presses', () => {
		const onAction = jest.fn();

		model.canPlay = true;
		model.status = DownloadStatus.Complete;

		const { getByTestId, queryByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				actions={getDownloadItemActions(model)}
				onAction={onAction}
				onSelect={jest.fn()}
			/>
		);

		expect(queryByTestId('select-checkbox')).toBeNull();
		expect(queryByTestId('failed-icon')).toBeNull();

		expect(getByTestId('title')).toHaveTextContent('title');
		expect(getByTestId('subtitle')).toHaveTextContent('file name.mp4');

		expect(queryByTestId('loading-indicator')).toBeNull();

		// Pressing the list item should call onPlay when not editing
		expect(onAction).not.toHaveBeenCalled();
		fireEvent.press(getByTestId('list-item'));
		expect(onAction).toHaveBeenLastCalledWith(DownloadAction.PlayInApp);
		// Pressing the play menu action should call onPlay
		expect(queryByTestId('play_in_app')).not.toBeNull();
		fireEvent.press(getByTestId('play_in_app'));
		expect(onAction).toHaveBeenLastCalledWith(DownloadAction.PlayInApp);
		expect(onAction).toHaveBeenCalledTimes(2);
		// Pressing the open menu action should call onOpen
		expect(queryByTestId('open_in_files')).not.toBeNull();
		fireEvent.press(getByTestId('open_in_files'));
		expect(onAction).toHaveBeenLastCalledWith(DownloadAction.OpenInFiles);
		// Pressing the delete menu action should call onDelete
		expect(queryByTestId('delete')).not.toBeNull();
		fireEvent.press(getByTestId('delete'));
		expect(onAction).toHaveBeenLastCalledWith(DownloadAction.Delete);
	});

	it('should call onOpen if the item is pressed and not playable', () => {
		const onAction = jest.fn();
		const audioModel = new DownloadModel(
			{
				Id: 'item-id',
				ServerId: 'server-id',
				Name: 'title',
				MediaType: MediaType.Audio
			},
			'https://example.com/',
			'api-key',
			'file name.mp3',
			'https://example.com/download'
		);

		audioModel.status = DownloadStatus.Complete;

		const { getByTestId } = render(
			<DownloadListItem
				item={audioModel}
				index={0}
				actions={getDownloadItemActions(audioModel)}
				onAction={onAction}
				onSelect={jest.fn()}
			/>
		);

		// Pressing the list item should call onOpen when not playable
		expect(onAction).not.toHaveBeenCalled();
		fireEvent.press(getByTestId('list-item'));
		expect(onAction).toHaveBeenCalledWith(DownloadAction.OpenInFiles);
	});

	it('should call onPlay for completed video downloads even without canPlay metadata', () => {
		const onAction = jest.fn();

		model.status = DownloadStatus.Complete;

		const { getByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				actions={getDownloadItemActions(model)}
				onAction={onAction}
				onSelect={jest.fn()}
			/>
		);

		expect(onAction).not.toHaveBeenCalled();
		fireEvent.press(getByTestId('list-item'));
		expect(onAction).toHaveBeenCalledWith(DownloadAction.PlayInApp);
	});

	it('should display the select checkbox and handle presses', () => {
		const onSelect = jest.fn();

		model.status = DownloadStatus.Complete;

		const { getByTestId, queryByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				actions={getDownloadItemActions(model)}
				onAction={jest.fn()}
				onSelect={onSelect}
				isEditMode={true}
			/>
		);

		expect(queryByTestId('select-checkbox')).not.toBeNull();

		expect(getByTestId('title')).toHaveTextContent('title');
		expect(getByTestId('subtitle')).toHaveTextContent('file name.mp4');

		expect(queryByTestId('loading-indicator')).toBeNull();
		expect(queryByTestId('failed-icon')).toBeNull();

		expect(onSelect).not.toHaveBeenCalled();

		// Pressing the list item and checkbox should call select
		fireEvent.press(getByTestId('list-item'));
		expect(onSelect).toHaveBeenCalledTimes(1);
		fireEvent.press(getByTestId('select-checkbox'));
		expect(onSelect).toHaveBeenCalledTimes(2);
	});

	it('should display a warning for failed downloads', () => {
		model.status = DownloadStatus.Failed;

		const { getByTestId, queryByTestId } = render(
			<DownloadListItem
				item={model}
				index={0}
				actions={getDownloadItemActions(model)}
				onAction={jest.fn()}
				onSelect={jest.fn()}
			/>
		);

		expect(queryByTestId('select-checkbox')).toBeNull();
		expect(queryByTestId('loading-indicator')).toBeNull();

		expect(getByTestId('title')).toHaveTextContent('title');
		expect(getByTestId('subtitle')).toHaveTextContent('file name.mp4');

		expect(queryByTestId('failed-icon')).not.toBeNull();
	});
});
