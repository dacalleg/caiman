import { Injectable } from '@angular/core';
import { ProductModel, SeramiEntry } from '../classes/interfaces';

const DB_NAME = 'caiman';
const DB_VERSION = 1;

interface ProductRecord {
  id: string;
  product: ProductModel;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.openDb();
  }

  saveProduct(productKey: string, lang: string, product: ProductModel): Promise<void> {
    return this.put('products', {
      id: this.productCacheId(productKey, lang),
      product,
    });
  }

  getProduct(productKey: string, lang: string): Promise<ProductModel | null> {
    return this.get<ProductRecord>('products', this.productCacheId(productKey, lang)).then(
      record => record?.product ?? null
    );
  }

  saveSerami(key: string, entry: SeramiEntry): Promise<void> {
    return this.put('serami', { key, entry });
  }

  getSerami(key: string): Promise<SeramiEntry | null> {
    return this.get<{ key: string; entry: SeramiEntry }>('serami', key).then(
      record => record?.entry ?? null
    );
  }

  private productCacheId(productKey: string, lang: string): string {
    return `${productKey}:${lang}`;
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('serami')) {
          db.createObjectStore('serami', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private put<T>(storeName: string, value: T): Promise<void> {
    return this.dbPromise.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }));
  }

  private get<T>(storeName: string, key: string): Promise<T | null> {
    return this.dbPromise.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
    }));
  }
}
