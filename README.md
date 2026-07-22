<div align="center">

# 🎓 Student Toolkit

**Eleven everyday tools, one page, zero servers.**

Build a résumé · Edit &amp; compress PDFs · Clean a spreadsheet · Unzip an archive · Touch up a photo · Convert files · Generate a QR code · Turn a photo into an editable PDF · Turn an EPUB into a PDF · Share any file instantly

[![License: MIT](https://img.shields.io/badge/license-MIT-c9a24b.svg)](LICENSE)
![Backend](https://img.shields.io/badge/backend-none-1e3d3f.svg)
![Runs](https://img.shields.io/badge/runs-100%25%20in%20your%20browser-1e3d3f.svg)
![Build Step](https://img.shields.io/badge/build%20step-none-1e3d3f.svg)

</div>

---

## Overview

**Student Toolkit** is a single HTML page that quietly does the job of eleven different apps. Everything — every PDF page you rotate, every cell you clean, every photo you crop, every word an OCR engine reads off a photo — is processed **locally in your browser**. Nothing is uploaded, nothing is stored on a server, and there's nothing to install. Open `index.html` and you're already using it.

It opens on a home screen of large, clearly-labeled tool cards rather than a crowded menu of tabs. Pick a tool, and a slim top bar appears so you can jump between the other ten without ever losing your place.

|  | Tool | What it does |
|---|---|---|
| 📄 | **CV Creation** | Fill a form, watch a live preview, download a resume that always fits one page |
| 🛠 | **PDF Editing** | Rotate, delete, reorder, merge, watermark, and insert image pages |
| 📊 | **Excel Cleaner** | Strip blank rows/columns, trim whitespace, normalize headers, dedupe |
| 🗜 | **.zip Operation** | Preview an archive's contents and download only what you pick |
| 🖼 | **Image Editor** | Crop, resize, rotate/flip, adjust brightness/contrast/saturation, filter |
| 🗃 | **PDF Compressor** | Shrink a PDF's file size with an adjustable quality/size trade-off |
| 🔳 | **QR Code Tool** | Generate a styled QR code, or scan one via upload or live camera |
| 🔄 | **File Converter** | Convert images, audio, and data files between common formats |
| 🔎 | **Text → Editable PDF** | OCR a photo of text and export a real, selectable/editable PDF |
| 📤 | **Share File** | Send a PDF or any file straight to another app via your device's native share sheet |
| 📚 | **EPUB → PDF** | Convert a DRM-free EPUB into a paginated PDF — direct download, or a print-ready view for big books |

---

## Table of Contents

- [Features](#features)
- [Design](#design)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started-local-development)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### 📄 CV Creation

A form-based resume builder with a live, styled preview — a teal sidebar (contact, skills, languages, research focus) beside a main column (profile, education, certifications, projects). Seven templates are available, each adapting the form to show only the fields that template uses.

- Add or remove entries on the fly for skills, languages, certifications, education, and projects
- The preview sits inside a fixed A4 frame and **always fits exactly one page** — long content is scaled down automatically rather than spilling onto a second page
- **Get CV** exports that exact same frame to PDF, pixel-for-pixel

**Using it:** pick a template, fill in the fields on the left, watch the preview update on the right (a small note appears if it had to auto-shrink to fit), then click **Get CV**.

### 🛠 PDF Editing

Open any PDF and see every page as a thumbnail you can act on directly.

- **Rotate** pages in 90° steps, **delete** pages, **reorder** with move left/right
- **Merge** another PDF's pages into the current set
- **Add Image** — drop in a PNG/JPEG as a new page, scaled and centered; works even before opening a PDF, so you can build one from scratch out of photos alone
- Per-page checkbox to include/exclude from the final export — a quick way to extract a subset of pages
- Optional diagonal **watermark** stamped across every page on export

> This is *structural* editing — rotate, delete, reorder, merge, watermark, insert. It doesn't rewrite text that's already baked into a PDF's pages. If what you actually have is a **photo or scan** and you want its words out as editable text, that's what the **Text → Editable PDF** tool below is for.

**Using it:** **Open PDF** → adjust pages with the `←` `→` `⟳` `✕` controls and checkboxes → optionally **Merge Another PDF** or **Add Image** → optionally set a watermark → **Download Edited PDF**.

### 📊 Excel Cleaner

Upload a `.xlsx`, `.xls`, or `.csv`, choose a sheet, and tidy it up with one-click options:

- Remove blank rows / remove blank columns
- Trim stray whitespace
- Normalize headers
- Remove duplicate rows

A live table preview (up to 300 rows) shows the result before you commit. The download matches your original format — `.csv` in, cleaned `.csv` out; `.xlsx` in, cleaned `.xlsx` out.

**Using it:** **Open File** → pick a sheet if there's more than one → tick the cleaning steps you want → **Apply Cleaning** → **Download File**.

### 🗜 .zip Operation

Open an archive and see everything inside it — filename, path, and size — without extracting a thing to disk.

- Filter the list by filename to find what you need fast
- Tick individual files, or **Select All**
- One file ticked downloads as-is; multiple files bundle into a fresh `selected-files.zip` with the original folder structure preserved
- Per-row **Download** button grabs a single file instantly, no ticking required

**Using it:** **Open .zip** → filter/tick what you want → **Download Selected**, or use a row's own **Download** button.

### 🖼 Image Editor

A full canvas-based photo editor with no external image library — crop, resize, rotate/flip, tone adjustments, and quick filters, with undo at every step.

- **Crop** — drag to select an area, then apply
- **Resize** — set width/height with optional locked aspect ratio
- **Rotate** left/right, **flip** horizontal/vertical
- **Adjust** — brightness, contrast, and saturation sliders with live preview
- **Quick filters** — grayscale, sepia, invert
- **Undo** steps back through every destructive edit
- Export as **PNG**, **JPEG**, or **WEBP** (JPEG/WEBP expose a quality slider)

**Using it:** **Open Image** → make your edits in any order → pick an export format → **Download Image**.

### 🗃 PDF Compressor

Shrinks a PDF by re-rendering each page to a canvas at a chosen resolution, re-encoding it as JPEG, and rebuilding a new PDF from those images at the original page size.

- Four presets — **Low** (~150 DPI), **Recommended** (~110 DPI), **High** (~72 DPI), or **Custom** (your own DPI + JPEG quality)
- Before/after size comparison with the percentage reduction shown

> Because pages become images, the resulting text is no longer selectable or searchable. This works well for scans and image-heavy PDFs, and less well when you need to keep real, searchable text.

**Using it:** **Open PDF** → pick a compression level (or dial in a custom DPI/quality) → **Compress PDF** → **Download Compressed PDF**.

### 🔳 QR Code Tool

Two modes in one tab: **Generate** and **Scan**.

**Generate**
- Turn any link or block of text into a QR code
- Adjust size, foreground/background color, and error-correction level (L/M/Q/H)
- Download as PNG

**Scan**
- Decode a QR code from an uploaded image, or point your camera at one for live decoding
- Copy the decoded text, or open it directly if it's a link

**Using it:** switch between **🔳 Generate** and **📷 Scan** at the top of the tool. To generate, type your content, tweak the look, and download. To scan, upload an image or start the camera — the decoded content appears automatically.

### 🔄 File Converter

Open almost anything and convert it to a more useful format, scoped honestly to what a browser can do without a server:

- **Images** — any format the browser can display (PNG, JPEG, WEBP, GIF, BMP, SVG—) → PNG, JPEG, or WEBP, via `<canvas>`, with a quality slider for lossy formats
- **Audio** — any format the browser can decode (MP3, WAV, OGG, M4A, AAC—) → WAV (uncompressed PCM), via the Web Audio API
- **Data files** — CSV, TSV, JSON, XLSX/XLS → any of those four, reusing the same SheetJS engine as the Excel Cleaner
- Anything outside those three categories (video, DOCX, archives, etc.) shows a clear "not supported here" message rather than pretending to convert it

**Using it:** **Open File** → the tool detects the category automatically and shows the right panel → pick a target format (and quality, if relevant) → **Convert & Download**.

### 🔎 Text → Editable PDF

Point it at a photo of text — handwritten notes, a printed page, a whiteboard — and get real, selectable text out the other end, not just a picture of it.

- OCR runs **entirely client-side** via [Tesseract.js](https://tesseract.projectnaptha.com/) (WebAssembly) — the photo never leaves your browser
- Add multiple photos to build a multi-page document
- Choose a recognition language: English, Hindi, English + Hindi, French, Spanish, or German
- A progress bar and status badge track each photo through **Pending → Processing → Done**
- The recognized text lands in an editable text box per page — fix anything OCR got wrong (or just type/paste your own text) before exporting
- **Generate & Download PDF** builds a real PDF with [jsPDF](https://github.com/parallax/jsPDF) out of actual text objects — selectable, searchable, and editable in any PDF editor, with automatic line wrapping and page breaks for longer text

> This is the opposite trade-off from the PDF Compressor: that tool turns *pages into images* to shrink them; this tool turns *an image into real text*.

**Using it:** **Add Photo(s)** → pick a language → **Run OCR** → review/correct the text for each page → **Generate & Download PDF**.

### 📤 Share File

The fastest way out of the toolkit: pick a PDF, photo, video, or literally any other file, and hand it off through your device's own share sheet instead of downloading it first and hunting for it later. Built to just work, every time.

- Choose one or more files via the file picker, or **drag and drop** them onto the panel
- **Share** calls the browser's [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) (`navigator.share`) with the file(s) attached, opening your OS's native share sheet — AirDrop, Bluetooth, Messages, Mail, WhatsApp, Drive, or whatever else is installed. The file goes straight from your device to the destination — it's never uploaded to any server in between
- **Photos and videos get an instant preview thumbnail** right in the list (a free object-URL reference, no re-encoding), so you can confirm what you're about to send at a glance
- **PDFs get a real first-page preview**, rendered with the same pdf.js engine as the PDF Editor — if a PDF can't even be opened for preview, that's a strong sign it's corrupted, so a **⚠️ check file** warning shows up immediately, before you try to send it
- Files with a missing or generic type (common with dragged PDFs and some phone exports) are **automatically re-typed from their extension**, so the receiving app sees a proper PDF/photo/video instead of a nameless generic attachment
- Folder drops and exact duplicate files are filtered out on the way in, with a clear note about what was skipped
- Each file also gets its own quick **Download** button, and an **✕** to remove it from the list
- Where native file-sharing isn't supported or a share attempt fails for any reason, **Share** automatically falls back to downloading instead — a single file downloads as-is, multiple files bundle into `shared-files.zip` using **stored (uncompressed) mode for already-compressed formats** like photos, video, and PDFs so bundling large batches stays fast, with a live progress percentage while it works

> Support for sharing *files* through `navigator.share` isn't universal yet — it also requires HTTPS (or `localhost`). Safari and Edge support it fully; Chrome's support varies by platform; Firefox doesn't support it at all. The automatic download fallback means the tool is always useful either way — there's no dead end.

**Using it:** **Choose File(s)** (or drag some in) → check the previews (and watch for any ⚠️ warning on a PDF) → **Share** to open your device's share sheet, or use a row's own **Download** button.

### 📚 EPUB → PDF

Reads a DRM-free EPUB the way an e-reader would — unpacking it, walking its chapters in the spine's reading order, and rebuilding it as a paginated PDF.

- **Download as PDF** — renders each chapter with jsPDF + html2canvas and downloads automatically, no extra steps
- **Open Print View** — assembles the whole book into a print-ready page and hands off to the browser's native print → Save as PDF, skipping canvas rendering entirely; far lighter on memory for big or image-heavy books, especially on phones
- Embedded images are automatically downscaled and re-encoded before rendering, so oversized cover art and illustrations don't blow up memory use
- Page size (A4 / US Letter) and render quality (Fast / Balanced / High) are adjustable
- Works with files up to 200 MB

> DRM-protected files — Kindle (`.azw`), Adobe Digital Editions, and similar — aren't supported. No browser-side tool can open those without the original DRM key.

**Using it:** **Open EPUB** → optionally adjust page size/quality → **Download as PDF** for a one-click file, or **Open Print View** and use your browser's Save as PDF (recommended for large, image-heavy books).

---

## Design

The interface leans editorial rather than "app-like" — a deep teal (`#1e3d3f`) and warm gold (`#c9a24b`) palette, `Lora` serif for headings paired with `Source Sans 3` for everything else, on a soft off-white background. The home screen favors a handful of large, legible tool cards over a dense toolbar, and every tool view keeps a slim, persistent top bar for one-click navigation back home or across tools. The whole layout is responsive down to mobile, including the top bar, which measures and adapts its own height as it wraps on narrower screens.

---

## Tech Stack

Pure static frontend — no framework, no bundler, no backend:

| Purpose | Library |
|---|---|
| HTML → PDF export | [html2canvas](https://github.com/niklasvh/html2canvas) + [jsPDF](https://github.com/parallax/jsPDF) |
| PDF editing & compression rebuild | [pdf-lib](https://pdf-lib.js.org/) |
| PDF page rendering | [pdf.js](https://mozilla.github.io/pdf.js/) |
| Spreadsheet parsing/writing | [SheetJS (xlsx)](https://sheetjs.com/) |
| Zip read/write | [JSZip](https://stuk.github.io/jszip/) |
| QR code generation | [qrcodejs](https://davidshimjs.github.io/qrcodejs/) |
| QR code scanning | [jsQR](https://github.com/cozmo/jsQR) |
| OCR (photo → text) | [Tesseract.js](https://tesseract.projectnaptha.com/) |
| Image editing & audio decoding | Native Canvas API + Web Audio API — no library needed |
| Fonts | Google Fonts (Lora + Source Sans 3) |

All libraries load from CDN in `index.html` — nothing to install.

---

## Project Structure

```
toolkit/
├── index.html              # Main HTML shell — home screen + all 11 tool views
├── css/
│   └── style.css           # All styling: theme, layout, and every tool's UI
├── js/
│   ├── tabs.js              # View switching + top bar behavior
│   ├── resume.js            # CV Creation (incl. one-page auto-fit)
│   ├── pdf-editor.js        # PDF Editing
│   ├── excel-cleaner.js     # Excel Cleaner
│   ├── zip-tool.js          # .zip Operation
│   ├── image-editor.js      # Image Editor
│   ├── pdf-compressor.js    # PDF Compressor
│   ├── qr-code.js           # QR Code Tool (generate + scan)
│   ├── file-converter.js    # File Converter (images, audio, data files)
│   ├── ocr-pdf.js           # Text → Editable PDF (OCR)
│   ├── share-file.js        # Share File (Web Share API + download fallback)
│   ├── epub-to-pdf.js       # EPUB → PDF
│   └── theme.js             # Light/dark theme toggle
├── LICENSE
└── README.md
```

---

## Getting Started (Local Development)

No build tools needed — just serve the folder statically.

**Option A — Open directly**
```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```
Then double-click `index.html`, or open it via your browser's `File > Open`.

> `index.html` needs to sit at the **root** of your repo, alongside `README.md` — not nested inside a subfolder — or GitHub Pages won't find it. If you're starting from a downloaded zip, extract its contents directly into your repo root.

> Some browsers restrict file-reading APIs when opening `index.html` straight from `file://`. If a tool behaves oddly, use Option B instead.

**Option B — Local server (recommended)**
```bash
# just click on
https://prateek-kumar-anand.github.io/Toolkit-Web-Application/

# or Node (npx, no install needed)
npx serve .
```
Then visit `http://localhost:8000`.

> All CDN-hosted libraries — including the OCR engine's language data — are fetched over the network the first time each tool is used, so an internet connection is required at least once per tool, even though no file you open or create is ever sent anywhere.

---

## Deployment

The app is 100% static, so **GitHub Pages** is the simplest way to host it — no build step, no config.

1. Make sure `index.html`, `css/`, `js/`, and `README.md` sit directly in your project folder, not nested one level deeper.
2. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: student toolkit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source → Deploy from a branch**.
4. Choose branch `main`, folder `/ (root)`, then **Save**.
5. Your app goes live at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

Every push to `main` redeploys automatically.

---

## Known Limitations

- PDF editing is page-level only — no in-place editing of existing text inside a PDF
- **Add Image** (in PDF Editing) only accepts PNG and JPEG; other formats show an error
- Very large PDFs (100+ pages) may render thumbnails slowly, since everything happens client-side
- Resume PDF export is image-based (html2canvas), so exported text isn't selectable — a common trade-off for pixel-accurate custom layouts in the browser
- Very long resume content is auto-shrunk to fit one page; extremely long content can end up quite small
- The .zip tool reads standard, non-encrypted archives — password-protected zips aren't supported
- PDF Compressor makes pages image-based, so compressed output loses selectable/searchable text
- Audio conversion only targets WAV — true lossy re-encoding (e.g. to MP3) needs a dedicated encoder library that isn't included
- OCR accuracy depends on photo quality — clear lighting, good focus, and a fairly straight-on angle all help; the recognized text should always be reviewed before export
- The Text → Editable PDF export preserves the *words*, not the original layout, fonts, tables, or images — it's plain reflowed text
- Share File's native share sheet needs a browser that supports sharing files via the Web Share API (Safari and Edge do; Chrome varies by platform; Firefox doesn't) and a secure context (HTTPS or `localhost`) — everywhere else it falls back to downloading instead. Its PDF "corrupted" warning only means pdf.js couldn't render page 1 — it's a useful early signal, not a full validity guarantee
- EPUB → PDF only supports standard, DRM-free EPUB 2/3 files — Kindle (`.azw`) and Adobe Digital Editions files aren't supported. Large, image-heavy books can still take several minutes and use real memory; **Print View** is the more reliable option for those, since it skips canvas rendering entirely
- No persistence between sessions — refreshing clears the resume form and any loaded PDF, spreadsheet, archive, image, OCR pages, EPUB in progress, or selected files to share

---

## Roadmap

- [ ] Save/load resume form data as JSON (import/export drafts)
- [ ] Drag-and-drop page reordering in the PDF editor
- [ ] Multiple resume templates *(seven already shipped — more on the way)*
- [ ] Split a PDF into separate single-page downloads
- [ ] More OCR languages, plus an option to keep the original photo as a page background behind the text
- [ ] Optional lossy audio export (MP3) via a bundled encoder
- [ ] Carry an EPUB's table of contents into the exported PDF as clickable bookmarks

---

## Contributing

This is a personal project, but suggestions and pull requests are welcome — open an issue or PR if you spot a bug or have an idea.

## License

MIT — see [LICENSE](LICENSE).
