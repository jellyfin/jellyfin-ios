import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';

/** Returns the extension of a file path, including the dot. */
export function getExtension(path: string | undefined | null) {
	if (!path) return undefined;
	return `.${path.split('.').pop()}`;
}

/** Returns the extension of a media container, including the dot. */
export function getContainerExtension(item: BaseItemDto, container?: string | undefined | null) {
	const containers = (container || item.Container || '')
		.split(',')
		.map(ext => `.${ext}`);

	// If there's only one container, use it as the extension
	if (containers.length === 1) return containers[0];

	// If a container matches the original file extension, use it
	const ext = getExtension(item.Path);
	if (ext && containers.includes(ext)) return ext;

	// Otherwise, use the first container
	console.error(`No matching container found for ${item.Path} in ${containers.join(', ')}, using ${containers[0]}`);
	return containers[0];
}
