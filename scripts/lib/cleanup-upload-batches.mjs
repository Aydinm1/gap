// Shared by the local command and failure-injection tests; credentials stay in caller.
export async function cleanupUploadBatches(db, owner) {
  let removed = 0, failed = 0;
  // Bound each invocation so large ledgers cannot revisit their own five-minute lease.
  for (let batch = 0; batch < 100; batch++) {
    const { data, error } = await db.rpc('cleanup_uploads', { p_owner: owner });
    if (error) throw new Error('Could not claim expired uploads.');
    if (!data.length) break;
    for (const intent of data) {
      let removalFailed = true;
      try { removalFailed = Boolean((await db.storage.from('submissions').remove([intent.path])).error); }
      catch { /* The claim already records failure, so even network loss is retryable. */ }
      let receiptFailed = true;
      try { receiptFailed = Boolean((await db.rpc('cleanup_uploads', { p_id: intent.id, p_failed: removalFailed, p_owner: owner })).error); }
      catch { /* Preserve the failed claim for the next run. */ }
      if (removalFailed || receiptFailed) failed++; else removed++;
    }
  }
  return { removed, failed };
}
