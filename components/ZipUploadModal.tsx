import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from './Button';
import { parseZipFile } from '../utils/zipHelper';
import { ZipFileEntry } from '../types';

interface ZipUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (packages: { name: string; files: ZipFileEntry[] }[]) => void;
  initialFiles?: File[];
}

const MAX_SLOTS = 5;

interface FileCardProps {
  file: File | null;
  index: number;
  onRemove: (index: number) => void;
  onClick?: () => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, index, onRemove, onClick }) => (
  <div 
    onClick={!file && onClick ? onClick : undefined}
    className={`
      relative flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed transition-all h-32 w-full
      ${file 
        ? 'border-blue-500/50 bg-blue-900/20 cursor-default' 
        : 'border-gray-700 bg-gray-800/30 text-gray-500 cursor-pointer hover:border-gray-500 hover:bg-gray-800/50'
      }
    `}
  >
    {file ? (
      <>
        <div className="text-2xl mb-1">📦</div>
        <div className="text-[10px] font-bold text-blue-300 uppercase mb-1">View {index + 1}</div>
        <div className="text-xs text-gray-200 font-medium truncate w-full text-center px-2" title={file.name}>
          {file.name}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(index); }}
          className="absolute top-1 right-1 text-gray-500 hover:text-red-400 p-1"
          title="Remove file"
        >
          ✕
        </button>
      </>
    ) : (
      <>
        <div className="text-xl mb-1 opacity-30">📂</div>
        <div className="text-[10px] font-semibold">Slot {index + 1}</div>
        <div className="text-[9px] mt-1 opacity-50">Empty</div>
      </>
    )}
  </div>
);

export const ZipUploadModal: React.FC<ZipUploadModalProps> = ({ isOpen, onClose, onConfirm, initialFiles = [] }) => {
  // Fixed size array of length 5
  const [files, setFiles] = useState<(File | null)[]>(Array(MAX_SLOTS).fill(null));
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified file handling logic
  const handleFiles = useCallback((incomingFiles: File[]) => {
    const validZips = incomingFiles.filter(
      f => f.type === 'application/zip' || f.name.endsWith('.zip')
    );

    if (validZips.length === 0) {
      if (incomingFiles.length > 0) setError('Only ZIP files are supported.');
      return;
    }

    setError(null);

    setFiles(prev => {
      const newFiles = [...prev];
      let zipIdx = 0;
      
      // Fill empty slots with new zips
      for (let i = 0; i < MAX_SLOTS; i++) {
        if (zipIdx >= validZips.length) break;
        
        if (newFiles[i] === null) {
          newFiles[i] = validZips[zipIdx];
          zipIdx++;
        }
      }
      
      // If we still have zips left and no empty slots, overwrite from start (optional, simplified to just fill empty)
      return newFiles;
    });
  }, []);

  useEffect(() => {
    if (isOpen && initialFiles.length > 0) {
        handleFiles(initialFiles);
    } else if (!isOpen) {
        setFiles(Array(MAX_SLOTS).fill(null));
        setError(null);
    }
  }, [isOpen, initialFiles, handleFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!e.dataTransfer) return;
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const removeFile = (index: number) => {
    setFiles(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const processFiles = async () => {
    const activeFiles = files.filter(f => f !== null) as File[];
    if (activeFiles.length < 1) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const results = await Promise.all(activeFiles.map(async (file) => {
        const entries = await parseZipFile(file);
        return {
          name: file.name.replace('.zip', ''),
          files: entries
        };
      }));

      onConfirm(results);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to process one or more ZIP files.');
    } finally {
      setIsProcessing(false);
    }
  };

  const activeCount = files.filter(f => f !== null).length;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
    >
      <div 
        className={`
          bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-[800px] max-w-full overflow-hidden transition-all flex flex-col max-h-[90vh]
          ${isDragging ? 'ring-4 ring-blue-500/50 scale-[1.02]' : ''}
        `}
        onDrop={(e) => e.stopPropagation()} 
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Setup Multi-View Project</h2>
            <p className="text-sm text-gray-400 mt-1">
              Upload up to 5 ZIP packages. 
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="text-blue-400 hover:text-blue-300 ml-1 underline underline-offset-2 focus:outline-none"
              >
                Browse files
              </button>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileInputChange} 
            className="hidden" 
            accept=".zip,application/zip" 
            multiple 
          />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((file, idx) => (
              <FileCard 
                key={idx}
                file={file} 
                index={idx} 
                onRemove={removeFile}
                onClick={() => fileInputRef.current?.click()}
              />
            ))}
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-2 text-red-400 bg-red-900/10 px-4 py-3 rounded-lg border border-red-900/50">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-800/50 border-t border-gray-800 flex justify-end gap-3 shrink-0">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button 
            onClick={processFiles} 
            variant="primary" 
            disabled={activeCount < 1 || isProcessing}
            className="px-6"
            icon={isProcessing ? <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : null}
          >
            {isProcessing ? 'Unzipping...' : `Compare ${activeCount} Package${activeCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
};