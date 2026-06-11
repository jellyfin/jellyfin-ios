/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

const loadStaticFile = async (asset) => {
	const [{ localUri }] = await Asset.loadAsync(asset);
	return new File(localUri).text();
};

class Loader {
	scripts = {
		NativeAudioPlayer: '',
		NativeVideoPlayer: '',
		NativeShell: '',
		ExpoRouterShim: ''
	};

	async load() {
		// Load NativeShell plugins
		this.scripts.NativeAudioPlayer = await loadStaticFile(require('../assets/js/plugins/NativeAudioPlayer.staticjs'));
		this.scripts.NativeVideoPlayer = await loadStaticFile(require('../assets/js/plugins/NativeVideoPlayer.staticjs'));
		// Load the NativeShell
		this.scripts.NativeShell = await loadStaticFile(require('../assets/js/NativeShell.staticjs'));
		// Load the RouterShim
		this.scripts.ExpoRouterShim = await loadStaticFile(require('../assets/js/ExpoRouterShim.staticjs'));

		return this.scripts;
	}
}

const StaticScriptLoader = new Loader();

export default StaticScriptLoader;
