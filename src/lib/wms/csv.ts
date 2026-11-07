/** Downloads a CSV that Excel opens correctly (UTF-8 BOM, quoted cells). Runs in the browser only. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const quote = (cell: string | number | null | undefined) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const body = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
