import React from 'react';
import { AgentFile } from '../types';

interface MarkdownViewerProps {
  file: AgentFile | null;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ file }) => {
  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <p className="text-lg font-medium">Select a file to view content</p>
        <p className="text-sm mt-2">Click nodes in the graph or files in the explorer</p>
      </div>
    );
  }

  // Simple formatter to highlight links
  const renderContent = (text: string) => {
    // Split by [[wiki]] OR @path
    // Regex: ([[.*?]]) OR ((?:^|\s)@[^\s]+)
    const parts = text.split(/(\[\[.*?\]\]|(?:^|\s)@[a-zA-Z0-9_\-\.\/]+)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const content = part.slice(2, -2);
        return (
          <span key={i} className="text-blue-400 font-medium bg-blue-900/30 px-1 rounded cursor-default border border-blue-800/50">
            {content}
          </span>
        );
      } else if (part.trim().startsWith('@')) {
        // Handle @path, preserving leading whitespace if split captured it
        const isSpaced = part.startsWith(' ') || part.startsWith('\n');
        const cleanPart = part.trim();
        return (
          <React.Fragment key={i}>
            {isSpaced && <span>{part.substring(0, part.indexOf('@'))}</span>}
            <span className="text-emerald-400 font-medium bg-emerald-900/30 px-1 rounded cursor-default border border-emerald-800/50">
              {cleanPart}
            </span>
          </React.Fragment>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="border-b border-gray-800 p-4 bg-gray-800/50">
        <h2 className="text-xl font-bold text-white flex items-center">
           <span className="text-blue-500 mr-2">
            {file.name === 'CLAUDE.md' ? '🤖' : '#'}
           </span>
           {file.name}
        </h2>
        <p className="text-xs text-gray-400 mt-1 font-mono">{file.path}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {!file.content ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg font-medium">Loading content...</p>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none prose-headings:text-blue-300 prose-a:text-blue-400 prose-code:text-orange-300 prose-pre:bg-gray-800">
             <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
               {renderContent(file.content)}
             </pre>
          </div>
        )}
      </div>
    </div>
  );
};