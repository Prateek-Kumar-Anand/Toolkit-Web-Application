/* ============================================================
   MODULE 2: PDF EDITOR
   Client-side page-level PDF editing using pdf-lib (editing/export)
   and pdf.js (thumbnail rendering).
   Supports: rotate, delete, reorder, merge, add image as a new
   page, place an image onto an existing page (logo/stamp/signature),
   selective extract, watermark.
   ============================================================ */
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let sourceDocs = {};   // sourceId -> { pdfLibDoc }
let workingPages = []; // { key, sourceId, srcPageIndex, rotation, include, thumb, displayThumb, overlays }
let srcCounter = 0;
let pageKeyCounter = 0;
let overlayCounter = 0;

// State for the "place image on page" workflow
let pendingPlacement = null;   // { dataURL, isPng }
let currentPlacementPos = 'bottom-right';

document.getElementById('pdfOpenInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  // Opening a fresh PDF resets the working set
  sourceDocs = {};
  workingPages = [];
  await loadPdfIntoWorkingSet(file);
  document.getElementById('mergeBtn').disabled = false;
  document.getElementById('placeImageBtn').disabled = false;
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

document.getElementById('imageAddInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  await loadImageIntoWorkingSet(file);
  document.getElementById('mergeBtn').disabled = false;
  document.getElementById('placeImageBtn').disabled = false;
  document.getElementById('pdfDownloadBtn').disabled = false;
  document.getElementById('pdfEmptyState').style.display = 'none';
  renderPdfGrid();
  e.target.value = '';
});

document.getElementById('imagePlaceInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
  const isJpg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name);
  if(!isPng && !isJpg){
    alert('Only PNG and JPEG images can be placed on a page.');
    e.target.value = '';
    return;
  }
  if(workingPages.length === 0){
    alert('Open or create a PDF first, then place an image onto one of its pages.');
    e.target.value = '';
    return;
  }
  const dataURL = await fileToDataURL(file);
  pendingPlacement = { dataURL, isPng };
  openPlacementPanel();
  e.target.value = '';
});

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

async function loadImageIntoWorkingSet(file){
  setStatus('Adding image ' + file.name + '...');
  try{
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    const isJpg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name);
    if(!isPng && !isJpg){
      alert('Only PNG and JPEG images can be added as a page.');
      setStatus(workingPages.length + ' page(s) loaded across ' + Object.keys(sourceDocs).length + ' file(s).');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();

    // Match the page size already in use so the new page blends in with the
    // rest of the document; fall back to standard A4 (in points) if this is
    // the very first thing added to the working set.
    let pageWidth = 595.28, pageHeight = 841.89;
    if(workingPages.length > 0){
      const first = workingPages[0];
      const size = sourceDocs[first.sourceId].pdfLibDoc.getPage(first.srcPageIndex).getSize();
      pageWidth = size.width;
      pageHeight = size.height;
    }

    const imageDoc = await PDFLib.PDFDocument.create();
    const embedded = isPng ? await imageDoc.embedPng(arrayBuffer) : await imageDoc.embedJpg(arrayBuffer);
    const page = imageDoc.addPage([pageWidth, pageHeight]);

    // Fit the image inside the page with a small margin, centered, preserving
    // its aspect ratio (never stretched/distorted).
    const margin = 36; // 0.5in
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const ratio = embedded.width / embedded.height;
    let drawW = maxW, drawH = maxW / ratio;
    if(drawH > maxH){ drawH = maxH; drawW = maxH * ratio; }
    page.drawImage(embedded, {
      x: (pageWidth - drawW) / 2,
      y: (pageHeight - drawH) / 2,
      width: drawW,
      height: drawH
    });

    const sourceId = 'src' + (srcCounter++);
    sourceDocs[sourceId] = { pdfLibDoc: imageDoc };

    // Render the thumbnail through the same pdf.js pipeline used for opened
    // PDFs, so this page looks/behaves identically (rotation, sizing, etc.)
    const imageDocBytes = await imageDoc.save();
    const pdfjsDoc = await pdfjsLib.getDocument({ data: imageDocBytes }).promise;
    const pdfjsPage = await pdfjsDoc.getPage(1);
    const viewport = pdfjsPage.getViewport({ scale: 0.4 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await pdfjsPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    workingPages.push({
      key: 'p' + (pageKeyCounter++),
      sourceId,
      srcPageIndex: 0,
      rotation: 0,
      include: true,
      thumb: canvas.toDataURL('image/png')
    });

    setStatus(workingPages.length + ' page(s) loaded across ' + Object.keys(sourceDocs).length + ' file(s). Image added as a new page.');
  } catch(e){
    alert('Could not add that image: ' + e.message);
    console.error(e);
    setStatus(workingPages.length + ' page(s) loaded across ' + Object.keys(sourceDocs).length + ' file(s).');
  }
}

function renderPdfGrid(){
  const grid = document.getElementById('pdfGrid');
  grid.innerHTML = '';
  workingPages.forEach((wp, idx) => {
    const card = document.createElement('div');
    card.className = 'pdf-page-card' + (wp.include ? '' : ' excluded');
    const rotClass = (wp.rotation === 90 || wp.rotation === 270) ? 'rot-90' : '';
    const hasOverlays = wp.overlays && wp.overlays.length > 0;
    const thumbSrc = wp.displayThumb || wp.thumb;
    card.innerHTML = `
      <input type="checkbox" class="include-toggle" ${wp.include ? 'checked' : ''} title="Include in export"
        onchange="toggleInclude('${wp.key}', this.checked)">
      <div class="thumb-box">
        ${hasOverlays ? `<div class="overlay-badge" title="${wp.overlays.length} image(s) placed">🖼 ×${wp.overlays.length}</div>` : ''}
        <img src="${thumbSrc}" class="${rotClass}" style="transform: rotate(${wp.rotation}deg);">
      </div>
      <div class="page-num">Page ${idx + 1}${wp.rotation ? ' · ' + wp.rotation + '°' : ''}</div>
      <div class="page-controls">
        <button onclick="movePage('${wp.key}', -1)" title="Move left">←</button>
        <button onclick="movePage('${wp.key}', 1)" title="Move right">→</button>
        <button onclick="rotatePage('${wp.key}')" title="Rotate 90°">⟳</button>
        ${hasOverlays ? `<button onclick="removeOverlays('${wp.key}')" title="Remove placed image(s)">🖼✕</button>` : ''}
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
    document.getElementById('placeImageBtn').disabled = true;
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

/* ---------------- Place image onto an existing page ---------------- */

function openPlacementPanel(){
  const select = document.getElementById('placePageSelect');
  select.innerHTML = '';
  workingPages.forEach((wp, idx) => {
    const opt = document.createElement('option');
    opt.value = wp.key;
    opt.textContent = 'Page ' + (idx + 1);
    select.appendChild(opt);
  });
  currentPlacementPos = 'bottom-right';
  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos === currentPlacementPos);
  });
  document.getElementById('placeSizeRange').value = 30;
  document.getElementById('placeSizeVal').textContent = '30%';
  document.getElementById('imagePlacementPanel').style.display = 'flex';
}

function selectPlacementPos(btn){
  currentPlacementPos = btn.dataset.pos;
  document.querySelectorAll('.pos-btn').forEach(b => b.classList.toggle('active', b === btn));
}

function cancelPlacement(){
  pendingPlacement = null;
  document.getElementById('imagePlacementPanel').style.display = 'none';
}

function confirmPlaceImage(){
  if(!pendingPlacement) return;
  const key = document.getElementById('placePageSelect').value;
  const sizePct = parseInt(document.getElementById('placeSizeRange').value, 10);
  const wp = workingPages.find(p => p.key === key);
  if(!wp) return;

  wp.overlays = wp.overlays || [];
  wp.overlays.push({
    id: 'ov' + (overlayCounter++),
    dataURL: pendingPlacement.dataURL,
    isPng: pendingPlacement.isPng,
    position: currentPlacementPos,
    sizePct
  });

  const pageIdx = workingPages.findIndex(p => p.key === key);
  cancelPlacement();
  refreshPageThumbnail(key).then(() => {
    setStatus('Image placed on page ' + (pageIdx + 1) + '. It will be baked in when you download.');
  });
}

function removeOverlays(key){
  const wp = workingPages.find(p => p.key === key);
  if(!wp || !wp.overlays || wp.overlays.length === 0) return;
  if(!confirm('Remove the placed image(s) from this page?')) return;
  wp.overlays = [];
  wp.displayThumb = null;
  renderPdfGrid();
  setStatus('Removed placed image(s) from that page.');
}

// Computes a draw rect (bottom-left origin, like PDF space) for an overlay,
// given the container's width/height (works for both real PDF points and
// thumbnail pixels since it's all proportional).
function computeOverlayRect(containerW, containerH, imgRatio, sizePct, position){
  const w = containerW * (sizePct / 100);
  const h = w / imgRatio;
  const margin = Math.min(containerW, containerH) * 0.04;
  let x, y;
  switch(position){
    case 'top-left':     x = margin;                 y = containerH - margin - h; break;
    case 'top-right':    x = containerW - margin - w; y = containerH - margin - h; break;
    case 'bottom-left':  x = margin;                 y = margin; break;
    case 'center':        x = (containerW - w) / 2;   y = (containerH - h) / 2; break;
    case 'bottom-right':
    default:              x = containerW - margin - w; y = margin; break;
  }
  return { x, y, w, h };
}

function loadImageEl(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Rebuilds wp.displayThumb by compositing every placed overlay onto a fresh
// copy of the page's base thumbnail, so the grid preview matches what will
// actually be baked into the PDF on download.
async function refreshPageThumbnail(key){
  const wp = workingPages.find(p => p.key === key);
  if(!wp) return;
  if(!wp.overlays || wp.overlays.length === 0){
    wp.displayThumb = null;
    renderPdfGrid();
    return;
  }
  const baseImg = await loadImageEl(wp.thumb);
  const canvas = document.createElement('canvas');
  canvas.width = baseImg.width;
  canvas.height = baseImg.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(baseImg, 0, 0);

  for(const ov of wp.overlays){
    const ovImg = await loadImageEl(ov.dataURL);
    const rect = computeOverlayRect(canvas.width, canvas.height, ovImg.width / ovImg.height, ov.sizePct, ov.position);
    // Flip from bottom-left (PDF-style) origin to canvas's top-left origin.
    ctx.drawImage(ovImg, rect.x, canvas.height - rect.y - rect.h, rect.w, rect.h);
  }

  wp.displayThumb = canvas.toDataURL('image/png');
  renderPdfGrid();
}

function dataURLToUint8Array(dataURL){
  const base64 = dataURL.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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

      if(wp.overlays && wp.overlays.length){
        const { width: pw, height: ph } = copiedPage.getSize();
        for(const ov of wp.overlays){
          const bytes = dataURLToUint8Array(ov.dataURL);
          const embedded = ov.isPng ? await outDoc.embedPng(bytes) : await outDoc.embedJpg(bytes);
          const rect = computeOverlayRect(pw, ph, embedded.width / embedded.height, ov.sizePct, ov.position);
          copiedPage.drawImage(embedded, { x: rect.x, y: rect.y, width: rect.w, height: rect.h });
        }
      }
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
