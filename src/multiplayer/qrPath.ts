/**
 * One path, not one rectangle per module: a link's code is about a thousand dark modules, and a node
 * for each would be a slow list to mount.
 */
export function qrPath(matrix: readonly (readonly boolean[])[]): string {
  return matrix
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")))
    .join("");
}
