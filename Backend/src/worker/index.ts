// Scanner job worker. Assessments are queued (not run inline in HTTP
// handlers) and picked up here. A simple polling/in-process worker is
// enough for Round 1 — no Kafka/Redis required.
export {};
