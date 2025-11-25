import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { GraphNode, GraphLink, AgentFile } from "../types";
import { COLORS, getNodeColor, GRAPH, UI } from "../constants";

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (file: AgentFile) => void;
  selectedPath?: string;
  activeMode: "CLAUDE.md" | "AGENTS.md";
}

// File type classification
type FileType = "CLAUDE.md" | "AGENTS.md" | "other" | null;

const getFileType = (fileName: string): FileType => {
  const lower = fileName.toLowerCase();
  if (lower === "claude.md") return "CLAUDE.md";
  if (lower === "agents.md") return "AGENTS.md";
  if (lower.endsWith(".md")) return "other";
  return null;
};

// Node styling helpers
const getNodeRadius = (node: GraphNode): number => {
  const baseRadius = Math.max(
    GRAPH.NODE_MIN_RADIUS,
    Math.sqrt(node.val) * GRAPH.NODE_SIZE_MULTIPLIER
  );
  const extra = node.isRoot
    ? GRAPH.ROOT_NODE_EXTRA_RADIUS
    : GRAPH.NORMAL_NODE_EXTRA_RADIUS;
  return baseRadius + extra;
};

const getNodeFillColor = (node: GraphNode, selectedPath?: string): string => {
  if (node.id === selectedPath) return COLORS.node.selected;
  if (node.isRoot) return COLORS.node.root;

  const fileType = getFileType(node.file.name);
  if (fileType === "CLAUDE.md" || fileType === "AGENTS.md") {
    return getNodeColor(fileType, "fill");
  }
  if (fileType === "other") return COLORS.node.otherMd;
  return COLORS.node.default;
};

const getNodeStrokeColor = (node: GraphNode, selectedPath?: string): string => {
  if (node.id === selectedPath) return COLORS.node.selectedStroke;
  if (node.isRoot) return COLORS.node.rootStroke;

  const fileType = getFileType(node.file.name);
  if (fileType === "CLAUDE.md" || fileType === "AGENTS.md") {
    return getNodeColor(fileType, "stroke");
  }
  if (fileType === "other") return COLORS.node.otherMdStroke;
  return COLORS.node.defaultStroke;
};

const getNodeTextColor = (node: GraphNode): string => {
  if (node.isRoot) return COLORS.node.rootText;

  const fileType = getFileType(node.file.name);
  if (fileType === "CLAUDE.md" || fileType === "AGENTS.md") {
    return getNodeColor(fileType, "text");
  }
  if (fileType === "other") return COLORS.node.otherMdText;
  return COLORS.node.defaultText;
};

// Calculate force simulation parameters based on container size and node count
const calculateSimulationParams = (
  width: number,
  height: number,
  nodeCount: number
) => {
  const scale = Math.min(width, height) / GRAPH.BASE_SCALE_REFERENCE;

  return {
    linkDistance: Math.max(
      GRAPH.MIN_LINK_DISTANCE,
      GRAPH.BASE_LINK_DISTANCE * scale + nodeCount * GRAPH.LINK_DISTANCE_PER_NODE
    ),
    chargeStrength: Math.min(
      GRAPH.MAX_CHARGE_STRENGTH,
      GRAPH.BASE_CHARGE_STRENGTH * scale - nodeCount * GRAPH.CHARGE_PER_NODE
    ),
    collideRadius: (d: GraphNode) =>
      Math.sqrt(d.val) * GRAPH.COLLIDE_BASE_MULTIPLIER * scale +
      GRAPH.COLLIDE_EXTRA,
  };
};

// Custom hook for container dimensions with debounced resize
const useContainerDimensions = (
  containerRef: React.RefObject<HTMLDivElement | null>
) => {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setDimensions({ width, height });
          }
        }
      }, UI.RESIZE_DEBOUNCE_MS);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return dimensions;
};

export const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  links,
  onNodeClick,
  selectedPath,
  activeMode,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesRef = useRef<GraphNode[]>(nodes);

  const dimensions = useContainerDimensions(wrapperRef);

  // Keep nodes ref updated
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Center on selected node
  const centerOnNode = useCallback(
    (nodeId: string) => {
      if (!svgRef.current || !zoomRef.current) return;

      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node || node.x === undefined || node.y === undefined) return;

      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;

      const scale = GRAPH.CENTER_ZOOM_SCALE;
      const x = width / 2 - node.x * scale;
      const y = height / 2 - node.y * scale;

      svg
        .transition()
        .duration(UI.ZOOM_ANIMATION_MS)
        .call(zoomRef.current.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    },
    [dimensions]
  );

  // Center on selected node when selectedPath changes
  useEffect(() => {
    if (selectedPath) {
      const timer = setTimeout(() => {
        centerOnNode(selectedPath);
      }, UI.CENTER_NODE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [selectedPath, centerOnNode]);

  // Main D3 simulation effect
  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const params = calculateSimulationParams(width, height, nodes.length);

    // Setup zoom behavior
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([GRAPH.ZOOM_MIN, GRAPH.ZOOM_MAX])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(params.linkDistance)
          .strength(GRAPH.LINK_STRENGTH)
      )
      .force(
        "charge",
        d3
          .forceManyBody()
          .strength(params.chargeStrength)
          .distanceMax(GRAPH.CHARGE_DISTANCE_MAX)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide<GraphNode>()
          .radius(params.collideRadius)
          .iterations(GRAPH.COLLIDE_ITERATIONS)
          .strength(GRAPH.COLLIDE_STRENGTH)
      )
      .force("x", d3.forceX(width / 2).strength(GRAPH.CENTER_FORCE_STRENGTH))
      .force("y", d3.forceY(height / 2).strength(GRAPH.CENTER_FORCE_STRENGTH));

    // Draw links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", COLORS.link.stroke)
      .attr("stroke-opacity", GRAPH.LINK_OPACITY)
      .attr("stroke-width", GRAPH.LINK_WIDTH)
      .attr("marker-end", "url(#arrowhead)");

    // Arrowhead marker definition
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", GRAPH.ARROW_REF_X)
      .attr("refY", 0)
      .attr("markerWidth", GRAPH.ARROW_SIZE)
      .attr("markerHeight", GRAPH.ARROW_SIZE)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", COLORS.link.arrow);

    // Drag handlers
    const dragstarted = (event: any, d: any) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    };

    const dragged = (event: any, d: any) => {
      d.fx = event.x;
      d.fy = event.y;
    };

    const dragended = (event: any, d: any) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    };

    // Draw nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event, d) => {
        onNodeClick(d.file);
        event.stopPropagation();
      });

    // Node circles
    node
      .append("circle")
      .attr("r", getNodeRadius)
      .attr("fill", (d) => getNodeFillColor(d, selectedPath))
      .attr("stroke", (d) => getNodeStrokeColor(d, selectedPath))
      .attr("stroke-width", (d) =>
        d.isRoot ? GRAPH.ROOT_STROKE_WIDTH : GRAPH.NORMAL_STROKE_WIDTH
      )
      .attr("class", "cursor-pointer hover:opacity-80 transition-opacity");

    // Node labels
    node
      .append("text")
      .attr("dx", GRAPH.LABEL_DX)
      .attr("dy", GRAPH.LABEL_DY)
      .text((d) => d.name)
      .attr("fill", getNodeTextColor)
      .style("font-size", (d) =>
        d.isRoot ? GRAPH.ROOT_FONT_SIZE : GRAPH.NORMAL_FONT_SIZE
      )
      .style("font-family", "monospace")
      .style("font-weight", "bold")
      .style("pointer-events", "auto")
      .style("cursor", "pointer")
      .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.8)");

    // Simulation tick handler
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions, onNodeClick, selectedPath, activeMode]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden">
      {/* Legend */}
      <GraphLegend />
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
      />
    </div>
  );
};

// Legend component
const GraphLegend: React.FC = () => (
  <div className="absolute top-4 right-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur-sm flex flex-col gap-2 shadow-2xl">
    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">
      Graph Legend
    </div>
    <LegendItem color="bg-amber-500" borderColor="border-amber-400" label="Root File" textColor="text-amber-300" large />
    <LegendItem color="bg-pink-500" label="CLAUDE.md" textColor="text-pink-300" />
    <LegendItem color="bg-purple-500" label="AGENTS.md" textColor="text-purple-300" />
    <LegendItem color="bg-cyan-500" label="Other .md" textColor="text-cyan-300" />
    <div className="mt-2 text-[10px] text-gray-500">
      Drag nodes to rearrange
      <br />
      Scroll to zoom
    </div>
  </div>
);

// Legend item component
interface LegendItemProps {
  color: string;
  borderColor?: string;
  label: string;
  textColor: string;
  large?: boolean;
}

const LegendItem: React.FC<LegendItemProps> = ({
  color,
  borderColor,
  label,
  textColor,
  large,
}) => (
  <div className="flex items-center gap-2">
    <span
      className={`rounded-full ${color} ${large ? "w-3.5 h-3.5" : "w-3 h-3"} ${
        borderColor ? `border-2 ${borderColor}` : ""
      }`}
    />
    <span className={`text-xs ${textColor}`}>{label}</span>
  </div>
);
