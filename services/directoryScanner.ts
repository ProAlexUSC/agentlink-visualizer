/**
 * Directory scanning service
 * Handles recursive directory traversal with gitignore support
 */

import { AgentFile } from "../types";
import { parseGitignore, shouldIgnore } from "./gitignore";

// Directories to always skip (version control systems)
const ALWAYS_SKIP_DIRS = new Set([".git", ".svn", ".hg"]);

// File extensions to scan
const MARKDOWN_EXTENSION = ".md";

/**
 * Build the entry path by combining the relative path and entry name
 */
const buildEntryPath = (relativePath: string, entryName: string): string => {
  return relativePath ? `${relativePath}/${entryName}` : entryName;
};

/**
 * Try to load .gitignore from a directory and add patterns to the map
 */
const loadGitignorePatterns = async (
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string,
  gitignorePatterns: Map<string, string[]>
): Promise<void> => {
  try {
    const gitignoreHandle = await dirHandle.getFileHandle(".gitignore");
    const gitignoreFile = await gitignoreHandle.getFile();
    const gitignoreContent = await gitignoreFile.text();
    const patterns = parseGitignore(gitignoreContent);
    if (patterns.length > 0) {
      gitignorePatterns.set(relativePath, patterns);
    }
  } catch {
    // No .gitignore in this directory, continue
  }
};

/**
 * Check if a file should be included in the scan results
 */
const isMarkdownFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith(MARKDOWN_EXTENSION);
};

/**
 * Check if a directory should be skipped
 */
const shouldSkipDirectory = (
  dirName: string,
  entryPath: string,
  gitignorePatterns: Map<string, string[]>
): boolean => {
  // Always skip version control directories
  if (ALWAYS_SKIP_DIRS.has(dirName)) {
    return true;
  }

  // Check gitignore patterns
  return shouldIgnore(entryPath, true, gitignorePatterns);
};

/**
 * Create an AgentFile from a file entry
 */
const createAgentFile = (
  entryPath: string,
  entryName: string,
  relativePath: string,
  fileHandle: FileSystemFileHandle
): AgentFile => ({
  path: entryPath,
  name: entryName,
  directory: relativePath,
  fileHandle,
});

/**
 * Recursively scan a directory for markdown files
 * Respects .gitignore patterns at each level
 */
export const scanDirectory = async (
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string = "",
  gitignorePatterns: Map<string, string[]> = new Map()
): Promise<AgentFile[]> => {
  const foundFiles: AgentFile[] = [];

  try {
    // Load .gitignore patterns from this directory
    await loadGitignorePatterns(dirHandle, relativePath, gitignorePatterns);

    // Iterate through directory entries
    // @ts-expect-error - values() method exists in File System Access API
    for await (const entry of dirHandle.values()) {
      const entryPath = buildEntryPath(relativePath, entry.name);

      if (entry.kind === "file") {
        // Process markdown files that aren't ignored
        if (
          isMarkdownFile(entry.name) &&
          !shouldIgnore(entryPath, false, gitignorePatterns)
        ) {
          foundFiles.push(
            createAgentFile(
              entryPath,
              entry.name,
              relativePath,
              entry as FileSystemFileHandle
            )
          );
        }
      } else if (entry.kind === "directory") {
        // Recursively scan non-ignored directories
        if (
          !shouldSkipDirectory(entry.name, entryPath, gitignorePatterns)
        ) {
          const subFiles = await scanDirectory(
            entry as FileSystemDirectoryHandle,
            entryPath,
            gitignorePatterns
          );
          foundFiles.push(...subFiles);
        }
      }
    }
  } catch (error) {
    console.error("Error scanning directory:", error);
  }

  return foundFiles;
};

/**
 * Load content for all files in parallel
 * Uses Promise.allSettled to handle individual failures gracefully
 */
export const loadAllFileContents = async (
  files: AgentFile[]
): Promise<AgentFile[]> => {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      if (file.fileHandle && !file.content) {
        const fileObj = await file.fileHandle.getFile();
        const content = await fileObj.text();
        return { ...file, content };
      }
      return file;
    })
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    console.error(`Failed to load ${files[index].path}:`, result.reason);
    return files[index];
  });
};
