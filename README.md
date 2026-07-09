# Resume, PDF, Excel & Zip Toolkit

A single-page, fully client-side web app with four tools in one:

1. **CV Creation** — fill a form, get a live preview, download a formatted resume PDF that always fits on one page
2. **PDF Editing** — rotate, delete, reorder, merge, extract pages, and watermark PDFs
3. **Excel Cleaning** — *(coming soon)* clean up messy spreadsheets
4. **.zip operation** — unzip an archive, preview what's inside, and download only the files you pick

No backend, no build step, no server. Everything runs in the browser and nothing you upload ever leaves your machine.

---

## Live Demo

Once deployed on GitHub Pages (see [Deployment](#deployment) below), your app will be live at:

```
https://<your-username>.github.io/<repo-name>/
```

---

## Design

The app opens on a **home screen with large tool buttons** (CV Creation, PDF Editing, Excel Cleaning, .zip operation) — no hunting for tiny tabs. Clicking one takes you into that tool, with a slim top bar (← Home + quick tab switches) so you can jump between tools without going back every time. Layout is responsive down to mobile.

## Features

### 1. CV Creation
- Form-based resume builder with a live, styled preview
- Two-column layout: teal sidebar (contact, skills, languages, research focus) + main column (profile, education, certifications, projects)
- Add/remove entries dynamically for skills, languages, certifications, education, and projects
- The preview lives inside a fixed A4-size window and **always fits on exactly one page** — if your content would run long, it's automatically (and legibly) scaled down to fit rather than spilling onto a second page
- One-click **Get CV** button exports that same single-page preview to PDF (pixel-for-pixel, since the export captures the exact same fixed-size frame)

### 2. PDF Editing
- Open any PDF and see every page as a thumbnail
- **Rotate** individual pages in 90° steps
- **Delete** individual pages
- **Reorder** pages with move left / move right controls
- **Merge** another PDF's pages into the current working set
- **Add Image** — insert a PNG/JPEG as a brand-new page (scaled to fit, centered, aspect ratio preserved); works even before opening a PDF, so you can build one from scratch out of just photos/scans
- **Selective export** — checkbox per page to include/exclude from the final download (handy for extracting a subset of pages)
- **Watermark** — optional text stamped diagonally across every page on export, including any pages added from images
- Download the result as a single new PDF

> Note: this is *structural* PDF editing (rotate/delete/reorder/merge/watermark/insert-image). It does not rewrite existing text inside a PDF — that requires OCR/layout reconstruction and is out of scope for a client-side tool.

### 3. Excel Cleaning (planned)
- Upload a messy `.xlsx` / `.csv`
- Remove blank rows/columns, trim whitespace, normalize headers, dedupe rows
- Download the cleaned file
- Not yet implemented — the tab currently shows a placeholder. Logic will live in `js/excel-cleaner.js`, using the already-included [SheetJS](https://sheetjs.com/) library.

### 4. .zip operation
- Open any `.zip` archive — every file inside is listed with an icon, its path, and its size
- Filter the list by filename to quickly find what you need
- Tick individual files (or **Select All**) to choose what to keep
- **Download**:
  - one file ticked → downloads that file as-is
  - multiple files ticked → bundled into a fresh `selected-files.zip` (original folder structure preserved)
- Per-row **Download** button for grabbing a single file immediately without ticking anything
- Everything happens in-browser via [JSZip](https://stuk.github.io/jszip/) — the archive is never uploaded anywhere

---

## Tech Stack

Pure static frontend — no framework, no bundler, no backend:

| Purpose            | Library                                                                 |
|--------------------|--------------------------------------------------------------------------|
| HTML → PDF export  | [html2canvas](https://github.com/niklasvh/html2canvas) + [jsPDF](https://github.com/parallax/jsPDF) |
| PDF editing        | [pdf-lib](https://pdf-lib.js.org/)                                       |
| PDF page rendering | [pdf.js](https://mozilla.github.io/pdf.js/)                              |
| Excel parsing      | [SheetJS (xlsx)](https://sheetjs.com/) — loaded, not yet wired up        |
| Zip read/write     | [JSZip](https://stuk.github.io/jszip/)                                   |
| Fonts              | Google Fonts (Lora + Source Sans 3)                                      |

All libraries are loaded from CDN (cdnjs) in `index.html` — nothing to install.

---

## Project Structure

```
toolkit/
├── index.html              # Main HTML shell — all 4 tabs, loads CSS/JS
├── css/
│   └── style.css           # All styling (nav, resume layout, PDF editor UI, zip tool UI)
├── js/
│   ├── tabs.js             # Tab-switching logic
│   ├── resume.js           # CV Creation module (incl. one-page auto-fit)
│   ├── pdf-editor.js       # PDF Editing module
│   ├── excel-cleaner.js    # Excel Cleaning module (placeholder)
│   └── zip-tool.js         # .zip operation module
├── assets/                 # (empty — for future logos/images)
├── LICENSE
├── .gitignore
└── README.md
```

---

## Getting Started (Local Development)

No build tools needed. Just serve the folder statically.

**Option A — Open directly**
```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```
Then double-click `index.html`, or open it in your browser via `File > Open`.

> Important: `index.html` must sit at the **root** of your repo (same level as `README.md`), not inside a subfolder — otherwise GitHub Pages won't find it and you'll get a blank/404 page. If you downloaded this as a zip, make sure you extract its contents directly into your repo root, not into a nested folder.

> Some browsers restrict certain features (like file reading) when opening `index.html` directly via `file://`. If anything behaves oddly, use Option B instead.

**Option B — Local server (recommended)**
```bash
# Python 3
python3 -m http.server 8000

# or Node (npx, no install needed)
npx serve .
```
Then visit `http://localhost:8000` in your browser.

---

## Deployment

This app is 100% static, so **GitHub Pages** is the simplest way to deploy it — no build step, no config files.

### Steps:
1. If you're starting from the downloaded zip, extract it and make sure `index.html`, `css/`, `js/`, `README.md` etc. are directly inside your project folder — not nested one level deeper inside another folder of the same name.
2. Push this repo to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: resume, pdf, excel toolkit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub, go to your repo → **Settings** → **Pages**.
4. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
5. Choose branch `main` and folder `/ (root)`, then **Save**.
6. Wait a minute, then your app will be live at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

That's it — every time you push to `main`, GitHub Pages redeploys automatically.

---

## Usage Guide

### CV Creation
1. Fill in the form fields on the left (name, contact info, skills, education, etc.)
2. Watch the preview on the right update live — it always shows exactly one page; if your content is long, it auto-shrinks slightly to keep fitting (a small note appears under the preview when this happens)
3. Click **Get CV (Download PDF)** to download your resume

### PDF Editing
1. Click **Open PDF** and choose a file — every page appears as a thumbnail
2. Use the controls on each page:
   - `←` / `→` — reorder
   - `⟳` — rotate 90°
   - `✕` — delete
   - checkbox (top-left of thumbnail) — include/exclude from export
3. Optionally click **+ Merge Another PDF** to append another file's pages
4. Optionally click **+ Add Image** to insert a PNG/JPEG as a new page (works even without opening a PDF first, if you want to build one purely from images)
5. Optionally type text into the **Watermark** box
6. Click **Download Edited PDF**

### Excel Cleaning
Not yet available — check back after this module is implemented.

### .zip operation
1. Click **Open .zip** and choose an archive — every file inside is listed
2. Optionally type in the filter box to narrow the list by filename
3. Tick the files you want (or click **Select All**)
4. Click **Download Selected** — a single ticked file downloads as-is, multiple files download bundled as `selected-files.zip`
5. Or click the **Download** button on any single row to grab just that file right away

---

## Known Limitations

- PDF editing is page-level only (no in-place text editing of existing PDF content)
- **Add Image** only accepts PNG and JPEG (pdf-lib's supported embed formats) — other formats like WEBP or GIF aren't supported and will show an error
- Very large PDFs (100+ pages) may render thumbnails slowly since everything happens client-side
- Resume PDF export uses an image-based render (html2canvas), so exported text isn't selectable — this is a common tradeoff for pixel-accurate custom layouts in the browser
- Very long resume content is auto-shrunk to keep everything on one page; extremely long content (many projects/education entries) can end up quite small — trimming content is still the best way to keep it readable
- The .zip tool reads standard, non-encrypted .zip archives — password-protected zips aren't supported
- No persistence between sessions yet — refreshing the page clears the resume form, any loaded PDFs, and any opened .zip

## Roadmap

- [ ] Implement Excel cleaning module (blank row/column removal, header normalization, dedupe)
- [ ] Add save/load of resume form data as JSON (import/export drafts)
- [ ] Drag-and-drop page reordering in the PDF editor
- [ ] Multiple resume templates to choose from
- [ ] Split PDF into separate single-page downloads

---

## Contributing

This is a personal project, but suggestions and pull requests are welcome — open an issue or PR if you spot a bug or have an idea.

## License

MIT — see [LICENSE](LICENSE).
