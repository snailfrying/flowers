import type { Note, CollectionType } from '../types.js';

/**
 * Vector Store using IndexedDB + hnswlib-wasm
 * Supports collection isolation (notes vs faqs)
 */
export interface VectorStore {
  upsert(id: string, text: string, embedding: number[], metadata: Record<string, any>): Promise<void>;
  delete(id: string): Promise<void>;
  update(id: string, text?: string, embedding?: number[], metadata?: Record<string, any>): Promise<void>;
  query(embedding: number[], topK: number, tags?: string[]): Promise<Array<{
    id: string;
    text: string;
    metadata: Record<string, any>;
    score: number;
  }>>;
}

// IndexedDB schema using Dexie
// Use IndexedDB directly (no Dexie dependency for simplicity)
// Alternatively, import Dexie if available
interface VectorRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
  updatedAt: number;
}

class VectorDB {
  private dbName: string;
  private storeName: string;

  constructor(collectionType: CollectionType) {
    this.dbName = `chroma_vectors_${collectionType}`;
    this.storeName = collectionType;
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('tags', 'metadata.tags', { multiEntry: true });
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
    });
  }

  async put(record: VectorRecord): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  }

  async get(id: string): Promise<VectorRecord | undefined> {
    const db = await this.getDB();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const result = await new Promise<VectorRecord | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  }

  async getAll(): Promise<VectorRecord[]> {
    const db = await this.getDB();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const result = await new Promise<VectorRecord[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  }

  async bulkGet(ids: string[]): Promise<(VectorRecord | undefined)[]> {
    const db = await this.getDB();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const results = await Promise.all(
      ids.map(id => new Promise<VectorRecord | undefined>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }))
    );
    db.close();
    return results;
  }
}

export class ChromaVectorStore implements VectorStore {
  private collectionType: CollectionType;
  private db: VectorDB;
  private hnswIndex: any; // hnswlib-wasm Index (can be null if not available)

  constructor(collectionType: CollectionType = 'notes') {
    this.collectionType = collectionType;
    this.db = new VectorDB(collectionType);
    // Initialize hnswlib-wasm index lazily
    this.hnswIndex = null;
  }

  private async ensureHNSWIndex(dim: number): Promise<any> {
    if (!this.hnswIndex) {
      // Detect Service Worker via explicit global flag set by our SW bootstrap
      // Fallback to feature checks if the flag is missing
      const swFlag = (globalThis as any).__CHROMA_SW__ === true;
      const isServiceWorker = swFlag || (typeof self !== 'undefined' && (self as any).registration !== undefined);
      
      if (isServiceWorker) {
        // In Service Worker, always use brute force search
        console.log('Service Worker detected, using brute force search instead of hnswlib-wasm');
        this.hnswIndex = null;
        return null;
      }
      
      // Dynamic import hnswlib-wasm (optional dependency)
      // Only attempt in non-Service Worker environments
      try {
        const hnswlib = await import('hnswlib-wasm' as string) as any;
        const Index = hnswlib.Index || hnswlib.default?.Index;
        if (!Index) throw new Error('hnswlib-wasm Index not found');
        
        this.hnswIndex = new Index({
          type: 'l2', // or 'cosine'
          dim: dim
        });
        
        // Load existing embeddings from IndexedDB
        const records = await this.db.getAll();
        for (const record of records) {
          try {
            this.hnswIndex.addPoint(record.embedding, record.id);
          } catch (e) {
            // Point might already exist, skip
          }
        }
      } catch (error) {
        // Fallback to brute force search if hnswlib-wasm is not available
        console.warn('hnswlib-wasm not available, falling back to brute force search:', error);
        this.hnswIndex = null;
      }
    }
    return this.hnswIndex;
  }

  async upsert(id: string, text: string, embedding: number[], metadata: Record<string, any>): Promise<void> {
    // 1. Store in IndexedDB
    await this.db.put({
      id,
      text,
      embedding,
      metadata: { ...metadata, collectionType: this.collectionType },
      updatedAt: Date.now()
    });

    // 2. Update HNSW index (if available)
    const index = await this.ensureHNSWIndex(embedding.length);
    if (index) {
      // Check if point exists (delete old if exists)
      try {
        index.removePoint(id);
      } catch {
        // Point doesn't exist, that's fine
      }
      
      // Add new point
      try {
        index.addPoint(embedding, id);
      } catch (e) {
        console.warn('Failed to add point to HNSW index:', e);
      }
    }
  }

  async delete(id: string): Promise<void> {
    // 1. Remove from IndexedDB
    await this.db.delete(id);

    // 2. Remove from HNSW index
    if (this.hnswIndex) {
      try {
        this.hnswIndex.removePoint(id);
      } catch {
        // Point doesn't exist, that's fine
      }
    }
  }

  async update(id: string, text?: string, embedding?: number[], metadata?: Record<string, any>): Promise<void> {
    const existing = await this.db.get(id);
    if (!existing) {
      throw new Error(`Vector ${id} not found`);
    }

    const updated: VectorRecord = {
      ...existing,
      ...(text !== undefined && { text }),
      ...(embedding !== undefined && { embedding }),
      ...(metadata !== undefined && { 
        metadata: { ...existing.metadata, ...metadata } 
      }),
      updatedAt: Date.now()
    };

    await this.upsert(updated.id, updated.text, updated.embedding, updated.metadata);
  }

  async query(embedding: number[], topK: number, tags?: string[]): Promise<Array<{
    id: string;
    text: string;
    metadata: Record<string, any>;
    score: number;
  }>> {
    console.info(`[VectorStore:${this.collectionType}] Starting query:`, {
      embeddingLength: embedding.length,
      topK,
      tags,
      collectionType: this.collectionType
    });

    // 1. Query HNSW index for similar vectors (or brute force if not available)
    let index = await this.ensureHNSWIndex(embedding.length);
    let results: Array<{ id: string; distance: number }> = [];
    
    if (index) {
      // Use HNSW index for fast search
      try {
        const hnswResults = index.searchKnn(embedding, topK * 2);
        results = hnswResults.map((r: any) => ({ id: r.id || r.label, distance: r.distance || 0 }));
        console.info(`[VectorStore:${this.collectionType}] HNSW search completed:`, {
          resultsCount: results.length
        });
      } catch (e) {
        console.warn(`[VectorStore:${this.collectionType}] HNSW search failed, falling back to brute force:`, e);
        index = null; // Fallback to brute force
      }
    }
    
    if (!index) {
      // Brute force cosine similarity search
      console.info(`[VectorStore:${this.collectionType}] Using brute force search...`);
      const allRecords = await this.db.getAll();
      console.info(`[VectorStore:${this.collectionType}] Total records in DB:`, allRecords.length);
      results = allRecords.map(r => ({
        id: r.id,
        distance: 1 - this.cosineSimilarity(embedding, r.embedding)
      })).sort((a, b) => a.distance - b.distance).slice(0, topK * 2);
      console.info(`[VectorStore:${this.collectionType}] Brute force search completed:`, {
        resultsCount: results.length,
        topResults: results.slice(0, 5).map(r => ({ id: r.id, distance: r.distance.toFixed(4) }))
      });
    }
    
    // 2. Filter by tags if provided
    let filteredIds = results.map(r => r.id);
    if (tags && tags.length > 0) {
      console.info(`[VectorStore:${this.collectionType}] Filtering by tags:`, tags);
      const records = await this.db.bulkGet(filteredIds);
      const beforeFilter = filteredIds.length;
      filteredIds = records
        .filter((r: VectorRecord | undefined): r is VectorRecord => {
          if (!r) return false;
          const itemTags = r.metadata?.tags || [];
          return tags.some(t => itemTags.includes(t));
        })
        .map(r => r.id);
      console.info(`[VectorStore:${this.collectionType}] Tag filtering completed:`, {
        beforeFilter,
        afterFilter: filteredIds.length
      });
    }

    // 3. Get topK results
    const topKIds = filteredIds.slice(0, topK);
    console.info(`[VectorStore:${this.collectionType}] Getting topK results:`, {
      topKIds,
      topKCount: topKIds.length
    });
    const records = await this.db.bulkGet(topKIds);
    const validRecords = records.filter((r): r is VectorRecord => r !== undefined);
    console.info(`[VectorStore:${this.collectionType}] Retrieved records:`, {
      requested: topKIds.length,
      found: validRecords.length,
      recordIds: validRecords.map(r => r.id)
    });

    // 4. Compute scores and return
    const finalResults = validRecords
      .map((r: VectorRecord) => {
        // Get similarity score from HNSW results
        const hnswResult = results.find((res: { id: string; distance: number }) => res.id === r.id);
        const score = hnswResult ? 1 - hnswResult.distance : this.cosineSimilarity(embedding, r.embedding);
        return {
          id: r.id,
          text: r.text,
          metadata: r.metadata,
          score
        };
      })
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    console.info(`[VectorStore:${this.collectionType}] Query completed:`, {
      finalResultsCount: finalResults.length,
      results: finalResults.map(r => ({
        id: r.id,
        score: r.score.toFixed(4),
        textLength: r.text.length,
        tags: r.metadata.tags
      }))
    });

    return finalResults;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Helper method for Note interface compatibility
  async upsertNote(note: Note, embedding: number[]): Promise<void> {
    await this.upsert(note.id, `${note.title}\n${note.content}`, embedding, {
      noteId: note.id,
      tags: note.tags,
      sourceUrl: note.sourceUrl,
      role: note.role
    });
  }

  // Helper method for FAQ interface compatibility
  async upsertFAQ(faq: { id: string; question: string; answer: string; tags?: string[] }, embedding: number[]): Promise<void> {
    await this.upsert(faq.id, `${faq.question}\n${faq.answer}`, embedding, {
      faqId: faq.id,
      tags: faq.tags || []
    });
  }
}
