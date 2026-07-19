// IndexedDB ラッパー。写真と動画を同じ 'photos' ストアに保存する。
// (ストア名は互換維持のため 'photos' のまま。IndexedDB はスキーマレスなので
//  フィールド追加に DB バージョン上げは不要)

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type MediaKind = 'photo' | 'video';

export interface MediaRecord {
  id: number;
  blob: Blob;
  width: number;
  height: number;
  takenAt: number; // epoch ms
  type: string; // mime
  /** 旧レコードには無いので読み出し時に 'photo' へ正規化する */
  kind: MediaKind;
  /** video のみ: 再生時間 */
  durationMs?: number;
  /** video のみ: サムネイル用の静止画 (録画開始時のフレーム) */
  poster?: Blob;
}

/** 旧バージョンで保存されたレコードは kind が無い */
type StoredRecord = Omit<MediaRecord, 'id' | 'kind'> & { id?: number; kind?: MediaKind };

interface SilentCameraSchema extends DBSchema {
  photos: {
    key: number;
    value: StoredRecord;
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

function normalize(v: StoredRecord): MediaRecord {
  return { ...(v as MediaRecord), kind: v.kind ?? 'photo' };
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
    kind: 'photo',
  });
}

export async function saveVideo(input: {
  blob: Blob;
  width: number;
  height: number;
  takenAt: number;
  durationMs: number;
  poster: Blob;
}): Promise<number> {
  const db = await getDB();
  return await db.add('photos', {
    blob: input.blob,
    width: input.width,
    height: input.height,
    takenAt: input.takenAt,
    type: input.blob.type || 'video/mp4',
    kind: 'video',
    durationMs: input.durationMs,
    poster: input.poster,
  });
}

export async function listMedia(): Promise<MediaRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('photos', 'by-takenAt');
  // 新しい順に
  return all.reverse().map(normalize);
}

export async function getLatestMedia(): Promise<MediaRecord | null> {
  const db = await getDB();
  const tx = db.transaction('photos', 'readonly');
  const idx = tx.store.index('by-takenAt');
  const cursor = await idx.openCursor(null, 'prev');
  if (!cursor) return null;
  return normalize(cursor.value);
}

export async function deleteMedia(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('photos', id);
}

export async function estimateUsageBytes(): Promise<number | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage } = await navigator.storage.estimate();
  return usage ?? null;
}
