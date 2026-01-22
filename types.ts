export enum ContentType {
  EMPTY = 'EMPTY',
  FILE = 'FILE',
  URL = 'URL'
}

export interface ViewState {
  id: string; // Unique ID for keying
  type: ContentType;
  content: string; // URL or raw HTML string
  name: string;
}

export interface SyncConfig {
  enabled: boolean;
  mode: 'PERCENTAGE' | 'PIXEL'; 
}

// Zip Project Types
export interface ZipFileEntry {
  path: string;
  name: string;
  originalObj: any; // JSZip object type
}

export interface PackageData {
  id: string;
  name: string;
  files: ZipFileEntry[];
}

export interface ProjectState {
  isActive: boolean;
  packages: PackageData[];
}