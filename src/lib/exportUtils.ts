import JSZip from 'jszip';

export interface ExportData {
  notes: any[];
  snippets: any[];
  todos: any[];
  exportDate: string;
  version: string;
}

export interface ImportData {
  notes?: any[];
  snippets?: any[];
  todos?: any[];
  exportDate?: string;
  version?: string;
}

// Export functions
export const exportNotesAsMarkdown = (notes: any[]): string => {
  let markdown = '# Notes Export\n\n';
  markdown += `Generated on: ${new Date().toLocaleString()}\n\n`;

  notes.forEach((note, index) => {
    markdown += `## ${note.title || 'Untitled Note'}\n\n`;
    if (note.tags && note.tags.length > 0) {
      markdown += `**Tags:** ${note.tags.join(', ')}\n\n`;
    }
    markdown += `${note.content}\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
};

export const exportNotesAsJson = (notes: any[]): string => {
  const exportData = {
    notes,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  return JSON.stringify(exportData, null, 2);
};

export const exportSnippetsAsJson = (snippets: any[]): string => {
  const exportData = {
    snippets,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  return JSON.stringify(exportData, null, 2);
};

export const exportSnippetsAsCodeBlocks = (snippets: any[]): string => {
  let codeBlocks = '# Code Snippets Export\n\n';
  codeBlocks += `Generated on: ${new Date().toLocaleString()}\n\n`;

  snippets.forEach((snippet, index) => {
    codeBlocks += `## ${snippet.title}\n\n`;
    if (snippet.language) {
      codeBlocks += `**Language:** ${snippet.language}\n`;
    }
    if (snippet.category) {
      codeBlocks += `**Category:** ${snippet.category}\n`;
    }
    codeBlocks += '\n';
    codeBlocks += `\`\`\`${snippet.language || ''}\n`;
    codeBlocks += snippet.content;
    codeBlocks += '\n```\n\n';
    codeBlocks += `---\n\n`;
  });

  return codeBlocks;
};

export const exportTodosAsJson = (todos: any[]): string => {
  const exportData = {
    todos,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  return JSON.stringify(exportData, null, 2);
};

export const exportAllAsZip = async (data: ExportData): Promise<Blob> => {
  const zip = new JSZip();

  // Add individual exports
  if (data.notes && data.notes.length > 0) {
    zip.file('notes.md', exportNotesAsMarkdown(data.notes));
    zip.file('notes.json', exportNotesAsJson(data.notes));
  }

  if (data.snippets && data.snippets.length > 0) {
    zip.file('snippets.md', exportSnippetsAsCodeBlocks(data.snippets));
    zip.file('snippets.json', exportSnippetsAsJson(data.snippets));
  }

  if (data.todos && data.todos.length > 0) {
    zip.file('todos.json', exportTodosAsJson(data.todos));
  }

  // Add metadata
  zip.file('export-info.json', JSON.stringify({
    exportDate: data.exportDate,
    version: data.version,
    notesCount: data.notes?.length || 0,
    snippetsCount: data.snippets?.length || 0,
    todosCount: data.todos?.length || 0
  }, null, 2));

  return await zip.generateAsync({ type: 'blob' });
};

// Import functions
export const validateImportData = (data: any): ImportData | null => {
  try {
    // Check if it's a valid JSON structure
    if (typeof data !== 'object' || data === null) {
      return null;
    }

    // Validate that it contains at least one of our data types
    if (!data.notes && !data.snippets && !data.todos) {
      return null;
    }

    return {
      notes: Array.isArray(data.notes) ? data.notes : undefined,
      snippets: Array.isArray(data.snippets) ? data.snippets : undefined,
      todos: Array.isArray(data.todos) ? data.todos : undefined,
      exportDate: data.exportDate,
      version: data.version
    };
  } catch (error) {
    console.error('Invalid import data:', error);
    return null;
  }
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; 
