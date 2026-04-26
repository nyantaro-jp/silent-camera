// IndexedDB ラッパー。Step 4 で UI と繋ぐ前提だが、撮影直後の保存は Step 3 で既に動かす。

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface PhotoRecord {
  id: number;
  blob: Blob;
  width: number;
  height: number;
  takenAt: number; // epoch ms
  type: string; // mime
}

interface SilentCameraSchema extends DBSchema {
  photos: {
    key: number;
    value: Omit<PhotoRecord, 'id'> & { id?: number };
    indexes: { 'by-takenAt': number };
  };
}

const DB_NAME = 'silent-camera';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SilentCameraSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SilentCameraSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-takenAt', 'takenAt');
      },
    });
  }
  return dbPromise;
}

export async function savePhoto(input: {
  blob: Blob;
  width: number;
  height: number;
  takenAt: number;
}): Promise<number> {
  const db = await getDB();
  return await db.add('photos', {
    blob: input.blob,
    width: input.width,
    height: input.height,
    takenAt: input.takenAt,
    type: input.blob.type || 'image/jpeg',
  });
}

export async function listPhotos(): Promise<PhotoRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('photos', 'by-takenAt');
  // 新しい順に
  return all.reverse() as PhotoRecord[];
}

export async function getLatestPhoto(): Promise<PhotoRecord | null> {
  const db = await getDB();
  const tx = db.transaction('photos', 'readonly');
  const idx = tx.store.index('by-takenAt');
  const cursor = await idx.openCursor(null, 'prev');
  if (!cursor) return null;
  return cursor.value as PhotoRecord;
}

export async function deletePhoto(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('photos', id);
}

export async function estimateUsageBytes(): Promise<number | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage } = await navigator.storage.estimate();
  return usage ?? null;
}
