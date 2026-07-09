/* ============================================================
   MODULE 3: EXCEL CLEANER
   Upload a .xlsx/.xls/.csv (parsed client-side via SheetJS,
   already loaded in index.html as xlsx.full.min.js), pick a
   sheet, apply cleaning steps (trim whitespace, remove blank
   rows/columns, normalize headers, dedupe rows), preview the
   result in a table, and download the cleaned file.
   Assumes row 1 of each sheet is the header row.
   Nothing is ever uploaded anywhere — it all happens in the browser.
   ============================================================ */

let excelWorkbook = null;
let excelOriginalFilename = '';
let excelCurrentSheetName = '';
let excelRawGrid = [];        // grid for the currently selected sheet, as loaded
let excelDisplayGrid = [];    // grid currently shown/downloaded (raw until cleaning is applied)
const EXCEL_PREVIEW_ROW_LIMIT = 300;

document.getElementById('excelOpenInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  await openExcelFile(file);
  e.target.value = '';
});

async function openExcelFile(file){
  setExcelStatus('Reading ' + file.name + '...');
  try{
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
    if(!wb.SheetNames || wb.SheetNames.length === 0){
      throw new Error('No sheets found in this file.');
    }

    excelWorkbook = wb;
    excelOriginalFilename = file.name;

    const sheetSelect = document.getElementById('excelSheetSelect');
    sheetSelect.innerHTML = wb.SheetNames.map(name =>
      `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`
    ).join('');
    sheetSelect.disabled = wb.SheetNames.length <= 1;

    document.getElementById('excelEmptyState').style.display = 'none';
    document.getElementById('excelWorkArea').style.display = 'block';

    loadExcelSheet(wb.SheetNames[0]);
    setExcelStatus(wb.SheetNames.length + ' sheet(s) found in ' + file.name + '.');
  } catch(e){
    alert('Could not read that file — it may be corrupted or in an unsupported format: ' + e.message);
    console.error(e);
    setExcelStatus('');
  }
}

function onExcelSheetChange(){
  const sheetSelect = document.getElementById('excelSheetSelect');
  loadExcelSheet(sheetSelect.value);
}

function loadExcelSheet(sheetName){
  excelCurrentSheetName = sheetName;
  document.getElementById('excelSheetSelect').value = sheetName;

  const ws = excelWorkbook.Sheets[sheetName];
  let grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: true });

  // Pad every row to the same width so column operations are well-defined.
  const colCount = grid.reduce((max, row) => Math.max(max, row.length), 0);
  grid = grid.map(row => {
    const padded = row.slice();
    while(padded.length < colCount) padded.push('');
    return padded;
  });

  excelRawGrid = grid;
  excelDisplayGrid = grid.map(row => row.slice());

  document.getElementById('excelSummary').innerHTML = '';
  renderExcelPreview(excelDisplayGrid);
  document.getElementById('excelDownloadBtn').disabled = excelDisplayGrid.length === 0;
  setExcelStatus('Loaded sheet "' + sheetName + '" — ' +
    Math.max(0, excelRawGrid.length - 1) + ' row(s), ' + colCount + ' column(s). Adjust options and click Apply Cleaning.');
}

function applyExcelCleaning(){
  if(!excelRawGrid.length){
    setExcelStatus('Load a file first.');
    return;
  }

  const opts = {
    removeBlankRows: document.getElementById('optRemoveBlankRows').checked,
    removeBlankCols: document.getElementById('optRemoveBlankCols').checked,
    trim: document.getElementById('optTrimWhitespace').checked,
    normalizeHeaders: document.getElementById('optNormalizeHeaders').checked,
    dedupe: document.getElementById('optDedupeRows').checked,
  };

  let grid = excelRawGrid.map(row => row.slice());
  const originalRowCount = Math.max(0, grid.length - 1);
  const originalColCount = grid.length ? grid[0].length : 0;

  // 1) Trim whitespace on every cell (and collapse internal runs of spaces).
  if(opts.trim){
    grid = grid.map(row => row.map(cell =>
      typeof cell === 'string' ? cell.trim().replace(/\s+/g, ' ') : cell
    ));
  }

  // 2) Normalize headers: trim, collapse spaces, fill blanks, de-duplicate names.
  if(opts.normalizeHeaders && grid.length){
    const seen = {};
    grid[0] = grid[0].map((h, i) => {
      let name = (h === undefined || h === null) ? '' : String(h).trim().replace(/\s+/g, ' ');
      if(!name) name = 'Column ' + (i + 1);
      if(seen[name] === undefined){
        seen[name] = 0;
      } else {
        seen[name]++;
        name = name + ' (' + seen[name] + ')';
      }
      return name;
    });
  }

  // 3) Remove blank rows (rows where every cell is empty/whitespace), keeping the header.
  let removedBlankRows = 0;
  if(opts.removeBlankRows && grid.length){
    const header = grid[0];
    const before = grid.length - 1;
    const rest = grid.slice(1).filter(row =>
      row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
    );
    removedBlankRows = before - rest.length;
    grid = [header, ...rest];
  }

  // 4) Remove blank columns (columns where every cell across all rows is empty).
  let removedBlankCols = 0;
  if(opts.removeBlankCols && grid.length){
    const colCount = grid[0].length;
    const keepCols = [];
    for(let c = 0; c < colCount; c++){
      const hasData = grid.some(row => {
        const cell = row[c];
        return cell !== undefined && cell !== null && String(cell).trim() !== '';
      });
      if(hasData) keepCols.push(c);
    }
    removedBlankCols = colCount - keepCols.length;
    grid = grid.map(row => keepCols.map(c => (row[c] !== undefined ? row[c] : '')));
  }

  // 5) Remove exact duplicate data rows (header is never considered a duplicate).
  let removedDupes = 0;
  if(opts.dedupe && grid.length > 1){
    const header = grid[0];
    const seenRows = new Set();
    const kept = [];
    grid.slice(1).forEach(row => {
      const key = JSON.stringify(row);
      if(seenRows.has(key)){
        removedDupes++;
        return;
      }
      seenRows.add(key);
      kept.push(row);
    });
    grid = [header, ...kept];
  }

  excelDisplayGrid = grid;
  renderExcelPreview(grid);

  const finalRowCount = Math.max(0, grid.length - 1);
  const finalColCount = grid.length ? grid[0].length : 0;

  const parts = [];
  if(opts.removeBlankRows) parts.push('<strong>' + removedBlankRows + '</strong> blank row(s) removed');
  if(opts.removeBlankCols) parts.push('<strong>' + removedBlankCols + '</strong> blank column(s) removed');
  if(opts.dedupe) parts.push('<strong>' + removedDupes + '</strong> duplicate row(s) removed');
  const summaryLine = parts.length ? parts.join(' · ') + '.' : 'No removal options were selected.';

  document.getElementById('excelSummary').innerHTML =
    summaryLine + '<br>Result: <strong>' + finalRowCount + '</strong> row(s) × <strong>' + finalColCount + '</strong> column(s) ' +
    '(started from ' + originalRowCount + ' × ' + originalColCount + ').';

  document.getElementById('excelDownloadBtn').disabled = grid.length === 0;
  setExcelStatus('Cleaning applied to sheet "' + excelCurrentSheetName + '".');
}

function renderExcelPreview(grid){
  const table = document.getElementById('excelPreviewTable');
  const hint = document.getElementById('excelMoreRowsHint');

  if(!grid.length){
    table.innerHTML = '<tr><td style="color:#999;">No data in this sheet.</td></tr>';
    hint.textContent = '';
    return;
  }

  const header = grid[0];
  const rows = grid.slice(1, 1 + EXCEL_PREVIEW_ROW_LIMIT);

  let html = '<thead><tr>' +
    header.map(h => '<th>' + escapeHtml(String(h === undefined || h === null ? '' : h)) + '</th>').join('') +
    '</tr></thead><tbody>';

  html += rows.map(row =>
    '<tr>' + row.map(cell => '<td>' + escapeHtml(String(cell === undefined || cell === null ? '' : cell)) + '</td>').join('') + '</tr>'
  ).join('');
  html += '</tbody>';

  table.innerHTML = html;

  const totalDataRows = grid.length - 1;
  hint.textContent = totalDataRows > EXCEL_PREVIEW_ROW_LIMIT
    ? 'Showing the first ' + EXCEL_PREVIEW_ROW_LIMIT + ' of ' + totalDataRows + ' rows. The full data downloads correctly regardless.'
    : '';
}

function downloadCleanedExcel(){
  if(!excelDisplayGrid.length){
    setExcelStatus('Nothing to download yet.');
    return;
  }

  try{
    const ext = (excelOriginalFilename.split('.').pop() || '').toLowerCase();
    const baseName = excelOriginalFilename.replace(/\.[^/.]+$/, '') || 'cleaned';
    const ws = XLSX.utils.aoa_to_sheet(excelDisplayGrid);

    if(ext === 'csv'){
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      triggerExcelBlobDownload(blob, baseName + '-cleaned.csv');
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, (excelCurrentSheetName || 'Sheet1').slice(0, 31));
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      triggerExcelBlobDownload(blob, baseName + '-cleaned.xlsx');
    }

    setExcelStatus('Downloaded cleaned file.');
  } catch(e){
    alert('Something went wrong building the download: ' + e.message);
    console.error(e);
  }
}

function triggerExcelBlobDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setExcelStatus(msg){
  document.getElementById('excelStatus').textContent = msg;
}

// escapeHtml (js/resume.js) and escapeAttr (js/zip-tool.js) are already
// defined globally — plain <script> files share one global scope — and
// are reused here as-is.
