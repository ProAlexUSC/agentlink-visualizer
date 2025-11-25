import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentFile } from "../types";

interface MarkdownViewerProps {
	file: AgentFile | null;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ file }) => {
	if (!file) {
		return (
			<div className="h-full flex flex-col items-center justify-center text-gray-500">
				<p className="text-lg font-medium">Select a file to view content</p>
				<p className="text-sm mt-2">
					Click nodes in the graph or files in the explorer
				</p>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col bg-gray-900">
			<div className="border-b border-gray-800 p-4 bg-gray-800/50 shrink-0">
				<h2 className="text-xl font-bold text-white flex items-center">
					<span className="text-blue-500 mr-2">
						{file.name === "CLAUDE.md" ? "🤖" : "#"}
					</span>
					{file.name}
				</h2>
				<p className="text-xs text-gray-400 mt-1 font-mono">{file.path}</p>
			</div>
			<div className="flex-1 overflow-y-auto p-6">
				{!file.content ? (
					<div className="flex flex-col items-center justify-center h-full text-gray-500">
						<div className="flex items-center space-x-3">
							<div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
							<p className="text-lg font-medium">Loading content...</p>
						</div>
						<p className="text-sm mt-2 text-gray-600">{file.path}</p>
					</div>
				) : (
					<article className="prose prose-invert prose-sm max-w-none prose-headings:text-blue-300 prose-a:text-blue-400 prose-code:text-orange-300 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-blockquote:border-blue-500 prose-blockquote:bg-gray-800/50 prose-blockquote:py-1 prose-strong:text-gray-200 prose-li:marker:text-gray-500">
						<Markdown
							remarkPlugins={[remarkGfm]}
							components={{
								// 高亮 @path 引用
								p: ({ children, ...props }) => (
									<p {...props}>{highlightReferences(children)}</p>
								),
								li: ({ children, ...props }) => (
									<li {...props}>{highlightReferences(children)}</li>
								),
								td: ({ children, ...props }) => (
									<td {...props}>{highlightReferences(children)}</td>
								),
							}}
						>
							{file.content}
						</Markdown>
					</article>
				)}
			</div>
		</div>
	);
};

// 高亮 @path 和 [[wiki]] 引用
function highlightReferences(children: React.ReactNode): React.ReactNode {
	if (typeof children === "string") {
		const parts = children.split(/(\[\[.*?\]\]|@[a-zA-Z0-9_\-\.\/]+)/g);
		if (parts.length === 1) return children;

		return parts.map((part, i) => {
			if (part.startsWith("[[") && part.endsWith("]]")) {
				const content = part.slice(2, -2);
				return (
					<span
						key={i}
						className="text-blue-400 font-medium bg-blue-900/30 px-1 rounded cursor-default border border-blue-800/50 not-prose"
					>
						[[{content}]]
					</span>
				);
			} else if (part.startsWith("@")) {
				return (
					<span
						key={i}
						className="text-emerald-400 font-medium bg-emerald-900/30 px-1 rounded cursor-default border border-emerald-800/50 not-prose"
					>
						{part}
					</span>
				);
			}
			return part;
		});
	}

	if (Array.isArray(children)) {
		return children.map((child, i) => (
			<React.Fragment key={i}>{highlightReferences(child)}</React.Fragment>
		));
	}

	if (React.isValidElement(children)) {
		return children;
	}

	return children;
}
