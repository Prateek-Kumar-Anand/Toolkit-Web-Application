/* ============================================================
   MODULE 3: EXCEL CLEANER
   Client-side spreadsheet cleanup using SheetJS (xlsx.full.min.js,
   already loaded in index.html). Reads .xlsx/.xls/.csv, lets the
   user toggle cleaning options with a live preview, and exports
   the cleaned result as .xlsx or .csv.

   Cleaning pipeline (each step optional, applied in this order to
   a fresh copy of the raw data every time an option is toggled):
     1. Trim stray whitespace in every cell
     2. Remove columns that are blank across the entire sheet
     3. Normalize the header row (trim/collapse spaces, dedupe names)
     4. Remove blank rows (row 0 / header is always kept)
     5. Remove duplicate rows (row 0 / header is always kept)
   ============================================================ */

let excelWorkbook = null;   // parsed SheetJS workbook
let excelRawData = [];      // 2D array (array-of-arrays) for the active sheet
let excelCleanedData = [];  // result of the cleaning pipeline, kept for download

document.getElementById('excelOpenInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  await loadExcelFile(file);
  e.target.value = '';
});

async function loadExcelFile(file){
  setExcelStatus('Loading ' + file.name + '...');
  try{
    const arrayBuffer = await file.arrayBuffer();
    excelWorkbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetGrp = document.getElementById('excelSheetGrp');
    const select = document.getElementById('excelSheetSelect');
    select.innerHTML = '';
    excelWorkbook.SheetNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    sheetGrp.style.display = excelWorkbook.SheetNames.length > 1 ? 'flex' : 'none';

    loadActiveSheet();

    document.getElementById('excelEmptyState').style.display = 'none';
    document.getElementById('excelLayout').style.display = 'grid';
    document.getElementById('excelDownloadBtn').disabled = false;
  } catch(err){
    alert('Could not read that spreadsheet: ' + err.message);
    console.error(err);
    setExcelStatus('Could not read that file.');
  }
}

function onExcelSheetChange(){
  loadActiveSheet();
}

function loadActiveSheet(){
  const select = document.getElementById('excelSheetSelect');
  const sheetName = select.value || excelWorkbook.SheetNames[0];
  const sheet = excelWorkbook.Sheets[sheetName];
  // header:1 => array-of-arrays; defval:'' fills in gaps so every row is
  // the same length, which the cleaning steps below rely on.
  excelRawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  runExcelClean();
}

/* ---------------- Cleaning pipeline ---------------- */

function cellIsBlank(cell){
  return cell === null || cell === undefined || cell.toString().trim() === '';
}

function normalizeHeaderRow(row){
  const seen = {};
  return row.map(cell => {
    let h = cellIsBlank(cell) ? '' : cell.toString().trim().replace(/\s+/g, ' ');
    if(h === '') h = 'Column';
    if(seen[h] !== undefined){
      seen[h]++;
      h = h + '_' + seen[h];
    } else {
      seen[h] = 0;
    }
    return h;
  });
}

function runExcelClean(){
  if(!excelRawData || excelRawData.length === 0) return;

  const optTrim = document.getElementById('optTrim').checked;
  const optBlankCols = document.getElementById('optBlankCols').checked;
  const optHeaders = document.getElementById('optHeaders').checked;
  const optBlankRows = document.getElementById('optBlankRows').checked;
  const optDedupe = document.getElementById('optDedupe').checked;

  // Work on a deep copy so the original parsed data is never mutated —
  // toggling an option off always recovers the original cell values.
  let rows = excelRawData.map(row => row.slice());
  const originalRowCount = rows.length;
  const originalColCount = rows.reduce((max, r) => Math.max(max, r.length), 0);

  if(optTrim){
    rows = rows.map(row => row.map(cell => cellIsBlank(cell) ? '' : cell.toString().trim()));
  }

  let removedCols = 0;
  if(optBlankCols && rows.length > 0){
    const colCount = rows.reduce((max, r) => Math.max(max, r.length), 0);
    const keepCols = [];
    for(let c = 0; c < colCount; c++){
      const allBlank = rows.every(row => cellIsBlank(row[c]));
      if(!allBlank) keepCols.push(c);
    }
    removedCols = colCount - keepCols.length;
    rows = rows.map(row => keepCols.map(c => row[c] !== undefined ? row[c] : ''));
  }

  if(optHeaders && rows.length > 0){
    rows[0] = normalizeHeaderRow(rows[0]);
  }

  let removedBlankRows = 0;
  if(optBlankRows && rows.length > 1){
    const header = rows[0];
    const dataRows = rows.slice(1).filter(row => !row.every(cell => cellIsBlank(cell)));
    removedBlankRows = (rows.length - 1) - dataRows.length;
    rows = [header, ...dataRows];
  }

  let removedDupeRows = 0;
  if(optDedupe && rows.length > 1){
    const header = rows[0];
    const seenRows = new Set();
    const dataRows = [];
    for(const row of rows.slice(1)){
      const sig = JSON.stringify(row);
      if(seenRows.has(sig)){
        removedDupeRows++;
      } else {
        seenRows.add(sig);
        dataRows.push(row);
      }
    }
    rows = [header, ...dataRows];
  }

  excelCleanedData = rows;
  renderExcelPreview(rows);
  renderExcelStats({
    originalRowCount, originalColCount,
    cleanedRowCount: rows.length,
    cleanedColCount: rows[0] ? rows[0].length : 0,
    removedCols, removedBlankRows, removedDupeRows
  });
}

/* ---------------- Preview & stats ---------------- */

const EXCEL_PREVIEW_ROW_LIMIT = 300;

function renderExcelPreview(rows){
  const wrap = document.getElementById('excelTableWrap');
  if(rows.length === 0){
    wrap.innerHTML = '<div class="pdf-empty" style="border:none;">Nothing left after cleaning — try unchecking an option.</div>';
    return;
  }
  const header = rows[0] || [];
  const bodyRows = rows.slice(1, 1 + EXCEL_PREVIEW_ROW_LIMIT);
  const truncated = rows.length - 1 > EXCEL_PREVIEW_ROW_LIMIT;

  let html = '<table class="excel-table"><thead><tr>';
  header.forEach(h => { html += `<th>${escapeHtml(h)}</th>`; });
  html += '</tr></thead><tbody>';
  bodyRows.forEach(row => {
    html += '<tr>';
    header.forEach((_, c) => { html += `<td>${escapeHtml(row[c] !== undefined ? row[c] : '')}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table>';
  if(truncated){
    html += `<div class="excel-table-note">Showing first ${EXCEL_PREVIEW_ROW_LIMIT} of ${rows.length - 1} data rows in the preview — the full cleaned data is included in the download.</div>`;
  }
  wrap.innerHTML = html;
}

function escapeHtml(val){
  return val.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderExcelStats(s){
  document.getElementById('excelStats').innerHTML = `
    Original: <b>${s.originalRowCount - 1}</b> data row(s) × <b>${s.originalColCount}</b> column(s)<br>
    Cleaned: <b>${Math.max(s.cleanedRowCount - 1, 0)}</b> data row(s) × <b>${s.cleanedColCount}</b> column(s)<br>
    ${s.removedCols ? `Removed <b>${s.removedCols}</b> blank column(s)<br>` : ''}
    ${s.removedBlankRows ? `Removed <b>${s.removedBlankRows}</b> blank row(s)<br>` : ''}
    ${s.removedDupeRows ? `Removed <b>${s.removedDupeRows}</b> duplicate row(s)<br>` : ''}
  `;
  setExcelStatus('Cleaned preview updated — ' + Math.max(s.cleanedRowCount - 1, 0) + ' data row(s) ready to download.');
}

function setExcelStatus(msg){
  document.getElementById('excelStatus').textContent = msg;
}

/* ---------------- Download ---------------- */

function downloadCleanedExcel(){
  if(!excelCleanedData || excelCleanedData.length === 0) return;
  const format = document.getElementById('excelFormatSelect').value;

  const ws = XLSX.utils.aoa_to_sheet(excelCleanedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cleaned');

  if(format === 'csv'){
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'cleaned.csv');
  } else {
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerDownload(blob, 'cleaned.xlsx');
  }
}

function triggerDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  setExcelStatus('Downloaded as ' + filename + '.');
}
