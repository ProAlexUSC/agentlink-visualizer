import React, { useState, useMemo, useEffect } from "react";
import { FolderOpen, GitBranch, Eye } from "lucide-react";
import { FileTree } from "./components/FileTree";
import { GraphView } from "./components/GraphView";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { buildFileTree, buildGraphData } from "./services/fileParser";
import { AgentFile } from "./types";

type ParseMode = "CLAUDE.md" | "AGENTS.md";

const App: React.FC = () => {
	const [files, setFiles] = useState<AgentFile[]>([]);
	const [selectedFile, setSelectedFile] = useState<AgentFile | null>(null);
	const [parseTarget, setParseTarget] = useState<ParseMode>("CLAUDE.md");

	// Check browser compatibility
	useEffect(() => {
		if (!("showDirectoryPicker" in window)) {
			console.warn(
				"File System Access API not supported. Please use Chrome or Edge."
			);
		}
	}, []);

	// Derived state
	const fileTreeData = useMemo(() => buildFileTree(files), [files]);

	// Re-build graph when files OR parse target changes
	const graphData = useMemo(
		() => buildGraphData(files, parseTarget),
		[files, parseTarget]
	);

	// Recursively scan directory for AGENTS.md and CLAUDE.md files
	const scanDirectory = async (
		dirHandle: FileSystemDirectoryHandle,
		relativePath: string
	): Promise<AgentFile[]> => {
		const foundFiles: AgentFile[] = [];

		try {
			// @ts-ignore - values() method exists in File System Access API
			for await (const entry of dirHandle.values()) {
				const entryPath = relativePath
					? `${relativePath}/${entry.name}`
					: entry.name;

				if (entry.kind === "file") {
					const fileName = entry.name.toLowerCase();
					// Only process AGENTS.md and CLAUDE.md files
					if (fileName === "agents.md" || fileName === "claude.md") {
						foundFiles.push({
							path: entryPath,
							name: entry.name,
							directory: relativePath,
							fileHandle: entry as FileSystemFileHandle,
							// Note: content is NOT loaded here (lazy loading)
						});
					}
				} else if (entry.kind === "directory") {
					// Recursively scan subdirectories
					const subFiles = await scanDirectory(
						entry as FileSystemDirectoryHandle,
						entryPath
					);
					foundFiles.push(...subFiles);
				}
			}
		} catch (error) {
			console.error("Error scanning directory:", error);
		}

		return foundFiles;
	};

	// Handle folder selection using File System Access API
	const handleSelectFolder = async () => {
		try {
			// @ts-ignore - File System Access API may not be in all TypeScript versions
			const dirHandle = await window.showDirectoryPicker();

			// Scan directory tree
			const foundFiles = await scanDirectory(dirHandle, "");

			if (foundFiles.length > 0) {
				setFiles(foundFiles);
				setSelectedFile(null);

				// Preload all file contents for graph building
				await loadAllFileContents(foundFiles);
			} else {
				alert(
					"No AGENTS.md or CLAUDE.md files found in the selected folder."
				);
			}
		} catch (err: any) {
			if (err.name !== "AbortError") {
				console.error("Failed to access folder:", err);
				alert("Failed to access folder. Please try again.");
			}
		}
	};

	// Load all file contents (needed for graph building)
	const loadAllFileContents = async (filesToLoad: AgentFile[]) => {
		const updatedFiles = await Promise.all(
			filesToLoad.map(async (file) => {
				if (file.fileHandle && !file.content) {
					try {
						const fileObj = await file.fileHandle.getFile();
						const content = await fileObj.text();
						return { ...file, content };
					} catch (error) {
						console.error(`Failed to load ${file.path}:`, error);
						return file;
					}
				}
				return file;
			})
		);

		setFiles(updatedFiles);
	};

	// Load individual file content on demand
	const loadFileContent = async (file: AgentFile): Promise<string> => {
		if (file.content) return file.content;

		if (file.fileHandle) {
			try {
				const fileObj = await file.fileHandle.getFile();
				const content = await fileObj.text();

				// Update state to cache content
				setFiles((prev) =>
					prev.map((f) =>
						f.path === file.path ? { ...f, content } : f
					)
				);

				return content;
			} catch (error) {
				console.error(
					`Failed to load content for ${file.path}:`,
					error
				);
				return "";
			}
		}

		return "";
	};

	// Handle file selection and auto-switch parse target
	const handleFileSelect = (file: AgentFile) => {
		// Update selected file
		setSelectedFile(file);

		// Auto-switch parse target based on file name
		const fileName = file.name.toUpperCase();
		if (fileName === "AGENTS.MD") {
			setParseTarget("AGENTS.md");
		} else if (fileName === "CLAUDE.MD") {
			setParseTarget("CLAUDE.md");
		}
	};

	return (
		<div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
			{/* Header */}
			<header className="h-14 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-4 shadow-md z-20">
				<div className="flex items-center space-x-4">
					<div className="flex items-center space-x-2">
						<GitBranch className="text-blue-500" size={20} />
						<h1 className="text-lg font-bold tracking-wide">
							<span className="text-blue-500">Agent</span>Link{" "}
							<span className="text-gray-500 text-xs font-normal ml-2 border border-gray-700 px-1.5 py-0.5 rounded">
								{files.length > 0 ? "LOCAL REPO" : "NO FOLDER"}
							</span>
						</h1>
					</div>

					<div className="h-6 w-px bg-gray-800 mx-2"></div>

					{/* Mode Selector */}
					<div className="flex items-center space-x-2 bg-gray-900 rounded-md p-1 border border-gray-800">
						<Eye size={14} className="text-gray-400 ml-2" />
						<select
							value={parseTarget}
							onChange={(e) =>
								setParseTarget(e.target.value as ParseMode)
							}
							className="bg-transparent text-sm font-medium text-blue-400 focus:outline-none cursor-pointer py-0.5"
						>
							<option value="CLAUDE.md">Parse CLAUDE.md</option>
							<option value="AGENTS.md">Parse AGENTS.md</option>
						</select>
					</div>
				</div>

				<div className="flex items-center space-x-3">
					<button
						onClick={handleSelectFolder}
						className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium cursor-pointer transition-colors"
					>
						<FolderOpen size={14} />
						<span>Select Local Folder</span>
					</button>
				</div>
			</header>

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
					{files.length > 0 ? (
						<>
							<div className="absolute top-3 left-3 z-10 pointer-events-none">
								<div className="flex items-center space-x-2 bg-gray-900/90 backdrop-blur px-3 py-1.5 rounded-full border border-gray-800 shadow-lg">
									<div
										className={`w-2 h-2 rounded-full animate-pulse ${
											parseTarget === "CLAUDE.md"
												? "bg-pink-500"
												: "bg-purple-500"
										}`}
									></div>
									<span className="text-xs text-gray-300 font-medium">
										Parsing{" "}
										<span
											className={
												parseTarget === "CLAUDE.md"
													? "text-pink-400"
													: "text-purple-400"
											}
										>
											{parseTarget}
										</span>
									</span>
									<span className="text-gray-600">|</span>
									<span className="text-xs text-gray-500">
										{graphData.nodes.length} Nodes,{" "}
										{graphData.links.length} Links
									</span>
								</div>
							</div>

							<div className="flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-gray-900 to-gray-900">
								<GraphView
									nodes={graphData.nodes}
									links={graphData.links}
									onNodeClick={setSelectedFile}
									selectedPath={selectedFile?.path}
									activeMode={parseTarget}
								/>
							</div>
						</>
					) : (
						<div className="flex-1 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-gray-900 to-gray-900">
							<div className="text-center space-y-4 max-w-md px-6">
								<FolderOpen
									className="mx-auto text-gray-600"
									size={64}
								/>
								<h2 className="text-xl font-semibold text-gray-300">
									No Folder Selected
								</h2>
								<p className="text-gray-500 text-sm leading-relaxed">
									Click{" "}
									<span className="text-blue-400 font-medium">
										"Select Local Folder"
									</span>{" "}
									above to choose a folder containing{" "}
									<span className="font-mono text-blue-400">
										AGENTS.md
									</span>{" "}
									or{" "}
									<span className="font-mono text-blue-400">
										CLAUDE.md
									</span>{" "}
									files.
								</p>
							</div>
						</div>
					)}
				</main>

				{/* Right Sidebar: Content Viewer */}
				<aside className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col shadow-xl z-10">
					<MarkdownViewer file={selectedFile} />
				</aside>
			</div>

			{/* Footer Status Bar */}
			<div className="h-6 bg-blue-900/10 border-t border-blue-900/20 flex items-center px-4 text-[10px] text-blue-300/60 justify-between">
				<span>Files: {files.length}</span>
				<span>
					Mode: {parseTarget} (Graph only shows relationships between{" "}
					{parseTarget} files)
				</span>
			</div>
		</div>
	);
};

export default App;
