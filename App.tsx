import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FolderOpen, GitBranch, Eye } from "lucide-react";
import { FileTree } from "./components/FileTree";
import { GraphView } from "./components/GraphView";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { buildFileTree, buildGraphData } from "./services/fileParser";
import { scanDirectory, loadAllFileContents } from "./services/directoryScanner";
import { AgentFile } from "./types";
import { UI, ParseMode } from "./constants";

// Custom hook for resizable sidebar
const useResizableSidebar = (initialWidth: number) => {
  const [width, setWidth] = useState(initialWidth);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(UI.SIDEBAR_MIN_WIDTH, Math.min(newWidth, window.innerWidth - UI.MAIN_MIN_WIDTH)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return { width, handleMouseDown };
};

// Custom hook for browser compatibility check
const useBrowserCompatibility = () => {
  useEffect(() => {
    if (!("showDirectoryPicker" in window)) {
      console.warn(
        "File System Access API not supported. Please use Chrome or Edge."
      );
    }
  }, []);
};

const App: React.FC = () => {
  // State
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<AgentFile | null>(null);
  const [parseTarget, setParseTarget] = useState<ParseMode>("CLAUDE.md");
  const [scanStatus, setScanStatus] = useState<string>("");

  // Hooks
  const { width: sidebarWidth, handleMouseDown } = useResizableSidebar(UI.SIDEBAR_DEFAULT_WIDTH);
  useBrowserCompatibility();

  // Computed data
  const graphData = useMemo(
    () => buildGraphData(files, parseTarget),
    [files, parseTarget]
  );

  const fileTreeData = useMemo(() => {
    const indexedFiles = graphData.nodes.map((node) => node.file);
    return buildFileTree(indexedFiles);
  }, [graphData.nodes]);

  // Handlers
  const handleSelectFolder = async () => {
    try {
      // @ts-expect-error - File System Access API types may not be available
      const dirHandle = await window.showDirectoryPicker();

      setScanStatus("Scanning...");
      const foundFiles = await scanDirectory(dirHandle);
      setScanStatus("");

      if (foundFiles.length > 0) {
        setFiles(foundFiles);
        setSelectedFile(null);
        const filesWithContent = await loadAllFileContents(foundFiles);
        setFiles(filesWithContent);
      } else {
        alert("No AGENTS.md or CLAUDE.md files found in the selected folder.");
      }
    } catch (err: unknown) {
      setScanStatus("");
      const error = err as { name?: string };
      if (error.name !== "AbortError") {
        console.error("Failed to access folder:", err);
        alert("Failed to access folder. Please try again.");
      }
    }
  };

  const handleFileSelect = (file: AgentFile) => {
    setSelectedFile(file);

    // Auto-switch parse target based on file name
    const fileName = file.name.toUpperCase();
    if (fileName === "AGENTS.MD") {
      setParseTarget("AGENTS.md");
    } else if (fileName === "CLAUDE.MD") {
      setParseTarget("CLAUDE.md");
    }
  };

  const hasFiles = files.length > 0;
  const isScanning = Boolean(scanStatus);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Header */}
      <Header
        hasFiles={hasFiles}
        parseTarget={parseTarget}
        onParseModeChange={setParseTarget}
        scanStatus={scanStatus}
        onSelectFolder={handleSelectFolder}
        isScanning={isScanning}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: File Explorer */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800 flex items-center text-gray-400 text-xs uppercase font-semibold tracking-wider bg-gray-900/50">
            <FolderOpen size={14} className="mr-2" />
            Explorer
          </div>
          <div className="flex-1 overflow-hidden">
            <FileTree
              nodes={fileTreeData}
              onSelect={handleFileSelect}
              selectedPath={selectedFile?.path}
            />
          </div>
        </aside>

        {/* Center: Graph Visualization */}
        <main className="flex-1 bg-gray-900 relative flex flex-col">
          {hasFiles ? (
            <GraphPanel
              graphData={graphData}
              parseTarget={parseTarget}
              selectedFile={selectedFile}
              onNodeClick={setSelectedFile}
            />
          ) : (
            <EmptyState />
          )}
        </main>

        {/* Resizable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize transition-colors shrink-0"
        />

        {/* Right Sidebar: Content Viewer */}
        <aside
          style={{ width: sidebarWidth }}
          className="bg-gray-900 border-l border-gray-800 flex flex-col shadow-xl z-10 shrink-0"
        >
          <MarkdownViewer file={selectedFile} />
        </aside>
      </div>

      {/* Footer Status Bar */}
      <Footer filesCount={files.length} parseTarget={parseTarget} />
    </div>
  );
};

// Header component
interface HeaderProps {
  hasFiles: boolean;
  parseTarget: ParseMode;
  onParseModeChange: (mode: ParseMode) => void;
  scanStatus: string;
  onSelectFolder: () => void;
  isScanning: boolean;
}

const Header: React.FC<HeaderProps> = ({
  hasFiles,
  parseTarget,
  onParseModeChange,
  scanStatus,
  onSelectFolder,
  isScanning,
}) => (
  <header className="h-14 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-4 shadow-md z-20">
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <GitBranch className="text-blue-500" size={20} />
        <h1 className="text-lg font-bold tracking-wide">
          <span className="text-blue-500">Agent</span>Link{" "}
          <span className="text-gray-500 text-xs font-normal ml-2 border border-gray-700 px-1.5 py-0.5 rounded">
            {hasFiles ? "LOCAL REPO" : "NO FOLDER"}
          </span>
        </h1>
      </div>

      <div className="h-6 w-px bg-gray-800 mx-2" />

      {/* Mode Selector */}
      <div className="flex items-center space-x-2 bg-gray-900 rounded-md p-1 border border-gray-800">
        <Eye size={14} className="text-gray-400 ml-2" />
        <select
          value={parseTarget}
          onChange={(e) => onParseModeChange(e.target.value as ParseMode)}
          className="bg-transparent text-sm font-medium text-blue-400 focus:outline-none cursor-pointer py-0.5"
        >
          <option value="CLAUDE.md">Parse CLAUDE.md</option>
          <option value="AGENTS.md">Parse AGENTS.md</option>
        </select>
      </div>
    </div>

    <div className="flex items-center space-x-3">
      {scanStatus && (
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <span>{scanStatus}</span>
        </div>
      )}
      <button
        onClick={onSelectFolder}
        disabled={isScanning}
        className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium cursor-pointer transition-colors"
      >
        <FolderOpen size={14} />
        <span>Select Local Folder</span>
      </button>
    </div>
  </header>
);

// Graph panel with status indicator
interface GraphPanelProps {
  graphData: { nodes: { file: AgentFile }[]; links: unknown[] };
  parseTarget: ParseMode;
  selectedFile: AgentFile | null;
  onNodeClick: (file: AgentFile) => void;
}

const GraphPanel: React.FC<GraphPanelProps> = ({
  graphData,
  parseTarget,
  selectedFile,
  onNodeClick,
}) => {
  const indicatorColor = parseTarget === "CLAUDE.md" ? "bg-pink-500" : "bg-purple-500";
  const textColor = parseTarget === "CLAUDE.md" ? "text-pink-400" : "text-purple-400";

  return (
    <>
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="flex items-center space-x-2 bg-gray-900/90 backdrop-blur px-3 py-1.5 rounded-full border border-gray-800 shadow-lg">
          <div className={`w-2 h-2 rounded-full animate-pulse ${indicatorColor}`} />
          <span className="text-xs text-gray-300 font-medium">
            Parsing <span className={textColor}>{parseTarget}</span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-xs text-gray-500">
            {graphData.nodes.length} Nodes, {graphData.links.length} Links
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-gray-800/20 via-gray-900 to-gray-900">
        <GraphView
          nodes={graphData.nodes as any}
          links={graphData.links as any}
          onNodeClick={onNodeClick}
          selectedPath={selectedFile?.path}
          activeMode={parseTarget}
        />
      </div>
    </>
  );
};

// Empty state component
const EmptyState: React.FC = () => (
  <div className="flex-1 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-gray-800/20 via-gray-900 to-gray-900">
    <div className="text-center space-y-4 max-w-md px-6">
      <FolderOpen className="mx-auto text-gray-600" size={64} />
      <h2 className="text-xl font-semibold text-gray-300">No Folder Selected</h2>
      <p className="text-gray-500 text-sm leading-relaxed">
        Click <span className="text-blue-400 font-medium">"Select Local Folder"</span>{" "}
        above to choose a folder containing{" "}
        <span className="font-mono text-blue-400">AGENTS.md</span> or{" "}
        <span className="font-mono text-blue-400">CLAUDE.md</span> files.
      </p>
    </div>
  </div>
);

// Footer component
interface FooterProps {
  filesCount: number;
  parseTarget: ParseMode;
}

const Footer: React.FC<FooterProps> = ({ filesCount, parseTarget }) => (
  <div className="h-6 bg-blue-900/10 border-t border-blue-900/20 flex items-center px-4 text-[10px] text-blue-300/60 justify-between">
    <span>Files: {filesCount}</span>
    <span>
      Mode: {parseTarget} (Graph only shows relationships between {parseTarget} files)
    </span>
  </div>
);

export default App;
