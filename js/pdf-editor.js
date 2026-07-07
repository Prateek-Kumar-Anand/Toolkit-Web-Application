/* ============================================================
   MODULE 2: PDF EDITOR
   Client-side page-level PDF editing using pdf-lib (editing/export)
   and pdf.js (thumbnail rendering).
   Supports: rotate, delete, reorder, merge, selective extract, watermark.
   ============================================================ */
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let sourceDocs = {};   // sourceId -> { pdfLibDoc }
let workingPages = []; // { key, sourceId, srcPageIndex, rotation, include, thumb }
let srcCounter = 0;
let pageKeyCounter = 0;

document.getElementById('pdfOpenInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  // Opening a fresh PDF resets the working set
  sourceDocs = {};
  workingPages = [];
  await loadPdfIntoWorkingSet(file);
  document.getElementById('mergeBtn').disabled = false;
  document.getElementById('pdfDownloadBtn').disabled = false;
  document.getElementById('pdfEmptyState').style.display = 'none';
  renderPdfGrid();
  e.target.value = '';
});

document.getElementById('pdfMergeInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  await loadPdfIntoWorkingSet(file);
  renderPdfGrid();
  e.target.value = '';
});

async function loadPdfIntoWorkingSet(file){
  setStatus('Loading ' + file.name + '...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer.slice(0));
  const sourceId = 'src' + (srcCounter++);
  sourceDocs[sourceId] = { pdfLibDoc };

  const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const pageCount = pdfLibDoc.getPageCount();

  for(let i = 0; i < pageCount; i++){
    const page = await pdfjsDoc.getPage(i + 1);
    const viewport = page.getViewport({ scale: 0.4 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    workingPages.push({
      key: 'p' + (pageKeyCounter++),
      sourceId,
      srcPageIndex: i,
      rotation: 0,
      include: true,
      thumb: canvas.toDataURL('image/png')
    });
  }
  setStatus(workingPages.length + ' page(s) loaded across ' + Object.keys(sourceDocs).length + ' file(s).');
}

function renderPdfGrid(){
  const grid = document.getElementById('pdfGrid');
  grid.innerHTML = '';
  workingPages.forEach((wp, idx) => {
    const card = document.createElement('div');
    card.className = 'pdf-page-card' + (wp.include ? '' : ' excluded');
    const rotClass = (wp.rotation === 90 || wp.rotation === 270) ? 'rot-90' : '';
    card.innerHTML = `
      <input type="checkbox" class="include-toggle" ${wp.include ? 'checked' : ''} title="Include in export"
        onchange="toggleInclude('${wp.key}', this.checked)">
      <div class="thumb-box">
        <img src="${wp.thumb}" class="${rotClass}" style="transform: rotate(${wp.rotation}deg);">
      </div>
      <div class="page-num">Page ${idx + 1}${wp.rotation ? ' · ' + wp.rotation + '°' : ''}</div>
      <div class="page-controls">
        <button onclick="movePage('${wp.key}', -1)" title="Move left">←</button>
        <button onclick="movePage('${wp.key}', 1)" title="Move right">→</button>
        <button onclick="rotatePage('${wp.key}')" title="Rotate 90°">⟳</button>
        <button onclick="deletePage('${wp.key}')" title="Delete page">✕</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function toggleInclude(key, checked){
  const wp = workingPages.find(p => p.key === key);
  if(wp) wp.include = checked;
  renderPdfGrid();
}

function rotatePage(key){
  const wp = workingPages.find(p => p.key === key);
  if(wp) wp.rotation = (wp.rotation + 90) % 360;
  renderPdfGrid();
}

function deletePage(key){
  workingPages = workingPages.filter(p => p.key !== key);
  if(workingPages.length === 0){
    document.getElementById('pdfEmptyState').style.display = 'block';
    document.getElementById('pdfDownloadBtn').disabled = true;
    document.getElementById('mergeBtn').disabled = true;
  }
  renderPdfGrid();
  setStatus(workingPages.length + ' page(s) remaining.');
}

function movePage(key, dir){
  const idx = workingPages.findIndex(p => p.key === key);
  const newIdx = idx + dir;
  if(newIdx < 0 || newIdx >= workingPages.length) return;
  const [item] = workingPages.splice(idx, 1);
  workingPages.splice(newIdx, 0, item);
  renderPdfGrid();
}

function setStatus(msg){
  document.getElementById('pdfStatus').textContent = msg;
}

async function downloadEditedPdf(){
  const btn = document.getElementById('pdfDownloadBtn');
  const included = workingPages.filter(p => p.include);
  if(included.length === 0){
    alert('No pages are selected for export. Check at least one page.');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Building PDF...';
  try{
    const outDoc = await PDFLib.PDFDocument.create();
    for(const wp of included){
      const srcDoc = sourceDocs[wp.sourceId].pdfLibDoc;
      const [copiedPage] = await outDoc.copyPages(srcDoc, [wp.srcPageIndex]);
      const baseAngle = copiedPage.getRotation().angle;
      copiedPage.setRotation(PDFLib.degrees((baseAngle + wp.rotation) % 360));
      outDoc.addPage(copiedPage);
    }

    const watermark = document.getElementById('watermarkText').value.trim();
    if(watermark){
      const font = await outDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      outDoc.getPages().forEach(page => {
        const { width, height } = page.getSize();
        const size = Math.min(width, height) * 0.09;
        const textWidth = font.widthOfTextAtSize(watermark, size);
        page.drawText(watermark, {
          x: width / 2 - textWidth / 2,
          y: height / 2,
          size,
          font,
          color: PDFLib.rgb(0.55, 0.55, 0.55),
          opacity: 0.28,
          rotate: PDFLib.degrees(45)
        });
      });
    }

    const bytes = await outDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e){
    alert('Something went wrong building the PDF: ' + e.message);
    console.error(e);
  } finally{
    btn.disabled = false;
    btn.textContent = 'Download Edited PDF';
  }
}
