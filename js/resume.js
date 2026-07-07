/* ============================================================
   MODULE 1: RESUME BUILDER
   Renders a live preview matching a fixed two-column CV layout
   and exports it to PDF using html2canvas + jsPDF.
   ============================================================ */
let counter = 0;
function uid(){ return 'id' + (counter++); }

function addSimpleLine(containerId, placeholderKind, value){
  const container = document.getElementById(containerId);
  const wrap = document.createElement('div');
  wrap.className = 'simple-line';
  const ph = placeholderKind === 'skill' ? 'e.g. Molecular Biology Techniques'
    : placeholderKind === 'language' ? 'e.g. English'
    : 'e.g. Biotechnology — St. Andrew\'s College, 2021–2022';
  wrap.innerHTML = `
    <input type="text" placeholder="${ph}" value="${value ? value.replace(/"/g,'&quot;') : ''}" oninput="renderResume()">
    <button class="rm" onclick="this.parentElement.remove(); renderResume();">✕</button>
  `;
  container.appendChild(wrap);
  renderResume();
}

function addEducation(data){
  data = data || {};
  const container = document.getElementById('education-container');
  const wrap = document.createElement('div');
  wrap.className = 'list-item';
  wrap.innerHTML = `
    <button class="rm" onclick="this.parentElement.remove(); renderResume();">✕ remove</button>
    <label>School / University</label>
    <input type="text" class="edu-school" value="${data.school||''}" oninput="renderResume()">
    <div class="row2">
      <div><label>Location</label><input type="text" class="edu-location" value="${data.location||''}" oninput="renderResume()"></div>
      <div><label>Dates</label><input type="text" class="edu-dates" placeholder="2023 – 2024" value="${data.dates||''}" oninput="renderResume()"></div>
    </div>
    <label>Degree</label>
    <input type="text" class="edu-degree" value="${data.degree||''}" oninput="renderResume()">
    <label>Description</label>
    <textarea class="edu-desc" oninput="renderResume()">${data.desc||''}</textarea>
  `;
  container.appendChild(wrap);
  renderResume();
}

function addProject(data){
  data = data || {};
  const container = document.getElementById('projects-container');
  const wrap = document.createElement('div');
  wrap.className = 'list-item';
  wrap.innerHTML = `
    <button class="rm" onclick="this.parentElement.remove(); renderResume();">✕ remove</button>
    <label>Project Title</label>
    <input type="text" class="proj-title" value="${data.title||''}" oninput="renderResume()">
    <label>Description</label>
    <textarea class="proj-desc" oninput="renderResume()">${data.desc||''}</textarea>
  `;
  container.appendChild(wrap);
  renderResume();
}

function renderResume(){
  document.getElementById('p-name').textContent = val('f-name') || 'Your Name';
  document.getElementById('p-title').textContent = val('f-title') || 'Your Title / Subtitle';
  document.getElementById('p-email').textContent = val('f-email') || 'email@example.com';
  document.getElementById('p-phone').textContent = val('f-phone') || 'phone number';
  document.getElementById('p-location').textContent = val('f-location') || 'Location';
  document.getElementById('p-university').textContent = val('f-university') || 'University';
  document.getElementById('p-research-focus').textContent = val('f-research-focus');
  document.getElementById('p-profile').textContent = val('f-profile');

  fillList('skills-container', 'p-skills');
  fillList('languages-container', 'p-languages');
  fillList('certifications-container', 'p-certifications');

  const eduOut = document.getElementById('p-education');
  eduOut.innerHTML = '';
  document.querySelectorAll('#education-container .list-item').forEach(item=>{
    const school = item.querySelector('.edu-school').value;
    const location = item.querySelector('.edu-location').value;
    const dates = item.querySelector('.edu-dates').value;
    const degree = item.querySelector('.edu-degree').value;
    const desc = item.querySelector('.edu-desc').value;
    if(!school && !degree) return;
    const div = document.createElement('div');
    div.className = 'edu-entry';
    div.innerHTML = `
      <div class="edu-head">
        <span class="edu-school">${escapeHtml(school)}${location ? ' — ' + escapeHtml(location) : ''}</span>
        <span class="edu-dates">${escapeHtml(dates)}</span>
      </div>
      <div class="edu-loc-degree">${escapeHtml(degree)}</div>
      <div class="edu-desc">${escapeHtml(desc).replace(/\n/g,'<br>')}</div>
    `;
    eduOut.appendChild(div);
  });

  const projOut = document.getElementById('p-projects');
  projOut.innerHTML = '';
  document.querySelectorAll('#projects-container .list-item').forEach(item=>{
    const title = item.querySelector('.proj-title').value;
    const desc = item.querySelector('.proj-desc').value;
    if(!title && !desc) return;
    const div = document.createElement('div');
    div.className = 'proj-entry';
    div.innerHTML = `
      <div class="proj-title">${escapeHtml(title)}</div>
      <div class="proj-desc">${escapeHtml(desc).replace(/\n/g,'<br>')}</div>
    `;
    projOut.appendChild(div);
  });
}

function fillList(containerId, targetId){
  const target = document.getElementById(targetId);
  target.innerHTML = '';
  document.querySelectorAll('#'+containerId+' input').forEach(inp=>{
    if(inp.value.trim()){
      const li = document.createElement('li');
      li.textContent = inp.value;
      target.appendChild(li);
    }
  });
}

function val(id){ return document.getElementById(id).value.trim(); }
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

['f-name','f-title','f-email','f-phone','f-location','f-university','f-research-focus','f-profile']
  .forEach(id => document.getElementById(id).addEventListener('input', renderResume));

function seedExample(){
  ['Molecular Biology Techniques','Microbiology & Cell Culture','Analytical Techniques','Bioinformatics & Software','PCR & Cell Culture','Plant Pathology & Virology']
    .forEach(s => addSimpleLine('skills-container','skill', s));
  ['English','Hindi'].forEach(l => addSimpleLine('languages-container','language', l));
  addSimpleLine('certifications-container','certification', "Database Management System — St. Andrew's College, 2019–2020");
  addEducation({school:"Deen Dayal Upadhyaya Gorakhpur University", location:"Gorakhpur", dates:"2023 – 2024", degree:"M.Sc. Biotechnology", desc:"Advanced laboratory techniques including PCR, cell culture, and bioinformatics analysis."});
  addProject({title:"Microbial Diversity in Organic Compost", desc:"Isolated, cultured, and identified microorganisms from organic compost samples using standard microbiological techniques."});
  renderResume();
}
seedExample();

document.getElementById('downloadBtn').addEventListener('click', async function(){
  const btn = this;
  btn.disabled = true;
  btn.textContent = 'Generating PDF...';
  try{
    const resumeEl = document.getElementById('resume');

    // Make sure the custom webfonts (Lora / Source Sans 3) are fully loaded
    // before rasterizing — otherwise html2canvas can capture a fallback
    // system font mid-swap, which is a common cause of a "broken looking" export.
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Small extra delay to let the browser finish painting after font swap.
    await new Promise(resolve => setTimeout(resolve, 150));

    const canvas = await html2canvas(resumeEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: resumeEl.scrollWidth,
      windowHeight: resumeEl.scrollHeight
    });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210, pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    const name = val('f-name') || 'resume';
    pdf.save(name.replace(/\s+/g,'_') + '_CV.pdf');
  } catch(e){
    alert('Something went wrong generating the PDF: ' + e.message);
    console.error(e);
  } finally{
    btn.disabled = false;
    btn.textContent = 'Get CV (Download PDF)';
  }
});
