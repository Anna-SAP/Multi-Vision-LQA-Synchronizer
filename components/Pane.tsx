import React, { useRef, useState } from 'react';
import { ContentType, ViewState } from '../types';
import { Button } from './Button';

interface PaneProps {
  index: number;
  viewState: ViewState;
  onLoadFile: (file: File) => void;
  onClear: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export const Pane: React.FC<PaneProps> = ({ 
  index,
  viewState, 
  onLoadFile, 
  onClear,
  iframeRef 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      if (file.name.endsWith('.zip')) {
        return; // Bubble up to App
      }

      if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        e.stopPropagation();
        onLoadFile(file);
      } else {
        alert('Please drop an HTML file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onLoadFile(e.target.files[0]);
    }
  };

  const triggerFileDialog = () => fileInputRef.current?.click();

  if (viewState.type === ContentType.EMPTY) {
    return (
      <div 
        className={`flex-1 h-full flex flex-col items-center justify-center border-2 border-dashed transition-colors duration-200 min-w-[320px]
          ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-800/50'}
          border-l-0 first:border-l-2
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center p-6">
          <svg className="w-10 h-10 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            View #{index + 1}
          </h3>
          <p className="text-sm text-gray-500 mb-6">Drop HTML file</p>
          <Button onClick={triggerFileDialog} variant="primary">
            Choose File
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".html,.htm" 
            onChange={handleFileSelect} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col relative bg-white group min-w-[400px] border-l border-gray-800 first:border-l-0">
      {/* Floating Header */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800/90 backdrop-blur text-xs flex items-center justify-between px-3 border-b border-gray-600 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="truncate text-gray-300 max-w-[70%]"><span className="font-bold mr-2">#{index + 1}</span>{viewState.name}</span>
        <button onClick={onClear} className="text-gray-400 hover:text-red-400">
          Close
        </button>
      </div>

      <iframe
        ref={iframeRef as React.RefObject<HTMLIFrameElement>}
        className="w-full h-full border-none bg-white"
        title={`View-${index}`}
        srcDoc={viewState.type === ContentType.FILE ? viewState.content : undefined}
        src={viewState.type === ContentType.URL ? viewState.content : undefined}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};