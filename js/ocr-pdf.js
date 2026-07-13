/* ============================================================
   MODULE 9: TEXT -> EDITABLE PDF (OCR)
   Takes one or more photos of text (notes, a printed page, a
   whiteboard...), runs OCR entirely in the browser via
   Tesseract.js (WebAssembly, no server involved), lets the
   person fix any misread words, then builds a real PDF out of
   that text with jsPDF. Because the PDF page is built from
   actual text objects (not a picture of the page), the result
   is selectable, searchable, and editable in any PDF editor —
   unlike a plain scanned image.

   Each entry in ocrPages is:
   { id, file, dataUrl, status: 'pending'|'processing'|'done'|'error',
     progress (0-1), text, error }
   ============================================================ */

let ocrPages = [];
let ocrPageSeq = 0;
let ocrRunning = false;

document.getElementById('ocrOpenInput').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if(!files.length) return;

  for(const file of files){
    const dataUrl = await readFileAsDataUrl(file);
    ocrPages.push({
      id: ++ocrPageSeq,
      file,
      dataUrl,
      status: 'pending',
      progress: 0,
      text: '',
      error: ''
    });
  }
  renderOcrPages();
  setOcrStatus(files.length + ' photo(s) added. Click "Run OCR" when ready.');
});

function readFileAsDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function setOcrStatus(msg){
  document.getElementById('ocrStatus').textContent = msg || '';
}

function ocrPageById(id){
  return ocrPages.find(p => p.id === id);
}

function removeOcrPage(id){
  ocrPages = ocrPages.filter(p => p.id !== id);
  renderOcrPages();
}

function clearOcrPages(){
  if(ocrRunning) return;
  ocrPages = [];
  renderOcrPages();
  setOcrStatus('');
}

/* Pull any hand-edited text out of the on-screen textareas back into
   state, so nothing typed after OCR finished gets lost before we
   read from ocrPages elsewhere (e.g. when building the PDF). */
function syncOcrTextFromDom(){
  ocrPages.forEach(p => {
    const ta = document.getElementById('ocr-text-' + p.id);
    if(ta) p.text = ta.value;
  });
}

function renderOcrPages(){
  const list = document.getElementById('ocrPageList');
  const empty = document.getElementById('ocrEmptyState');
  const runBtn = document.getElementById('ocrRunBtn');
  const genBtn = document.getElementById('ocrGenerateBtn');
  const clearBtn = document.getElementById('ocrClearBtn');

  empty.style.display = ocrPages.length ? 'none' : 'block';
  runBtn.disabled = ocrRunning || ocrPages.length === 0;
  clearBtn.disabled = ocrRunning || ocrPages.length === 0;
  genBtn.disabled = ocrPages.length === 0;

  // Preserve whatever's currently typed before wiping the DOM and rebuilding it.
  syncOcrTextFromDom();

  list.innerHTML = ocrPages.map((p, idx) => `
    <div class="ocr-page-card" data-page-id="${p.id}">
      <div>
        <div class="ocr-thumb-box"><img src="${p.dataUrl}" alt="Page ${idx + 1}"></div>
        <div class="ocr-page-meta">
          <span class="ocr-page-num">Page ${idx + 1}</span>
          <button type="button" class="ocr-remove-btn" onclick="removeOcrPage(${p.id})" ${ocrRunning ? 'disabled' : ''}>Remove</button>
        </div>
      </div>
      <div class="ocr-page-body">
        <div class="ocr-page-status">
          <span class="ocr-badge ${p.status}" id="ocr-badge-${p.id}">${ocrBadgeLabel(p)}</span>
          <div class="ocr-progress-track"><div class="ocr-progress-fill" id="ocr-progress-${p.id}" style="width:${Math.round((p.progress||0)*100)}%;"></div></div>
        </div>
        <textarea class="ocr-page-textarea" id="ocr-text-${p.id}" placeholder="Recognized text will show up here once OCR runs — or just type/paste text yourself.">${escapeHtml(p.text)}</textarea>
        ${p.status === 'error' ? `<div style="color:#a33;font-size:12px;margin-top:6px;">${escapeHtml(p.error || 'OCR failed for this photo.')}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function ocrBadgeLabel(p){
  switch(p.status){
    case 'processing': return 'Processing…';
    case 'done': return 'Done';
    case 'error': return 'Error';
    default: return 'Pending';
  }
}

function escapeHtml(str){
  return (str || '').replace(/[&<>]/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[ch]));
}

async function runOcrOnAllPages(){
  if(ocrRunning || !ocrPages.length) return;
  if(typeof Tesseract === 'undefined'){
    setOcrStatus('OCR engine failed to load (needs an internet connection the first time). Please check your connection and try again.');
    return;
  }

  ocrRunning = true;
  syncOcrTextFromDom();
  const lang = document.getElementById('ocrLangSelect').value;
  renderOcrPages();

  for(let i = 0; i < ocrPages.length; i++){
    const page = ocrPages[i];
    page.status = 'processing';
    page.progress = 0;
    updatePageStatusUI(page);
    setOcrStatus(`Reading photo ${i + 1} of ${ocrPages.length}…`);

    try{
      const { data } = await Tesseract.recognize(page.file, lang, {
        logger: (m) => {
          if(m.status === 'recognizing text' && typeof m.progress === 'number'){
            page.progress = m.progress;
            updatePageStatusUI(page);
          }
        }
      });
      page.text = (data && data.text ? data.text.trim() : '');
      page.status = 'done';
      page.progress = 1;
    } catch(err){
      console.error(err);
      page.status = 'error';
      page.error = err && err.message ? err.message : 'OCR failed for this photo.';
    }
    updatePageStatusUI(page);
    const textarea = document.getElementById('ocr-text-' + page.id);
    if(textarea) textarea.value = page.text;
  }

  ocrRunning = false;
  renderOcrPages();
  setOcrStatus('OCR finished. Check the recognized text below, fix anything it missed, then generate the PDF.');
}

function updatePageStatusUI(page){
  const badge = document.getElementById('ocr-badge-' + page.id);
  const fill = document.getElementById('ocr-progress-' + page.id);
  if(badge){
    badge.textContent = ocrBadgeLabel(page);
    badge.className = 'ocr-badge ' + page.status;
  }
  if(fill){
    fill.style.width = Math.round((page.progress || 0) * 100) + '%';
  }
  const runBtn = document.getElementById('ocrRunBtn');
  const clearBtn = document.getElementById('ocrClearBtn');
  if(runBtn) runBtn.disabled = ocrRunning || ocrPages.length === 0;
  if(clearBtn) clearBtn.disabled = ocrRunning || ocrPages.length === 0;
}

function generateOcrPdf(){
  if(!ocrPages.length) return;
  syncOcrTextFromDom();

  if(typeof window.jspdf === 'undefined'){
    setOcrStatus('PDF library failed to load. Please check your connection and try again.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48, marginY = 56;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2;
  const lineHeight = 16;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);

  ocrPages.forEach((page, idx) => {
    if(idx > 0) pdf.addPage();
    let y = marginY;
    const text = (page.text || '').trim() || '[No text recognized on this page]';
    const paragraphs = text.split(/\n/);

    paragraphs.forEach(paragraph => {
      const lines = pdf.splitTextToSize(paragraph.length ? paragraph : ' ', maxWidth);
      lines.forEach(line => {
        if(y > pageHeight - marginY){
          pdf.addPage();
          y = marginY;
        }
        pdf.text(line, marginX, y);
        y += lineHeight;
      });
    });
  });

  pdf.save('editable_text.pdf');
  setOcrStatus('PDF downloaded — ' + ocrPages.length + ' page(s).');
}
