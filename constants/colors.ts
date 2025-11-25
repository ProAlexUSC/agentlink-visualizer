/**
 * 应用颜色常量
 * 统一管理所有颜色值，便于主题切换和维护
 */

export const COLORS = {
  // 节点颜色
  node: {
    selected: "#3b82f6",        // 选中节点 - 蓝色
    selectedStroke: "#60a5fa",  // 选中节点边框
    claudeMd: "#ec4899",        // CLAUDE.md 节点 - 粉色
    claudeMdStroke: "#fbcfe8",  // CLAUDE.md 节点边框
    claudeMdText: "#fbcfe8",    // CLAUDE.md 文字颜色
    agentsMd: "#a855f7",        // AGENTS.md 节点 - 紫色
    agentsMdStroke: "#d8b4fe",  // AGENTS.md 节点边框
    agentsMdText: "#e9d5ff",    // AGENTS.md 文字颜色
    default: "#1f2937",         // 默认节点 - 深灰
    defaultStroke: "#374151",   // 默认节点边框
    defaultText: "#9ca3af",     // 默认文字颜色
    // Root file special color
    root: "#f59e0b",            // Root node - amber
    rootStroke: "#fbbf24",      // Root node stroke
    rootText: "#fcd34d",        // Root text color
    // Other .md files (e.g., project.md, spec.md)
    otherMd: "#06b6d4",         // Cyan for other md files
    otherMdStroke: "#22d3ee",   // Cyan stroke
    otherMdText: "#67e8f9",     // Cyan text
  },

  // 连线颜色
  link: {
    stroke: "#4b5563",
    arrow: "#6b7280",
  },

  // UI 颜色
  ui: {
    primary: "#3b82f6",         // 主色调 - 蓝色
    primaryHover: "#2563eb",
    background: "#111827",
    surface: "#1f2937",
    border: "#374151",
    text: "#f3f4f6",
    textMuted: "#9ca3af",
  },
} as const;

// 根据模式获取节点颜色
export const getNodeColor = (
  mode: 'CLAUDE.md' | 'AGENTS.md',
  type: 'fill' | 'stroke' | 'text'
): string => {
  if (mode === 'CLAUDE.md') {
    return type === 'fill'
      ? COLORS.node.claudeMd
      : type === 'stroke'
        ? COLORS.node.claudeMdStroke
        : COLORS.node.claudeMdText;
  }
  return type === 'fill'
    ? COLORS.node.agentsMd
    : type === 'stroke'
      ? COLORS.node.agentsMdStroke
      : COLORS.node.agentsMdText;
};
