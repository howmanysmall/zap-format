/**
 * Represents a value that can be used as a file path in Bun APIs.
 *
 * A `PathLike` is any value accepted by Bun's file system APIs as a path
 * argument. This includes:
 *
 * - `string`: A file system path or filename.
 * - `URL`: A file URL (e.g., `new URL("file:///tmp/foo.txt")`).
 * - `ArrayBuffer` or TypedArray: A buffer containing a UTF-8 encoded path string.
 * - `Bun.BunFile`: A Bun file handle, which exposes a `name` property for the
 *   file path.
 *
 * @remarks
 * This type is a union of `Bun.BunFile` and `Bun.PathLike`, matching the
 * accepted types for Bun's file APIs.
 * @see {@link https://bun.com/docs/api/file-io | Bun File I/O}
 * @see {@linkcode https://bun.sh/reference/bun/PathLike | Bun.PathLike}
 */
export type PathLike = Bun.BunFile | Bun.PathLike;

const BUFFER_EXISTS = typeof Buffer !== "undefined";

/**
 * Checks if a given value is a Bun.BunFile instance.
 *
 * @param file - The value to check.
 * @returns `true` if the value is a Bun.BunFile, `false` otherwise.
 */
export function isBunFile(file: unknown): file is Bun.BunFile {
	return file instanceof Blob && "name" in file && typeof file.name === "string" && file.name.length > 0;
}

/**
 * Checks if a given value is a Bun.PathLike type. A PathLike can be a string,
 * URL, ArrayBuffer, or a TypedArray (excluding DataView).
 *
 * @param value - The value to check.
 * @returns `true` if the value is a Bun.PathLike, `false` otherwise.
 */
export function isPathLike(value: unknown): value is Bun.PathLike {
	if (typeof value === "string") return true;
	if (value instanceof URL) return true;
	if (value instanceof ArrayBuffer) return true;
	return !!(ArrayBuffer.isView(value) && !(value instanceof DataView));
}

/**
 * Converts a value that can be used as a path to its string representation.
 *
 * Accepts strings, URLs, and various typed arrays or buffers, returning a
 * string suitable for Bun file APIs.
 *
 * @example
 *
 * ```typescript
 * toPathString("foo.txt"); // "foo.txt"
 * toPathString(new URL("file:///bar.txt")); // "/bar.txt"
 * toPathString(new Uint8Array([97, 98, 99])); // "abc"
 * ```
 *
 * @param pathLike - The value to convert to a path string. Can be a string,
 *   URL, or supported buffer/typed array.
 * @returns The string representation of the path.
 * @throws {TypeError} If the input type is not supported.
 * @see {@linkcode PathLike}
 */
export function fromPathLike(pathLike: PathLike): string {
	if (typeof pathLike === "string") return pathLike;
	if (pathLike instanceof URL) return pathLike.pathname;
	if (BUFFER_EXISTS && Buffer.isBuffer(pathLike)) return pathLike.toString();

	if (pathLike instanceof ArrayBuffer || ArrayBuffer.isView(pathLike)) {
		const bytes =
			pathLike instanceof ArrayBuffer
				? new Uint8Array(pathLike)
				: new Uint8Array(pathLike.buffer, pathLike.byteOffset, pathLike.byteLength);

		return new TextDecoder().decode(bytes);
	}

	if (isBunFile(pathLike)) {
		const { name } = pathLike;
		if (name) return name;
		throw new TypeError("BunFile must have a name property");
	}

	throw new TypeError(`Unsupported path type: ${Object.prototype.toString.call(pathLike)}`);
}
