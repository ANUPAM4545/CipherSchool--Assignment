export type ProgrammingLanguage = 'javascript' | 'python';

export const SUPPORTED_LANGUAGES: ReadonlyArray<ProgrammingLanguage> = [
  'javascript',
  'python',
] as const;

export interface LanguageMetadata {
  id: ProgrammingLanguage;
  displayName: string;
  version: string;
  monacoLanguage: string;
  fileExtension: string;
}

export const LANGUAGE_METADATA: Record<ProgrammingLanguage, LanguageMetadata> = {
  javascript: {
    id: 'javascript',
    displayName: 'JavaScript (Node.js)',
    version: 'Node.js v20',
    monacoLanguage: 'javascript',
    fileExtension: '.js',
  },
  python: {
    id: 'python',
    displayName: 'Python (Python 3)',
    version: 'Python 3.9+',
    monacoLanguage: 'python',
    fileExtension: '.py',
  },
};

export function isSupportedLanguage(lang: string): lang is ProgrammingLanguage {
  return SUPPORTED_LANGUAGES.includes(lang.toLowerCase() as ProgrammingLanguage);
}
