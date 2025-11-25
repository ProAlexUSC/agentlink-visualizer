/**
 * Application constants
 * Centralized configuration values and magic numbers
 */

// UI layout constants
export const UI = {
  // Sidebar dimensions
  SIDEBAR_MIN_WIDTH: 300,
  SIDEBAR_DEFAULT_WIDTH: 600,
  MAIN_MIN_WIDTH: 400,

  // Resize debounce delay (ms)
  RESIZE_DEBOUNCE_MS: 100,

  // Animation durations (ms)
  ZOOM_ANIMATION_MS: 500,
  CENTER_NODE_DELAY_MS: 100,

  // Header height
  HEADER_HEIGHT: 56, // h-14 = 3.5rem = 56px
  FOOTER_HEIGHT: 24, // h-6 = 1.5rem = 24px
} as const;

// Graph visualization constants
export const GRAPH = {
  // Zoom limits
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 4,
  CENTER_ZOOM_SCALE: 1.2,

  // Node sizing
  NODE_MIN_RADIUS: 6,
  NODE_SIZE_MULTIPLIER: 6,
  ROOT_NODE_EXTRA_RADIUS: 8,
  NORMAL_NODE_EXTRA_RADIUS: 4,
  ROOT_STROKE_WIDTH: 2.5,
  NORMAL_STROKE_WIDTH: 2,

  // Force simulation parameters
  BASE_SCALE_REFERENCE: 600,
  MIN_LINK_DISTANCE: 120,
  BASE_LINK_DISTANCE: 200,
  LINK_DISTANCE_PER_NODE: 5,
  MAX_CHARGE_STRENGTH: -200,
  BASE_CHARGE_STRENGTH: -500,
  CHARGE_PER_NODE: 20,
  CHARGE_DISTANCE_MAX: 500,
  LINK_STRENGTH: 0.3,
  COLLIDE_BASE_MULTIPLIER: 8,
  COLLIDE_EXTRA: 40,
  COLLIDE_ITERATIONS: 3,
  COLLIDE_STRENGTH: 0.8,
  CENTER_FORCE_STRENGTH: 0.05,

  // Link appearance
  LINK_OPACITY: 0.4,
  LINK_WIDTH: 1.5,

  // Arrow marker
  ARROW_REF_X: 28,
  ARROW_SIZE: 6,

  // Label positioning
  LABEL_DX: 16,
  LABEL_DY: 4,
  ROOT_FONT_SIZE: "12px",
  NORMAL_FONT_SIZE: "11px",
} as const;

// File types that are parsed for cross-references
export const FILE_TYPES = {
  CLAUDE_MD: "CLAUDE.md",
  AGENTS_MD: "AGENTS.md",
  ALLOWED_TYPES: ["CLAUDE.md", "AGENTS.md"],
} as const;

// Parse mode type
export type ParseMode = "CLAUDE.md" | "AGENTS.md";

// Re-export colors
export { COLORS, getNodeColor } from "./colors";
