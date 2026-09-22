# ADR 0008 — Manual accepted-member intake

Status: Accepted (2026-09-22)

The club automation owns recruitment. GAP reads the accepted-members board; presence
establishes acceptance and the checkbox requests enrollment. This supersedes ADR 0005's
applicant/Accepted-status intake assumption, not its explicit approval or history rules.

Admins preview, map cohorts, and confirm. Status is informational. One item represents
one cohort participation; returning members require new items, preserving immutable links.

Private owner-scoped batches expire after 15 minutes and store per-item atomic receipts.
Service-only RPCs repeat current admin authorization and ownership checks. Confirmation
re-reads Monday and rejects changed enrollment fields. A cross-system race remains:
Monday can change after its last read; approval is verified at read time, not continuously.

No Monday writes, background processing, or automatic revocation. Outbound reporting
and audit-retention automation remain separate work.
