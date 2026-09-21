import { AttachedFile } from '../types';

export class FileService {
  // Read and extract content from uploaded files locally
  async processFile(file: File): Promise<AttachedFile> {
    const fileId = 'file_' + Math.random().toString(36).substring(2, 9);
    const fileName = file.name;
    const fileType = file.type || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // 1. Handle Images
    if (fileType.startsWith('image/')) {
      const base64Data = await this.readAsBase64(file);
      // Strip data url prefix for Ollama image array
      const rawBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      return {
        id: fileId,
        name: fileName,
        type: fileType,
        size: file.size,
        extractedText: `[Image: ${fileName}]`,
        base64Data: rawBase64,
        isImage: true,
        tokenEstimate: 512,
      };
    }

    // 2. Handle Text and CSV / Code files
    if (
      fileType.includes('text') ||
      ['txt', 'csv', 'tsv', 'json', 'md', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'yaml', 'yml', 'xml', 'log'].includes(extension)
    ) {
      const text = await this.readAsText(file);
      return {
        id: fileId,
        name: fileName,
        type: fileType || 'text/plain',
        size: file.size,
        extractedText: text,
        tokenEstimate: Math.ceil(text.length / 4),
      };
    }

    // 3. Handle PDF files
    if (extension === 'pdf' || fileType === 'application/pdf') {
      const extractedText = await this.extractTextFromPDF(file);
      return {
        id: fileId,
        name: fileName,
        type: 'application/pdf',
        size: file.size,
        extractedText: extractedText || `[PDF document "${fileName}" with ${Math.round(file.size / 1024)} KB]`,
        tokenEstimate: Math.ceil((extractedText?.length || 100) / 4),
      };
    }

    // 4. Handle DOCX files
    if (extension === 'docx' || fileType.includes('wordprocessingml')) {
      const extractedText = await this.extractTextFromDocx(file);
      return {
        id: fileId,
        name: fileName,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: file.size,
        extractedText: extractedText || `[DOCX document "${fileName}"]`,
        tokenEstimate: Math.ceil((extractedText?.length || 100) / 4),
      };
    }

    // 5. Fallback for other files
    try {
      const text = await this.readAsText(file);
      return {
        id: fileId,
        name: fileName,
        type: fileType || 'application/octet-stream',
        size: file.size,
        extractedText: text.slice(0, 10000),
        tokenEstimate: Math.ceil(Math.min(text.length, 10000) / 4),
      };
    } catch {
      return {
        id: fileId,
        name: fileName,
        type: fileType || 'application/octet-stream',
        size: file.size,
        extractedText: `[Binary document: ${fileName} (${Math.round(file.size / 1024)} KB)]`,
        tokenEstimate: 50,
      };
    }
  }

  private readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // Client-side lightweight PDF text stream extractor
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const textDecoder = new TextDecoder('latin1');
      const content = textDecoder.decode(bytes);

      // Extract text within BT (begin text) and ET (end text) operators
      const textMatches: string[] = [];
      const btEtRegex = /BT[\s\S]*?ET/g;
      const matches = content.match(btEtRegex) || [];

      for (const block of matches) {
        // Extract string tokens inside parenthesis (text) Tj or [(t)(e)(x)(t)] TJ
        const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
        let m;
        while ((m = tjRegex.exec(block)) !== null) {
          if (m[1] && m[1].length > 0) {
            textMatches.push(m[1].replace(/\\([()\\])/g, '$1'));
          }
        }
      }

      if (textMatches.length > 5) {
        return textMatches.join(' ').replace(/\s+/g, ' ').trim();
      }

      // Fallback: extract printable ascii sequences if standard operators are filtered
      const plainAscii = content.replace(/[^\x20-\x7E\n]/g, ' ');
      const words = plainAscii.split(/\s+/).filter((w) => w.length > 2 && /^[a-zA-Z0-9,.-]+$/.test(w));
      if (words.length > 15) {
        return words.slice(0, 800).join(' ');
      }

      return `[PDF Document: ${file.name} - ${Math.round(file.size / 1024)} KB]`;
    } catch (e) {
      console.warn('PDF extraction fallback', e);
      return `[PDF Document: ${file.name}]`;
    }
  }

  // Extract raw text from docx file using zip unpack or XML parse
  private async extractTextFromDocx(file: File): Promise<string> {
    try {
      const text = await this.readAsText(file);
      // Search for XML tags in docx stream: <w:t>...</w:t>
      const wtMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (wtMatches && wtMatches.length > 0) {
        return wtMatches
          .map((tag) => tag.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      return `[DOCX Document: ${file.name}]`;
    } catch {
      return `[DOCX Document: ${file.name}]`;
    }
  }
}

export const fileService = new FileService();
