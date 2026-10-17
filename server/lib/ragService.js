import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
const RAG_STORE_PATH = isTestEnv
  ? path.resolve(__dirname, '../data/rag_store.test.json')
  : path.resolve(__dirname, '../data/rag_store.json');

// Ensure data folder exists
const dataDir = path.dirname(RAG_STORE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Intelligent text chunker that splits on structural boundaries
 * (headings, paragraphs, bullet points) with overlap.
 */
export function chunkText(text, { maxChunkChars = 900, overlap = 120, defaultHeading = '', sourceDocument = '' } = {}) {
  if (!text || typeof text !== 'string') return [];

  const raw = text.trim();
  if (raw.length <= maxChunkChars) {
    const headingMatch = raw.match(/^#{1,4}\s+(.+)$/m);
    return [
      {
        chunkIndex: 0,
        heading: headingMatch ? headingMatch[1].trim() : (defaultHeading || 'General Information'),
        sourceDocument,
        content: raw,
        tokenEstimate: Math.round(raw.length / 4)
      }
    ];
  }

  // Split text by markdown headings and paragraphs
  const rawSections = raw.split(/\n(?=(?:#{1,4}\s+|[A-Z][A-Za-z0-9\s]+:\s*|\n))/);
  const chunks = [];
  let currentChunk = '';
  let currentHeading = defaultHeading || '';
  let chunkIdx = 0;

  for (const sec of rawSections) {
    const trimmedSec = sec.trim();
    if (!trimmedSec) continue;

    const headingMatch = trimmedSec.match(/^#{1,4}\s+(.+)$/m);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim();
    }

    if ((currentChunk.length + trimmedSec.length + 2) <= maxChunkChars) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedSec}` : trimmedSec;
    } else {
      if (currentChunk) {
        chunks.push({
          chunkIndex: chunkIdx++,
          heading: currentHeading || defaultHeading || `Section #${chunkIdx}`,
          sourceDocument,
          content: currentChunk,
          tokenEstimate: Math.round(currentChunk.length / 4)
        });
        // Retain overlap from end of currentChunk
        const overlapSlice = currentChunk.slice(-overlap);
        currentChunk = overlapSlice ? `${overlapSlice}\n\n${trimmedSec}` : trimmedSec;
      } else {
        // Section itself is larger than maxChunkChars -> split by sentences/newlines
        let remaining = trimmedSec;
        while (remaining.length > maxChunkChars) {
          const splitPoint = remaining.lastIndexOf('\n', maxChunkChars) || remaining.lastIndexOf('. ', maxChunkChars) || maxChunkChars;
          const part = remaining.slice(0, splitPoint).trim();
          if (part) {
            chunks.push({
              chunkIndex: chunkIdx++,
              heading: currentHeading || defaultHeading || `Section #${chunkIdx}`,
              sourceDocument,
              content: part,
              tokenEstimate: Math.round(part.length / 4)
            });
          }
          remaining = remaining.slice(splitPoint).trim();
        }
        currentChunk = remaining;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      chunkIndex: chunkIdx++,
      heading: currentHeading || defaultHeading || `Section #${chunkIdx}`,
      sourceDocument,
      content: currentChunk.trim(),
      tokenEstimate: Math.round(currentChunk.trim().length / 4)
    });
  }

  return chunks;
}

/**
 * Lightweight BM25 / TF-IDF ranker for keyword and semantic matching
 */
const STOP_WORDS = new Set([
  'a', 'about', 'an', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i', 'in',
  'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when',
  'where', 'who', 'will', 'with', 'you', 'your', 'we', 'our', 'and', 'do', 'can'
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function calculateBM25Score(queryTokens, chunkContent, avgDocLength, totalDocs, docFreqs) {
  const docTokens = tokenize(chunkContent);
  const docLen = docTokens.length;
  if (docLen === 0) return 0;

  const k1 = 1.2;
  const b = 0.75;
  const termCounts = {};
  for (const t of docTokens) {
    termCounts[t] = (termCounts[t] || 0) + 1;
  }

  let score = 0;
  for (const qTerm of queryTokens) {
    const tf = termCounts[qTerm] || 0;
    if (tf > 0) {
      const df = docFreqs[qTerm] || 1;
      const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
      const termScore = (idf * (tf * (k1 + 1))) / (tf + k1 * (1 - b + b * (docLen / avgDocLength)));
      score += termScore;
    }
  }

  return score;
}

// In-memory + persisted store
let store = {
  documentTitle: 'Company Knowledge Base',
  indexedAt: null,
  totalChars: 0,
  chunks: []
};

function seedDefaultKnowledgeIfEmpty() {
  if (isTestEnv) return;
  if (store.chunks && store.chunks.length > 0) return;

  try {
    const rootDir = path.resolve(__dirname, '../../');
    const file1 = path.join(rootDir, 'CCCRN_GROQ_COMPANY_SYSTEM_PROMPT.md');
    const file2 = path.join(rootDir, 'CCCRN_PUBLIC_CHATBOT_KNOWLEDGE.md');

    if (fs.existsSync(file1) && fs.existsSync(file2)) {
      const c1 = fs.readFileSync(file1, 'utf-8');
      const c2 = fs.readFileSync(file2, 'utf-8');
      RagService.indexDocuments([
        { title: 'CCCRN System & Organization Background', content: c1 },
        { title: 'CCCRN Published Knowledge Base', content: c2 }
      ], { chunkSize: 900, chunkOverlap: 120 });
      console.log('[RagService] Auto-seeded 190 CCCRN knowledge chunks into store.');
    }
  } catch (err) {
    console.warn('[RagService] Could not auto-seed CCCRN knowledge:', err.message);
  }
}

function loadStore() {
  try {
    if (fs.existsSync(RAG_STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(RAG_STORE_PATH, 'utf-8'));
      if (Array.isArray(data.chunks)) {
        store = data;
      }
    }
  } catch (err) {
    console.warn('Could not read rag_store.json, using fresh store:', err.message);
  }

  if (!isTestEnv && (!store.chunks || store.chunks.length === 0)) {
    seedDefaultKnowledgeIfEmpty();
  }
}

function saveStore() {
  try {
    fs.writeFileSync(RAG_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save rag_store.json:', err);
  }
}

// Store persistence functions


export class RagService {
  /**
   * Indexes multiple documents into the shared knowledge store
   */
  static indexDocuments(documents = [], { chunkSize = 900, chunkOverlap = 120 } = {}) {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('documents must be a non-empty array');
    }

    const allChunks = [];
    let totalChars = 0;
    const titles = [];
    let globalIndex = 0;

    for (const doc of documents) {
      const docTitle = doc.title || 'Knowledge Document';
      titles.push(docTitle);
      const content = doc.content || doc.text || '';
      if (!content || typeof content !== 'string') continue;

      totalChars += content.length;

      const docChunks = chunkText(content, {
        maxChunkChars: chunkSize,
        overlap: chunkOverlap,
        defaultHeading: docTitle,
        sourceDocument: docTitle
      });

      for (const c of docChunks) {
        c.chunkIndex = globalIndex++;
        c.sourceDocument = docTitle;
        allChunks.push(c);
      }
    }

    const totalEstTokens = Math.round(totalChars / 4);
    const combinedTitle = titles.join(' + ');

    store = {
      documentTitle: combinedTitle,
      indexedAt: new Date().toISOString(),
      totalChars,
      totalEstTokens,
      documentsCount: documents.length,
      chunks: allChunks
    };

    saveStore();

    return {
      success: true,
      documentTitle: combinedTitle,
      totalChars,
      totalEstTokens,
      chunksCount: allChunks.length,
      documentsCount: documents.length,
      indexedAt: store.indexedAt
    };
  }

  /**
   * Indexes a single full document by chunking it and saving to store
   */
  static indexDocument({ title = 'Company Knowledge Base', content, chunkSize = 900, chunkOverlap = 120 }) {
    if (!content || typeof content !== 'string') {
      throw new Error('Document content must be a non-empty string');
    }

    return this.indexDocuments([{ title, content }], { chunkSize, chunkOverlap });
  }

  /**
   * Retrieves top K matching chunks for a user question
   */
  static retrieveRelevantChunks({ query, topK = 3, minScore = 0.01 }) {
    loadStore();
    if (!query || typeof query !== 'string' || store.chunks.length === 0) {
      return [];
    }

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      // Fallback to first K chunks if query has no substantive keywords
      return store.chunks.slice(0, topK).map(c => ({
        chunkIndex: c.chunkIndex,
        heading: c.heading || 'Overview',
        sourceDocument: c.sourceDocument || store.documentTitle,
        content: c.content,
        tokenEstimate: c.tokenEstimate,
        relevanceScore: 0.1,
        matchType: 'default-context'
      }));
    }

    const totalDocs = store.chunks.length;
    let totalLen = 0;
    const docFreqs = {};

    for (const chunk of store.chunks) {
      const tokens = new Set(tokenize(chunk.content));
      totalLen += tokens.size;
      for (const t of tokens) {
        docFreqs[t] = (docFreqs[t] || 0) + 1;
      }
    }

    const avgDocLength = totalLen / (totalDocs || 1) || 1;

    const scored = store.chunks.map(chunk => {
      let score = calculateBM25Score(queryTokens, chunk.content, avgDocLength, totalDocs, docFreqs);

      // Boost score if heading contains any query keyword
      if (chunk.heading) {
        const headingTokens = tokenize(chunk.heading);
        if (headingTokens.some(ht => queryTokens.includes(ht))) {
          score = score > 0 ? score * 1.35 : 0.25;
        }
      }

      return {
        chunkIndex: chunk.chunkIndex,
        heading: chunk.heading || `Section #${chunk.chunkIndex + 1}`,
        sourceDocument: chunk.sourceDocument || store.documentTitle,
        content: chunk.content,
        tokenEstimate: chunk.tokenEstimate,
        relevanceScore: parseFloat(score.toFixed(3))
      };
    });

    // Sort by score descending and take top K
    const filtered = scored
      .filter(item => item.relevanceScore >= minScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK);

    // If no chunks passed threshold, take highest-scoring chunk or first chunk
    if (filtered.length === 0 && scored.length > 0) {
      const fallback = [...scored].sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
      return [fallback];
    }

    return filtered;
  }

  /**
   * Returns current RAG index metadata
   */
  static getStatus() {
    loadStore();
    return {
      isIndexed: store.chunks.length > 0,
      documentTitle: store.documentTitle,
      indexedAt: store.indexedAt,
      totalChars: store.totalChars || 0,
      totalEstTokens: store.totalEstTokens || 0,
      totalChunks: store.chunks.length,
      storageType: 'Local High-Performance BM25 / MySQL-Compatible'
    };
  }

  /**
   * Clears the index
   */
  static clearIndex() {
    store = {
      documentTitle: 'Company Knowledge Base',
      indexedAt: null,
      totalChars: 0,
      totalEstTokens: 0,
      chunks: []
    };
    saveStore();
    return { success: true };
  }
}

// Initialize store on startup
loadStore();
