/* ============================================================
   MODULE 6: FILE CONVERSION
   Client-side format conversion, scoped to what a browser can
   honestly do without a backend or heavy transcoding library:

   - IMAGES: any format the browser can display (png/jpg/webp/
     gif/bmp/svg/...) -> PNG, JPEG, or WEBP, via <canvas>.
   - AUDIO: any format the browser can decode (mp3/wav/ogg/m4a/
     aac/...) -> WAV (uncompressed PCM), via Web Audio API.
     True lossy re-encoding (e.g. to mp3) needs a dedicated
     encoder library, which isn't included, so WAV is the
     supported target — it's universally playable.
   - DATA FILES: csv/tsv/json/xlsx/xls -> csv, tsv, json, or
     xlsx, reusing the SheetJS library already loaded for the
     Excel Cleaner tab.
   - Anything else (video, docx, pdf, archives, ...) shows a
     clear "not supported here" message, pointing at the PDF
     Editor / .zip operation tabs when relevant, rather than
     pretending to convert it.
   ============================================================ */

let convCurrentFile = null;
let convCurrentCategory = null;

// Image state
let convImageBitmapCanvas = null; // offscreen canvas holding the loaded image at full resolution

// Audio state
let convAudioBuffer = null;
let convAudioFileBaseName = 'converted';

// Data state
let convDataRows = [];      // array-of-arrays (AOA) parsed from the input file
let convDataBaseName = 'converted';

document.getElementById('convOpenInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  await handleConvertFileOpen(file);
  e.target.value = '';
});

function convBaseName(filename){
  return filename.replace(/\.[^.]+$/, '') || 'converted';
}

function detectConvCategory(file){
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = file.type || '';

  const imageExts = ['png','jpg','jpeg','webp','gif','bmp','svg','ico'];
  const audioExts = ['mp3','wav','ogg','m4a','aac','flac','weba'];
  const dataExts = ['csv','tsv','json','xlsx','xls'];

  if(type.startsWith('image/') || imageExts.includes(ext)) return 'image';
  if(type.startsWith('audio/') || audioExts.includes(ext)) return 'audio';
  if(dataExts.includes(ext) || type === 'application/json' || type === 'text/csv') return 'data';
  if(type === 'application/pdf' || ext === 'pdf') return 'pdf-hint';
  if(['zip','rar','7z','tar','gz'].includes(ext)) return 'zip-hint';
  return 'unsupported';
}

function hideAllConvPanels(){
  ['convImagePanel', 'convAudioPanel', 'convDataPanel', 'convUnsupportedPanel'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

async function handleConvertFileOpen(file){
  convCurrentFile = file;
  hideAllConvPanels();
  document.getElementById('convEmptyState').style.display = 'none';
  setConvStatus('Reading ' + file.name + '...');

  convCurrentCategory = detectConvCategory(file);

  try{
    if(convCurrentCategory === 'image'){
      await setupImageConversion(file);
    } else if(convCurrentCategory === 'audio'){
      await setupAudioConversion(file);
    } else if(convCurrentCategory === 'data'){
      await setupDataConversion(file);
    } else {
      showUnsupported(file, convCurrentCategory);
    }
  } catch(err){
    console.error(err);
    setConvStatus('Could not process that file: ' + err.message);
    showUnsupported(file, 'error');
  }
}

function setConvStatus(msg){
  document.getElementById('convStatus').textContent = msg;
}

/* ---------------- Unsupported / hint panel ---------------- */

function showUnsupported(file, category){
  document.getElementById('convUnsupportedPanel').style.display = 'block';
  let msg = `"${file.name}" isn't a format this tool can convert yet — only images, audio, and data files (CSV/TSV/JSON/XLSX/XLS) are supported right now.`;
  if(category === 'pdf-hint'){
    msg = `"${file.name}" is a PDF. This tab doesn't convert PDFs, but the <strong>PDF Editing</strong> tab can rotate, merge, extract pages, watermark it, and add/place images on it.`;
  } else if(category === 'zip-hint'){
    msg = `"${file.name}" is an archive. This tab doesn't convert archives, but the <strong>.zip operation</strong> tab can open, preview, and extract files from a .zip.`;
  } else if(category === 'error'){
    msg = `Couldn't read "${file.name}" — it may be corrupted, password-protected, or in a format your browser can't decode.`;
  }
  document.getElementById('convUnsupportedMsg').innerHTML = msg;
  setConvStatus('Unsupported for conversion: ' + file.name);
}

/* ---------------- IMAGE conversion ---------------- */

function setupImageConversion(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        convImageBitmapCanvas = document.createElement('canvas');
        convImageBitmapCanvas.width = img.naturalWidth;
        convImageBitmapCanvas.height = img.naturalHeight;
        convImageBitmapCanvas.getContext('2d').drawImage(img, 0, 0);

        document.getElementById('convImagePreview').src = ev.target.result;
        document.getElementById('convImagePanel').style.display = 'block';
        setConvStatus(file.name + ' — ' + img.naturalWidth + '×' + img.naturalHeight + 'px, ready to convert.');
        resolve();
      };
      img.onerror = () => reject(new Error('This image format could not be decoded by your browser.'));
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('convImageFormat').addEventListener('change', () => {
  const fmt = document.getElementById('convImageFormat').value;
  document.getElementById('convImageQualityRow').style.display = (fmt === 'image/png') ? 'none' : 'block';
});

document.getElementById('convImageQuality').addEventListener('input', () => {
  const pct = Math.round(document.getElementById('convImageQuality').value * 100);
  document.getElementById('convImageQualityVal').textContent = pct + '%';
});

function convertAndDownloadImage(){
  if(!convImageBitmapCanvas) return;
  const fmt = document.getElementById('convImageFormat').value;
  const quality = parseFloat(document.getElementById('convImageQuality').value);
  const ext = fmt === 'image/jpeg' ? 'jpg' : (fmt === 'image/webp' ? 'webp' : 'png');

  // JPEG has no alpha channel — flatten transparency onto white first.
  let sourceCanvas = convImageBitmapCanvas;
  if(fmt === 'image/jpeg'){
    sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = convImageBitmapCanvas.width;
    sourceCanvas.height = convImageBitmapCanvas.height;
    const ctx = sourceCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    ctx.drawImage(convImageBitmapCanvas, 0, 0);
  }

  sourceCanvas.toBlob((blob) => {
    if(!blob){
      setConvStatus('Conversion failed — your browser may not support exporting to that format.');
      return;
    }
    const baseName = convBaseName(convCurrentFile.name);
    triggerConvDownload(blob, baseName + '.' + ext);
  }, fmt, fmt === 'image/png' ? undefined : quality);
}

/* ---------------- AUDIO conversion ---------------- */

async function setupAudioConversion(file){
  convAudioFileBaseName = convBaseName(file.name);
  document.getElementById('convAudioPanel').style.display = 'block';
  document.getElementById('convAudioBtn').disabled = true;
  document.getElementById('convAudioInfo').textContent = 'Decoding audio...';
  setConvStatus('Decoding ' + file.name + '...');

  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  try{
    convAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } catch(e){
    document.getElementById('convAudioInfo').textContent = 'Could not decode this audio file in your browser.';
    setConvStatus('Could not decode ' + file.name + '.');
    throw e;
  } finally{
    ctx.close();
  }

  const durationSec = convAudioBuffer.duration;
  const mins = Math.floor(durationSec / 60);
  const secs = Math.round(durationSec % 60);
  document.getElementById('convAudioInfo').innerHTML =
    `Duration: <b>${mins}:${secs.toString().padStart(2, '0')}</b> &nbsp;·&nbsp; ` +
    `Channels: <b>${convAudioBuffer.numberOfChannels}</b> &nbsp;·&nbsp; ` +
    `Sample rate: <b>${convAudioBuffer.sampleRate} Hz</b>`;
  document.getElementById('convAudioBtn').disabled = false;
  setConvStatus(file.name + ' decoded — ready to convert to WAV.');
}

function encodeWavFromAudioBuffer(audioBuffer){
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str){
    for(let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);        // PCM chunk size
  view.setUint16(20, 1, true);         // audio format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);        // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and convert float32 [-1,1] samples to int16 PCM.
  const channelData = [];
  for(let c = 0; c < numChannels; c++) channelData.push(audioBuffer.getChannelData(c));

  let offset = 44;
  for(let i = 0; i < numFrames; i++){
    for(let c = 0; c < numChannels; c++){
      let sample = Math.max(-1, Math.min(1, channelData[c][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function convertAndDownloadAudio(){
  if(!convAudioBuffer) return;
  setConvStatus('Encoding WAV...');
  const blob = encodeWavFromAudioBuffer(convAudioBuffer);
  triggerConvDownload(blob, convAudioFileBaseName + '.wav');
}

/* ---------------- DATA FILE conversion ---------------- */

async function setupDataConversion(file){
  convDataBaseName = convBaseName(file.name);
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if(ext === 'json'){
    const text = await file.text();
    let parsed;
    try{
      parsed = JSON.parse(text);
    } catch(e){
      throw new Error('This .json file is not valid JSON.');
    }
    convDataRows = jsonToAOA(parsed);
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    convDataRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });
  }

  renderConvDataPreview(convDataRows);
  document.getElementById('convDataPanel').style.display = 'block';
  const dataRowCount = Math.max(convDataRows.length - 1, 0);
  const colCount = convDataRows[0] ? convDataRows[0].length : 0;
  document.getElementById('convDataStats').innerHTML =
    `<b>${dataRowCount}</b> data row(s) × <b>${colCount}</b> column(s) detected.`;
  setConvStatus(file.name + ' loaded — ' + dataRowCount + ' row(s), ready to convert.');
}

// Accepts either an array of objects (records) or an array of arrays, and
// normalizes both into a single array-of-arrays with a header row.
function jsonToAOA(parsed){
  const records = Array.isArray(parsed) ? parsed : [parsed];
  if(records.length === 0) return [[]];

  if(Array.isArray(records[0])){
    return records; // already array-of-arrays
  }

  // Array of objects: collect the union of all keys, in first-seen order.
  const headerSet = [];
  records.forEach(rec => {
    if(rec && typeof rec === 'object'){
      Object.keys(rec).forEach(k => { if(!headerSet.includes(k)) headerSet.push(k); });
    }
  });
  const rows = [headerSet];
  records.forEach(rec => {
    rows.push(headerSet.map(k => (rec && rec[k] !== undefined) ? rec[k] : ''));
  });
  return rows;
}

const CONV_PREVIEW_ROW_LIMIT = 200;

function renderConvDataPreview(rows){
  const wrap = document.getElementById('convDataPreview');
  if(!rows || rows.length === 0){
    wrap.innerHTML = '<div class="pdf-empty" style="border:none;">No data found in this file.</div>';
    return;
  }
  const header = rows[0] || [];
  const bodyRows = rows.slice(1, 1 + CONV_PREVIEW_ROW_LIMIT);
  const truncated = rows.length - 1 > CONV_PREVIEW_ROW_LIMIT;

  let html = '<table class="excel-table"><thead><tr>';
  header.forEach(h => { html += `<th>${convEscapeHtml(h)}</th>`; });
  html += '</tr></thead><tbody>';
  bodyRows.forEach(row => {
    html += '<tr>';
    header.forEach((_, c) => { html += `<td>${convEscapeHtml(row[c] !== undefined ? row[c] : '')}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table>';
  if(truncated){
    html += `<div class="excel-table-note">Showing first ${CONV_PREVIEW_ROW_LIMIT} of ${rows.length - 1} data rows — the full file is included in the download.</div>`;
  }
  wrap.innerHTML = html;
}

function convEscapeHtml(val){
  return val.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function convertAndDownloadData(){
  if(!convDataRows || convDataRows.length === 0) return;
  const format = document.getElementById('convDataFormat').value;
  const ws = XLSX.utils.aoa_to_sheet(convDataRows);

  if(format === 'json'){
    const header = convDataRows[0] || [];
    const records = convDataRows.slice(1).map(row => {
      const obj = {};
      header.forEach((key, c) => { obj[key] = row[c] !== undefined ? row[c] : ''; });
      return obj;
    });
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    triggerConvDownload(blob, convDataBaseName + '.json');
  } else if(format === 'csv'){
    const csv = XLSX.utils.sheet_to_csv(ws);
    triggerConvDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), convDataBaseName + '.csv');
  } else if(format === 'tsv'){
    const tsv = XLSX.utils.sheet_to_csv(ws, { FS: '\t' });
    triggerConvDownload(new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' }), convDataBaseName + '.tsv');
  } else if(format === 'xlsx'){
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    triggerConvDownload(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), convDataBaseName + '.xlsx');
  }
}

/* ---------------- Shared download helper ---------------- */

function triggerConvDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  setConvStatus('Downloaded as ' + filename + '.');
}
