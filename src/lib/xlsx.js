/**
 * Styled Excel (.xlsx) templates + reading them back, via ExcelJS.
 * ExcelJS is large, so it's loaded only when a file is generated or read.
 * Colours come from index.css so sheets match the web app.
 */
import { excelColor } from './theme'

const loadExcel = async () => (await import('exceljs')).default

/**
 * columns: [{ key, header, width?, required?, numFmt?, list?: string[], note? }]
 *   list → in-cell dropdown for that column; note → hover comment on the header.
 * rows: data objects keyed by column key.
 * blankRows: extra empty, styled input rows after the data (for templates).
 * instructions: [[label, text], …] → an "Instructions" sheet.
 */
export async function buildWorkbook({ sheetName, columns, rows = [], blankRows = 0, instructions }) {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Nirog Pharma'
  wb.created = new Date()

  const c = {
    required: excelColor('--green-deep'),
    optional: excelColor('--mint'),
    input: excelColor('--bg'),
    border: excelColor('--mint'),
    white: excelColor('--white'),
    ink: excelColor('--forest'),
    text: excelColor('--text'),
  }
  const border = { style: 'thin', color: { argb: c.border } }
  const borders = { top: border, left: border, bottom: border, right: border }

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
    properties: { defaultRowHeight: 20 },
  })
  ws.columns = columns.map((col) => ({ key: col.key, width: col.width ?? Math.max(12, col.header.length + 4) }))

  // Header row: required = deep green / white, optional = mint / forest.
  const header = ws.getRow(1)
  header.height = 24
  columns.forEach((col, i) => {
    const cell = header.getCell(i + 1)
    cell.value = col.header
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: col.required ? c.white : c.ink } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.required ? c.required : c.optional } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = borders
    if (col.note) cell.note = col.note
  })

  // Data + blank input rows share the input style.
  const total = rows.length + blankRows
  for (let r = 0; r < total; r++) {
    const row = ws.getRow(r + 2)
    row.height = 20
    const data = rows[r]
    columns.forEach((col, i) => {
      const cell = row.getCell(i + 1)
      if (data) cell.value = data[col.key] === '' || data[col.key] === undefined ? null : data[col.key]
      cell.font = { name: 'Arial', size: 10, color: { argb: c.text } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.input } }
      cell.alignment = { vertical: 'middle' }
      cell.border = borders
      if (col.numFmt) cell.numFmt = col.numFmt
    })
  }

  // Dropdowns for constrained columns, over the whole input area.
  const lastRow = Math.max(total + 1, 2)
  columns.forEach((col, i) => {
    if (!col.list) return
    const letter = ws.getColumn(i + 1).letter
    for (let r = 2; r <= lastRow; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: !col.required,
        formulae: [`"${col.list.join(',')}"`],
        showErrorMessage: true,
        errorTitle: col.header,
        error: `Choose one of: ${col.list.join(', ')}`,
      }
    }
  })

  if (instructions?.length) {
    const info = wb.addWorksheet('Instructions', { views: [{ showGridLines: false }] })
    info.columns = [{ width: 26 }, { width: 90 }]
    instructions.forEach(([label, text], i) => {
      const row = info.getRow(i + 1)
      row.getCell(1).value = label
      row.getCell(2).value = text
      row.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: i === 0 ? c.white : c.ink } }
      row.getCell(2).font = { name: 'Arial', size: 10, bold: i === 0, color: { argb: i === 0 ? c.white : c.text } }
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(1).alignment = { vertical: 'top' }
      if (i === 0) {
        row.height = 24
        ;[1, 2].forEach((n) => {
          row.getCell(n).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.required } }
          row.getCell(n).alignment = { vertical: 'middle', wrapText: true }
        })
      }
    })
  }

  return wb
}

export async function downloadWorkbook(filename, workbook) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Plain value of an ExcelJS cell (rich text, formula results, hyperlinks, dates). */
function cellValue(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value
  if (typeof value === 'object') {
    if ('result' in value) return cellValue(value.result)
    if ('richText' in value) return value.richText.map((part) => part.text).join('')
    if ('text' in value) return value.text
    return ''
  }
  return value
}

/**
 * First worksheet of an .xlsx → [{ header(lower-cased): value }].
 * Empty rows are dropped. Numbers stay numbers, dates stay Date objects.
 */
export async function readWorkbookRows(file) {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) return []

  const headers = []
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cellValue(cell.value)).trim().toLowerCase()
  })

  const rows = []
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const record = { __line: rowNumber }
    let hasValue = false
    headers.forEach((key, col) => {
      if (!key) return
      const v = cellValue(row.getCell(col).value)
      const clean = typeof v === 'string' ? v.trim() : v
      if (clean !== '' && clean !== null) hasValue = true
      record[key] = clean
    })
    if (hasValue) rows.push(record)
  })
  return rows
}
