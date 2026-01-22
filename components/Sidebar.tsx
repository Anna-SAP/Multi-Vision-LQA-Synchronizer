import React, { useState } from 'react';
import { ZipFileEntry } from '../types';

interface PackageProps {
  name: string;
  files: ZipFileEntry[];
  selectedPath: string | null;
  onSelect: (entry: ZipFileEntry) => void;
  index: number;
}

const PackageSection: React.FC<PackageProps> = ({ name, files, selectedPath, onSelect, index }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex flex-col min-h-0 border-b border-gray-700 last:border-0">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 bg-gray-800 flex items-center justify-between hover:bg-gray-750 transition-colors"
      >
        <div className="text-xs font-bold text-gray-300 uppercase tracking-wider truncate mr-2">
            {index + 1}. {name}
        </div>
        <span className="text-gray-500 text-[10px] transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
      </button>
      
      {isExpanded && (
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {files.length === 0 ? (
                <div className="p-4 text-xs text-gray-600 italic text-center">No HTML files found</div>
            ) : (
                <ul className="text-sm">
                {files.map((file) => (
                    <li key={file.path}>
                    <button
                        onClick={() => onSelect(file)}
                        title={file.path}
                        className={`w-full text-left px-3 py-1.5 text-xs truncate transition-colors border-l-2
                        ${selectedPath === file.path 
                            ? 'bg-blue-900/30 text-blue-200 border-blue-500' 
                            : 'text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200'}
                        `}
                    >
                        {file.name}
                    </button>
                    </li>
                ))}
                </ul>
            )}
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  packages: { id: string; name: string; files: ZipFileEntry[] }[];
  selectedPaths: (string | null)[];
  onSelect: (packageIndex: number, entry: ZipFileEntry) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  packages,
  selectedPaths,
  onSelect
}) => {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-full shrink-0 overflow-y-auto custom-scrollbar">
      {packages.map((pkg, idx) => (
        <PackageSection 
          key={pkg.id}
          index={idx}
          name={pkg.name}
          files={pkg.files}
          selectedPath={selectedPaths[idx]}
          onSelect={(entry) => onSelect(idx, entry)}
        />
      ))}
    </div>
  );
};