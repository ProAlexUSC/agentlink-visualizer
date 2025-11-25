import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, AgentFile } from '../types';

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (file: AgentFile) => void;
  selectedPath?: string;
  activeMode: 'CLAUDE.md' | 'AGENTS.md';
}

export const GraphView: React.FC<GraphViewProps> = ({ nodes, links, onNodeClick, selectedPath, activeMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesRef = useRef<GraphNode[]>(nodes);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Keep nodes ref updated
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.offsetWidth,
          height: wrapperRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Center on selected node
  const centerOnNode = useCallback((nodeId: string) => {
    if (!svgRef.current || !zoomRef.current) return;

    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node || node.x === undefined || node.y === undefined) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Calculate transform to center on node
    const scale = 1.2;
    const x = width / 2 - node.x * scale;
    const y = height / 2 - node.y * scale;

    svg.transition()
      .duration(500)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(x, y).scale(scale)
      );
  }, [dimensions]);

  // Center on selected node when selectedPath changes
  useEffect(() => {
    if (selectedPath) {
      // Small delay to ensure node positions are updated
      const timer = setTimeout(() => {
        centerOnNode(selectedPath);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPath, centerOnNode]);

  // D3 Simulation
  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const { width, height } = dimensions;

    // Zoom behavior
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Force Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => Math.sqrt(d.val) * 8 + 30).iterations(2));

    // Draw Links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#4b5563")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    // Arrowhead definition
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#6b7280");

    // Draw Nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      )
      .on("click", (event, d) => {
        onNodeClick(d.file);
        event.stopPropagation();
      });

    // Node Circles
    node.append("circle")
      .attr("r", (d) => Math.max(6, Math.sqrt(d.val) * 6 + 4))
      .attr("fill", (d) => {
        if (d.id === selectedPath) return "#3b82f6"; // Blue (Selected)
        // Highlight based on mode
        if (d.name === activeMode) {
            return activeMode === 'CLAUDE.md' ? "#ec4899" : "#a855f7";
        }
        return "#1f2937"; // Gray (Standard File)
      })
      .attr("stroke", (d) => {
        if (d.id === selectedPath) return "#60a5fa";
        if (d.name === activeMode) return activeMode === 'CLAUDE.md' ? "#fbcfe8" : "#d8b4fe";
        return "#374151";
      })
      .attr("stroke-width", (d) => d.name === activeMode ? 2 : 1.5)
      .attr("class", "cursor-pointer hover:opacity-80 transition-opacity");

    // Labels
    node.append("text")
      .attr("dx", 16)
      .attr("dy", 4)
      .text((d) => d.name)
      .attr("fill", (d) => d.name === activeMode ? (activeMode === 'CLAUDE.md' ? "#fbcfe8" : "#e9d5ff") : "#9ca3af")
      .style("font-size", "11px")
      .style("font-family", "monospace")
      .style("font-weight", (d) => d.name === activeMode ? "bold" : "normal")
      .style("pointer-events", "auto")
      .style("cursor", "pointer")
      .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.8)");

    // Tick function
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [nodes, links, dimensions, onNodeClick, activeMode]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden">
       {/* Legend */}
       <div className="absolute top-4 right-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur-sm flex flex-col gap-2 shadow-2xl">
         <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Graph Legend</div>
         <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${activeMode === 'CLAUDE.md' ? 'bg-pink-500' : 'bg-purple-500'}`}></span> 
            <span className="text-xs text-gray-200">{activeMode}</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-800 border border-gray-600"></span> 
            <span className="text-xs text-gray-400">Referenced File</span>
         </div>
         <div className="mt-2 text-[10px] text-gray-500">
           Drag nodes to rearrange<br/>Scroll to zoom
         </div>
       </div>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="block w-full h-full" />
    </div>
  );
};