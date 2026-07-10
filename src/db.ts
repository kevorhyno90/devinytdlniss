import Dexie, { type Table } from 'dexie';
import type { HistoryEntry } from './types';

export class AppDatabase extends Dexie {
  history!: Table<HistoryEntry, string>;

  constructor() {
    super('ytdlnis-db');
    this.version(1).stores({
      history: 'id, completedAt, type, title'
    });
  }
}

export const db = new AppDatabase();
