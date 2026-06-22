import { AuditSession, FixerState, SitePreferenceRecord } from '../../shared/types';
import { StorageDumpSchema, SitePreferenceRecordSchema, AuditSessionSchema } from '../../shared/schemas';
import { DEFAULT_FIXER_STATE } from '../../shared/constants';
import { StorageError } from '../../shared/errors';

export class StorageClient {
  public static async getDump(): Promise<{
    preferences: Record<string, SitePreferenceRecord>;
    history: AuditSession[];
    pinned: string[];
  }> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['preferences', 'history', 'pinned'], (result) => {
        const pinnedList = Array.isArray(result.pinned) ? (result.pinned as string[]) : [];
        try {
          const parsed = StorageDumpSchema.safeParse(result);
          if (parsed.success) {
            resolve({
              preferences: parsed.data.preferences,
              history: parsed.data.history,
              pinned: pinnedList
            });
          } else {
            console.warn('Storage validation failed, resolving fallbacks:', parsed.error.format());
            
            // Clean preferences domain-by-domain
            const rawPrefs = result.preferences && typeof result.preferences === 'object' ? result.preferences : {};
            const cleanPrefs: Record<string, SitePreferenceRecord> = {};
            for (const [domain, record] of Object.entries(rawPrefs)) {
              const recordParse = SitePreferenceRecordSchema.safeParse(record);
              if (recordParse.success) {
                cleanPrefs[domain] = recordParse.data;
              }
            }

            // Clean history session-by-session, dropping corrupted audits
            const rawHistory = Array.isArray(result.history) ? result.history : [];
            const cleanHistory: AuditSession[] = [];
            for (const session of rawHistory) {
              const sessionParse = AuditSessionSchema.safeParse(session);
              if (sessionParse.success) {
                cleanHistory.push(sessionParse.data);
              }
            }

            resolve({
              preferences: cleanPrefs,
              history: cleanHistory,
              pinned: pinnedList
            });
          }
        } catch {
          resolve({ preferences: {}, history: [], pinned: [] });
        }
      });
    });
  }

  public static async getPreferences(domain: string): Promise<FixerState> {
    const dump = await StorageClient.getDump();
    const record = dump.preferences[domain];
    if (record && record.state) {
      return record.state;
    }
    return { ...DEFAULT_FIXER_STATE, lastUpdatedAt: Date.now() };
  }

  public static async savePreferences(domain: string, state: FixerState): Promise<void> {
    const record: SitePreferenceRecord = {
      domain,
      state: {
        ...state,
        lastUpdatedAt: Date.now()
      },
      updatedAt: Date.now()
    };

    const dump = await StorageClient.getDump();
    dump.preferences[domain] = record;

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ preferences: dump.preferences }, () => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(chrome.runtime.lastError.message || 'Preferences write failed'));
        } else {
          resolve();
        }
      });
    });
  }

  public static async saveAuditSession(session: AuditSession): Promise<void> {
    const dump = await StorageClient.getDump();
    let history = dump.history;
    const pinned = dump.pinned;

    // Append session
    history.unshift(session); // Put new items at the beginning

    // prunes excess sessions under 50 limit
    if (history.length > 50) {
      const prunedHistory: AuditSession[] = [];
      let keptCount = 0;

      for (const item of history) {
        const isPinned = pinned.includes(item.id);
        if (isPinned || keptCount < 50) {
          prunedHistory.push(item);
          if (!isPinned) keptCount++;
        }
      }
      history = prunedHistory;
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ history }, () => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(chrome.runtime.lastError.message || 'History save failed'));
        } else {
          resolve();
        }
      });
    });
  }

  public static async deleteAuditSession(id: string): Promise<void> {
    const dump = await StorageClient.getDump();
    const history = dump.history.filter(s => s.id !== id);
    const pinned = dump.pinned.filter(pId => pId !== id);

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ history, pinned }, () => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(chrome.runtime.lastError.message || 'Deletion failed'));
        } else {
          resolve();
        }
      });
    });
  }

  public static async pinAuditSession(id: string, isPinned: boolean): Promise<void> {
    const dump = await StorageClient.getDump();
    let pinned = dump.pinned;

    if (isPinned) {
      if (!pinned.includes(id)) pinned.push(id);
    } else {
      pinned = pinned.filter(pId => pId !== id);
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ pinned }, () => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(chrome.runtime.lastError.message || 'Pinning update failed'));
        } else {
          resolve();
        }
      });
    });
  }
}
