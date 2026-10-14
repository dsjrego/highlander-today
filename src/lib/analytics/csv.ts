export function csvCell(value: unknown) {
  const raw = String(value ?? "");
  // Quoting alone does not prevent spreadsheet formula execution.
  return `"${(/^[\s]*[=+@\-\t\r]/.test(raw) ? "'" : "") + raw.replace(/"/g, '""')}"`;
}
