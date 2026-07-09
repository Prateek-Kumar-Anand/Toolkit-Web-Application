/* ============================================================
   MODULE 5: IMAGE EDITOR
   Pure client-side photo editing using the Canvas API — no
   external library needed. Supports: crop, resize, rotate,
   flip, brightness/contrast/saturation adjustment, quick
   filters (grayscale/sepia/invert), undo, and export as
   PNG/JPEG/WEBP.

   Model:
   - `baseCanvas` holds the current *committed* pixel state.
   - The visible <canvas id="imgCanvas"> always mirrors
     baseCanvas, except while the adjustment sliders are being
     dragged (live preview drawn with ctx.filter, not yet baked in).
   - Every destructive op (crop/resize/rotate/flip/apply
     adjustments/preset) pushes the previous baseCanvas onto an
     undo stack (as a dataURL) before mutating.
   ============================================================ */

let imgOriginalDataURL = null; // untouched, for full Reset
let baseCanvas = null;         // committed working canvas
let undoStack = [];            // array of dataURLs (previous committed states)

let cropMode = false;
let cropStart = null;   // {x,y} in canvas-wrap CSS pixel space
let cropCurrent = null; // {x,y}

const imgCanvas = document.getElementById('imgCanvas');
const imgCtx = imgCanvas.getContext('2d');
const imgCanvasWrap = document.getElementById('imgCanvasWrap');
const imgCropBox = document.getElementById('imgCropBox');

/* ---------------- Loading ---------------- */

document.getElementById('imgOpenInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  await loadImageFile(file);
  e.target.value = '';
});

function loadImageFile(file){
  return new Promise((resolve) => {
    setImgStatus('Loading ' + file.name + '...');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        imgOriginalDataURL = ev.target.result;
        undoStack = [];

        baseCanvas = document.createElement('canvas');
        baseCanvas.width = img.naturalWidth;
        baseCanvas.height = img.naturalHeight;
        baseCanvas.getContext('2d').drawImage(img, 0, 0);

        redrawFromBase();
        syncResizeInputs();
        showImgEditorUI();
        setImgStatus(file.name + ' — ' + baseCanvas.width + '×' + baseCanvas.height + 'px');
        updateUndoBtn();
        resolve();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function showImgEditorUI(){
  document.getElementById('imgEmptyState').style.display = 'none';
  document.getElementById('imgEditorLayout').style.display = 'grid';
  document.getElementById('imgDownloadBtn').disabled = false;
  document.getElementById('imgResetBtn').disabled = false;
  imgCanvas.classList.add('no-crop');
}

/* ---------------- Canvas <-> visible sync ---------------- */

function redrawFromBase(){
  imgCanvas.width = baseCanvas.width;
  imgCanvas.height = baseCanvas.height;
  imgCtx.filter = 'none';
  imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
  imgCtx.drawImage(baseCanvas, 0, 0);
}

function pushUndoSnapshot(){
  undoStack.push(baseCanvas.toDataURL('image/png'));
  if(undoStack.length > 20) undoStack.shift(); // cap history so memory doesn't grow forever
  updateUndoBtn();
}

function updateUndoBtn(){
  document.getElementById('imgUndoBtn').disabled = undoStack.length === 0;
}

function imgUndo(){
  if(undoStack.length === 0) return;
  const dataURL = undoStack.pop();
  const img = new Image();
  img.onload = () => {
    baseCanvas = document.createElement('canvas');
    baseCanvas.width = img.naturalWidth;
    baseCanvas.height = img.naturalHeight;
    baseCanvas.getContext('2d').drawImage(img, 0, 0);
    redrawFromBase();
    syncResizeInputs();
    imgResetAdjustmentSliders();
    setImgStatus('Undid last change — ' + baseCanvas.width + '×' + baseCanvas.height + 'px');
    updateUndoBtn();
  };
  img.src = dataURL;
}

function imgResetAll(){
  if(!imgOriginalDataURL) return;
  undoStack = [];
  const img = new Image();
  img.onload = () => {
    baseCanvas = document.createElement('canvas');
    baseCanvas.width = img.naturalWidth;
    baseCanvas.height = img.naturalHeight;
    baseCanvas.getContext('2d').drawImage(img, 0, 0);
    redrawFromBase();
    syncResizeInputs();
    imgResetAdjustmentSliders();
    imgCancelCrop();
    setImgStatus('Reset to original — ' + baseCanvas.width + '×' + baseCanvas.height + 'px');
    updateUndoBtn();
  };
  img.src = imgOriginalDataURL;
}

function setImgStatus(msg){
  document.getElementById('imgStatus').textContent = msg;
}

/* ---------------- Adjustments (brightness / contrast / saturation) ---------------- */

function currentFilterString(){
  const b = document.getElementById('imgBrightness').value;
  const c = document.getElementById('imgContrast').value;
  const s = document.getElementById('imgSaturation').value;
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
}

function previewAdjustments(){
  document.getElementById('imgBrightnessVal').textContent = document.getElementById('imgBrightness').value + '%';
  document.getElementById('imgContrastVal').textContent = document.getElementById('imgContrast').value + '%';
  document.getElementById('imgSaturationVal').textContent = document.getElementById('imgSaturation').value + '%';

  imgCanvas.width = baseCanvas.width;
  imgCanvas.height = baseCanvas.height;
  imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
  imgCtx.filter = currentFilterString();
  imgCtx.drawImage(baseCanvas, 0, 0);
  imgCtx.filter = 'none';
}

['imgBrightness', 'imgContrast', 'imgSaturation'].forEach(id => {
  document.getElementById(id).addEventListener('input', previewAdjustments);
});

function imgApplyAdjustments(){
  const b = document.getElementById('imgBrightness').value;
  const c = document.getElementById('imgContrast').value;
  const s = document.getElementById('imgSaturation').value;
  if(b === '100' && c === '100' && s === '100'){
    setImgStatus('Nothing to apply — sliders are already at default.');
    return;
  }
  pushUndoSnapshot();

  const baked = document.createElement('canvas');
  baked.width = baseCanvas.width;
  baked.height = baseCanvas.height;
  const bctx = baked.getContext('2d');
  bctx.filter = currentFilterString();
  bctx.drawImage(baseCanvas, 0, 0);
  bctx.filter = 'none';

  baseCanvas = baked;
  redrawFromBase();
  imgResetAdjustmentSliders();
  setImgStatus('Adjustments applied.');
}

function imgResetAdjustmentSliders(){
  document.getElementById('imgBrightness').value = 100;
  document.getElementById('imgContrast').value = 100;
  document.getElementById('imgSaturation').value = 100;
  document.getElementById('imgBrightnessVal').textContent = '100%';
  document.getElementById('imgContrastVal').textContent = '100%';
  document.getElementById('imgSaturationVal').textContent = '100%';
  redrawFromBase();
}

/* ---------------- Quick filter presets ---------------- */

function imgApplyPreset(name){
  pushUndoSnapshot();
  const baked = document.createElement('canvas');
  baked.width = baseCanvas.width;
  baked.height = baseCanvas.height;
  const bctx = baked.getContext('2d');

  if(name === 'grayscale'){
    bctx.filter = 'grayscale(100%)';
    bctx.drawImage(baseCanvas, 0, 0);
  } else if(name === 'sepia'){
    bctx.filter = 'sepia(100%)';
    bctx.drawImage(baseCanvas, 0, 0);
  } else if(name === 'invert'){
    bctx.filter = 'invert(100%)';
    bctx.drawImage(baseCanvas, 0, 0);
  } else {
    bctx.drawImage(baseCanvas, 0, 0);
  }
  bctx.filter = 'none';

  baseCanvas = baked;
  redrawFromBase();
  setImgStatus('Filter applied: ' + name + '.');
}

/* ---------------- Rotate & Flip ---------------- */

function imgRotate(deg){
  pushUndoSnapshot();
  const rad = deg * Math.PI / 180;
  const w = baseCanvas.width, h = baseCanvas.height;
  const rotated = document.createElement('canvas');
  rotated.width = h;
  rotated.height = w;
  const rctx = rotated.getContext('2d');
  rctx.translate(rotated.width / 2, rotated.height / 2);
  rctx.rotate(rad);
  rctx.drawImage(baseCanvas, -w / 2, -h / 2);

  baseCanvas = rotated;
  redrawFromBase();
  syncResizeInputs();
  setImgStatus('Rotated ' + (deg > 0 ? 'right' : 'left') + ' 90°.');
}

function imgFlip(axis){
  pushUndoSnapshot();
  const w = baseCanvas.width, h = baseCanvas.height;
  const flipped = document.createElement('canvas');
  flipped.width = w;
  flipped.height = h;
  const fctx = flipped.getContext('2d');
  if(axis === 'h'){
    fctx.translate(w, 0);
    fctx.scale(-1, 1);
  } else {
    fctx.translate(0, h);
    fctx.scale(1, -1);
  }
  fctx.drawImage(baseCanvas, 0, 0);

  baseCanvas = flipped;
  redrawFromBase();
  setImgStatus('Flipped ' + (axis === 'h' ? 'horizontally' : 'vertically') + '.');
}

/* ---------------- Resize ---------------- */

function syncResizeInputs(){
  document.getElementById('imgWidthInput').value = baseCanvas.width;
  document.getElementById('imgHeightInput').value = baseCanvas.height;
}

document.getElementById('imgWidthInput').addEventListener('input', () => {
  if(!document.getElementById('imgLockAspect').checked || !baseCanvas) return;
  const w = parseInt(document.getElementById('imgWidthInput').value, 10);
  if(!w || w <= 0) return;
  const ratio = baseCanvas.height / baseCanvas.width;
  document.getElementById('imgHeightInput').value = Math.round(w * ratio);
});

document.getElementById('imgHeightInput').addEventListener('input', () => {
  if(!document.getElementById('imgLockAspect').checked || !baseCanvas) return;
  const h = parseInt(document.getElementById('imgHeightInput').value, 10);
  if(!h || h <= 0) return;
  const ratio = baseCanvas.width / baseCanvas.height;
  document.getElementById('imgWidthInput').value = Math.round(h * ratio);
});

function imgApplyResize(){
  const w = parseInt(document.getElementById('imgWidthInput').value, 10);
  const h = parseInt(document.getElementById('imgHeightInput').value, 10);
  if(!w || !h || w <= 0 || h <= 0){
    setImgStatus('Enter a valid width and height first.');
    return;
  }
  if(w === baseCanvas.width && h === baseCanvas.height){
    setImgStatus('Size unchanged.');
    return;
  }
  pushUndoSnapshot();

  const resized = document.createElement('canvas');
  resized.width = w;
  resized.height = h;
  const rctx = resized.getContext('2d');
  rctx.imageSmoothingEnabled = true;
  rctx.imageSmoothingQuality = 'high';
  rctx.drawImage(baseCanvas, 0, 0, w, h);

  baseCanvas = resized;
  redrawFromBase();
  setImgStatus('Resized to ' + w + '×' + h + 'px.');
}

/* ---------------- Crop ---------------- */

function imgStartCrop(){
  cropMode = true;
  cropStart = null;
  cropCurrent = null;
  imgCropBox.style.display = 'none';
  imgCanvas.classList.remove('no-crop');
  document.getElementById('imgCropHint').style.display = 'block';
  document.getElementById('imgCropStartBtn').disabled = true;
  document.getElementById('imgCropCancelBtn').disabled = false;
  document.getElementById('imgCropApplyBtn').disabled = true;
  setImgStatus('Drag on the image to select a crop area.');
}

function imgCancelCrop(){
  cropMode = false;
  cropStart = null;
  cropCurrent = null;
  imgCropBox.style.display = 'none';
  imgCanvas.classList.add('no-crop');
  document.getElementById('imgCropHint').style.display = 'none';
  document.getElementById('imgCropStartBtn').disabled = false;
  document.getElementById('imgCropCancelBtn').disabled = true;
  document.getElementById('imgCropApplyBtn').disabled = true;
}

function getCanvasOffsetInWrap(){
  // The wrap can have borders/padding that make its box bigger than the
  // canvas rendered inside it — measure the canvas itself for anything
  // pixel-accurate, and only use this offset to place the overlay div
  // (which is positioned relative to the wrap, not the canvas).
  const canvasRect = imgCanvas.getBoundingClientRect();
  const wrapRect = imgCanvasWrap.getBoundingClientRect();
  return { offsetX: canvasRect.left - wrapRect.left, offsetY: canvasRect.top - wrapRect.top };
}

function wrapPoint(e){
  const canvasRect = imgCanvas.getBoundingClientRect();
  let clientX, clientY;
  if(e.changedTouches && e.changedTouches.length){
    // touchend/touchcancel: the finger that lifted is only in changedTouches,
    // e.touches for it has already been emptied out by the browser.
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else if(e.touches && e.touches.length){
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  // Coordinates are relative to the canvas's own box, in the same CSS-pixel
  // space it's rendered at — this is what imgApplyCrop scales up from.
  let x = clientX - canvasRect.left;
  let y = clientY - canvasRect.top;
  x = Math.max(0, Math.min(x, canvasRect.width));
  y = Math.max(0, Math.min(y, canvasRect.height));
  return { x, y };
}

function drawCropBox(){
  if(!cropStart || !cropCurrent) return;
  const { offsetX, offsetY } = getCanvasOffsetInWrap();
  const x = Math.min(cropStart.x, cropCurrent.x);
  const y = Math.min(cropStart.y, cropCurrent.y);
  const w = Math.abs(cropCurrent.x - cropStart.x);
  const h = Math.abs(cropCurrent.y - cropStart.y);
  // cropStart/cropCurrent are canvas-relative; the overlay div's own
  // coordinate space is the wrap, so shift by the canvas's offset inside it.
  imgCropBox.style.left = (offsetX + x) + 'px';
  imgCropBox.style.top = (offsetY + y) + 'px';
  imgCropBox.style.width = w + 'px';
  imgCropBox.style.height = h + 'px';
  imgCropBox.style.display = 'block';
  document.getElementById('imgCropApplyBtn').disabled = (w < 4 || h < 4);
}

function cropPointerDown(e){
  if(!cropMode) return;
  cropStart = wrapPoint(e);
  cropCurrent = cropStart;
  drawCropBox();
  e.preventDefault();
}
function cropPointerMove(e){
  if(!cropMode || !cropStart) return;
  cropCurrent = wrapPoint(e);
  drawCropBox();
  e.preventDefault();
}
function cropPointerUp(e){
  if(!cropMode || !cropStart) return;
  cropCurrent = wrapPoint(e);
  drawCropBox();
}

imgCanvasWrap.addEventListener('mousedown', cropPointerDown);
imgCanvasWrap.addEventListener('mousemove', cropPointerMove);
window.addEventListener('mouseup', cropPointerUp);
imgCanvasWrap.addEventListener('touchstart', cropPointerDown, { passive: false });
imgCanvasWrap.addEventListener('touchmove', cropPointerMove, { passive: false });
imgCanvasWrap.addEventListener('touchend', cropPointerUp);

function imgApplyCrop(){
  if(!cropStart || !cropCurrent) return;
  const canvasRect = imgCanvas.getBoundingClientRect();
  const scaleX = baseCanvas.width / canvasRect.width;
  const scaleY = baseCanvas.height / canvasRect.height;

  const x = Math.min(cropStart.x, cropCurrent.x) * scaleX;
  const y = Math.min(cropStart.y, cropCurrent.y) * scaleY;
  const w = Math.abs(cropCurrent.x - cropStart.x) * scaleX;
  const h = Math.abs(cropCurrent.y - cropStart.y) * scaleY;

  if(w < 2 || h < 2) return;

  pushUndoSnapshot();

  const cropped = document.createElement('canvas');
  cropped.width = Math.round(w);
  cropped.height = Math.round(h);
  cropped.getContext('2d').drawImage(
    baseCanvas,
    Math.round(x), Math.round(y), Math.round(w), Math.round(h),
    0, 0, Math.round(w), Math.round(h)
  );

  baseCanvas = cropped;
  redrawFromBase();
  syncResizeInputs();
  imgCancelCrop();
  setImgStatus('Cropped to ' + cropped.width + '×' + cropped.height + 'px.');
}

/* ---------------- Format / quality / download ---------------- */

document.getElementById('imgFormatSelect').addEventListener('change', () => {
  const fmt = document.getElementById('imgFormatSelect').value;
  document.getElementById('imgQualityGrp').style.display =
    (fmt === 'image/jpeg' || fmt === 'image/webp') ? 'flex' : 'none';
});

function downloadEditedImage(){
  if(!baseCanvas) return;
  const fmt = document.getElementById('imgFormatSelect').value;
  const quality = parseFloat(document.getElementById('imgQualityRange').value);
  const ext = fmt === 'image/jpeg' ? 'jpg' : (fmt === 'image/webp' ? 'webp' : 'png');

  // If JPEG, flatten transparency onto white first (JPEG has no alpha channel).
  let exportCanvas = baseCanvas;
  if(fmt === 'image/jpeg'){
    exportCanvas = document.createElement('canvas');
    exportCanvas.width = baseCanvas.width;
    exportCanvas.height = baseCanvas.height;
    const ectx = exportCanvas.getContext('2d');
    ectx.fillStyle = '#ffffff';
    ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ectx.drawImage(baseCanvas, 0, 0);
  }

  const dataURL = (fmt === 'image/png') ? exportCanvas.toDataURL(fmt) : exportCanvas.toDataURL(fmt, quality);
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = 'edited-image.' + ext;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setImgStatus('Downloaded as ' + a.download + '.');
}
