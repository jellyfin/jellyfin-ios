import { NativeModules, Platform } from 'react-native';

/**
 * Enable or disable iOS shake-to-undo ("Undo Typing" dialog).
 */
export const setShakeToEditEnabled = (enabled: boolean) => {
	if (Platform.OS !== 'ios') return;
	NativeModules.ShakeToEdit?.setEnabled(enabled);
};
