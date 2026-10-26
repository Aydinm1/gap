export async function cleanupGradingExamples(db, owner) {
  let removed = 0, failed = 0;
  for (let batch = 0; batch < 100; batch++) {
    const { data, error } = await db.rpc('cleanup_grading_examples', { p_owner: owner });
    if (error) throw new Error('Could not claim abandoned example PDFs.');
    if (!data.length) break;
    for (const d of data) {
      let deletionFailed = true;
      try { deletionFailed = Boolean((await db.storage.from('grading-examples').remove([d.path])).error); } catch { /* Claim retains failure. */ }
      let receiptFailed = true;
      try { receiptFailed = Boolean((await db.rpc('cleanup_grading_examples', { p_owner: owner, p_id: d.id, p_failed: deletionFailed })).error); } catch { /* Retry after lease. */ }
      if (deletionFailed || receiptFailed) failed++; else removed++;
    }
  }
  return { removed, failed };
}
