import React, { useState, useRef, useEffect } from 'react';
import { Pane } from './components/Pane';
import { Button } from './components/Button';
import { Sidebar } from './components/Sidebar';
import { ZipUploadModal } from './components/ZipUploadModal';
import { useSyncScroll } from './hooks/useSyncScroll';
import { ContentType, ViewState, ProjectState, ZipFileEntry } from './types';
import { extractFileContent, parseZipFile } from './utils/zipHelper';

// Helper to generate a default empty state
const createEmptyView = (idSuffix: number): ViewState => ({
  id: `view-${Date.now()}-${idSuffix}`,
  type: ContentType.EMPTY,
  content: '',
  name: ''
});

const App: React.FC = () => {
  const [syncEnabled, setSyncEnabled] = useState(true);
  
  // Dynamic Views State (Default to 2)
  const [views, setViews] = useState<ViewState[]>([
    createEmptyView(1),
    createEmptyView(2)
  ]);
  
  // Project State
  const [project, setProject] = useState<ProjectState>({ isActive: false, packages: [] });
  const [isModalOpen, setModalOpen] = useState(false);
  const [pendingZipFiles, setPendingZipFiles] = useState<File[]>([]);
  
  // Selection state per view index
  const [selectedPaths, setSelectedPaths] = useState<(string | null)[]>([null, null]);

  // Hidden input for "Add Report" functionality
  const appendInputRef = useRef<HTMLInputElement>(null);

  // Array of Refs for N frames
  const paneRefs = useRef<(HTMLIFrameElement | null)[]>([]);

  // Update refs array size when views change
  useEffect(() => {
    paneRefs.current = paneRefs.current.slice(0, views.length);
  }, [views]);

  // Sync Scroll Hook
  useSyncScroll(
    paneRefs, 
    syncEnabled, 
    // Re-attach listeners when content of ANY view changes
    views.map(v => v.content)
  );

  const loadFile = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setViews(prev => {
        const next = [...prev];
        next[index] = { ...next[index], type: ContentType.FILE, content, name: file.name };
        return next;
      });
      // Clear sidebar selection for this view if manually loaded
      setSelectedPaths(prev => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    };
    reader.readAsText(file);
  };

  const handleZipProjectLoaded = (packages: { name: string; files: ZipFileEntry[] }[]) => {
    // New Project Logic: Reset everything
    const newViewCount = Math.max(2, packages.length);
    const newViews = Array.from({ length: newViewCount }, (_, i) => createEmptyView(i));
    
    setViews(newViews);
    setSelectedPaths(new Array(newViewCount).fill(null));

    setProject({ 
        isActive: true, 
        packages: packages.map((p, i) => ({
            id: `pkg-${Date.now()}-${i}`,
            name: p.name,
            files: p.files
        })) 
    });
    
    setPendingZipFiles([]);
  };

  const handleAppendZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Safety check for max views
    if (views.length >= 5) {
        alert("Maximum 5 views allowed.");
        return;
    }

    try {
        const entries = await parseZipFile(file);
        const newPkg = {
            id: `pkg-${Date.now()}-append`,
            name: file.name.replace('.zip', ''),
            files: entries
        };

        // 1. Add new empty view
        setViews(prev => [...prev, createEmptyView(prev.length + 1)]);
        
        // 2. Add new null selection path
        setSelectedPaths(prev => [...prev, null]);
        
        // 3. Update Project State
        setProject(prev => ({
            isActive: true, // Ensure project is active even if it wasn't
            packages: [...prev.packages, newPkg]
        }));
        
        // 4. (Optional) Auto-select the first HTML file in the new package if available
        // We defer this slightly to allow state to settle, or just let user click sidebar
        
    } catch (err) {
        alert("Failed to parse ZIP file.");
        console.error(err);
    } finally {
        if (appendInputRef.current) appendInputRef.current.value = '';
    }
  };

  const handleSidebarSelect = async (packageIndex: number, entry: ZipFileEntry) => {
    if (packageIndex >= views.length) return;

    try {
      const content = await extractFileContent(entry);
      
      setViews(prev => {
        const next = [...prev];
        next[packageIndex] = { ...next[packageIndex], type: ContentType.FILE, content, name: entry.name };
        return next;
      });

      setSelectedPaths(prev => {
        const next = [...prev];
        next[packageIndex] = entry.path;
        return next;
      });

    } catch (e) {
      alert("Error loading file content");
    }
  };

  const clearView = (index: number) => {
    setViews(prev => {
      const next = [...prev];
      next[index] = { ...next[index], type: ContentType.EMPTY, content: '', name: '' };
      return next;
    });
    setSelectedPaths(prev => {
        const next = [...prev];
        next[index] = null;
        return next;
    });
  };

  const clearAllViews = () => {
    setViews(prev => prev.map((v, i) => ({ ...v, type: ContentType.EMPTY, content: '', name: '' })));
    setSelectedPaths(prev => prev.map(() => null));
  };

  const resetScroll = () => {
    paneRefs.current.forEach(frame => {
        if (frame?.contentWindow) frame.contentWindow.scrollTo(0, 0);
    });
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files) as File[];
        const zipFiles = files.filter(f => f.name.endsWith('.zip'));
        if (zipFiles.length > 0) {
            setPendingZipFiles(zipFiles);
            setModalOpen(true);
        }
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const allEmpty = views.every(v => v.type === ContentType.EMPTY);
  const canAddMore = views.length < 5;

  return (
    <div 
        className="h-screen flex flex-col bg-gray-900 overflow-hidden"
        onDrop={handleGlobalDrop}
        onDragOver={handleGlobalDragOver}
    >
      {/* Hidden input for appending */}
      <input 
        type="file" 
        ref={appendInputRef} 
        onChange={handleAppendZip} 
        className="hidden" 
        accept=".zip,application/zip" 
      />

      {/* Header Toolbar */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-400 rounded-md flex items-center justify-center text-white font-bold text-xs">MV</div>
            <h1 className="font-semibold text-gray-100 tracking-tight hidden md:block">Multi-Vision Synchronizer</h1>
            <h1 className="font-semibold text-gray-100 tracking-tight md:hidden">MV Sync</h1>
          </div>
          
          <div className="h-6 w-px bg-gray-600 mx-2"></div>
          
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900/50 px-2 py-1 rounded border border-gray-700 cursor-help" title="Scroll any view to sync others">
            <div className={`w-2 h-2 rounded-full ${syncEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            {syncEnabled ? 'SYNC ON' : 'SYNC OFF'}
          </div>

          {project.isActive && (
            <span className="text-xs text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded border border-purple-900/50">
              {views.length}-View Project
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
            {/* Primary Action Group */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-1 rounded-lg border border-gray-600">
                <Button
                    variant="ghost"
                    onClick={() => {
                        setPendingZipFiles([]);
                        setModalOpen(true);
                    }}
                    title="Start a fresh project"
                    className="text-xs px-2 h-7"
                >
                    New Project
                </Button>
                
                <div className="w-px h-4 bg-gray-500"></div>

                <Button
                    variant="primary"
                    onClick={() => appendInputRef.current?.click()}
                    disabled={!canAddMore}
                    icon={<span className="text-lg leading-none font-bold">+</span>}
                    className={`text-xs px-3 h-7 ${!canAddMore ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={canAddMore ? "Add another report (ZIP)" : "Max 5 views reached"}
                >
                    Add Report
                </Button>
            </div>

            <div className="h-6 w-px bg-gray-600 mx-1"></div>

            <Button 
                onClick={() => setSyncEnabled(!syncEnabled)} 
                active={syncEnabled}
                variant={syncEnabled ? 'primary' : 'secondary'}
                title={syncEnabled ? "Unlink Views" : "Link Views"}
                icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                }
            />

            <Button 
                onClick={resetScroll}
                title="Reset all views to top"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
            >
               <span className="hidden md:inline">Reset Top</span>
            </Button>
            
            <div className="h-6 w-px bg-gray-600 mx-1"></div>
            
            <Button 
                variant="danger" 
                onClick={clearAllViews}
                disabled={allEmpty}
                className={allEmpty ? 'opacity-50 cursor-not-allowed' : ''}
                title="Clear all views"
            >
                Clear
            </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-row relative min-h-0 overflow-hidden">
        {project.isActive && (
          <Sidebar 
            packages={project.packages}
            selectedPaths={selectedPaths}
            onSelect={handleSidebarSelect}
          />
        )}

        {/* Scrollable Container for Panes */}
        <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden bg-gray-950 scroll-smooth">
          {views.map((view, index) => (
            <React.Fragment key={view.id}>
                <Pane 
                    index={index}
                    viewState={view} 
                    onLoadFile={(f) => loadFile(index, f)} 
                    onClear={() => clearView(index)}
                    iframeRef={(el) => (paneRefs.current[index] = el)}
                />
                {/* Gutter */}
                {index < views.length - 1 && (
                    <div className="w-1 bg-gray-800 shrink-0 z-10 flex items-center justify-center">
                        <div className="h-4 w-0.5 bg-gray-700 rounded-full"></div>
                    </div>
                )}
            </React.Fragment>
          ))}

          {/* Add View Placeholder (Visual Feedback) */}
          {canAddMore && (
             <div className="flex shrink-0 min-w-[200px] max-w-[300px] flex-col relative border-l border-gray-800 bg-gray-900/50">
                 <button 
                    onClick={() => appendInputRef.current?.click()}
                    className="flex-1 m-4 border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-blue-900/10 rounded-xl flex flex-col items-center justify-center group transition-all text-gray-500 hover:text-blue-400"
                    title="Add another report view"
                 >
                     <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-blue-900/50 flex items-center justify-center mb-3 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     </div>
                     <span className="text-sm font-medium">Add View</span>
                 </button>
             </div>
          )}
          
          {/* Spacer to ensure last item isn't flush with edge if scrolling happens */}
          <div className="w-4 shrink-0"></div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-[10px] text-gray-500 justify-between shrink-0 z-20">
         <div>Multi-Vision LQA Tool v2.1</div>
         <div className="flex gap-4">
            {views.map((v, i) => (
                <span key={i} className="truncate max-w-[150px]">
                    #{i + 1}: {v.name || 'Empty'}
                </span>
            ))}
         </div>
      </footer>

      {/* Modals */}
      <ZipUploadModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onConfirm={handleZipProjectLoaded}
        initialFiles={pendingZipFiles}
      />
    </div>
  );
};

export default App;