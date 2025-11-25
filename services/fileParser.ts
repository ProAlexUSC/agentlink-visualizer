import { AgentFile, FileTreeNode, GraphLink, GraphNode } from "../types";
import { FILE_TYPES, ParseMode } from "../constants";

// Regex patterns for link extraction (compiled once for performance)
const LINK_PATTERNS = {
  // [[wiki-style]] links (legacy AGENTS.md format)
  wikiLink: /\[\[(.*?)\]\]/g,
  // `@/path/to/file` or `@./path` (backtick wrapped)
  backtickAtLink: /`(@[\/\.]?[a-zA-Z0-9_\-\.\/]+)`/g,
  // @path without backticks
  atLink: /(?:^|[\s:])(@[\/\.]?[a-zA-Z0-9_\-\.\/]+)/gm,
  // `path/to/file.md` without @ prefix
  backtickPath: /`([a-zA-Z0-9_\-\.\/]+\.(md|ts|js|json|yaml|yml))`/g,
} as const;

/**
 * Resolve a link path relative to the source file location
 * Supports: absolute (/path), explicit relative (./path, ../path), and implicit root (path)
 */
const resolvePath = (sourcePath: string, linkPath: string): string => {
  // Strip leading @ if present
  const cleanLink = linkPath.startsWith("@")
    ? linkPath.slice(1).trim()
    : linkPath.trim();

  // Absolute path from project root (e.g., /src/main.ts)
  if (cleanLink.startsWith("/")) {
    return cleanLink.slice(1);
  }

  // Explicit relative path (e.g., ./utils.ts or ../config.json)
  if (cleanLink.startsWith(".")) {
    return resolveRelativePath(sourcePath, cleanLink);
  }

  // Implicit root relative (e.g., src/utils/logger.ts)
  return cleanLink;
};

/**
 * Resolve a relative path (starting with . or ..) against a source path
 */
const resolveRelativePath = (sourcePath: string, relativePath: string): string => {
  const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
  const sourceParts = sourceDir ? sourceDir.split("/") : [];
  const linkParts = relativePath.split("/");

  const resultParts = [...sourceParts];

  for (const part of linkParts) {
    if (part === ".") continue;
    if (part === "..") {
      resultParts.pop();
    } else {
      resultParts.push(part);
    }
  }

  return resultParts.join("/");
};

/**
 * Reset all regex patterns (required for global flag)
 */
const resetPatterns = (): void => {
  Object.values(LINK_PATTERNS).forEach((pattern) => {
    pattern.lastIndex = 0;
  });
};

/**
 * Extract all links from markdown content
 * Supports wiki-style [[links]] and @path references
 */
export const extractLinks = (content: string): string[] => {
  const links: string[] = [];
  resetPatterns();

  // Wiki-style links: [[path/to/file]]
  let match;
  while ((match = LINK_PATTERNS.wikiLink.exec(content)) !== null) {
    links.push(match[1]);
  }

  // Backtick-wrapped @links: `@/path/to/file`
  while ((match = LINK_PATTERNS.backtickAtLink.exec(content)) !== null) {
    links.push(match[1]);
  }

  // Plain @links (avoid duplicates from backtick matches)
  while ((match = LINK_PATTERNS.atLink.exec(content)) !== null) {
    if (!links.includes(match[1])) {
      links.push(match[1]);
    }
  }

  // Backtick-wrapped paths without @: `specs/auth/spec.md`
  while ((match = LINK_PATTERNS.backtickPath.exec(content)) !== null) {
    if (!links.includes(match[1])) {
      links.push(match[1]);
    }
  }

  return links;
};

/**
 * Check if a file is an allowed type for graph parsing
 */
const isAllowedFileType = (fileName: string): boolean => {
  const lowerName = fileName.toLowerCase();
  return FILE_TYPES.ALLOWED_TYPES.some(
    (type) => lowerName === type.toLowerCase()
  );
};

/**
 * Check if a file is in the root directory
 */
const isRootFile = (file: AgentFile): boolean => {
  return !file.directory || file.directory === "";
};

/**
 * Check if a file should be excluded from the graph (root file of non-selected mode)
 */
const shouldExcludeFile = (file: AgentFile, parseTarget: ParseMode): boolean => {
  if (!isRootFile(file)) return false;

  const fileName = file.name.toLowerCase();
  const isAgentOrClaude =
    fileName === "claude.md" || fileName === "agents.md";

  return isAgentOrClaude && fileName !== parseTarget.toLowerCase();
};

/**
 * Try to find a target file in the file map
 * Supports exact match and fuzzy match with .md extension
 */
const findTargetFile = (
  resolvedPath: string,
  fileMap: Map<string, AgentFile>
): AgentFile | undefined => {
  // Try exact match first
  const exactMatch = fileMap.get(resolvedPath);
  if (exactMatch) return exactMatch;

  // Try with .md extension
  return Array.from(fileMap.values()).find(
    (f) => f.path === resolvedPath || f.path === `${resolvedPath}.md`
  );
};

/**
 * Build graph data (nodes and links) from agent files
 */
export const buildGraphData = (
  files: AgentFile[],
  parseTarget: ParseMode
): { nodes: GraphNode[]; links: GraphLink[] } => {
  const fileMap = new Map(files.map((f) => [f.path, f]));
  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const linkSet = new Set<string>();

  // Create or get a node for a file
  const getOrCreateNode = (file: AgentFile, isSource: boolean): GraphNode => {
    const existingNode = nodesMap.get(file.path);
    if (existingNode) return existingNode;

    const isRootOfTarget =
      isRootFile(file) &&
      file.name.toLowerCase() === parseTarget.toLowerCase();

    const displayName = file.directory
      ? `${file.directory.split("/").pop()}/${file.name}`
      : file.name;

    const node: GraphNode = {
      id: file.path,
      name: displayName,
      group: 1,
      file,
      val: isSource ? 2 : 1,
      isRoot: isRootOfTarget,
    };

    nodesMap.set(file.path, node);
    return node;
  };

  // Process each source file
  for (const sourceFile of files) {
    // Only process CLAUDE.md and AGENTS.md files
    if (!isAllowedFileType(sourceFile.name)) continue;

    // Skip root file of non-selected mode
    if (shouldExcludeFile(sourceFile, parseTarget)) continue;

    // Skip files without content
    if (!sourceFile.content) continue;

    const sourceNode = getOrCreateNode(sourceFile, true);
    const rawLinks = extractLinks(sourceFile.content);

    for (const rawLink of rawLinks) {
      const resolvedPath = resolvePath(sourceFile.path, rawLink);
      const target = findTargetFile(resolvedPath, fileMap);

      if (!target) continue;

      // Only allow .md files as targets
      if (!target.name.toLowerCase().endsWith(".md")) continue;

      // Skip excluded files
      if (shouldExcludeFile(target, parseTarget)) continue;

      // Avoid self-loops
      if (sourceFile.path === target.path) continue;

      // Avoid duplicate links
      const linkKey = `${sourceFile.path}->${target.path}`;
      if (linkSet.has(linkKey)) continue;

      linkSet.add(linkKey);
      const targetNode = getOrCreateNode(target, false);

      links.push({
        source: sourceFile.path,
        target: target.path,
      });

      // Increase node values based on connections
      sourceNode.val += 1;
      targetNode.val += 1;
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    links,
  };
};

/**
 * Build a hierarchical file tree from a flat list of files
 */
export const buildFileTree = (files: AgentFile[]): FileTreeNode[] => {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const nodeType = isFile ? "file" : "directory";
      const existingNode = currentLevel.find(
        (n) => n.name === part && n.type === nodeType
      );

      if (existingNode) {
        if (!isFile && existingNode.children) {
          currentLevel = existingNode.children;
        }
      } else {
        const newNode: FileTreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          type: nodeType,
          children: isFile ? undefined : [],
          fileData: isFile ? file : undefined,
        };
        currentLevel.push(newNode);

        if (!isFile && newNode.children) {
          currentLevel = newNode.children;
        }
      }
    });
  }

  sortFileTree(root);
  return root;
};

/**
 * Sort file tree nodes: directories first, then alphabetically
 */
const sortFileTree = (nodes: FileTreeNode[]): void => {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  for (const node of nodes) {
    if (node.children) {
      sortFileTree(node.children);
    }
  }
};
