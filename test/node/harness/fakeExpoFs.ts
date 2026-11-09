/**
 * `expo-file-system` (the part Bati uses) on the real disk of the machine running the test, with real HTTP
 * for uploads and downloads. A device of the Node harness gets one of these, rooted in its own temporary
 * folder, so two devices never see each other's files except through a server.
 *
 * Only what the data code calls is here: File (uri, name, exists, size, delete, copy, move, text, textSync,
 * write, info, open, upload, downloadFileAsync), Directory (uri, exists, list, create, delete) and Paths
 * (cache, document, basename, availableDiskSpace).
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
  textSync(): string {
    return fs.readFileSync(toPath(this.uri), "utf8");
  }
  open(mode: string = FileMode.ReadWrite): FileHandle {
    return new FileHandle(toPath(this.uri), mode);
  }
  text(): Promise<string> {
    return Promise.resolve(fs.readFileSync(toPath(this.uri), "utf8"));
  }
  writeSync(content: string | Uint8Array): void {
    this.write(content);
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

export const FileMode = { ReadOnly: "r", ReadWrite: "rw" } as const;

/** expo-file-system's random access handle: an offset that moves with each read and write. */
class FileHandle {
  private fd: number | null;
  offset: number | null = 0;
  constructor(file: string, mode: string) {
    this.fd = fs.openSync(file, mode === FileMode.ReadOnly ? "r" : "r+");
  }
  get size(): number | null {
    return this.fd === null ? null : fs.fstatSync(this.fd).size;
  }
  private use(): number {
    if (this.fd === null) throw new Error("FileHandle is closed");
    return this.fd;
  }
  readBytes(length: number): Promise<Uint8Array> {
    const fd = this.use();
    const buffer = Buffer.alloc(length);
    const read = fs.readSync(fd, buffer, 0, length, this.offset ?? 0);
    this.offset = (this.offset ?? 0) + read;
    return Promise.resolve(new Uint8Array(buffer.subarray(0, read)));
  }
  writeBytes(bytes: Uint8Array): Promise<void> {
    const fd = this.use();
    // As on Android: past the end, the write lands at the end.
    const at = Math.min(this.offset ?? 0, fs.fstatSync(fd).size);
    fs.writeSync(fd, bytes, 0, bytes.length, at);
    this.offset = at + bytes.length;
    return Promise.resolve();
  }
  close(): void {
    if (this.fd !== null) fs.closeSync(this.fd);
    this.fd = null;
    this.offset = null;
  }
}

/** Free space the fake disk reports; a test lowers it to play a full phone. */
export const disk = { available: Number.MAX_SAFE_INTEGER };

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
  /** As on a device: a missing parent fails unless `intermediates` (P2P's `p2p/out` did, 08/11). */
  create(options?: { intermediates?: boolean }): void {
    fs.mkdirSync(toPath(this.uri), { recursive: options?.intermediates === true });
  }
  delete(): void {
    fs.rmSync(toPath(this.uri), { recursive: true });
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
    FileMode,
    Paths: {
      cache: new Directory(toUri(cache)),
      document: new Directory(toUri(path.join(cache, "..", "document"))),
      basename: (p: string) => path.basename(toPath(p)),
      get availableDiskSpace() {
        return disk.available;
      },
    },
    UploadType: { BINARY_CONTENT: 0 },
  };
}
