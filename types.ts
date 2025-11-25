import * as d3 from "d3";

// Re-export File System API types
import "./types/fileSystem";

/**
 * Represents a markdown file found in the repository
 */
export interface AgentFile {
  /** Relative path from repository root */
  path: string;
  /** File name (e.g., "CLAUDE.md") */
  name: string;
  /** File content (loaded lazily) */
  content?: string;
  /** Parent directory path */
  directory: string;
  /** File System Access API handle for lazy loading */
  fileHandle?: FileSystemFileHandle;
}

/**
 * Graph node representing a file in the visualization
 */
export interface GraphNode extends d3.SimulationNodeDatum {
  /** Unique identifier (file path) */
  id: string;
  /** Display name shown in the graph */
  name: string;
  /** Group for clustering (currently unused) */
  group: number;
  /** Associated file data */
  file: AgentFile;
  /** Node size based on connection count */
  val: number;
  /** Whether this is a root-level file */
  isRoot: boolean;
}

/**
 * Graph link representing a reference between files
 */
export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  /** Source node ID or reference */
  source: string | GraphNode;
  /** Target node ID or reference */
  target: string | GraphNode;
}

/**
 * File tree node for the sidebar explorer
 */
export interface FileTreeNode {
  /** Display name */
  name: string;
  /** Full path */
  path: string;
  /** Node type */
  type: "file" | "directory";
  /** Child nodes (for directories) */
  children?: FileTreeNode[];
  /** Associated file data (for files) */
  fileData?: AgentFile;
}
