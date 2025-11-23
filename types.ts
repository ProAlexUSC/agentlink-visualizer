import * as d3 from 'd3';

export interface AgentFile {
  path: string;
  name: string;
  content?: string;  // Optional for lazy loading
  directory: string;
  fileHandle?: FileSystemFileHandle;  // For File System Access API
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string; // path
  name: string;
  group: number;
  file: AgentFile;
  val: number; // size based on connections
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  fileData?: AgentFile;
}