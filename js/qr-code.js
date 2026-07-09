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
