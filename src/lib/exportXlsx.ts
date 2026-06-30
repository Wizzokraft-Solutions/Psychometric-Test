// Export an array of plain objects as a single-sheet .xlsx download.
// xlsx is loaded lazily so it isn't in the initial bundle.
export async function exportRows(
  rows: Record<string, unknown>[],
  sheetName: string,
  fileName: string,
) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, fileName)
}
