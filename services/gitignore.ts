/**
 * Gitignore pattern matching utilities
 * Handles parsing and matching of .gitignore patterns
 */

/**
 * Parse .gitignore file content into an array of patterns
 * Filters out empty lines and comments
 */
export const parseGitignore = (content: string): string[] => {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
};

/**
 * Convert a gitignore pattern to a RegExp
 * Handles glob patterns like *, **, ?, and directory-specific patterns
 */
const patternToRegex = (pattern: string, isRooted: boolean): RegExp | null => {
  let regexStr = pattern
    .replace(/\./g, "\\.") // Escape dots
    .replace(/\*\*/g, "{{GLOBSTAR}}") // Temp placeholder for **
    .replace(/\*/g, "[^/]*") // * matches anything except /
    .replace(/\?/g, "[^/]") // ? matches single char except /
    .replace(/\{\{GLOBSTAR\}\}/g, ".*"); // ** matches everything

  // If pattern doesn't contain /, it can match at any level
  if (!pattern.includes("/") && !isRooted) {
    regexStr = `(^|.*/)?${regexStr}$`;
  } else if (isRooted) {
    regexStr = `^${regexStr}$`;
  } else {
    regexStr = `(^|/)${regexStr}$`;
  }

  try {
    return new RegExp(regexStr);
  } catch {
    return null;
  }
};

/**
 * Check if a path matches a single gitignore pattern
 */
export const matchesGitignorePattern = (
  path: string,
  pattern: string,
  isDirectory: boolean
): boolean => {
  // Handle negation patterns (skip for simplicity)
  if (pattern.startsWith("!")) return false;

  // Remove trailing slash for directory-only patterns
  const dirOnly = pattern.endsWith("/");
  let cleanPattern = dirOnly ? pattern.slice(0, -1) : pattern;

  // If pattern is directory-only but entry is a file, no match
  if (dirOnly && !isDirectory) return false;

  // Handle patterns starting with /
  const isRooted = cleanPattern.startsWith("/");
  if (isRooted) {
    cleanPattern = cleanPattern.slice(1);
  }

  const regex = patternToRegex(cleanPattern, isRooted);
  return regex ? regex.test(path) : false;
};

/**
 * Check if a path should be ignored based on multiple gitignore pattern sets
 * Patterns are organized by directory, with each directory's patterns applying
 * to paths within that directory
 */
export const shouldIgnore = (
  relativePath: string,
  isDirectory: boolean,
  gitignorePatterns: Map<string, string[]>
): boolean => {
  for (const [ignoreDir, patterns] of gitignorePatterns) {
    // Only apply patterns from parent directories
    const isApplicable =
      relativePath.startsWith(ignoreDir) ||
      ignoreDir === "" ||
      relativePath === ignoreDir;

    if (!isApplicable) continue;

    const pathRelativeToIgnore = ignoreDir
      ? relativePath.slice(ignoreDir.length + 1)
      : relativePath;

    for (const pattern of patterns) {
      if (matchesGitignorePattern(pathRelativeToIgnore, pattern, isDirectory)) {
        return true;
      }
    }
  }

  return false;
};
