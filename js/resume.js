/* ============================================================
   MODULE 1: RESUME BUILDER
   Renders a live preview matching one of four selectable CV
   layouts and exports it to PDF using html2canvas + jsPDF.
   The preview always fits on a single A4 page: content taller than
   one page is auto-scaled down (see fitResumeToOnePage) rather than
   spilling onto a second page.
   ============================================================ */
let counter = 0;
function uid(){ return 'id' + (counter++); }

let currentTemplate = 'classic';
let photoDataUrl = null;

const PROFILE_HEADING = { classic: 'Professional Profile', student: 'About Me', executive: 'Summary', social: 'Profile', corporate: 'Professional Summary', bold: 'Summary' };
const WORKEXP_HEADING = { minimal: 'Career', executive: 'Work Experience', social: 'Career', corporate: 'Work History', bold: 'Work Experience' };
const RESEARCH_HEADING = { classic: 'Research Focus', social: 'Professional' };

/* ------------------------------------------------------------
   TEMPLATE SWITCHING
   ------------------------------------------------------------ */
function selectTemplate(name){
  currentTemplate = name;

  document.querySelectorAll('#tmplPicker .tmpl-option').forEach(el=>{
    el.classList.toggle('active', el.getAttribute('data-tmpl-btn') === name);
  });

  document.querySelectorAll('.tmpl-field[data-tmpl]').forEach(el=>{
    const list = el.getAttribute('data-tmpl').split(' ');
    el.style.display = list.includes(name) ? '' : 'none';
  });

  document.querySelectorAll('.resume-tpl').forEach(el=>{
    el.style.display = (el.id === 'resume-' + name) ? 'flex' : 'none';
  });

  const profileHeading = document.getElementById('profileHeading');
  if(profileHeading) profileHeading.textContent = PROFILE_HEADING[name] || 'Professional Profile';
  const workexpHeading = document.getElementById('workexpHeading');
  if(workexpHeading) workexpHeading.textContent = WORKEXP_HEADING[name] || 'Work Experience';
  const researchHeading = document.getElementById('researchHeading');
  if(researchHeading) researchHeading.textContent = RESEARCH_HEADING[name] || 'Research Focus';

  renderResume();
}

/* ------------------------------------------------------------
   PHOTO UPLOAD
   ------------------------------------------------------------ */
function handlePhotoUpload(evt){
  const file = evt.target.files && evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    photoDataUrl = e.target.result;
    renderResume();
  };
  reader.readAsDataURL(file);
}
function clearPhoto(){
  photoDataUrl = null;
  const input = document.getElementById('f-photo');
  if(input) input.value = '';
  renderResume();
}
function photoHtml(shape){
  shape = shape || 'circle';
  if(photoDataUrl){
    return `<img src="${photoDataUrl}" class="photo-img photo-${shape}">`;
  }
  return `<div class="photo-placeholder photo-${shape}">Photo</div>`;
}


/* ------------------------------------------------------------
   SIMPLE REPEATERS (skills / languages / computer skills / interests / certs)
   ------------------------------------------------------------ */
const SIMPLE_PLACEHOLDERS = {
  skill: 'e.g. Molecular Biology Techniques',
  language: 'e.g. English — Native',
  certification: "e.g. Biotechnology — St. Andrew's College, 2021–2022",
  computer: 'e.g. MS Office',
  interest: 'e.g. Reading'
};

function addSimpleLine(containerId, placeholderKind, value, level){
  const container = document.getElementById(containerId);
  const wrap = document.createElement('div');
  wrap.className = 'simple-line';
  const ph = SIMPLE_PLACEHOLDERS[placeholderKind] || 'Enter a value';

  let sliderHtml = '';
  if(placeholderKind === 'skill'){
    const lvl = (level === undefined || level === null) ? 70 : level;
    sliderHtml = `
      <input type="range" class="level-slider" min="0" max="100" step="5" value="${lvl}"
        title="Bar length in the Student Blue template" oninput="this.nextElementSibling.textContent=this.value+'%'; renderResume();">
      <span class="level-badge">${lvl}%</span>
    `;
  } else if(placeholderKind === 'language'){
    const lvl = (level === undefined || level === null) ? 3 : level;
    sliderHtml = `
      <input type="range" class="level-slider" min="0" max="5" step="1" value="${lvl}"
        title="Dots filled in the Student Blue template" oninput="this.nextElementSibling.textContent=this.value+'/5'; renderResume();">
      <span class="level-badge">${lvl}/5</span>
    `;
  }

  wrap.innerHTML = `
    <input type="text" placeholder="${ph}" value="${value ? value.replace(/"/g,'&quot;') : ''}" oninput="renderResume()">
    ${sliderHtml}
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

function addWorkExp(data){
  data = data || {};
  const container = document.getElementById('workexp-container');
  const wrap = document.createElement('div');
  wrap.className = 'list-item';
  wrap.innerHTML = `
    <button class="rm" onclick="this.parentElement.remove(); renderResume();">✕ remove</button>
    <label>Company</label>
    <input type="text" class="we-company" value="${data.company||''}" oninput="renderResume()">
    <label>Position</label>
    <input type="text" class="we-position" value="${data.position||''}" oninput="renderResume()">
    <div class="row2">
      <div><label>Location</label><input type="text" class="we-location" value="${data.location||''}" oninput="renderResume()"></div>
      <div><label>Dates</label><input type="text" class="we-dates" placeholder="e.g. seit 11/2016" value="${data.dates||''}" oninput="renderResume()"></div>
    </div>
    <label>Description (one bullet per line)</label>
    <textarea class="we-desc" oninput="renderResume()">${data.desc||''}</textarea>
  `;
  container.appendChild(wrap);
  renderResume();
}

function addOrganization(data){
  data = data || {};
  const container = document.getElementById('organizations-container');
  const wrap = document.createElement('div');
  wrap.className = 'list-item';
  wrap.innerHTML = `
    <button class="rm" onclick="this.parentElement.remove(); renderResume();">✕ remove</button>
    <label>Organization Name</label>
    <input type="text" class="org-name" value="${data.name||''}" oninput="renderResume()">
    <div class="row2">
      <div><label>Role</label><input type="text" class="org-role" placeholder="e.g. Member" value="${data.role||''}" oninput="renderResume()"></div>
      <div><label>Dates</label><input type="text" class="org-dates" placeholder="2019 – Present" value="${data.dates||''}" oninput="renderResume()"></div>
    </div>
  `;
  container.appendChild(wrap);
  renderResume();
}

function addAchievement(data){
  data = data || {};
  const container = document.getElementById('achievements-container');
  const wrap = document.createElement('div');
  wrap.className = 'list-item';
  wrap.innerHTML = `
    <button class="rm" onclick="this.parentElement.remove(); renderResume();">✕ remove</button>
    <label>Title</label>
    <input type="text" class="ach-title" placeholder="e.g. With Honors (2019 – Present)" value="${data.title||''}" oninput="renderResume()">
    <label>Detail</label>
    <input type="text" class="ach-desc" placeholder="e.g. First and Second Quarter" value="${data.desc||''}" oninput="renderResume()">
  `;
  container.appendChild(wrap);
  renderResume();
}

/* ------------------------------------------------------------
   DATA COLLECTION HELPERS
   ------------------------------------------------------------ */
function val(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
function simpleLineValues(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' input[type=text]'))
    .map(inp => inp.value.trim())
    .filter(Boolean);
}
function simpleLineEntries(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' .simple-line')).map(row=>{
    const textInp = row.querySelector('input[type=text]');
    const rangeInp = row.querySelector('input[type=range]');
    return {
      text: textInp ? textInp.value.trim() : '',
      level: rangeInp ? parseInt(rangeInp.value, 10) : null
    };
  }).filter(e => e.text);
}
function fillListInto(containerId, targetEl){
  targetEl.innerHTML = '';
  simpleLineValues(containerId).forEach(v=>{
    const li = document.createElement('li');
    li.textContent = v;
    targetEl.appendChild(li);
  });
}
function educationEntries(){
  return Array.from(document.querySelectorAll('#education-container .list-item')).map(item=>({
    school: item.querySelector('.edu-school').value,
    location: item.querySelector('.edu-location').value,
    dates: item.querySelector('.edu-dates').value,
    degree: item.querySelector('.edu-degree').value,
    desc: item.querySelector('.edu-desc').value
  })).filter(e => e.school || e.degree);
}
function projectEntries(){
  return Array.from(document.querySelectorAll('#projects-container .list-item')).map(item=>({
    title: item.querySelector('.proj-title').value,
    desc: item.querySelector('.proj-desc').value
  })).filter(p => p.title || p.desc);
}
function workExpEntries(){
  return Array.from(document.querySelectorAll('#workexp-container .list-item')).map(item=>({
    company: item.querySelector('.we-company').value,
    position: item.querySelector('.we-position').value,
    location: item.querySelector('.we-location').value,
    dates: item.querySelector('.we-dates').value,
    desc: item.querySelector('.we-desc').value
  })).filter(w => w.company || w.position);
}
function organizationEntries(){
  return Array.from(document.querySelectorAll('#organizations-container .list-item')).map(item=>({
    name: item.querySelector('.org-name').value,
    role: item.querySelector('.org-role').value,
    dates: item.querySelector('.org-dates').value
  })).filter(o => o.name);
}
function achievementEntries(){
  return Array.from(document.querySelectorAll('#achievements-container .list-item')).map(item=>({
    title: item.querySelector('.ach-title').value,
    desc: item.querySelector('.ach-desc').value
  })).filter(a => a.title || a.desc);
}
function bulletsHtml(desc){
  return escapeHtml(desc).split('\n').map(l=>l.trim()).filter(Boolean)
    .map(l => `<li>${l}</li>`).join('');
}

/* ------------------------------------------------------------
   MASTER RENDER — dispatches to the active template
   ------------------------------------------------------------ */
function renderResume(){
  if(currentTemplate === 'classic') renderClassic();
  else if(currentTemplate === 'minimal') renderMinimal();
  else if(currentTemplate === 'student') renderStudent();
  else if(currentTemplate === 'executive') renderExecutive();
  else if(currentTemplate === 'social') renderSocial();
  else if(currentTemplate === 'corporate') renderCorporate();
  else if(currentTemplate === 'bold') renderBold();
  fitResumeToOnePage();
}

/* ---------- TEMPLATE 1: Classic Teal Sidebar ---------- */
function renderClassic(){
  document.getElementById('c-name').textContent = val('f-name') || 'Your Name';
  document.getElementById('c-title').textContent = val('f-title') || 'Your Title / Subtitle';
  document.getElementById('c-email').textContent = val('f-email') || 'email@example.com';
  document.getElementById('c-phone').textContent = val('f-phone') || 'phone number';
  document.getElementById('c-location').textContent = val('f-location') || 'Location';
  document.getElementById('c-university').textContent = val('f-university') || 'University';
  document.getElementById('c-research-focus').textContent = val('f-research-focus');
  document.getElementById('c-profile').textContent = val('f-profile');

  fillListInto('skills-container', document.getElementById('c-skills'));
  fillListInto('languages-container', document.getElementById('c-languages'));
  fillListInto('certifications-container', document.getElementById('c-certifications'));

  const eduOut = document.getElementById('c-education');
  eduOut.innerHTML = '';
  educationEntries().forEach(e=>{
    const div = document.createElement('div');
    div.className = 'edu-entry';
    div.innerHTML = `
      <div class="edu-head">
        <span class="edu-school">${escapeHtml(e.school)}${e.location ? ' — ' + escapeHtml(e.location) : ''}</span>
        <span class="edu-dates">${escapeHtml(e.dates)}</span>
      </div>
      <div class="edu-loc-degree">${escapeHtml(e.degree)}</div>
      <div class="edu-desc">${escapeHtml(e.desc).replace(/\n/g,'<br>')}</div>
    `;
    eduOut.appendChild(div);
  });

  const projOut = document.getElementById('c-projects');
  projOut.innerHTML = '';
  projectEntries().forEach(p=>{
    const div = document.createElement('div');
    div.className = 'proj-entry';
    div.innerHTML = `
      <div class="proj-title">${escapeHtml(p.title)}</div>
      <div class="proj-desc">${escapeHtml(p.desc).replace(/\n/g,'<br>')}</div>
    `;
    projOut.appendChild(div);
  });
}

/* ---------- TEMPLATE 2: Minimal London ---------- */
function renderMinimal(){
  document.getElementById('m-name').textContent = val('f-name') || 'Firstname Lastname';
  document.getElementById('m-birthday').textContent = val('f-birthday') || '—';
  document.getElementById('m-location').textContent = val('f-location') || '—';
  document.getElementById('m-phone').textContent = val('f-phone') || '—';
  document.getElementById('m-email').textContent = val('f-email') || '—';
  document.getElementById('m-photo-wrap').innerHTML = photoHtml('circle');

  const langs = simpleLineValues('languages-container');
  document.getElementById('m-languages').innerHTML = langs.length ? langs.map(escapeHtml).join('<br>') : '—';
  const comp = simpleLineValues('computerskills-container');
  document.getElementById('m-computerskills').innerHTML = comp.length ? comp.map(escapeHtml).join('<br>') : '—';
  const interests = simpleLineValues('interests-container');
  document.getElementById('m-interests').textContent = interests.length ? interests.join(', ') : '—';

  const weOut = document.getElementById('m-workexp');
  weOut.innerHTML = '';
  workExpEntries().forEach(w=>{
    const div = document.createElement('div');
    div.className = 'min-entry';
    div.innerHTML = `
      <div class="min-entry-dates">${escapeHtml(w.dates)}</div>
      <div class="min-entry-body">
        <div class="min-entry-title">${escapeHtml(w.company)}${w.location ? ' — ' + escapeHtml(w.location) : ''}</div>
        <div class="min-entry-sub">${escapeHtml(w.position)}</div>
        <ul class="min-bullets">${bulletsHtml(w.desc)}</ul>
      </div>
    `;
    weOut.appendChild(div);
  });

  const eduOut = document.getElementById('m-education');
  eduOut.innerHTML = '';
  educationEntries().forEach(e=>{
    const div = document.createElement('div');
    div.className = 'min-entry';
    div.innerHTML = `
      <div class="min-entry-dates">${escapeHtml(e.dates)}</div>
      <div class="min-entry-body">
        <div class="min-entry-title">${escapeHtml(e.school)}${e.location ? ' — ' + escapeHtml(e.location) : ''}</div>
        <div class="min-entry-sub">${escapeHtml(e.degree)}</div>
        <div class="min-entry-desc">${escapeHtml(e.desc).replace(/\n/g,'<br>')}</div>
      </div>
    `;
    eduOut.appendChild(div);
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
  const loc = val('f-location').split(',')[0] || 'London';
  document.getElementById('m-sig-date').textContent = `${loc}, ${dateStr}`;
  document.getElementById('m-sig-name').textContent = val('f-name') || '';
}

/* ---------- TEMPLATE 3: Student Blue ---------- */
function renderStudent(){
  document.getElementById('s-name').textContent = val('f-name') || 'Your Name';
  document.getElementById('s-title').textContent = (val('f-title') || 'STUDENT').toUpperCase();
  document.getElementById('s-photo-wrap').innerHTML = photoHtml('circle');
  document.getElementById('s-email').textContent = val('f-email') || 'email@example.com';
  document.getElementById('s-phone').textContent = val('f-phone') || 'phone number';
  document.getElementById('s-location').textContent = val('f-location') || 'Location';
  const linkedin = val('f-linkedin');
  document.getElementById('s-linkedin-row').style.display = linkedin ? '' : 'none';
  document.getElementById('s-linkedin').textContent = linkedin;
  document.getElementById('s-profile').textContent = val('f-profile');
  document.getElementById('s-expectations').textContent = val('f-expectations');

  const skillsOut = document.getElementById('s-skills');
  skillsOut.innerHTML = '';
  simpleLineEntries('skills-container').forEach(entry=>{
    const pct = entry.level !== null && !isNaN(entry.level) ? entry.level : 70;
    const row = document.createElement('div');
    row.className = 'stu-skill-row';
    row.innerHTML = `
      <div class="stu-skill-name">${escapeHtml(entry.text)}</div>
      <div class="stu-skill-bar"><div class="stu-skill-fill" style="width:${pct}%"></div></div>
    `;
    skillsOut.appendChild(row);
  });

  const langOut = document.getElementById('s-languages');
  langOut.innerHTML = '';
  simpleLineEntries('languages-container').forEach(entry=>{
    const filled = entry.level !== null && !isNaN(entry.level) ? entry.level : 3;
    let dots = '';
    for(let d=0; d<5; d++) dots += `<span class="stu-dot ${d < filled ? 'filled' : ''}"></span>`;
    const row = document.createElement('div');
    row.className = 'stu-lang-row';
    row.innerHTML = `<div class="stu-lang-name">${escapeHtml(entry.text)}</div><div class="stu-dots">${dots}</div>`;
    langOut.appendChild(row);
  });

  fillListInto('interests-container', document.getElementById('s-interests'));

  const eduOut = document.getElementById('s-education');
  eduOut.innerHTML = '';
  educationEntries().forEach(e=>{
    const div = document.createElement('div');
    div.className = 'stu-entry';
    div.innerHTML = `
      <div class="stu-entry-title">${escapeHtml(e.degree || e.school)}</div>
      <div class="stu-entry-sub">${escapeHtml(e.school)}${e.dates ? ' — ' + escapeHtml(e.dates) : ''}</div>
    `;
    eduOut.appendChild(div);
  });

  const orgOut = document.getElementById('s-organizations');
  orgOut.innerHTML = '';
  organizationEntries().forEach(o=>{
    const div = document.createElement('div');
    div.className = 'stu-entry';
    div.innerHTML = `
      <div class="stu-entry-title">${escapeHtml(o.name)}${o.dates ? ' (' + escapeHtml(o.dates) + ')' : ''}</div>
      <div class="stu-entry-sub">${escapeHtml(o.role)}</div>
    `;
    orgOut.appendChild(div);
  });

  const achOut = document.getElementById('s-achievements');
  achOut.innerHTML = '';
  achievementEntries().forEach(a=>{
    const div = document.createElement('div');
    div.className = 'stu-entry';
    div.innerHTML = `
      <div class="stu-entry-title">${escapeHtml(a.title)}</div>
      <div class="stu-entry-sub">${escapeHtml(a.desc)}</div>
    `;
    achOut.appendChild(div);
  });
}

/* ---------- TEMPLATE 4: Executive Mono ---------- */
function renderExecutive(){
  document.getElementById('e-name').textContent = (val('f-name') || 'Your Name').toUpperCase();
  document.getElementById('e-title').textContent = (val('f-title') || 'Your Title').toUpperCase();
  document.getElementById('e-photo-wrap').innerHTML = photoHtml('circle');
  document.getElementById('e-location').textContent = val('f-location') || 'Location';
  document.getElementById('e-phone').textContent = val('f-phone') || 'Phone';
  document.getElementById('e-email').textContent = val('f-email') || 'Email';
  const linkedin = val('f-linkedin');
  const linkedinEl = document.getElementById('e-linkedin');
  linkedinEl.textContent = linkedin;
  linkedinEl.style.display = linkedin ? '' : 'none';
  document.getElementById('e-profile').textContent = val('f-profile');

  fillListInto('skills-container', document.getElementById('e-skills'));
  fillListInto('languages-container', document.getElementById('e-languages'));

  const weOut = document.getElementById('e-workexp');
  weOut.innerHTML = '';
  workExpEntries().forEach(w=>{
    const div = document.createElement('div');
    div.className = 'exec-entry';
    div.innerHTML = `
      <div class="exec-entry-title">${escapeHtml(w.position).toUpperCase()}</div>
      <div class="exec-entry-sub">${escapeHtml(w.company)}${w.location ? ', ' + escapeHtml(w.location) : ''}${w.dates ? ' | ' + escapeHtml(w.dates) : ''}</div>
      <ul class="exec-bullets">${bulletsHtml(w.desc)}</ul>
    `;
    weOut.appendChild(div);
  });
}

/* ---------- TEMPLATE 5: Grey Slate (social work style) ---------- */
function renderSocial(){
  document.getElementById('so-name').textContent = val('f-name') || 'Your Name';
  document.getElementById('so-title').textContent = val('f-title') || 'Your Title';
  document.getElementById('so-photo-wrap').innerHTML = photoHtml('square');
  document.getElementById('so-location').textContent = val('f-location');
  document.getElementById('so-phone').textContent = val('f-phone');
  document.getElementById('so-email').textContent = val('f-email');
  document.getElementById('so-research-focus').textContent = val('f-research-focus');
  document.getElementById('so-profile').textContent = val('f-profile');

  fillListInto('skills-container', document.getElementById('so-skills'));

  const eduOut = document.getElementById('so-education');
  eduOut.innerHTML = '';
  educationEntries().forEach(e=>{
    const div = document.createElement('div');
    div.className = 'soc-acad-entry';
    div.innerHTML = `
      <div class="soc-acad-dates">${escapeHtml(e.dates)}</div>
      <div class="soc-acad-course">${escapeHtml(e.degree)}</div>
      <div class="soc-acad-school">${escapeHtml(e.school)}</div>
    `;
    eduOut.appendChild(div);
  });

  const weOut = document.getElementById('so-workexp');
  weOut.innerHTML = '';
  workExpEntries().forEach(w=>{
    const div = document.createElement('div');
    div.className = 'soc-career-entry';
    div.innerHTML = `
      <div class="soc-career-dates">${escapeHtml(w.dates)}</div>
      <div class="soc-career-body">
        <div class="soc-career-title">${escapeHtml(w.position)}${w.company ? ' — ' + escapeHtml(w.company) : ''}</div>
        <ul class="soc-bullets">${bulletsHtml(w.desc)}</ul>
      </div>
    `;
    weOut.appendChild(div);
  });
}

/* ---------- TEMPLATE 6: Corporate Blue ---------- */
function renderCorporate(){
  document.getElementById('co-name').textContent = val('f-name') || 'Your Name';
  document.getElementById('co-photo-wrap').innerHTML = photoHtml('square');
  document.getElementById('co-location').textContent = val('f-location');
  document.getElementById('co-phone').textContent = val('f-phone');
  document.getElementById('co-email').textContent = val('f-email');
  document.getElementById('co-profile').textContent = val('f-profile');

  fillListInto('certifications-container', document.getElementById('co-certifications'));
  fillListInto('skills-container', document.getElementById('co-skills'));

  const eduOut = document.getElementById('co-education');
  eduOut.innerHTML = '';
  educationEntries().forEach(e=>{
    const div = document.createElement('div');
    div.className = 'corp-edu-entry';
    div.innerHTML = `
      <div class="corp-edu-degree">${escapeHtml(e.degree)}</div>
      <div class="corp-edu-school">${escapeHtml(e.school)}${e.location ? ', ' + escapeHtml(e.location) : ''}</div>
    `;
    eduOut.appendChild(div);
  });

  const weOut = document.getElementById('co-workexp');
  weOut.innerHTML = '';
  workExpEntries().forEach(w=>{
    const div = document.createElement('div');
    div.className = 'corp-we-entry';
    div.innerHTML = `
      <div class="corp-we-dates">${escapeHtml(w.dates)}</div>
      <div class="corp-we-title">${escapeHtml(w.position)}<span class="corp-we-company">, ${escapeHtml(w.company)}</span>${w.location ? ', ' + escapeHtml(w.location) : ''}</div>
      <ul class="corp-bullets">${bulletsHtml(w.desc)}</ul>
    `;
    weOut.appendChild(div);
  });
}

/* ---------- TEMPLATE 7: Bold Angle ---------- */
function renderBold(){
  document.getElementById('bo-name').textContent = val('f-name') || 'Your Name';
  document.getElementById('bo-title').textContent = val('f-title') || 'Your Title';
  document.getElementById('bo-photo-wrap').innerHTML = photoHtml('circle');
  document.getElementById('bo-email').textContent = val('f-email');
  document.getElementById('bo-phone').textContent = val('f-phone');
  document.getElementById('bo-location').textContent = val('f-location');
  document.getElementById('bo-profile').textContent = val('f-profile');

  fillListInto('skills-container', document.getElementById('bo-skills'));

  const eduOut = document.getElementById('bo-education');
  eduOut.innerHTML = '';
  educationEntries().forEach(e=>{
    const div = document.createElement('div');
    div.className = 'bld-edu-entry';
    div.innerHTML = `
      <div class="bld-edu-degree">${escapeHtml(e.degree)}</div>
      <div class="bld-edu-school">${escapeHtml(e.school)}</div>
      <div class="bld-edu-dates">${escapeHtml(e.dates)}</div>
    `;
    eduOut.appendChild(div);
  });

  const weOut = document.getElementById('bo-workexp');
  weOut.innerHTML = '';
  workExpEntries().forEach(w=>{
    const div = document.createElement('div');
    div.className = 'bld-we-entry';
    div.innerHTML = `
      <div class="bld-we-title">${escapeHtml(w.position)}${w.company ? ', ' + escapeHtml(w.company) : ''}</div>
      <div class="bld-we-dates">${escapeHtml(w.dates)}</div>
      <ul class="bld-bullets">${bulletsHtml(w.desc)}</ul>
    `;
    weOut.appendChild(div);
  });
}

/* ------------------------------------------------------------
   ONE-PAGE AUTO-FIT
   #resume-<tpl> lives inside a fixed 794x1123px window (#resume-frame,
   the exact pixel size of an A4 page at 96dpi). If the real content
   is taller than that, we shrink the active template with a CSS
   transform so it always lands exactly on one page - both in the
   live preview and in the exported PDF (see the downloadBtn click
   handler below).
   ------------------------------------------------------------ */
const RESUME_PAGE_W = 794;
const RESUME_PAGE_H = 1123;

function fitResumeToOnePage(){
  const resumeEl = document.getElementById('resume-' + currentTemplate);
  if(!resumeEl) return 1;
  // Reset first so scrollHeight reflects the true, unscaled content height.
  resumeEl.style.transform = 'none';
  const naturalHeight = resumeEl.scrollHeight;
  const scale = naturalHeight > RESUME_PAGE_H ? RESUME_PAGE_H / naturalHeight : 1;
  resumeEl.style.transform = scale < 1 ? `scale(${scale})` : 'none';

  const note = document.getElementById('pageFitNote');
  if(note){
    note.textContent = scale < 1
      ? 'Content auto-shrunk slightly to keep this to one page.'
      : '';
  }
  return scale;
}

['f-name','f-title','f-email','f-phone','f-location','f-university','f-research-focus','f-profile','f-birthday','f-linkedin','f-expectations']
  .forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', renderResume);
  });

function seedExample(){
  [['Molecular Biology Techniques',90],['Microbiology & Cell Culture',80],['Analytical Techniques',70],['Bioinformatics & Software',95],['PCR & Cell Culture',75],['Plant Pathology & Virology',65]]
    .forEach(s => addSimpleLine('skills-container','skill', s[0], s[1]));
  [['English',5],['Hindi',4]].forEach(l => addSimpleLine('languages-container','language', l[0], l[1]));
  ['MS Office','Basic knowledge: Adobe Photoshop'].forEach(c => addSimpleLine('computerskills-container','computer', c));
  ['Reading','Travelling'].forEach(i => addSimpleLine('interests-container','interest', i));
  addSimpleLine('certifications-container','certification', "Database Management System — St. Andrew's College, 2019–2020");
  addEducation({school:"Deen Dayal Upadhyaya Gorakhpur University", location:"Gorakhpur", dates:"2023 – 2024", degree:"M.Sc. Biotechnology", desc:"Advanced laboratory techniques including PCR, cell culture, and bioinformatics analysis."});
  addProject({title:"Microbial Diversity in Organic Compost", desc:"Isolated, cultured, and identified microorganisms from organic compost samples using standard microbiological techniques."});
  addWorkExp({company:"Another Challenge Ltd.", position:"Team assistant", location:"London", dates:"seit 11/2016", desc:"Overview of key responsibilities\nSkills, experience and achievements"});
  addOrganization({name:"Science Club", role:"Member", dates:"2019 – Present"});
  addAchievement({title:"With Honors (2019 – Present)", desc:"First and Second Quarter (First Semester)"});
  renderResume();
}
seedExample();
selectTemplate('classic');

document.getElementById('downloadBtn').addEventListener('click', async function(){
  const btn = this;
  btn.disabled = true;
  btn.textContent = 'Generating PDF...';
  try{
    const frameEl = document.getElementById('resume-frame');

    // Make sure the custom webfonts (Lora / Source Sans 3 / Dancing Script) are
    // fully loaded BEFORE measuring/fitting the page. fitResumeToOnePage()
    // decides its scale from the content's rendered scrollHeight, and text set
    // in a fallback system font measures a different height than the same
    // text once the real webfont swaps in — so fitting too early can lock in
    // a scale that no longer matches the content a moment later, letting it
    // overflow the fixed-size capture window in the exported PDF.
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Small extra delay to let the browser finish painting after font swap.
    await new Promise(resolve => setTimeout(resolve, 150));

    // Re-run the fit now that fonts are settled (also covers any last-keystroke edit).
    fitResumeToOnePage();
    // Let the browser actually paint the resulting transform before we rasterize it.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Capture the fixed 794x1123 frame (not the free-floating template element).
    // Because the active template is scaled to fit inside it, this canvas is
    // always exactly one A4 page's worth of pixels — no matter how much
    // content the person has added.
    const canvas = await html2canvas(frameEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: RESUME_PAGE_W,
      height: RESUME_PAGE_H,
      windowWidth: RESUME_PAGE_W,
      windowHeight: RESUME_PAGE_H
    });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    // The frame's pixel ratio (794x1123) already matches A4's mm ratio
    // (210x297), so a single full-bleed image always fills exactly one page.
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
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
