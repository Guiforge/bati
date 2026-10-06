/**
 * `expo-file-system` (the part Bati uses) on the real disk of the machine running the test, with real HTTP
 * for uploads and downloads. A device of the Node harness gets one of these, rooted in its own temporary
 * folder, so two devices never see each other's files except through a server.
 *
 * Only what the data code calls is here: File (uri, name, exists, size, delete, copy, move, text, write,
 * info, upload, downloadFileAsync), Directory (uri, exists, list, create) and Paths (cache, basename).
 */
import fs from "node:fs";
import path from "node:path";

import { nodeFetch } from "./useNodeFetch";

const toPath = (uri: string) => decodeURI(uri.replace(/^file:\/\//, ""));
const toUri = (p: string) => `file://${encodeURI(p)}`;

type Entry = string | File | Directory;
const join = (parts: Entry[]): string =>
  toUri(
    path.join(
      ...parts.map((part, index) =>
        typeof part === "string" ? (index === 0 ? toPath(part) : part) : toPath(part.uri),
      ),
    ),
  );

export class File {
  uri: string;
  constructor(...parts: Entry[]) {
    this.uri = join(parts);
  }
  get name(): string {
    return path.basename(toPath(this.uri));
  }
  get exists(): boolean {
    return fs.existsSync(toPath(this.uri)) && fs.statSync(toPath(this.uri)).isFile();
  }
  get size(): number {
    return fs.statSync(toPath(this.uri)).size;
  }
  delete(): void {
    fs.rmSync(toPath(this.uri));
  }
  info() {
    const stat = fs.statSync(toPath(this.uri));
    return { exists: true, size: stat.size, modificationTime: stat.mtimeMs };
  }
  text(): Promise<string> {
    return Promise.resolve(fs.readFileSync(toPath(this.uri), "utf8"));
  }
  write(content: string | Uint8Array): void {
    fs.mkdirSync(path.dirname(toPath(this.uri)), { recursive: true });
    fs.writeFileSync(toPath(this.uri), content);
  }
  private target(destination: File | Directory): string {
    return destination instanceof Directory
      ? path.join(toPath(destination.uri), this.name)
      : toPath(destination.uri);
  }
  copy(destination: File | Directory, options?: { overwrite?: boolean }): Promise<void> {
    const to = this.target(destination);
    if (fs.existsSync(to) && !options?.overwrite) {
      return Promise.reject(new Error(`Destination already exists: ${to}`));
    }
    fs.copyFileSync(toPath(this.uri), to);
    return Promise.resolve();
  }
  moveSync(destination: File | Directory, options?: { overwrite?: boolean }): void {
    const to = this.target(destination);
    if (fs.existsSync(to) && !options?.overwrite)
      throw new Error(`Destination already exists: ${to}`);
    fs.renameSync(toPath(this.uri), to);
    if (destination instanceof File) destination.uri = toUri(to);
  }
  move(destination: File | Directory, options?: { overwrite?: boolean }): Promise<void> {
    try {
      this.moveSync(destination, options);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async upload(
    url: string,
    options: { httpMethod?: string; headers?: Record<string, string> },
  ): Promise<{ status: number }> {
    const response = await nodeFetch(url, {
      method: options.httpMethod ?? "POST",
      headers: options.headers,
      body: fs.readFileSync(toPath(this.uri)),
    });
    await response.arrayBuffer();
    return { status: response.status };
  }
  static async downloadFileAsync(
    url: string,
    destination: File | Directory,
    options?: { headers?: Record<string, string> },
  ): Promise<File> {
    const response = await nodeFetch(url, { headers: options?.headers });
    if (!response.ok) throw new Error(`response has status: ${response.status}`);
    const file =
      destination instanceof Directory
        ? new File(destination, path.basename(new URL(url).pathname))
        : destination;
    fs.mkdirSync(path.dirname(toPath(file.uri)), { recursive: true });
    fs.writeFileSync(toPath(file.uri), Buffer.from(await response.arrayBuffer()));
    return file;
  }
}

export class Directory {
  uri: string;
  constructor(...parts: Entry[]) {
    this.uri = join(parts);
  }
  get name(): string {
    return path.basename(toPath(this.uri));
  }
  get exists(): boolean {
    return fs.existsSync(toPath(this.uri)) && fs.statSync(toPath(this.uri)).isDirectory();
  }
  create(): void {
    fs.mkdirSync(toPath(this.uri), { recursive: true });
  }
  list(): (File | Directory)[] {
    return fs.readdirSync(toPath(this.uri)).map((name) => {
      const full = path.join(toPath(this.uri), name);
      return fs.statSync(full).isDirectory() ? new Directory(toUri(full)) : new File(toUri(full));
    });
  }
}

/** The module `expo-file-system` exports, rooted in `cache` for this device. */
export function makeExpoFs(cache: string) {
  fs.mkdirSync(cache, { recursive: true });
  return {
    File,
    Directory,
    Paths: {
      cache: new Directory(toUri(cache)),
      basename: (p: string) => path.basename(toPath(p)),
    },
    UploadType: { BINARY_CONTENT: 0 },
  };
}
