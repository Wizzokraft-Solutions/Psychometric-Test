// Export arrays of plain objects as an .xlsx download (one sheet per entry).
// xlsx is loaded lazily so it isn't in the initial bundle.
export async function exportSheets(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  fileName: string,
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.name.slice(0, 31))
  }
  XLSX.writeFile(wb, fileName)
}

export function exportRows(rows: Record<string, unknown>[], sheetName: string, fileName: string) {
  return exportSheets([{ name: sheetName, rows }], fileName)
}
