import { Injectable } from '@angular/core';
import { Board, Gateway, Info, ProductModel, SeramiEntry } from '../classes/interfaces';

const DB_NAME = 'caiman';
const DB_VERSION = 2;

const SYNC_META_KEY = 'global';
const INFO_KEY = 'global';

interface ProductRecord {
  id: string;
  product: ProductModel;
}

interface BoardRecord {
  id: number;
  board: Board;
}

interface GatewayRecord {
  id: string;
  gateway: Gateway;
}

interface ModelsRecord {
  lang: string;
  models: { name: string; key: string }[];
}

interface SyncMetaRecord {
  id: string;
  lastSyncAt: number;
  lastFullSyncAt: number;
}

interface DeferredRequestRecord {
  id: string;
  url: string;
  body: unknown;
}

interface ImageRecord {
  url: string;
  blob: Blob;
}

interface InfoRecord {
  id: string;
  info: Info;
}

interface SeramiRecord {
  key: string;
  entry: SeramiEntry;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.openDb();
  }

  saveProduct(productKey: string, lang: string, product: ProductModel, gatewayType?: string): Promise<void> {
    return this.put('products', {
      id: this.productCacheId(productKey, lang, gatewayType),
      product,
    });
  }

  async getProduct(productKey: string, lang: string, gatewayType?: string): Promise<ProductModel | null> {
    const cacheId = gatewayType
      ? this.productCacheId(productKey, lang, gatewayType)
      : this.productCacheId(productKey, lang);
    let record = await this.get<ProductRecord>('products', cacheId);

    if (!record?.product && gatewayType) {
      record = await this.get<ProductRecord>('products', this.productCacheId(productKey, lang));
    }

    if (!record?.product) {
      return null;
    }

    const product = { ...record.product };
    if (product.image) {
      const blobUrl = await this.getImageBlobUrl(product.image);
      if (blobUrl) {
        product.image = blobUrl;
      }
    }
    return product;
  }

  saveSerami(key: string, entry: SeramiEntry): Promise<void> {
    return this.put('serami', { key, entry });
  }

  getSerami(key: string): Promise<SeramiEntry | null> {
    return this.get<SeramiRecord>('serami', key).then(
      record => record?.entry ?? null
    );
  }

  saveBoard(boardId: number, board: Board): Promise<void> {
    return this.put('boards', { id: boardId, board });
  }

  getBoard(boardId: number): Promise<Board | null> {
    return this.get<BoardRecord>('boards', boardId).then(
      record => record?.board ?? null
    );
  }

  saveAllBoards(boards: { id: number; board: Board }[]): Promise<void> {
    return this.putAll('boards', boards.map(item => ({ id: item.id, board: item.board })));
  }

  saveGateway(boardId: number, type: string, gateway: Gateway): Promise<void> {
    return this.put('gateways', {
      id: this.gatewayCacheId(boardId, type),
      gateway,
    });
  }

  getGateway(boardId: number, type: string): Promise<Gateway | null> {
    return this.get<GatewayRecord>('gateways', this.gatewayCacheId(boardId, type)).then(
      record => record?.gateway ?? null
    );
  }

  getGatewaysByBoard(boardId: number): Promise<Gateway[]> {
    return this.getAll<GatewayRecord>('gateways').then(records =>
      records
        .filter(record => record.gateway.board === boardId)
        .map(record => record.gateway)
    );
  }

  saveAllGateways(gateways: Gateway[]): Promise<void> {
    return this.putAll(
      'gateways',
      gateways.map(gateway => ({
        id: this.gatewayCacheId(gateway.board, gateway.type),
        gateway,
      }))
    );
  }

  saveModels(lang: string, models: { name: string; key: string }[]): Promise<void> {
    return this.put('models', { lang, models });
  }

  getModels(lang: string): Promise<{ name: string; key: string }[]> {
    return this.get<ModelsRecord>('models', lang).then(
      record => record?.models ?? []
    );
  }

  saveSyncMeta(meta: { lastSyncAt: number; lastFullSyncAt: number }): Promise<void> {
    return this.put('syncMeta', { id: SYNC_META_KEY, ...meta });
  }

  getSyncMeta(): Promise<{ lastSyncAt: number; lastFullSyncAt: number } | null> {
    return this.get<SyncMetaRecord>('syncMeta', SYNC_META_KEY).then(record => {
      if (!record) {
        return null;
      }
      return {
        lastSyncAt: record.lastSyncAt,
        lastFullSyncAt: record.lastFullSyncAt,
      };
    });
  }

  saveDeferredRequest(request: { id: string; url: string; body: unknown }): Promise<void> {
    return this.put('deferredRequests', request);
  }

  getDeferredRequests(): Promise<{ id: string; url: string; body: unknown }[]> {
    return this.getAll<DeferredRequestRecord>('deferredRequests');
  }

  removeDeferredRequest(id: string): Promise<void> {
    return this.delete('deferredRequests', id);
  }

  saveImage(url: string, blob: Blob): Promise<void> {
    return this.put('images', { url, blob });
  }

  getImageBlobUrl(url: string): Promise<string | null> {
    return this.get<ImageRecord>('images', url).then(record => {
      if (!record?.blob) {
        return null;
      }
      return URL.createObjectURL(record.blob);
    });
  }

  saveInfo(info: Info): Promise<void> {
    return this.put('info', { id: INFO_KEY, info });
  }

  async getInfo(): Promise<Info | null> {
    const record = await this.get<InfoRecord>('info', INFO_KEY);
    if (!record?.info) {
      return null;
    }

    const info = { ...record.info };
    if (info.logo) {
      const blobUrl = await this.getImageBlobUrl(info.logo);
      if (blobUrl) {
        info.logo = blobUrl;
      }
    }
    return info;
  }

  clearAll(): Promise<void> {
    const storeNames = [
      'products',
      'serami',
      'boards',
      'gateways',
      'models',
      'syncMeta',
      'deferredRequests',
      'images',
      'info',
    ];
    return this.dbPromise.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const storeName of storeNames) {
        transaction.objectStore(storeName).clear();
      }
    }));
  }

  getBoardBySeramiKey(seramiKey: string): Promise<Board | null> {
    return this.getAll<BoardRecord>('boards').then(records =>
      records.find(record => record.board.key === seramiKey)?.board ?? null
    );
  }

  private productCacheId(productKey: string, lang: string, gatewayType?: string): string {
    if (gatewayType) {
      return `${productKey}:${lang}:${gatewayType}`;
    }
    return `${productKey}:${lang}`;
  }

  private gatewayCacheId(boardId: number, type: string): string {
    return `${boardId}:${type}`;
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        const stores = [
          'products',
          'serami',
          'boards',
          'gateways',
          'models',
          'syncMeta',
          'deferredRequests',
          'images',
          'info',
        ];

        for (const storeName of stores) {
          if (!db.objectStoreNames.contains(storeName)) {
            if (storeName === 'boards') {
              db.createObjectStore('boards', { keyPath: 'id' });
            } else if (storeName === 'gateways') {
              db.createObjectStore('gateways', { keyPath: 'id' });
            } else if (storeName === 'models') {
              db.createObjectStore('models', { keyPath: 'lang' });
            } else if (storeName === 'syncMeta' || storeName === 'info') {
              db.createObjectStore(storeName, { keyPath: 'id' });
            } else if (storeName === 'deferredRequests') {
              db.createObjectStore('deferredRequests', { keyPath: 'id' });
            } else if (storeName === 'images') {
              db.createObjectStore('images', { keyPath: 'url' });
            } else if (storeName === 'products') {
              db.createObjectStore('products', { keyPath: 'id' });
            } else if (storeName === 'serami') {
              db.createObjectStore('serami', { keyPath: 'key' });
            }
          }
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

  private putAll<T>(storeName: string, values: T[]): Promise<void> {
    return this.dbPromise.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const value of values) {
        store.put(value);
      }
    }));
  }

  private get<T>(storeName: string, key: string | number): Promise<T | null> {
    return this.dbPromise.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
    }));
  }

  private getAll<T>(storeName: string): Promise<T[]> {
    return this.dbPromise.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result as T[]) ?? []);
      request.onerror = () => reject(request.error);
    }));
  }

  private delete(storeName: string, key: string): Promise<void> {
    return this.dbPromise.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }));
  }
}
