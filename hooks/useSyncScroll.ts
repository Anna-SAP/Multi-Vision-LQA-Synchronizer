import React, { useEffect, useRef, useCallback } from 'react';

export const useSyncScroll = (
  refs: React.MutableRefObject<(HTMLIFrameElement | null)[]>,
  enabled: boolean,
  deps: any[] = [] 
) => {
  // Stores the index of the iframe currently driving the scroll
  const isScrollingIndex = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearScrollLock = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    // Small buffer to release the lock after scroll stops
    timeoutRef.current = window.setTimeout(() => {
      isScrollingIndex.current = null;
    }, 100); 
  }, []);

  const syncScroll = useCallback((sourceIndex: number) => {
    if (!enabled) return;
    
    // Loop prevention: If another frame is already driving, ignore this event
    if (isScrollingIndex.current !== null && isScrollingIndex.current !== sourceIndex) return;

    isScrollingIndex.current = sourceIndex;
    clearScrollLock();

    const sourceFrame = refs.current[sourceIndex];
    if (!sourceFrame) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
        const sourceWin = sourceFrame.contentWindow;
        const sourceDoc = sourceFrame.contentDocument?.documentElement;
        
        if (!sourceWin || !sourceDoc) return;

        // Calculate Scroll Percentage from Source
        const sourceHeight = sourceDoc.scrollHeight - sourceWin.innerHeight;
        const sourceWidth = sourceDoc.scrollWidth - sourceWin.innerWidth;

        if (sourceHeight <= 0) return; // Prevent division by zero

        const percentageY = sourceWin.scrollY / sourceHeight;
        // Horizontal sync is optional/tricky, but we include it for completeness
        const percentageX = sourceWidth > 0 ? sourceWin.scrollX / sourceWidth : 0;

        // Apply to ALL other frames
        refs.current.forEach((targetFrame, idx) => {
            if (idx === sourceIndex || !targetFrame) return;

            const targetWin = targetFrame.contentWindow;
            const targetDoc = targetFrame.contentDocument?.documentElement;

            if (!targetWin || !targetDoc) return;

            const targetHeight = targetDoc.scrollHeight - targetWin.innerHeight;
            const targetWidth = targetDoc.scrollWidth - targetWin.innerWidth;

            if (targetHeight > 0) {
                const targetY = percentageY * targetHeight;
                const targetX = targetWidth > 0 ? percentageX * targetWidth : 0;
                targetWin.scrollTo(targetX, targetY);
            }
        });
    });

  }, [enabled, clearScrollLock, refs]);

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    refs.current.forEach((iframe, index) => {
        if (!iframe) return;

        const handleScroll = () => syncScroll(index);

        const attach = () => {
            try {
                const win = iframe.contentWindow;
                if (win) {
                    win.removeEventListener('scroll', handleScroll, true);
                    win.addEventListener('scroll', handleScroll, { capture: true, passive: true });
                }
            } catch (e) {
                console.warn(`Could not attach scroll listener to frame ${index}`, e);
            }
        };

        // Attach on load and immediately if ready
        iframe.addEventListener('load', attach);
        if (iframe.contentDocument?.readyState === 'complete') attach();

        cleanups.push(() => {
            iframe.removeEventListener('load', attach);
            if (iframe.contentWindow) {
                iframe.contentWindow.removeEventListener('scroll', handleScroll, true);
            }
        });
    });

    return () => {
        cleanups.forEach(c => c());
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [refs, syncScroll, ...deps]); 
};