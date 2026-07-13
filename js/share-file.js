/* ============================================================
   MODULE 10: SHARE FILE
   Pick one or more files (any type — PDFs, photos, videos, anything)
   and hand them straight to the device's native share sheet via the
   Web Share API (navigator.share with a `files` payload) — the same
   sheet you'd get tapping "Share" in any app: AirDrop, Bluetooth,
   Messages, Mail, WhatsApp, Drive, whatever's installed. The file
   goes device-to-target directly — it is never uploaded anywhere.

   Reliability & speed choices, since this is meant to just work:
   - Files with a missing/generic MIME type (common with dragged PDFs
     and some camera exports) are re-typed from their extension before
     anything touches canShare/share/download, so receiving apps see
     the correct file kind instead of a bare "file" attachment.
   - Photos and videos get an instant preview thumbnail (object URL —
     no re-encoding, so it's free), and PDFs get a real first-page
     preview via pdf.js. If a PDF can't be rendered, that's a strong
     signal it may be corrupt, so a warning badge is shown *before*
     the user tries to send it, rather than finding out after.
   - Folder drops and exact duplicate files are filtered out on entry.
   - Every path leads somewhere: if native sharing isn't available, or
     the share sheet rejects the payload, or navigator.share() throws
     for any reason, this always falls back to a guaranteed-to-work
     download (single file as-is, multiple bundled into a .zip) — the
     user is never left with a silent failure.
   - The .zip fallback stores already-compressed formats (photos,
     videos, PDFs, audio, archives) instead of re-deflating them —
     that's wasted CPU for zero size benefit — and reports live
     progress for large batches.

   Reuses zipIconFor / formatBytes / escapeHtml / escapeAttr /
   triggerBlobDownload, already defined globally by zip-tool.js, and
   pdfjsLib (configured by pdf-editor.js), all loaded earlier.
   ============================================================ */
let shareFiles = []; // { file: File, id: string, thumbUrl: string|null, thumbKind: 'image'|'video'|'pdf'|'icon', pdfWarning: boolean }
let shareIdCounter = 0;

// Extensions -> correct MIME type, used to fix files whose browser-reported
// type is blank or generic (application/octet-stream), which is common for
// dragged PDFs and some phone photo/video exports.
const SHARE_EXT_MIME = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  webm: 'video/webm', m4v: 'video/x-m4v', '3gp': 'video/3gpp',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', flac: 'audio/flac', ogg: 'audio/ogg',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', json: 'application/json', html: 'text/html',
  zip: 'application/zip', rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed',
  gz: 'application/gzip', tar: 'application/x-tar'
};

const shareFileInputEl = document.getElementById('shareFileInput');
const shareDropzoneEl = document.getElementById('shareDropzone');

shareFileInputEl.addEventListener('change', (e) => {
  addShareFiles(e.target.files);
  e.target.value = '';
});

// Drag & drop onto the whole panel (works whether it's still showing the
// empty state or already has a list of files in it).
['dragenter', 'dragover'].forEach(evt => {
  shareDropzoneEl.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    shareDropzoneEl.classList.add('drag-over');
  });
});
['dragleave', 'drop'].forEach(evt => {
  shareDropzoneEl.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    shareDropzoneEl.classList.remove('drag-over');
  });
});
shareDropzoneEl.addEventListener('drop', (e) => {
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
    addShareFiles(e.dataTransfer.files);
  }
});

// Event delegation for per-row Download / remove buttons.
document.getElementById('shareList').addEventListener('click', (e) => {
  const dl = e.target.closest('.zip-dl:not(.share-remove)');
  if (dl) {
    downloadShareFile(dl.closest('.zip-row').dataset.id);
    return;
  }
  const rm = e.target.closest('.share-remove');
  if (rm) {
    removeShareFile(rm.closest('.zip-row').dataset.id);
  }
});

/* ---------------- Adding files: validate, re-type, preview ---------------- */

function addShareFiles(fileList) {
  const incoming = Array.from(fileList);
  let addedCount = 0, skippedFolders = 0, skippedDupes = 0;

  incoming.forEach(rawFile => {
    // Folders dropped via drag-and-drop typically show up as a zero-byte,
    // typeless "file" — there's nothing to share, so filter them out
    // instead of letting them fail silently later at share/download time.
    if (rawFile.size === 0 && !rawFile.type) {
      skippedFolders++;
      return;
    }
    const isDupe = shareFiles.some(f =>
      f.file.name === rawFile.name && f.file.size === rawFile.size && f.file.lastModified === rawFile.lastModified
    );
    if (isDupe) {
      skippedDupes++;
      return;
    }

    const file = normalizeFileType(rawFile);
    const entry = { file, id: 'f' + (shareIdCounter++), thumbUrl: null, thumbKind: 'icon', pdfWarning: false };
    shareFiles.push(entry);
    addedCount++;
    generateSharePreview(entry); // async, fire-and-forget — re-renders itself when ready
  });

  renderShareList();

  if (skippedFolders > 0 || skippedDupes > 0) {
    const parts = [];
    if (addedCount > 0) parts.push(addedCount + ' file(s) added');
    if (skippedDupes > 0) parts.push(skippedDupes + ' duplicate(s) skipped');
    if (skippedFolders > 0) parts.push(skippedFolders + " folder/empty item(s) skipped (folders can't be shared directly)");
    setShareStatus(parts.join(' — ') + '.');
  }
}

// Returns the same File if its type already looks legitimate, otherwise a
// re-typed copy (same bytes, correct MIME) inferred from the extension —
// this is what keeps a dragged PDF from arriving on the other end as a
// nameless generic attachment.
function normalizeFileType(file) {
  if (file.type && file.type !== 'application/octet-stream') return file;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const correctType = SHARE_EXT_MIME[ext];
  if (!correctType) return file;
  try {
    return new File([file], file.name, { type: correctType, lastModified: file.lastModified });
  } catch (e) {
    return file; // very old browsers without a File constructor — harmless fallback
  }
}

async function generateSharePreview(entry) {
  const file = entry.file;
  try {
    if (file.type.startsWith('image/')) {
      entry.thumbUrl = URL.createObjectURL(file);
      entry.thumbKind = 'image';
      renderShareList();
    } else if (file.type.startsWith('video/')) {
      entry.thumbUrl = URL.createObjectURL(file);
      entry.thumbKind = 'video';
      renderShareList();
    } else if (file.type === 'application/pdf') {
      const buffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 0.28 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      // Only apply if this entry is still in the list — it may have been
      // removed while the render was in flight.
      if (shareFiles.includes(entry)) {
        entry.thumbUrl = canvas.toDataURL('image/png');
        entry.thumbKind = 'pdf';
        renderShareList();
      }
    }
  } catch (e) {
    console.error('Preview failed for ' + file.name, e);
    if (file.type === 'application/pdf' && shareFiles.includes(entry)) {
      // A PDF that pdf.js can't even open is very likely damaged —
      // surfacing that now, before a share attempt, is the whole point.
      entry.pdfWarning = true;
      renderShareList();
    }
  }
}

function removeShareFile(id) {
  const idx = shareFiles.findIndex(f => f.id === id);
  if (idx === -1) return;
  revokeSharePreview(shareFiles[idx]);
  shareFiles.splice(idx, 1);
  renderShareList();
}

function clearShareFiles() {
  shareFiles.forEach(revokeSharePreview);
  shareFiles = [];
  renderShareList();
  setShareStatus('');
}

function revokeSharePreview(entry) {
  // PDF thumbs are data URLs (from canvas), not object URLs — nothing to revoke.
  if (entry.thumbUrl && entry.thumbKind !== 'pdf') {
    try { URL.revokeObjectURL(entry.thumbUrl); } catch (e) { /* already gone */ }
  }
}

/* ---------------- Rendering ---------------- */

function renderShareList() {
  const empty = document.getElementById('shareEmptyState');
  const list = document.getElementById('shareList');
  const clearBtn = document.getElementById('shareClearBtn');
  const shareBtn = document.getElementById('shareBtn');

  if (shareFiles.length === 0) {
    empty.style.display = '';
    list.style.display = 'none';
    list.innerHTML = '';
    clearBtn.disabled = true;
    shareBtn.disabled = true;
    setShareStatus('');
    updateShareFallbackNote();
    return;
  }

  empty.style.display = 'none';
  list.style.display = '';
  clearBtn.disabled = false;
  shareBtn.disabled = false;

  list.innerHTML = shareFiles.map(f => `
    <div class="zip-row" data-id="${f.id}">
      ${shareThumbMarkup(f)}
      <div class="zip-name" title="${escapeAttr(f.file.name)}">${escapeHtml(f.file.name)}</div>
      ${f.pdfWarning ? '<span class="share-warn" title="Couldn\'t open this PDF to preview it — it may be corrupted. Check it before sending.">⚠️ check file</span>' : ''}
      <div class="zip-size">${formatBytes(f.file.size)}</div>
      <button class="zip-dl" type="button">Download</button>
      <button class="zip-dl share-remove" type="button" title="Remove from list">✕</button>
    </div>
  `).join('');

  const totalBytes = shareFiles.reduce((sum, f) => sum + f.file.size, 0);
  let statusMsg = shareFiles.length + ' file(s) selected — ' + formatBytes(totalBytes) + ' total.';
  if (totalBytes > 500 * 1024 * 1024) {
    statusMsg += ' That\'s a large batch — if the share sheet struggles with it, downloading is the safe fallback.';
  }
  setShareStatus(statusMsg);
  updateShareFallbackNote();
}

function shareThumbMarkup(f) {
  if (f.thumbKind === 'image' && f.thumbUrl) {
    return `<img class="share-thumb" src="${escapeAttr(f.thumbUrl)}" alt="">`;
  }
  if (f.thumbKind === 'video' && f.thumbUrl) {
    return `<video class="share-thumb" src="${escapeAttr(f.thumbUrl)}" muted playsinline preload="metadata"></video>`;
  }
  if (f.thumbKind === 'pdf' && f.thumbUrl) {
    return `<img class="share-thumb share-thumb-pdf" src="${f.thumbUrl}" alt="">`;
  }
  return `<div class="zip-icon">${zipIconFor(f.file.name)}</div>`;
}

/* ---------------- Downloading (single row, or as a fallback) ---------------- */

function downloadShareFile(id) {
  const f = shareFiles.find(x => x.id === id);
  if (!f) return;
  triggerBlobDownload(f.file, f.file.name);
}

// Photos, videos, PDFs, audio, and archives are already compressed — asking
// JSZip to deflate them again just burns CPU for no size reduction, so those
// get stored as-is; everything else keeps normal compression.
function isIncompressible(file) {
  const type = file.type || '';
  if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) return true;
  return ['application/pdf', 'application/zip', 'application/x-7z-compressed', 'application/vnd.rar', 'application/gzip'].includes(type);
}

async function downloadAllSharedAsZip() {
  setShareStatus('Bundling ' + shareFiles.length + ' file(s)...');
  try {
    const zip = new JSZip();
    shareFiles.forEach(f => {
      zip.file(f.file.name, f.file, { compression: isIncompressible(f.file) ? 'STORE' : 'DEFLATE' });
    });
    const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      setShareStatus('Bundling... ' + Math.round(metadata.percent) + '%');
    });
    triggerBlobDownload(blob, 'shared-files.zip');
    setShareStatus(shareUnsupportedReason() + ' — they downloaded as shared-files.zip so you can attach them wherever you need.');
  } catch (e) {
    console.error(e);
    setShareStatus("Couldn't bundle the files (" + e.message + ") — try each row's own Download button instead.");
  }
}

async function fallbackDownload() {
  if (shareFiles.length === 1) {
    downloadShareFile(shareFiles[0].id);
    setShareStatus(shareUnsupportedReason() + ' — it downloaded instead so you can attach it wherever you need.');
  } else {
    await downloadAllSharedAsZip();
  }
}

function shareUnsupportedReason() {
  return navigator.share
    ? "This browser can't hand these file(s) to the share sheet"
    : "Native sharing isn't available in this browser";
}

/* ---------------- The actual Share action ---------------- */

async function shareSelectedFiles() {
  if (shareFiles.length === 0) return;
  const files = shareFiles.map(f => f.file);
  const btn = document.getElementById('shareBtn');
  const canShareAll = !!(navigator.share && navigator.canShare && navigator.canShare({ files }));

  if (canShareAll) {
    btn.disabled = true;
    setShareStatus('Opening the share sheet...');
    try {
      await navigator.share({
        files,
        title: files.length === 1 ? files[0].name : files.length + ' files'
      });
      setShareStatus('Shared successfully.');
    } catch (err) {
      if (err.name === 'AbortError') {
        setShareStatus('Share cancelled.');
      } else {
        // Even though canShare said yes, some browsers/OSes can still
        // reject a share at the last second (payload too large, receiving
        // app declined, etc.) — fall back rather than leave a dead end.
        console.error(err);
        await fallbackDownload();
      }
    } finally {
      btn.disabled = false;
    }
    return;
  }

  // No native file-sharing support here (or this combination of files isn't
  // shareable) — go straight to the guaranteed-to-work download path.
  btn.disabled = true;
  try {
    await fallbackDownload();
  } finally {
    btn.disabled = false;
  }
}

function updateShareFallbackNote() {
  const note = document.getElementById('shareFallbackNote');
  if (shareFiles.length === 0) {
    note.style.display = 'none';
    return;
  }
  const files = shareFiles.map(f => f.file);
  const canFileShare = !!(navigator.share && navigator.canShare && navigator.canShare({ files }));
  if (canFileShare) {
    note.style.display = 'none';
    return;
  }
  note.style.display = '';
  note.textContent = shareUnsupportedReason() + ' — tapping Share will download the file(s) instead so you can attach them manually.';
}

function setShareStatus(msg) {
  document.getElementById('shareStatus').textContent = msg;
}
