import { AgentFile, FileTreeNode, GraphLink, GraphNode } from '../types';

/**
 * Resolves a path relative to the source file.
 */
const resolvePath = (sourcePath: string, linkPath: string): string => {
  // Strip leading @ if present (CLAUDE.md style)
  let cleanLink = linkPath.startsWith('@') ? linkPath.slice(1) : linkPath;
  cleanLink = cleanLink.trim();

  // 1. Absolute path (from project root)
  // e.g., @/src/main.ts or /src/main.ts
  if (cleanLink.startsWith('/')) {
    return cleanLink.slice(1);
  }

  // 2. Explicit Relative path
  // e.g., @./utils.ts or @../config.json
  if (cleanLink.startsWith('.')) {
    const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
    const sourceParts = sourceDir ? sourceDir.split('/') : [];
    const linkParts = cleanLink.split('/');

    const resultParts = [...sourceParts];

    for (const part of linkParts) {
      if (part === '.') continue;
      if (part === '..') {
        if (resultParts.length > 0) {
          resultParts.pop();
        }
      } else {
        resultParts.push(part);
      }
    }
    return resultParts.join('/');
  }

  // 3. Implicit Root Relative (Common in CLAUDE.md)
  // e.g., @src/utils/logger.ts -> src/utils/logger.ts
  // If it doesn't start with . or /, we assume it's from root
  return cleanLink;
};

/**
 * Parses content to find @path links.
 */
export const extractLinks = (content: string): string[] => {
  const links: string[] = [];

  // Support [[wiki-style]] (legacy Agent.md)
  const wikiRegex = /\[\[(.*?)\]\]/g;
  let match;
  while ((match = wikiRegex.exec(content)) !== null) {
    links.push(match[1]);
  }

  // Support @file/path/style (CLAUDE.md)
  // Pattern 1: `@/path/to/file` or `@./path` or `@../path` (backtick wrapped)
  const backtickRegex = /`(@[\/\.]?[a-zA-Z0-9_\-\.\/]+)`/g;
  while ((match = backtickRegex.exec(content)) !== null) {
    links.push(match[1]);
  }

  // Pattern 2: @path without backticks (word boundary or whitespace before)
  // Supports: @/path, @./path, @../path, @path
  const atRegex = /(?:^|[\s:])(@[\/\.]?[a-zA-Z0-9_\-\.\/]+)/gm;
  while ((match = atRegex.exec(content)) !== null) {
    // Avoid duplicates from backtick matches
    if (!links.includes(match[1])) {
      links.push(match[1]);
    }
  }

  return links;
};

/**
 * Builds a node and link list for D3 visualization.
 * @param files All files in the repo
 * @param parseTarget The filename to look for links in (e.g. 'CLAUDE.md' or 'AGENTS.md')
 */
export const buildGraphData = (files: AgentFile[], parseTarget: 'CLAUDE.md' | 'AGENTS.md') => {
  // 1. Identify valid nodes
  // Nodes include:
  // - ONLY files that exactly match parseTarget.
  // - Other files (like .ts, .json) are explicitly filtered out from the graph
  
  const fileMap = new Map(files.map(f => [f.path, f]));
  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  // Helper to get or create node
  const getOrCreateNode = (file: AgentFile, isSource: boolean) => {
    if (!nodesMap.has(file.path)) {
      nodesMap.set(file.path, {
        id: file.path,
        name: file.directory ? `${file.directory.split('/').pop()}/${file.name}` : file.name,
        group: 1,
        file: file,
        val: isSource ? 2 : 1, // Larger start size for sources
      });
    }
    return nodesMap.get(file.path)!;
  };

  files.forEach(sourceFile => {
    // Only process the selected file type (e.g., CLAUDE.md or AGENTS.md)
    if (sourceFile.name.toLowerCase() !== parseTarget.toLowerCase()) return;

    // Skip files without loaded content
    if (!sourceFile.content) return;

    // Create the node for this file
    const sourceNode = getOrCreateNode(sourceFile, true);

    const rawLinks = extractLinks(sourceFile.content);
    
    rawLinks.forEach(rawLink => {
      const resolvedPath = resolvePath(sourceFile.path, rawLink);
      
      // Try to find exact match in files
      let target = fileMap.get(resolvedPath);

      // Fuzzy match logic for extensions (though usually we want exact md match here)
      if (!target) {
        target = Array.from(fileMap.values()).find(f => 
          f.path === resolvedPath || 
          f.path === `${resolvedPath}.md`
        );
      }

      if (target) {
        // STRICT FILTER: Only add the target to the graph if it is ALSO of the same type.
        // e.g. CLAUDE.md -> server.ts (IGNORE)
        // e.g. CLAUDE.md -> nested/CLAUDE.md (KEEP)
        if (target.name !== parseTarget) {
          return; 
        }

        // Ensure target node exists
        const targetNode = getOrCreateNode(target, false);

        // Avoid self-loops
        if (sourceFile.path !== target.path) {
          links.push({
            source: sourceFile.path,
            target: target.path
          });
          
          sourceNode.val += 1;
          targetNode.val += 1;
        }
      }
    });
  });

  return { 
    nodes: Array.from(nodesMap.values()), 
    links 
  };
};

/**
 * Converts a flat list of files into a nested tree structure.
 */
export const buildFileTree = (files: AgentFile[]): FileTreeNode[] => {
  const root: FileTreeNode[] = [];

  files.forEach(file => {
    const parts = file.path.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const existingPath = currentLevel.find(n => n.name === part && n.type === (isFile ? 'file' : 'directory'));

      if (existingPath) {
        if (!isFile) {
          currentLevel = existingPath.children!;
        }
      } else {
        const newNode: FileTreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
          fileData: isFile ? file : undefined
        };
        currentLevel.push(newNode);
        if (!isFile) {
          currentLevel = newNode.children!;
        }
      }
    });
  });

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
    nodes.forEach(node => {
      if (node.children) sortNodes(node.children);
    });
  };

  sortNodes(root);
  return root;
};
