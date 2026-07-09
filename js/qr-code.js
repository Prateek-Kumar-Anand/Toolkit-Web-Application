/* ============================================================
   MODULE 7: QR CODE GENERATOR
   Turns any link/text into a scannable QR code using the
   qrcodejs library (loaded via CDN in index.html), with
   customizable size, colors, and error-correction level.
   Renders to a canvas under the hood, which we read back out
   to build a downloadable PNG.
   ============================================================ */

let qrInstance = null;

const qrTextInput = document.getElementById('qrTextInput');
const qrSizeRange = document.getElementById('qrSizeRange');
const qrColorDark = document.getElementById('qrColorDark');
const qrColorLight = document.getElementById('qrColorLight');
const qrCorrectLevel = document.getElementById('qrCorrectLevel');
const qrCodeBox = document.getElementById('qrCodeBox');

qrSizeRange.addEventListener('input', () => {
  document.getElementById('qrSizeVal').textContent = qrSizeRange.value + 'px';
});

// Live-update as the person types/tweaks, with a short debounce so it
// doesn't regenerate on every single keystroke.
let qrDebounceTimer = null;
function scheduleQrUpdate(){
  clearTimeout(qrDebounceTimer);
  qrDebounceTimer = setTimeout(() => {
    if(qrTextInput.value.trim()) generateQrCode();
  }, 350);
}
[qrTextInput].forEach(el => el.addEventListener('input', scheduleQrUpdate));
[qrSizeRange, qrColorDark, qrColorLight, qrCorrectLevel].forEach(el => {
  el.addEventListener('input', () => { if(qrTextInput.value.trim()) generateQrCode(); });
  el.addEventListener('change', () => { if(qrTextInput.value.trim()) generateQrCode(); });
});

function generateQrCode(){
  const text = qrTextInput.value.trim();
  if(!text){
    setQrStatus('Type a link or some text first.');
    return;
  }

  const size = parseInt(qrSizeRange.value, 10);
  const correctLevelMap = {
    L: QRCode.CorrectLevel.L,
    M: QRCode.CorrectLevel.M,
    Q: QRCode.CorrectLevel.Q,
    H: QRCode.CorrectLevel.H,
  };

  qrCodeBox.innerHTML = '';
  qrInstance = new QRCode(qrCodeBox, {
    text: text,
    width: size,
    height: size,
    colorDark: qrColorDark.value,
    colorLight: qrColorLight.value,
    correctLevel: correctLevelMap[qrCorrectLevel.value],
  });

  document.getElementById('qrDownloadBtn').disabled = false;
  setQrStatus('QR code ready — ' + size + '×' + size + 'px.');
}

function downloadQrCode(){
  // qrcodejs draws to a <canvas>; on some mobile browsers it also swaps in
  // an <img> (workaround for old rendering bugs) which we prefer if present.
  const img = qrCodeBox.querySelector('img');
  const canvas = qrCodeBox.querySelector('canvas');

  let dataURL = null;
  if(img && img.src && img.src.startsWith('data:')) dataURL = img.src;
  else if(canvas) dataURL = canvas.toDataURL('image/png');

  if(!dataURL){
    setQrStatus('Generate a QR code first.');
    return;
  }

  const a = document.createElement('a');
  a.href = dataURL;
  a.download = 'qr-code.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setQrStatus('Downloaded qr-code.png.');
}

function setQrStatus(msg){
  document.getElementById('qrStatus').textContent = msg;
}

/* ============================================================
   MODULE 7b: QR CODE SCANNER
   Decodes a QR code back into its original link/text using
   jsQR (loaded via CDN in index.html). Two input paths:
   - Upload an image -> draw to an offscreen canvas -> jsQR.
   - Live camera -> getUserMedia stream -> sample frames onto
     the canvas on a requestAnimationFrame loop -> jsQR, until
     a code is found or the camera is stopped.
   ============================================================ */

let qrCameraStream = null;
let qrCameraRafId = null;

function setQrMode(mode){
  const isGenerate = mode === 'generate';
  document.getElementById('qrGenerateApp').style.display = isGenerate ? 'grid' : 'none';
  document.getElementById('qrScanApp').style.display = isGenerate ? 'none' : 'grid';
  document.getElementById('qrModeGenBtn').classList.toggle('active', isGenerate);
  document.getElementById('qrModeScanBtn').classList.toggle('active', !isGenerate);

  // Leaving scan mode should free the camera if it's running.
  if(isGenerate) stopQrCamera();
}

document.getElementById('qrScanFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  stopQrCamera();
  await scanQrFromImageFile(file);
  e.target.value = '';
});

async function scanQrFromImageFile(file){
  setQrScanStatus('Reading ' + file.name + '...');
  hideQrScanResult();

  try{
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsDataURL(file);
    });

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not load that image.'));
      img.src = dataUrl;
    });

    const imgPreview = document.getElementById('qrScanImagePreview');
    imgPreview.src = dataUrl;
    imgPreview.style.display = 'block';
    document.getElementById('qrScanVideo').style.display = 'none';
    document.getElementById('qrScanPlaceholder').style.display = 'none';

    const canvas = document.getElementById('qrScanCanvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if(result && result.data){
      showQrScanResult(result.data);
      setQrScanStatus('QR code decoded from ' + file.name + '.');
    } else {
      setQrScanStatus('No QR code found in that image. Try a clearer or closer photo.');
    }
  } catch(e){
    setQrScanStatus('Could not scan that image: ' + e.message);
    console.error(e);
  }
}

async function toggleQrCamera(){
  if(qrCameraStream){
    stopQrCamera();
    return;
  }

  const btn = document.getElementById('qrCameraToggleBtn');
  setQrScanStatus('Requesting camera access...');
  hideQrScanResult();

  try{
    qrCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
  } catch(e){
    setQrScanStatus('Could not access the camera: ' + e.message);
    console.error(e);
    return;
  }

  const video = document.getElementById('qrScanVideo');
  video.srcObject = qrCameraStream;
  video.style.display = 'block';
  document.getElementById('qrScanImagePreview').style.display = 'none';
  document.getElementById('qrScanPlaceholder').style.display = 'none';
  await video.play();

  btn.textContent = 'Stop Camera';
  setQrScanStatus('Point the camera at a QR code...');
  qrCameraRafId = requestAnimationFrame(scanQrCameraFrame);
}

function scanQrCameraFrame(){
  const video = document.getElementById('qrScanVideo');
  if(!qrCameraStream || video.readyState !== video.HAVE_ENOUGH_DATA){
    qrCameraRafId = requestAnimationFrame(scanQrCameraFrame);
    return;
  }

  const canvas = document.getElementById('qrScanCanvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

  if(result && result.data){
    showQrScanResult(result.data);
    setQrScanStatus('QR code detected!');
    stopQrCamera();
    return;
  }

  qrCameraRafId = requestAnimationFrame(scanQrCameraFrame);
}

function stopQrCamera(){
  if(qrCameraRafId){
    cancelAnimationFrame(qrCameraRafId);
    qrCameraRafId = null;
  }
  if(qrCameraStream){
    qrCameraStream.getTracks().forEach(track => track.stop());
    qrCameraStream = null;
  }

  const video = document.getElementById('qrScanVideo');
  video.pause();
  video.srcObject = null;
  video.style.display = 'none';

  const btn = document.getElementById('qrCameraToggleBtn');
  if(btn) btn.textContent = 'Start Camera';

  const imgVisible = document.getElementById('qrScanImagePreview').style.display === 'block';
  document.getElementById('qrScanPlaceholder').style.display = imgVisible ? 'none' : 'block';
}

function showQrScanResult(text){
  document.getElementById('qrScanResult').style.display = 'block';
  document.getElementById('qrScanResultText').value = text;

  const openBtn = document.getElementById('qrScanOpenBtn');
  const looksLikeUrl = /^https?:\/\//i.test(text.trim());
  openBtn.disabled = !looksLikeUrl;
  openBtn.textContent = looksLikeUrl ? 'Open Link' : 'Not a link';
}

function hideQrScanResult(){
  document.getElementById('qrScanResult').style.display = 'none';
  document.getElementById('qrScanResultText').value = '';
}

function openScannedQrLink(){
  const text = document.getElementById('qrScanResultText').value.trim();
  if(/^https?:\/\//i.test(text)){
    window.open(text, '_blank', 'noopener');
  }
}

function copyScannedQrText(){
  const text = document.getElementById('qrScanResultText').value;
  if(!text) return;
  navigator.clipboard.writeText(text).then(() => {
    setQrScanStatus('Copied to clipboard.');
  }).catch(() => {
    // Fallback for browsers/contexts without Clipboard API permission.
    const ta = document.getElementById('qrScanResultText');
    ta.select();
    document.execCommand('copy');
    setQrScanStatus('Copied to clipboard.');
  });
}

function setQrScanStatus(msg){
  document.getElementById('qrScanStatus').textContent = msg;
}
