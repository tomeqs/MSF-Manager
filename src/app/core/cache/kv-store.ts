import { Injectable } from '@angular/core';

const DB_NAME = 'msf-assistant';
const STORE = 'cache';

/**
 * Minimal async key-value store on IndexedDB (payloads like the character list are too
 * large for localStorage). Falls back to memory when IndexedDB is unavailable.
 */
@Injectable({ providedIn: 'root' })
export class KvStore {
  private readonly memory = new Map<string, unknown>();
  private db: Promise<IDBDatabase | null> | null = null;

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.open();
    if (!db) return this.memory.get(key) as T | undefined;
    return this.request<T>(db, 'readonly', (s) => s.get(key)).catch(() => undefined);
  }

  async set(key: string, value: unknown): Promise<void> {
    const db = await this.open();
    if (!db) {
      this.memory.set(key, value);
      return;
    }
    await this.request(db, 'readwrite', (s) => s.put(value, key)).catch(() => undefined);
  }

  /** Deletes every key starting with `prefix`. */
  async deletePrefix(prefix: string): Promise<void> {
    const db = await this.open();
    if (!db) {
      for (const key of [...this.memory.keys()]) {
        if (key.startsWith(prefix)) this.memory.delete(key);
      }
      return;
    }
    const range = IDBKeyRange.bound(prefix, prefix + String.fromCharCode(0xffff));
    await this.request(db, 'readwrite', (s) => s.delete(range)).catch(() => undefined);
  }

  private open(): Promise<IDBDatabase | null> {
    this.db ??= new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.db;
  }

  private request<T>(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }
}
