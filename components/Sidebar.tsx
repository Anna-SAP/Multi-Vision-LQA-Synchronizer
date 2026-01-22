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
        <div className="text-xs font-bold text-gray-300 uppercase tracking-wider truncate mr-2 flex items-center">
            <span className="inline-block w-4 h-4 rounded-full bg-gray-700 text-[10px] flex items-center justify-center mr-2 text-gray-400">
                {index + 1}
            </span>
            <span className="truncate max-w-[150px]">{name}</span>
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
  isPinned: boolean;
  onTogglePin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  packages,
  selectedPaths,
  onSelect,
  isPinned,
  onTogglePin
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // If pinned, we are expanded. If not pinned, we expand on hover.
  const isExpanded = isPinned || isHovered;

  return (
    // Outer Container: Manages the 'reserved space' in the flex layout.
    // If pinned, it reserves 64 units. If unpinned, it reserves 12 units (Rail).
    <div 
        className={`
            relative z-30 h-full flex flex-col bg-gray-900 border-r border-gray-700 
            transition-all duration-300 ease-in-out shrink-0
            ${isPinned ? 'w-64' : 'w-12'}
        `}
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
    >
        {/* 
           Inner Content Container:
           - If Pinned: It's relative and fills the 64w parent.
           - If Unpinned:
               - Idle: Hidden (or just showing rail icons).
               - Hovered: Absolute positioned, expands to 64w, floats over content.
        */}
        <div className={`
            flex flex-col h-full bg-gray-900 transition-all duration-300
            ${isPinned ? 'w-full relative' : 'absolute left-0 top-0 bottom-0 shadow-2xl border-r border-gray-600'}
            ${!isPinned && isExpanded ? 'w-64 translate-x-0' : ''}
            ${!isPinned && !isExpanded ? 'w-12 overflow-hidden' : ''}
        `}>
            
            {/* Header / Pin Toggle */}
            <div className="h-10 border-b border-gray-800 flex items-center justify-between px-3 shrink-0 bg-gray-850">
                {isExpanded && (
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">
                        Package Explorer
                    </span>
                )}
                
                <button 
                    onClick={onTogglePin}
                    className={`
                        text-gray-500 hover:text-white transition-colors focus:outline-none p-1 rounded hover:bg-gray-700
                        ${!isExpanded ? 'mx-auto' : ''}
                    `}
                    title={isPinned ? "Unpin Sidebar (Auto-collapse)" : "Pin Sidebar"}
                >
                    {isPinned ? (
                        /* Pin Icon (Solid) */
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.828 3h3.982a2 2 0 011.992 2.181l-.637 7A2 2 0 0113.174 14H8.004a2 2 0 01-1.992-1.819l-.637-7a2 2 0 011.992-2.181h2.461z" /></svg>
                    ) : (
                        /* Unpin Icon (Outline/Slash) */
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16zM15 11l-3 3m0-3l3 3" /></svg>
                    )}
                </button>
            </div>

            {/* Content List */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${!isExpanded ? 'hidden' : 'block'}`}>
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

            {/* Collapsed Rail View (Visible only when Unpinned and Not Hovered) */}
            {!isExpanded && (
                <div className="flex-1 flex flex-col items-center py-4 gap-4 opacity-50 hover:opacity-100 transition-opacity">
                    {/* Vertical Text Label */}
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>
                        Packages
                    </div>
                    
                    {/* Package Icons */}
                    {packages.map((pkg, idx) => (
                        <div 
                            key={pkg.id}
                            className={`
                                w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border
                                ${selectedPaths[idx] 
                                    ? 'bg-blue-900/50 text-blue-300 border-blue-500' 
                                    : 'bg-gray-800 text-gray-500 border-gray-700'
                                }
                            `}
                            title={pkg.name}
                        >
                            {idx + 1}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};