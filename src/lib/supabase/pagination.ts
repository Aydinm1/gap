/** Fetch every page; callers must supply a deterministic order ending in a unique ID. */
export async function readPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const data: T[] = [];
  const size = 100;
  for (let from = 0; ; from += size) {
    const page = await fetchPage(from, from + size - 1);
    if (page.error || !page.data) throw new Error('GAP data could not be loaded. Please try again.');
    data.push(...page.data);
    if (page.data.length < size) return { data };
  }
}
