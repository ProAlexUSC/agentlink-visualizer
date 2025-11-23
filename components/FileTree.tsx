import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FileCode } from 'lucide-react';
import { FileTreeNode, AgentFile } from '../types';

interface FileTreeProps {
  nodes: FileTreeNode[];
  onSelect: (file: AgentFile) => void;
  selectedPath?: string;
}

const FileTreeNodeItem: React.FC<{ 
  node: FileTreeNode; 
  onSelect: (file: AgentFile) => void;
  selectedPath?: string; 
  level: number; 
}> = ({ node, onSelect, selectedPath, level }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = node.type === 'file' && node.fileData?.path === selectedPath;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClick = () => {
    if (node.type === 'file' && node.fileData) {
      onSelect(node.fileData);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 cursor-pointer transition-colors duration-150 ${
          isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="mr-1 opacity-70">
          {node.type === 'directory' ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-[14px]" />
          )}
        </span>
        
        <span className={`mr-2 ${isSelected ? 'text-blue-200' : 'text-blue-500'}`}>
          {node.type === 'directory' ? (
            <Folder size={16} fill="currentColor" fillOpacity={0.2} />
          ) : (
            <FileCode size={16} />
          )}
        </span>
        
        <span className="text-sm truncate">{node.name}</span>
      </div>

      {node.type === 'directory' && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNodeItem
              key={child.path}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelect, selectedPath }) => {
  return (
    <div className="h-full overflow-y-auto py-2">
      {nodes.map((node) => (
        <FileTreeNodeItem
          key={node.path}
          node={node}
          onSelect={onSelect}
          selectedPath={selectedPath}
          level={0}
        />
      ))}
      {nodes.length === 0 && (
        <div className="p-4 text-gray-500 text-sm text-center">
          No Agent.md files found.
        </div>
      )}
    </div>
  );
};
