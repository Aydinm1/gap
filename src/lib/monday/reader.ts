export type MondayConfig = { token: string; account: string; board: string; email: string; checkbox: string; cohort: string; status: string };
export type MondayRow = { id: string; name: string; email: string; cohortKey: string; cohortLabel: string; status: string; checked: boolean; issue: string };

export function mondayConfig(env: Record<string, string | undefined>): MondayConfig {
  const current = env.MONDAY_MEMBERS_BOARD_ID?.trim();
  const legacy = env.MONDAY_APPLICANTS_BOARD_ID?.trim();
  if (current && legacy && current !== legacy) throw new Error('Conflicting Monday board settings.');
  const config = { token: env.MONDAY_API_TOKEN?.trim(), account: env.MONDAY_ACCOUNT_ID?.trim(), board: current || legacy,
    email: env.MONDAY_EMAIL_COLUMN_ID?.trim(), checkbox: env.MONDAY_ENROLL_IN_GAP_COLUMN_ID?.trim(),
    cohort: env.MONDAY_COHORT_COLUMN_ID?.trim(), status: env.MONDAY_MEMBER_STATUS_COLUMN_ID?.trim() };
  if (Object.values(config).some(value => !value)) throw new Error('Monday configuration is incomplete. Ask a GAP administrator to configure the server.');
  return config as MondayConfig;
}

type ColumnValue = { id: string; text: string | null; value: string | null };
type Item = { id: string; name: string; column_values: ColumnValue[] };
export function normalizeItem(item: Item, config: MondayConfig): MondayRow {
  const column = (id: string) => item.column_values.find(c => c.id === id);
  const parse = (id: string) => JSON.parse(column(id)?.value || 'null');
  const checkbox = parse(config.checkbox);
  const cohort = parse(config.cohort);
  const ids: unknown[] = Array.isArray(cohort?.ids) ? cohort.ids : [];
  const email = (column(config.email)?.text || '').trim().toLowerCase();
  const name = item.name.trim();
  return { id: item.id, name, email, checked: checkbox?.checked === true || checkbox?.checked === 'true',
    cohortKey: ids.length === 1 ? String(ids[0]) : '', cohortLabel: column(config.cohort)?.text || '',
    status: column(config.status)?.text || '',
    issue: !name ? 'Name is missing.' : !/^[^\s@]+@ucdavis\.edu$/.test(email) ? 'A valid UC Davis email is required.' : ids.length !== 1 ? 'Select exactly one Monday cohort.' : '' };
}

export async function readMonday(config: MondayConfig, transport: typeof fetch = fetch) {
  async function query(query: string, variables: Record<string, unknown>) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await transport('https://api.monday.com/v2', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
          headers: { Authorization: config.token, 'Content-Type': 'application/json', 'API-Version': '2026-04' }, body: JSON.stringify({ query, variables }) });
      } catch {
        if (attempt === 2) throw new Error('Monday is unavailable. Retry the preview; nothing was enrolled.');
        await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt)); continue;
      }
      const body = await response.json().catch(() => null);
      const retryable = response.status === 429 || response.status >= 500 || body?.errors?.some((e: { extensions?: { code?: string } }) => /RATE_LIMIT|COMPLEXITY|TEMPORARILY_BLOCKED/.test(e.extensions?.code || ''));
      if (retryable && attempt < 2) {
        const seconds = Number(response.headers.get('retry-after'));
        if (seconds > 10) throw new Error('Monday is rate-limited. Wait and try again.');
        await new Promise(resolve => setTimeout(resolve, Math.max(500 * 2 ** attempt, Number.isFinite(seconds) ? seconds * 1000 : 0))); continue;
      }
      if (!response.ok || body?.errors?.length || !body?.data) throw new Error('Monday could not complete the read. Check access and try again.');
      return body.data;
    }
    throw new Error('Monday is unavailable.');
  }
  const fields = 'id name column_values(ids:$columns){id text value}';
  const variables = { boards: [config.board], columns: [config.email, config.checkbox, config.cohort, config.status] };
  const first = await query(`query($boards:[ID!]!,$columns:[String!]){account{id} boards(ids:$boards){id name columns{id type} items_page(limit:100){cursor items{${fields}}}}}`, variables);
  const board = first.boards?.[0];
  if (String(first.account?.id) !== config.account || !board || String(board.id) !== config.board) throw new Error('Monday account or board does not match configuration.');
  for (const [id, type] of [[config.email, 'text'], [config.checkbox, 'checkbox'], [config.cohort, 'dropdown'], [config.status, 'status']]) {
    if (!board.columns.some((c: { id: string; type: string }) => c.id === id && c.type === type)) throw new Error('Monday column configuration has changed. Review the board mapping.');
  }
  const items: Item[] = [...board.items_page.items];
  const seen = new Set<string>();
  let cursor = board.items_page.cursor;
  while (cursor) {
    if (seen.has(cursor) || seen.size >= 100) throw new Error('Monday pagination could not finish. No preview was created.');
    seen.add(cursor);
    const page = await query(`query($cursor:String!,$columns:[String!]){next_items_page(limit:100,cursor:$cursor){cursor items{${fields}}}}`, { cursor, columns: variables.columns });
    items.push(...page.next_items_page.items); cursor = page.next_items_page.cursor;
  }
  if (new Set(items.map(i => i.id)).size !== items.length) throw new Error('Monday changed during pagination. Reload the preview.');
  return { boardName: board.name as string, rows: items.map(i => normalizeItem(i, config)).filter(i => i.checked) };
}
