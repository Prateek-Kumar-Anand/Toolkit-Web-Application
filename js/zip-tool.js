/* ============================================================
   MODULE 4: .ZIP OPERATION
   Client-side unzip + selective download using JSZip.
   - Open a .zip -> lists every file inside (with size + icon)
   - Tick the files you want (or "Select All")
   - Download: a single ticked file downloads as-is; multiple
     ticked files are bundled into a fresh "selected-files.zip"
     (folder structure preserved), all built in the browser.
   Nothing is ever uploaded anywhere.
   ============================================================ */
let zipEntries = [];   // { path, name, dir, size, entry, selected }

document.getElementById('zipOpenInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  await openZipFile(file);
  e.target.value = '';
});

// Event delegation for per-row checkboxes and download buttons — avoids
// having to escape arbitrary filenames (quotes, apostrophes, etc.) into
// inline onclick strings.
document.getElementById('zipList').addEventListener('change', (e) => {
  const check = e.target.closest('.zip-check');
  if(!check) return;
  const row = check.closest('.zip-row');
  zipToggleEntry(row.dataset.path, check.checked);
});
document.getElementById('zipList').addEventListener('click', (e) => {
  const btn = e.target.closest('.zip-dl');
  if(!btn) return;
  downloadSingleZipEntry(btn.closest('.zip-row').dataset.path);
});

async function openZipFile(file){
  setZipStatus('Reading ' + file.name + '...');
  try{
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    zipEntries = [];
    zip.forEach((relPath, entry) => {
      let size = '';
      if(entry._data && typeof entry._data.uncompressedSize === 'number'){
        size = entry._data.uncompressedSize;
      }
      zipEntries.push({
        path: relPath,
        name: relPath.split('/').filter(Boolean).pop() || relPath,
        dir: entry.dir,
        size,
        entry,
        selected: false
      });
    });
    zipEntries.sort((a, b) => a.path.localeCompare(b.path));

    document.getElementById('zipEmptyState').style.display = 'none';
    document.getElementById('zipSelectAllBtn').disabled = false;
    document.getElementById('zipFilterInput').disabled = false;
    document.getElementById('zipFilterInput').value = '';
    renderZipList();

    const fileCount = zipEntries.filter(z => !z.dir).length;
    setZipStatus(fileCount + ' file(s) found in ' + file.name + '.');
  } catch(e){
    alert('Could not read that .zip — it may be corrupted or password-protected: ' + e.message);
    console.error(e);
    setZipStatus('');
  }
}

function renderZipList(){
  const list = document.getElementById('zipList');
  const filter = document.getElementById('zipFilterInput').value.trim().toLowerCase();
  const visible = zipEntries.filter(z => !z.dir && (!filter || z.path.toLowerCase().includes(filter)));

  if(visible.length === 0){
    list.innerHTML = '<div class="zip-row" style="justify-content:center;color:#999;">No files match.</div>';
    updateZipDownloadBtn();
    return;
  }

  list.innerHTML = visible.map(z => {
    const slash = z.path.lastIndexOf('/');
    const folder = slash > -1 ? z.path.slice(0, slash + 1) : '';
    return `
      <div class="zip-row" data-path="${escapeAttr(z.path)}">
        <input type="checkbox" class="zip-check" ${z.selected ? 'checked' : ''}>
        <div class="zip-icon">${zipIconFor(z.name)}</div>
        <div class="zip-name" title="${escapeAttr(z.path)}">${folder ? '<span class="zip-path">' + escapeHtml(folder) + '</span>' : ''}${escapeHtml(z.name)}</div>
        <div class="zip-size">${formatBytes(z.size)}</div>
        <button class="zip-dl" type="button">Download</button>
      </div>
    `;
  }).join('');

  updateZipDownloadBtn();
}

function zipToggleEntry(path, checked){
  const z = zipEntries.find(e => e.path === path);
  if(z) z.selected = checked;
  updateZipDownloadBtn();
}

function zipToggleSelectAll(){
  const files = zipEntries.filter(z => !z.dir);
  const allSelected = files.length > 0 && files.every(z => z.selected);
  files.forEach(z => { z.selected = !allSelected; });
  renderZipList();
}

function updateZipDownloadBtn(){
  const files = zipEntries.filter(z => !z.dir);
  const selectedCount = files.filter(z => z.selected).length;

  const dlBtn = document.getElementById('zipDownloadBtn');
  dlBtn.disabled = selectedCount === 0;
  dlBtn.textContent = selectedCount > 0 ? `Download Selected (${selectedCount})` : 'Download Selected';

  const selectAllBtn = document.getElementById('zipSelectAllBtn');
  selectAllBtn.textContent = (files.length > 0 && selectedCount === files.length) ? 'Deselect All' : 'Select All';
}

async function downloadSingleZipEntry(path){
  const z = zipEntries.find(e => e.path === path);
  if(!z || z.dir) return;
  try{
    setZipStatus('Preparing ' + z.name + '...');
    const blob = await z.entry.async('blob');
    triggerBlobDownload(blob, z.name);
    setZipStatus('Downloaded ' + z.name + '.');
  } catch(e){
    alert('Could not extract ' + z.name + ': ' + e.message);
    console.error(e);
  }
}

async function downloadSelectedZipEntries(){
  const selected = zipEntries.filter(z => !z.dir && z.selected);
  if(selected.length === 0){
    alert('Tick at least one file to download.');
    return;
  }

  const btn = document.getElementById('zipDownloadBtn');
  btn.disabled = true;
  try{
    if(selected.length === 1){
      await downloadSingleZipEntry(selected[0].path);
    } else {
      btn.textContent = 'Building .zip...';
      setZipStatus('Bundling ' + selected.length + ' file(s)...');
      const outZip = new JSZip();
      for(const z of selected){
        const blob = await z.entry.async('blob');
        outZip.file(z.path, blob);
      }
      const outBlob = await outZip.generateAsync({ type: 'blob' });
      triggerBlobDownload(outBlob, 'selected-files.zip');
      setZipStatus('Downloaded ' + selected.length + ' file(s) as selected-files.zip.');
    }
  } catch(e){
    alert('Something went wrong building the download: ' + e.message);
    console.error(e);
  } finally{
    updateZipDownloadBtn();
  }
}

function triggerBlobDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setZipStatus(msg){
  document.getElementById('zipStatus').textContent = msg;
}

function zipIconFor(name){
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map = {
    pdf:'📕', doc:'📄', docx:'📄', txt:'📄', md:'📄', rtf:'📄',
    xls:'📊', xlsx:'📊', csv:'📊',
    ppt:'📽', pptx:'📽',
    png:'🖼', jpg:'🖼', jpeg:'🖼', gif:'🖼', svg:'🖼', webp:'🖼', bmp:'🖼',
    zip:'🗜', rar:'🗜', '7z':'🗜', gz:'🗜', tar:'🗜',
    mp3:'🎵', wav:'🎵', flac:'🎵', mp4:'🎞', mov:'🎞', avi:'🎞', mkv:'🎞',
    js:'⚙️', ts:'⚙️', json:'⚙️', html:'⚙️', css:'⚙️', py:'⚙️', java:'⚙️', c:'⚙️', cpp:'⚙️'
  };
  return map[ext] || '📦';
}

function formatBytes(bytes){
  if(bytes === '' || bytes === undefined || bytes === null) return '';
  if(bytes === 0) return '0 B';
  const units = ['B','KB','MB','GB'];
  let n = bytes, i = 0;
  while(n >= 1024 && i < units.length - 1){ n /= 1024; i++; }
  return (i === 0 ? n : n.toFixed(1)) + ' ' + units[i];
}

// escapeHtml is already defined globally by js/resume.js (plain <script>
// files share one global scope), so it's reused here for text content.
// Attribute values additionally need quotes escaped (real filenames can,
// rarely, contain them), hence this small wrapper.
function escapeAttr(str){
  return escapeHtml(str).replace(/"/g, '&quot;');
}
