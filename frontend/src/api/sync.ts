import { db } from '../db';
import { fetchRemoteHistory, fetchRemoteTemplates, syncHistory, syncTemplates, getToken } from './client';

export async function runSync() {
  if (!getToken()) return;

  try {
    // 1. Pull remote history and update local DB
    const remoteHistory = await fetchRemoteHistory();
    if (remoteHistory && remoteHistory.length > 0) {
      await db.transaction('rw', db.history, async () => {
        for (const item of remoteHistory) {
          // parse format back if it's a string
          if (typeof item.format === 'string') {
            try {
              item.format = JSON.parse(item.format);
            } catch (e) {
              item.format = null;
            }
          }
          await db.history.put(item);
        }
      });
    }

    // 2. Push local history to remote
    const localHistory = await db.history.toArray();
    if (localHistory.length > 0) {
      await syncHistory(localHistory);
    }

    // 3. Pull remote templates
    const remoteTemplates = await fetchRemoteTemplates();
    if (remoteTemplates && remoteTemplates.length > 0) {
      await db.transaction('rw', db.templates, async () => {
        for (const item of remoteTemplates) {
          await db.templates.put(item);
        }
      });
    }

    // 4. Push local templates to remote
    const localTemplates = await db.templates.toArray();
    if (localTemplates.length > 0) {
      await syncTemplates(localTemplates);
    }
    
    console.log('Sync completed successfully.');
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// Start periodic sync
export function startPeriodicSync() {
  runSync(); // Run immediately on start
  setInterval(runSync, 60000); // Run every 60 seconds
}
