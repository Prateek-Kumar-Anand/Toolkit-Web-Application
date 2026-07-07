# Resume, PDF & Excel Toolkit

A single-page, fully client-side web app with three tools in one:

1. **CV Creation** — fill a form, get a live preview, download a formatted resume PDF
2. **PDF Editing** — rotate, delete, reorder, merge, extract pages, and watermark PDFs
3. **Excel Cleaning** — *(coming soon)* clean up messy spreadsheets

No backend, no build step, no server. Everything runs in the browser and nothing you upload ever leaves your machine.

---

## Live Demo

Once deployed on GitHub Pages (see [Deployment](#deployment) below), your app will be live at:

```
https://<your-username>.github.io/<repo-name>/
```

---

## Design

The app opens on a **home screen with three large buttons** (CV Creation, PDF Editing, Excel Cleaning) — no hunting for tiny tabs. Clicking one takes you into that tool, with a slim top bar (← Home + quick tab switches) so you can jump between tools without going back every time. Layout is responsive down to mobile.

## Features

### 1. CV Creation
- Form-based resume builder with a live, styled preview
- Two-column layout: teal sidebar (contact, skills, languages, research focus) + main column (profile, education, certifications, projects)
- Add/remove entries dynamically for skills, languages, certifications, education, and projects
- One-click **Get CV** button exports the preview to a print-ready, multi-page-safe PDF

### 2. PDF Editing
- Open any PDF and see every page as a thumbnail
- **Rotate** individual pages in 90° steps
- **Delete** individual pages
- **Reorder** pages with move left / move right controls
- **Merge** another PDF's pages into the current working set
- **Selective export** — checkbox per page to include/exclude from the final download (handy for extracting a subset of pages)
- **Watermark** — optional text stamped diagonally across every page on export
- Download the result as a single new PDF

> Note: this is *structural* PDF editing (rotate/delete/reorder/merge/watermark). It does not rewrite existing text inside a PDF — that requires OCR/layout reconstruction and is out of scope for a client-side tool.

### 3. Excel Cleaning (planned)
- Upload a messy `.xlsx` / `.csv`
- Remove blank rows/columns, trim whitespace, normalize headers, dedupe rows
- Download the cleaned file
- Not yet implemented — the tab currently shows a placeholder. Logic will live in `js/excel-cleaner.js`, using the already-included [SheetJS](https://sheetjs.com/) library.

---

## Tech Stack

Pure static frontend — no framework, no bundler, no backend:

| Purpose            | Library                                                                 |
|--------------------|--------------------------------------------------------------------------|
| HTML → PDF export  | [html2canvas](https://github.com/niklasvh/html2canvas) + [jsPDF](https://github.com/parallax/jsPDF) |
| PDF editing        | [pdf-lib](https://pdf-lib.js.org/)                                       |
| PDF page rendering | [pdf.js](https://mozilla.github.io/pdf.js/)                              |
| Excel parsing      | [SheetJS (xlsx)](https://sheetjs.com/) — loaded, not yet wired up        |
| Fonts              | Google Fonts (Lora + Source Sans 3)                                      |

All libraries are loaded from CDN (cdnjs) in `index.html` — nothing to install.

---

## Project Structure

```
toolkit/
├── index.html              # Main HTML shell — all 3 tabs, loads CSS/JS
├── css/
│   └── style.css           # All styling (nav, resume layout, PDF editor UI)
├── js/
│   ├── tabs.js             # Tab-switching logic
│   ├── resume.js           # CV Creation module
│   ├── pdf-editor.js       # PDF Editing module
│   └── excel-cleaner.js    # Excel Cleaning module (placeholder)
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
2. Watch the preview on the right update live
3. Click **Get CV (Download PDF)** to download your resume

### PDF Editing
1. Click **Open PDF** and choose a file — every page appears as a thumbnail
2. Use the controls on each page:
   - `←` / `→` — reorder
   - `⟳` — rotate 90°
   - `✕` — delete
   - checkbox (top-left of thumbnail) — include/exclude from export
3. Optionally click **+ Merge Another PDF** to append another file's pages
4. Optionally type text into the **Watermark** box
5. Click **Download Edited PDF**

### Excel Cleaning
Not yet available — check back after this module is implemented.

---

## Known Limitations

- PDF editing is page-level only (no in-place text editing of existing PDF content)
- Very large PDFs (100+ pages) may render thumbnails slowly since everything happens client-side
- Resume PDF export uses an image-based render (html2canvas), so exported text isn't selectable — this is a common tradeoff for pixel-accurate custom layouts in the browser
- No persistence between sessions yet — refreshing the page clears the resume form and any loaded PDFs

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
