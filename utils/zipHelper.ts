import JSZip from 'jszip';
import { ZipFileEntry } from '../types';

export const parseZipFile = async (file: File): Promise<ZipFileEntry[]> => {
  try {
    const zip = await JSZip.loadAsync(file);
    const entries: ZipFileEntry[] = [];

    // Iterate over files
    zip.forEach((relativePath, zipEntry) => {
      // 1. Ignore directories
      if (zipEntry.dir) return;
      
      // 2. Ignore Mac OS artifacts and system files
      if (relativePath.startsWith('__MACOSX/') || relativePath.includes('.DS_Store')) return;

      // 3. Filter for HTML files only
      if (!relativePath.match(/\.(html|htm)$/i)) return;

      entries.push({
        path: relativePath,
        name: relativePath.split('/').pop() || relativePath,
        originalObj: zipEntry
      });
    });

    // Sort alphabetically by path
    return entries.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    console.error("Failed to unzip file:", error);
    throw new Error("Invalid ZIP file or corrupted data.");
  }
};

export const extractFileContent = async (entry: ZipFileEntry): Promise<string> => {
  // Lazy load content only when requested
  return await entry.originalObj.async('string');
};