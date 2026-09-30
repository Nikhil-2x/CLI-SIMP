export type Exploitability = "LOW" | "MEDIUM" | "HIGH";
export type Priority = "P0" | "P1" | "P2" | "P3";

export interface RiskInput {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  confidence: number; // 0-100
  exploitability: Exploitability;
  internetExposed: boolean;
  sensitiveData: boolean;
}

export interface RiskOutput {
  riskScore: number; // 0-100
  priority: Priority;
}
