// Carpetas de la sección Documentos (mismo orden en que se muestran).
export const FOLDER_LABEL = {
  legal: "Documentos legales",
  process: "Documentos del proceso",
  reports: "Informes",
  resources: "Recursos",
} as const;
export type Folder = keyof typeof FOLDER_LABEL;
export const FOLDERS = Object.keys(FOLDER_LABEL) as Folder[];
