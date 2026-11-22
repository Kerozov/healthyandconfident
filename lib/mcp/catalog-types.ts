export type McpSignature = {
  params: { name: string; type: string; optional: boolean }[];
  returns: string;
  doc: string;
  /** Одитното описание от кода на действието (каквото пише в „Профили и промени“). */
  summary: string;
  /** Видът действие от одита: send, delete, publish, update… */
  auditAction: string;
};
