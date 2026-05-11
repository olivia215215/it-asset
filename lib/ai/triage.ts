export interface TriageResult {
  category: "hardware" | "software" | "user_error";
  severity: "high" | "medium" | "low";
  needRepair: boolean;
  reason: string;
  selfHelp: string | null;
}

export function enforceTriageRules(result: TriageResult): TriageResult {
  const enforced: TriageResult = { ...result };

  // severity=high → needRepair 强制 true
  if (enforced.severity === "high") {
    enforced.needRepair = true;
  }

  // needRepair=true → selfHelp = null
  if (enforced.needRepair) {
    enforced.selfHelp = null;
  }

  // needRepair=false 且无 selfHelp → 兜底文案
  if (!enforced.needRepair && !enforced.selfHelp) {
    enforced.selfHelp =
      "请尝试重启设备，如问题持续请联系IT支持。";
  }

  return enforced;
}
