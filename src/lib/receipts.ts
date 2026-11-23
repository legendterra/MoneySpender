import type { SupabaseClient } from "@supabase/supabase-js";

export const RECEIPTS_BUCKET = "receipts";
const PAGE = 1000;

type StorageEntry = { name: string; id: string | null };

/**
 * Deletes every object under `<userId>/` in the receipts bucket (the storage
 * policies scope uploads to that folder). Folders are listed recursively.
 * Returns the number of removed files; throws naming the bucket on failure.
 */
export async function deleteUserReceipts(admin: SupabaseClient, userId: string): Promise<number> {
  const bucket = admin.storage.from(RECEIPTS_BUCKET);
  const files: string[] = [];
  const folders = [userId];

  while (folders.length) {
    const folder = folders.pop()!;
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await bucket.list(folder, { limit: PAGE, offset });
      if (error) throw new Error(`Supabase storage list on "${RECEIPTS_BUCKET}/${folder}" failed: ${error.message}`);
      const entries = (data ?? []) as StorageEntry[];
      for (const entry of entries) {
        const path = `${folder}/${entry.name}`;
        // Storage returns folders as entries without an id.
        if (entry.id === null) folders.push(path);
        else files.push(path);
      }
      if (entries.length < PAGE) break;
    }
  }

  for (let index = 0; index < files.length; index += PAGE) {
    const { error } = await bucket.remove(files.slice(index, index + PAGE));
    if (error) throw new Error(`Supabase storage remove on "${RECEIPTS_BUCKET}" failed: ${error.message}`);
  }
  return files.length;
}
