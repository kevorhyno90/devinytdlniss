import Dexie, { type Table } from 'dexie';
import type { HistoryEntry, CommandTemplate } from '../types';

class YTDLnisDB extends Dexie {
  history!: Table<HistoryEntry, string>;
  templates!: Table<CommandTemplate, string>;

  constructor() {
    super('ytdlnis');

    this.version(1).stores({
      history: 'id, completedAt, type, title',
      templates: 'id, name, createdAt'
    });
  }
}

export const db = new YTDLnisDB();
