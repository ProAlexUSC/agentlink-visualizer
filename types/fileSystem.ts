/**
 * File System Access API type definitions
 * These types augment the global Window interface for TypeScript support
 */

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
    getFileHandle(name: string): Promise<FileSystemFileHandle>;
  }

  interface FileSystemFileHandle {
    getFile(): Promise<File>;
  }

  interface FileSystemHandle {
    kind: "file" | "directory";
    name: string;
  }
}

export {};
