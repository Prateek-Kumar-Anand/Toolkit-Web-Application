/* ============================================================
   MODULE 6: PDF COMPRESSOR
   Client-side PDF size reduction. There's no way to deeply
   recompress an arbitrary PDF's internal content streams from
   the browser, so this uses the standard client-side approach:
   render each page to a canvas at a chosen DPI (via pdf.js),
   re-encode it as a JPEG at a chosen quality, then rebuild a
   new PDF from those images (via pdf-lib) sized to match the
   original page dimensions.

   Trade-off (shown to the user in the UI): pages become
   images, so text is no longer selectable/searchable. This
   works great for scanned docs / image-heavy PDFs, less well
   for text-heavy documents where you need to keep real text.
   ============================================================ */

let compressSourceBytes = null;
let compressSourceName = 'document';
let compressedPdfBytes = null;
let compressPageCount = 0;

const COMPRESS_PRESETS = {
  low:         { dpi: 150, quality: 0.85 },
  recommended: { dpi: 110, quality: 0.70 },
  high:        { dpi: 72,  quality: 0.45 },
};

document.getElementById('compressOpenInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  await loadPdfForCompression(file);
  e.target.value = '';
});

async function loadPdfForCompression(file){
  setCompressStatus('Loading ' + file.name + '...');
  compressSourceBytes = await file.arrayBuffer();
  compressSourceName = file.name.replace(/\.pdf$/i, '');
  compressedPdfBytes = null;

  const pdfjsDoc = await pdfjsLib.getDocument({ data: compressSourceBytes.slice(0) }).promise;
  compressPageCount = pdfjsDoc.numPages;

  document.getElementById('compressEmptyState').style.display = 'none';
  document.getElementById('compressLayout').style.display = 'grid';
  document.getElementById('compressRunBtn').disabled = false;
  document.getElementById('compressDownloadBtn').disabled = true;
  document.getElementById('compressPreviewGrid').innerHTML = '';

  document.getElementById('compressOriginalSize').textContent = formatBytes(compressSourceBytes.byteLength);
  document.getElementById('compressNewSize').textContent = '—';
  document.getElementById('compressReduction').textContent = '—';

  setCompressStatus(file.name + ' — ' + compressPageCount + ' page' + (compressPageCount === 1 ? '' : 's') + ', ' + formatBytes(compressSourceBytes.byteLength));
}

/* ---------------- Compression level UI ---------------- */

document.querySelectorAll('input[name="compressLevel"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.getElementById('compressCustomControls').style.display =
      (radio.value === 'custom' && radio.checked) ? 'block' : 'none';
  });
});

document.getElementById('compressDpiRange').addEventListener('input', (e) => {
  document.getElementById('compressDpiVal').textContent = e.target.value + ' DPI';
});
document.getElementById('compressQualityRange').addEventListener('input', (e) => {
  document.getElementById('compressQualityVal').textContent = e.target.value + '%';
});

function getSelectedCompressionSettings(){
  const level = document.querySelector('input[name="compressLevel"]:checked').value;
  if(level === 'custom'){
    return {
      dpi: parseInt(document.getElementById('compressDpiRange').value, 10),
      quality: parseInt(document.getElementById('compressQualityRange').value, 10) / 100,
    };
  }
  return COMPRESS_PRESETS[level];
}

/* ---------------- Compression run ---------------- */

async function runPdfCompression(){
  if(!compressSourceBytes) return;

  const { dpi, quality } = getSelectedCompressionSettings();
  const scale = dpi / 72; // pdf.js viewport scale of 1 == 72 DPI

  document.getElementById('compressRunBtn').disabled = true;
  document.getElementById('compressDownloadBtn').disabled = true;
  document.getElementById('compressPreviewGrid').innerHTML = '';

  const pdfjsDoc = await pdfjsLib.getDocument({ data: compressSourceBytes.slice(0) }).promise;
  const newDoc = await PDFLib.PDFDocument.create();

  for(let i = 1; i <= compressPageCount; i++){
    setCompressStatus('Compressing page ' + i + ' of ' + compressPageCount + '...');

    const page = await pdfjsDoc.getPage(i);
    const renderViewport = page.getViewport({ scale });
    const pointViewport = page.getViewport({ scale: 1 }); // 1 unit = 1 PDF point

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(renderViewport.width));
    canvas.height = Math.max(1, Math.round(renderViewport.height));
    const ctx = canvas.getContext('2d');
    // Flatten onto white first — source PDF pages can have transparent
    // backgrounds, and JPEG has no alpha channel.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

    const jpegDataURL = canvas.toDataURL('image/jpeg', quality);
    const jpegBytes = dataURLToUint8Array(jpegDataURL);
    const embeddedImg = await newDoc.embedJpg(jpegBytes);

    const newPage = newDoc.addPage([pointViewport.width, pointViewport.height]);
    newPage.drawImage(embeddedImg, { x: 0, y: 0, width: pointViewport.width, height: pointViewport.height });

    // Small live thumbnail so the user can sanity-check quality before downloading.
    if(i <= 12){
      const thumb = document.createElement('div');
      thumb.className = 'pdf-page-card';
      const thumbBox = document.createElement('div');
      thumbBox.className = 'thumb-box';
      const img = document.createElement('img');
      img.src = jpegDataURL;
      thumbBox.appendChild(img);
      const label = document.createElement('div');
      label.className = 'page-num';
      label.textContent = 'Page ' + i;
      thumb.appendChild(thumbBox);
      thumb.appendChild(label);
      document.getElementById('compressPreviewGrid').appendChild(thumb);
    }
  }

  if(compressPageCount > 12){
    const note = document.createElement('div');
    note.className = 'pdf-status';
    note.style.gridColumn = '1 / -1';
    note.textContent = '+ ' + (compressPageCount - 12) + ' more page(s) not previewed, but included in the download.';
    document.getElementById('compressPreviewGrid').appendChild(note);
  }

  compressedPdfBytes = await newDoc.save();

  const originalSize = compressSourceBytes.byteLength;
  const newSize = compressedPdfBytes.byteLength;
  const reductionPct = Math.max(0, Math.round((1 - newSize / originalSize) * 100));

  document.getElementById('compressNewSize').textContent = formatBytes(newSize);
  document.getElementById('compressReduction').textContent = reductionPct + '%';

  document.getElementById('compressRunBtn').disabled = false;
  document.getElementById('compressDownloadBtn').disabled = false;

  if(newSize >= originalSize){
    setCompressStatus('Done — this file was already efficiently encoded, so the result isn\u2019t smaller. Try "High Compression" or a lower custom DPI/quality.');
  } else {
    setCompressStatus('Done — ' + formatBytes(originalSize) + ' → ' + formatBytes(newSize) + ' (' + reductionPct + '% smaller).');
  }
}

function downloadCompressedPdf(){
  if(!compressedPdfBytes) return;
  const blob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = compressSourceName + '-compressed.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------- Helpers ---------------- */

function dataURLToUint8Array(dataURL){
  const base64 = dataURL.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function formatBytes(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function setCompressStatus(msg){
  document.getElementById('compressStatus').textContent = msg;
}
