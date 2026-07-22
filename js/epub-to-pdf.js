/* ============================================================
   MODULE 11: EPUB -> PDF
   Reads a DRM-free .epub (itself a zip of XHTML chapters) with
   JSZip, walks its spine in reading order, and inlines every
   image as a downsized data URL. From there it offers two exports:
     - "Download as PDF" renders each chapter page-by-page with
       jsPDF + html2canvas and triggers an automatic download.
     - "Open Print View" hands the assembled book to the browser's
       native print -> Save as PDF instead. It skips canvas
       rendering entirely, so it's far lighter on memory for big,
       image-heavy books (especially on phones).
   Everything happens client-side; the book is never uploaded.
   ============================================================ */

const EPUB_MAX_BYTES = 200 * 1024 * 1024;
const EPUB_MAX_IMG_DIM = 1400; // px — plenty for a printed page, keeps memory in check on phones

const EPUB_BASE_STYLE =
  "body{font-family:Georgia,'Times New Roman',serif;line-height:1.55;color:#1b1b1b;}" +
  "img,svg{max-width:100%;height:auto;display:block;margin:0.8em auto;}" +
  "h1,h2,h3,h4{font-family:Georgia,serif;line-height:1.25;}" +
  "p{margin:0 0 1em 0;}" +
  "table{max-width:100%;border-collapse:collapse;}" +
  "* { -webkit-print-color-adjust: exact; }";

let epubFile = null;
let epubBusy = false;
let epubCachedBook = null; // { title, creator, css, chapters } — parsed once, reused by either export path

document.getElementById('epubOpenInput').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (file) handleEpubFile(file);
});

function handleEpubFile(file) {
  setEpubStatus('');
  if (!file.name.toLowerCase().endsWith('.epub')) {
    setEpubStatus('That file doesn\'t look like an EPUB. Please choose a .epub file.');
    return;
  }
  if (file.size > EPUB_MAX_BYTES) {
    setEpubStatus(`This file is ${epubBytesLabel(file.size)}, which is over the 200 MB limit.`);
    return;
  }
  epubFile = file;
  epubCachedBook = null;

  document.getElementById('epubEmptyState').style.display = 'none';
  const card = document.getElementById('epubFileCard');
  card.style.display = 'flex';
  document.getElementById('epubFileName').textContent = file.name;
  document.getElementById('epubFileName').title = file.name;
  document.getElementById('epubFileSize').textContent = epubBytesLabel(file.size);
  document.getElementById('epubDownloadBtn').disabled = false;
  document.getElementById('epubPrintBtn').disabled = false;
  document.getElementById('epubClearBtn').disabled = false;
  setEpubProgress(0);
}

function clearEpub() {
  if (epubBusy) return;
  epubFile = null;
  epubCachedBook = null;
  document.getElementById('epubEmptyState').style.display = 'block';
  document.getElementById('epubFileCard').style.display = 'none';
  document.getElementById('epubDownloadBtn').disabled = true;
  document.getElementById('epubPrintBtn').disabled = true;
  document.getElementById('epubClearBtn').disabled = true;
  setEpubStatus('');
  setEpubProgress(0);
}

function epubBytesLabel(b) {
  if (b > 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}
function setEpubStatus(msg) {
  document.getElementById('epubStatus').textContent = msg || '';
}
function setEpubProgress(frac) {
  document.getElementById('epubProgressFill').style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
}
function setEpubBusy(busy) {
  epubBusy = busy;
  document.getElementById('epubDownloadBtn').disabled = busy || !epubFile;
  document.getElementById('epubPrintBtn').disabled = busy || !epubFile;
  document.getElementById('epubClearBtn').disabled = busy || !epubFile;
}

function epubDirname(path) {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.substring(0, i);
}
function epubResolvePath(baseDir, rel) {
  if (!rel) return null;
  rel = rel.split('#')[0];
  try { rel = decodeURIComponent(rel); } catch (e) {}
  if (/^([a-z]+:)?\/\//i.test(rel) || rel.indexOf('data:') === 0) return null;
  const baseParts = baseDir ? baseDir.split('/').filter(Boolean) : [];
  const stack = baseParts.slice();
  rel.split('/').forEach(part => {
    if (!part || part === '.') return;
    if (part === '..') stack.pop();
    else stack.push(part);
  });
  return stack.join('/');
}
function epubFindZipFile(zip, path) {
  if (!path) return null;
  const direct = zip.file(path);
  if (direct) return direct;
  const lower = path.toLowerCase();
  const key = Object.keys(zip.files).find(k => k.toLowerCase() === lower);
  return key ? zip.file(key) : null;
}
function epubExtToMime(ext) {
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp' };
  return map[(ext || '').toLowerCase()] || 'image/jpeg';
}
function epubEscapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function epubSanitizeFilename(name) {
  return String(name).replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 120) || 'book';
}

function epubFriendlyError(err) {
  const msg = (err && err.message) || String(err);
  if (/container\.xml|content\.opf|rootfile|No readable chapters/i.test(msg)) return msg;
  if (/central directory|corrupted zip|invalid signature/i.test(msg)) {
    return 'This file couldn\'t be opened as an EPUB. It may be corrupted, or protected by DRM (Kindle / Adobe Digital Editions aren\'t supported).';
  }
  return 'Something went wrong while converting: ' + msg;
}

/* Downscales + re-encodes an embedded image before it ever reaches html2canvas.
   EPUB illustrations/covers are often far higher resolution than a printed page
   needs, and feeding them in at full size is the single biggest cause of the
   renderer running out of memory on phones. */
function epubResizeImageBlob(blob, keepAlpha) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => {
      const w = im.naturalWidth || 1, h = im.naturalHeight || 1;
      const scale = Math.min(1, EPUB_MAX_IMG_DIM / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      try {
        ctx.drawImage(im, 0, 0, cw, ch);
        const dataUrl = keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.82);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
    im.src = url;
  });
}

async function epubParse(file, onProgress) {
  const buf = await file.arrayBuffer();
  onProgress(0.04, 'Unzipping EPUB…');
  const zip = await JSZip.loadAsync(buf);

  const containerFile = epubFindZipFile(zip, 'META-INF/container.xml');
  if (!containerFile) throw new Error('This isn\'t a valid EPUB (missing META-INF/container.xml).');
  const containerXml = await containerFile.async('text');
  const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
  const rootfileEl = containerDoc.getElementsByTagName('rootfile')[0];
  if (!rootfileEl) throw new Error('This isn\'t a valid EPUB (no rootfile listed in container.xml).');
  const opfPath = rootfileEl.getAttribute('full-path');
  const opfDir = epubDirname(opfPath);
  const opfFile = epubFindZipFile(zip, opfPath);
  if (!opfFile) throw new Error('This isn\'t a valid EPUB (content.opf is missing).');
  const opfText = await opfFile.async('text');
  const opfDoc = new DOMParser().parseFromString(opfText, 'application/xml');
  if (opfDoc.getElementsByTagName('parsererror').length) {
    throw new Error('Could not read this EPUB\'s metadata (content.opf is malformed).');
  }

  const getMeta = (tag) => {
    const els = opfDoc.getElementsByTagName(tag);
    return els.length ? (els[0].textContent || '').trim() : '';
  };
  const title = getMeta('dc:title') || file.name.replace(/\.epub$/i, '');
  const creator = getMeta('dc:creator');

  const manifestItems = {};
  Array.from(opfDoc.getElementsByTagName('item')).forEach(el => {
    manifestItems[el.getAttribute('id')] = {
      href: el.getAttribute('href'),
      mediaType: el.getAttribute('media-type') || ''
    };
  });

  const chapterHrefs = Array.from(opfDoc.getElementsByTagName('itemref'))
    .map(el => manifestItems[el.getAttribute('idref')])
    .filter(item => item && item.href)
    .map(item => item.href);
  if (chapterHrefs.length === 0) {
    throw new Error('No readable chapters were found in this EPUB. It may be DRM-protected or malformed.');
  }

  const mediaTypeByPath = {};
  Object.keys(manifestItems).forEach(id => {
    const it = manifestItems[id];
    if (it.mediaType && it.mediaType.indexOf('image/') === 0) {
      mediaTypeByPath[epubResolvePath(opfDir, it.href)] = it.mediaType;
    }
  });

  const cssHrefs = Object.values(manifestItems).filter(it => it.mediaType === 'text/css').map(it => it.href);
  onProgress(0.08, 'Reading stylesheets…');
  const cssParts = await Promise.all(cssHrefs.map(async (href) => {
    const f = epubFindZipFile(zip, epubResolvePath(opfDir, href));
    if (!f) return '';
    try { return await f.async('text'); } catch (e) { return ''; }
  }));
  const css = cssParts.join('\n');

  const chapters = [];
  const total = chapterHrefs.length;
  for (let idx = 0; idx < total; idx++) {
    const fullPath = epubResolvePath(opfDir, chapterHrefs[idx]);
    const chapFile = epubFindZipFile(zip, fullPath);
    if (!chapFile) {
      onProgress(0.1 + (idx / total) * 0.9, `Skipping missing chapter ${idx + 1} of ${total}…`);
      continue;
    }
    const text = await chapFile.async('text');
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const body = doc.body;
    if (!body) continue;

    const chapDir = epubDirname(fullPath);
    const imgs = Array.from(body.querySelectorAll('img'));
    await Promise.all(imgs.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      const imgPath = epubResolvePath(chapDir, src);
      if (!imgPath) return;
      const imgFile = epubFindZipFile(zip, imgPath);
      if (!imgFile) return;
      try {
        const u8 = await imgFile.async('uint8array');
        const mt = mediaTypeByPath[imgPath] || epubExtToMime(imgPath.split('.').pop());
        const keepAlpha = mt === 'image/png' || mt === 'image/gif';
        const blob = new Blob([u8], { type: mt });
        const dataUrl = await epubResizeImageBlob(blob, keepAlpha);
        img.setAttribute('src', dataUrl);
      } catch (e) { /* leave the original (broken) src rather than fail the whole book */ }
    }));

    chapters.push({ html: body.innerHTML });
    onProgress(0.1 + ((idx + 1) / total) * 0.9, `Reading chapter ${idx + 1} of ${total}…`);
  }

  return { title, creator, css, chapters };
}

async function epubGetBook(onProgress) {
  if (epubCachedBook) { onProgress(1, 'Using previously parsed book…'); return epubCachedBook; }
  epubCachedBook = await epubParse(epubFile, onProgress);
  return epubCachedBook;
}

async function epubRenderPdf(book, opts, onProgress) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: opts.pageSize, compress: true });
  const margin = 42;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const windowWidth = 800;

  const frame = document.getElementById('epubRenderFrame');
  frame.style.width = windowWidth + 'px';

  doc.setFont('times', 'bold'); doc.setFontSize(26);
  doc.text(book.title, pageWidth / 2, 220, { align: 'center', maxWidth: contentWidth });
  if (book.creator) {
    doc.setFont('times', 'normal'); doc.setFontSize(13);
    doc.text(book.creator, pageWidth / 2, 250, { align: 'center', maxWidth: contentWidth });
  }

  const total = book.chapters.length;
  for (let idx = 0; idx < total; idx++) {
    doc.addPage();
    const frameDoc = frame.contentDocument;
    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${EPUB_BASE_STYLE}\n${book.css}</style></head><body>${book.chapters[idx].html}</body></html>`);
    frameDoc.close();

    await doc.html(frameDoc.body, {
      x: margin, y: margin, width: contentWidth, windowWidth,
      autoPaging: 'text',
      html2canvas: { scale: opts.scale, useCORS: true, logging: false }
    });
    try { frameDoc.body.innerHTML = ''; } catch (e) {}
    onProgress(0.5 + ((idx + 1) / total) * 0.48, `Rendering page for chapter ${idx + 1} of ${total}…`);
  }
  return doc;
}

async function convertEpubToPdf() {
  if (epubBusy || !epubFile) return;
  if (typeof JSZip === 'undefined' || typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined') {
    setEpubStatus('A required library failed to load. Check your connection and reload the page.');
    return;
  }
  setEpubBusy(true);
  setEpubProgress(0);
  setEpubStatus('Starting…');
  try {
    const book = await epubGetBook((frac, label) => { setEpubProgress(frac * 0.5); setEpubStatus(label); });
    setEpubStatus('Rendering PDF pages…');
    const doc = await epubRenderPdf(book, {
      pageSize: document.getElementById('epubPageSize').value,
      scale: parseFloat(document.getElementById('epubQuality').value)
    }, (frac, label) => { setEpubProgress(frac); setEpubStatus(label); });

    setEpubProgress(1);
    setEpubStatus('Finalizing…');
    const blob = doc.output('blob');
    const filename = epubSanitizeFilename(book.title) + '.pdf';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    setEpubStatus(`PDF downloaded — ${epubBytesLabel(blob.size)}.`);
  } catch (err) {
    console.error(err);
    setEpubStatus(epubFriendlyError(err));
  } finally {
    setEpubBusy(false);
  }
}

async function openEpubPrintView() {
  if (epubBusy || !epubFile) return;
  if (typeof JSZip === 'undefined') {
    setEpubStatus('A required library failed to load. Check your connection and reload the page.');
    return;
  }
  // Open synchronously, inside the click gesture, so it isn't blocked by popup blockers.
  const printWin = window.open('', '_blank');
  if (!printWin) {
    setEpubStatus('Your browser blocked the print window. Please allow pop-ups for this page and try again.');
    return;
  }
  printWin.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preparing…</title></head><body style="font-family:sans-serif;padding:40px;color:#555;">Preparing your book…</body></html>');

  setEpubBusy(true);
  setEpubProgress(0);
  setEpubStatus('Starting…');
  try {
    const book = await epubGetBook((frac, label) => { setEpubProgress(frac * 0.9); setEpubStatus(label); });
    setEpubProgress(0.95);
    setEpubStatus('Building print view…');

    const pageCss =
      '@page{margin:2cm;}' +
      'body{font-family:Georgia,"Times New Roman",serif;line-height:1.6;color:#111;}' +
      'img,svg{max-width:100%;height:auto;}' +
      '.epub-chapter{page-break-before:always;}' +
      '.epub-chapter:first-of-type{page-break-before:avoid;}' +
      '.epub-cover{text-align:center;padding-top:35vh;page-break-after:always;}' +
      '.epub-cover h1{font-size:28px;} .epub-cover p{color:#444;}';
    const bodyHtml =
      `<div class="epub-cover"><h1>${epubEscapeHtml(book.title)}</h1>${book.creator ? `<p>${epubEscapeHtml(book.creator)}</p>` : ''}</div>` +
      book.chapters.map(c => `<div class="epub-chapter">${c.html}</div>`).join('\n');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${epubEscapeHtml(book.title)}</title><style>${pageCss}\n${book.css}</style></head><body>${bodyHtml}</body></html>`;

    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();

    setEpubProgress(1);
    setEpubStatus('Print view opened in a new tab — use "Save as PDF" there to finish.');
    setTimeout(() => { try { printWin.focus(); printWin.print(); } catch (e) {} }, 400);
  } catch (err) {
    console.error(err);
    setEpubStatus(epubFriendlyError(err));
    try { printWin.close(); } catch (e) {}
  } finally {
    setEpubBusy(false);
  }
}
