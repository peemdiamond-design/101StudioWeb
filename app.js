/* =========================================
   PEEMCN25 - Retro IBM Portfolio
   File: app.js
   ========================================= */

// 1. ระบบรายงาน Bug อัตโนมัติ
window.onerror = function(message, source, lineno, colno, error) {
    if (source && source.includes('chrome-extension')) return false;
    const bugData = { message: message, source: source, lineno: lineno, colno: colno };
    fetch('https://jogging-flagstick-wrongly.ngrok-free.dev/report-bug', {
        method: 'POST', 
        headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(bugData)
    }).catch(err => console.log('ไม่สามารถส่งรายงานบั๊กได้', err));
    return false; 
};

// 2. ตัวแปรตั้งต้นและ API
const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyTA1ZaJi3ieoEJt6mQD12Y-Ti5KY-uuyS3SdgmoFGL64jtgZM2xVdyg7GP1pSer46ZCQ/exec";
const SERVER_URL = 'https://retro-api.peemcn25.dev'; 

let scheduleData = []; 
let today = new Date(); 
let currentMonth = today.getMonth(); 
let currentYear = today.getFullYear();
const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

let projectData = [
    { name: "CODE CONTRA V.2.EXE", desc: "> ฝ่าด่านสุดมันส์ไปกับเกมยิงสไตล์ Retro 8-bit ที่สร้างสรรค์ขึ้นมาใหม่!", url: "https://codecontrav2by101studio.netlify.app/", icon: "▶ PLAY GAME" },
    { name: "MEDICINE DISPENSER SYS.", desc: "> Web App สำหรับควบคุมตู้จ่ายยาอัตโนมัติ ใช้งานง่าย", url: "https://example.com/medicine", icon: "🔗 OPEN WEB" },
    { name: "GOV_PORTAL NETWORK", desc: "> ระบบเว็บไซต์หน่วยงาน ออกแบบ UI/UX ให้ใช้งานคล่องตัว", url: "https://example.com/gov", icon: "🔗 OPEN WEB" }
];

// 3. ระบบเรนเดอร์ Projects
function renderProjects() {
    const container = document.getElementById('dynamic-project-container'); 
    if(!container) return;
    container.innerHTML = '';
    const isEdit = document.body.classList.contains('edit-mode');
    projectData.forEach((proj, index) => {
        const el = document.createElement('div'); el.className = 'project-item';
        let deleteBtnHTML = isEdit ? `<button class="action-btn sound-trigger" style="background:#da1e28; margin-left:5px; padding:4px 10px;" onclick="deleteProject(${index})">X</button>` : '';
        el.innerHTML = `
            <div class="project-header">
                <h3 class="project-title ${isEdit ? 'editable' : ''}" ${isEdit ? 'contenteditable="true"' : ''} onblur="projectData[${index}].name = this.innerText">${proj.name}</h3>
                <div><button class="action-btn sound-trigger" onclick="openTargetLinkStr('${proj.url}')">${proj.icon || '🔗 OPEN WEB'}</button>${deleteBtnHTML}</div>
            </div>
            <p class="project-desc ${isEdit ? 'editable' : ''}" ${isEdit ? 'contenteditable="true"' : ''} onblur="projectData[${index}].desc = this.innerText">${proj.desc}</p>
            <div class="admin-url-box"><span class="url-label">TARGET URL: </span><span class="proj-url-edit ${isEdit ? 'editable' : ''}" ${isEdit ? 'contenteditable="true"' : ''} onblur="projectData[${index}].url = this.innerText">${proj.url}</span></div>
        `;
        container.appendChild(el);
    });
}
window.addNewProject = function() { projectData.push({ name: "NEW_PROJECT.EXE", desc: "> คำอธิบาย...", url: "https://", icon: "🔗 OPEN WEB" }); renderProjects(); document.getElementById('save-btn').click(); }
window.deleteProject = function(index) { if(confirm("DELETE THIS PROJECT? (Y/N)")) { projectData.splice(index, 1); renderProjects(); document.getElementById('save-btn').click(); } }
window.openTargetLinkStr = function(url) { if (document.body.classList.contains('edit-mode')) return; if (url && url.trim() !== '') { let link = url.trim(); if (!link.startsWith('http')) { link = 'https://' + link; } window.open(link, '_blank'); } }

// 4. ระบบแฟ้มข้อมูล ARCHIVE (Google Drive)
let allFiles = []; 
let folderHistory = []; 
let currentFolderId = 'root';
let currentSort = { column: 'date', direction: 'desc' }; 
let currentViewMode = 'list'; 
let targetSecretBtn = null;

window.loadSecretFolder = function(btnElement) {
    const currentUser = firebase.auth().currentUser;
    const hasSecretAccess = sessionStorage.getItem('secret_unlocked') === 'true';
    if (currentUser || hasSecretAccess) {
        loadDriveFolder(btnElement, 'TOP_SECRET', '1waXWwHFGtWFfSpz2wnvld6UNq-CqZgV8');
    } else {
        playRetroClick();
        targetSecretBtn = btnElement;
        document.getElementById('secret-password').value = '';
        document.getElementById('secret-modal').style.display = 'flex';
        document.getElementById('secret-password').focus();
    }
}

window.loadDriveFolder = function(btnElement, folderName, baseFolderId) {
    document.querySelectorAll('.folder-btn').forEach(b => b.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    document.getElementById('archive-ext-link').href = `https://drive.google.com/drive/folders/${baseFolderId}`;
    document.getElementById('archive-ext-link').style.display = 'flex';
    folderHistory = [{ id: baseFolderId, name: folderName }];
    currentFolderId = baseFolderId;
    updatePathDisplay();
    fetchFiles(currentFolderId);
}

function formatDOSDate(isoDate) {
    if(!isoDate) return "<DIR>";
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function formatDOSSize(bytes) {
    if(!bytes) return "";
    return Math.ceil(bytes / 1024).toLocaleString() + " KB";
}

window.openPreview = function(fileId, fileName) {
    document.getElementById('preview-title').innerText = `VIEWING: ${fileName}`;
    document.getElementById('preview-frame').src = `https://drive.google.com/file/d/${fileId}/preview`;
    document.getElementById('preview-modal').style.display = 'flex';
}
window.closePreview = function() {
    document.getElementById('preview-modal').style.display = 'none';
    document.getElementById('preview-frame').src = '';
}

window.fetchFiles = async function(folderId) {
    const fileListDiv = document.getElementById('file-list');
    fileListDiv.innerHTML = `<span style="color:var(--ibm-accent-blue); font-family: 'VT323'; font-size:1.4rem; padding:10px;">> FETCHING DATA...</span>`;
    try {
        const headers = { 'ngrok-skip-browser-warning': 'true' };
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            const token = await currentUser.getIdToken(); 
            headers['Authorization'] = `Bearer ${token}`;
        }
        const fetchUrl = `${SERVER_URL}/list-files?folderId=${folderId}`;
        const response = await fetch(fetchUrl, { headers: headers });
        if (!response.ok) throw new Error(`HTTP ERROR: ${response.status}`);
        allFiles = await response.json(); 
        filterFiles(); 
    } catch (error) { 
        fileListDiv.innerHTML = `<span style="color:#da1e28; font-family: 'VT323'; font-size:1.4rem; padding:10px;">> ERROR: CONNECTION LOST<br>> DETAILS: ${error.message}</span>`; 
    }
}

window.toggleSort = function(column) {
    playRetroClick();
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = column === 'name' ? 'asc' : 'desc';
    }
    filterFiles();
}

function getSortedFiles(files) {
    return files.slice().sort((a, b) => {
        const isFolderA = a.mimeType === 'application/vnd.google-apps.folder' || a.name.endsWith('[FOLDER]');
        const isFolderB = b.mimeType === 'application/vnd.google-apps.folder' || b.name.endsWith('[FOLDER]');
        if (isFolderA !== isFolderB) return isFolderA ? -1 : 1;
        let valA, valB;
        if (currentSort.column === 'name') {
            valA = a.name.toLowerCase(); valB = b.name.toLowerCase();
        } else if (currentSort.column === 'date') {
            valA = new Date(a.createdTime || 0).getTime(); valB = new Date(b.createdTime || 0).getTime();
        } else if (currentSort.column === 'size') {
            valA = parseInt(a.size || 0, 10); valB = parseInt(b.size || 0, 10);
        }
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

window.toggleViewMode = function() {
    currentViewMode = currentViewMode === 'list' ? 'grid' : 'list';
    document.getElementById('view-toggle-btn').innerText = currentViewMode === 'list' ? '[ VIEW: LIST ]' : '[ VIEW: GRID ]';
    filterFiles();
}

function renderFilesList(filesToDisplay) {
    const fileListDiv = document.getElementById('file-list');
    let htmlStr = ''; 
    const sortedFiles = getSortedFiles(filesToDisplay);

    if (sortedFiles.length === 0 && folderHistory.length <= 1) {
        fileListDiv.innerHTML = '<span style="color:var(--ibm-shadow); font-family: \'VT323\'; font-size:1.4rem; padding: 10px;">> DIRECTORY IS EMPTY.</span>';
        return;
    }

    if (folderHistory.length > 1) {
        htmlStr += `
        <div class="file-item up-level-item sound-trigger" style="background: rgba(218, 30, 40, 0.05); cursor: pointer; border-bottom: 2px solid var(--ibm-key-dark);" onclick="goBackFolder()">
            <div class="file-info" style="flex-direction: row; justify-content: flex-start; gap: 10px;">
                <span class="dos-col-name" style="color: #da1e28; font-weight: bold; padding-left: 5px; flex:none;">[ .. ] UP LEVEL DIRECTORY</span>
                ${currentViewMode === 'list' ? '<span class="dos-col-date" style="color: #da1e28; flex:1;">&lt;DIR&gt;</span>' : ''}
            </div>
        </div>`;
    }

    if (currentViewMode === 'list') {
        const getSortIndicator = (col) => currentSort.column === col ? (currentSort.direction === 'asc' ? '&nbsp;▲' : '&nbsp;▼') : '';
        htmlStr += `
        <div class="dos-table-header">
            <span class="dos-col-name sortable-header sound-trigger" onclick="toggleSort('name')">FILE_NAME<span style="color:var(--ibm-accent-blue); display:inline-block; width:12px;">${getSortIndicator('name')}</span></span>
            <span class="dos-col-date sortable-header sound-trigger" onclick="toggleSort('date')">DATE_MODIFIED<span style="color:var(--ibm-accent-blue); display:inline-block; width:12px;">${getSortIndicator('date')}</span></span>
            <span class="dos-col-size sortable-header sound-trigger" onclick="toggleSort('size')">SIZE<span style="color:var(--ibm-accent-blue); display:inline-block; width:12px;">${getSortIndicator('size')}</span></span>
        </div>`;

        sortedFiles.forEach(file => {
            const safeName = file.name.replace(/'/g, "\\'");
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder' || file.name.endsWith('[FOLDER]'); 
            const dateStr = formatDOSDate(file.createdTime);
            const sizeStr = formatDOSSize(file.size);

            let clickAction = isFolder ? `onclick="enterFolder('${file.id}', '${safeName}')"` : `onclick="openPreview('${file.id}', '${safeName}')"`;
            let iconHtml = isFolder ? `<div class="file-icon" style="background:var(--ibm-key-dark); color:#fff; flex:none;">📁</div>` : 
                           (file.hasThumbnail ? `<img src="${file.thumbnailLink}" class="file-thumb" style="flex:none;">` : `<div class="file-icon" style="flex:none;">📄</div>`);
            
            htmlStr += `
            <div class="file-item sound-trigger" ${clickAction} style="cursor: pointer; display: flex; align-items: center;">
                <div class="file-info">
                    ${iconHtml}
                    <span class="dos-col-name" style="text-overflow: ellipsis;">
                        <a class="file-link" style="display:inline; text-decoration:none;">${file.name}</a>
                    </span>
                </div>
                <span class="dos-col-date" style="color:var(--ibm-shadow); font-family: 'VT323'; font-size: 1.1rem;">${dateStr}</span>
                <span class="dos-col-size" style="color:var(--ibm-shadow); font-family: 'VT323'; font-size: 1.1rem;">${sizeStr}</span>
            </div>`;
        });
    } else {
        htmlStr += `<div class="grid-container">`;
        sortedFiles.forEach(file => {
            const safeName = file.name.replace(/'/g, "\\'");
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder' || file.name.endsWith('[FOLDER]'); 
            let clickAction = isFolder ? `onclick="enterFolder('${file.id}', '${safeName}')"` : `onclick="openPreview('${file.id}', '${safeName}')"`;
            let iconHtml = isFolder ? `<div class="file-icon" style="color:var(--ibm-accent-blue); background:transparent; border:none;">📁</div>` : 
                           (file.hasThumbnail ? `<img src="${file.thumbnailLink}" class="file-thumb">` : `<div class="file-icon" style="color:var(--ibm-text); background:transparent; border:none;">📄</div>`);
            htmlStr += `
            <div class="grid-item sound-trigger" ${clickAction} title="${file.name}">
                ${iconHtml}
                <span class="file-link">${file.name}</span>
            </div>`;
        });
        htmlStr += `</div>`;
    }
    fileListDiv.innerHTML = htmlStr;
}

window.enterFolder = function(folderId, folderName) { folderHistory.push({ id: folderId, name: folderName }); currentFolderId = folderId; updatePathDisplay(); fetchFiles(currentFolderId); }
window.jumpToFolder = function(index) { folderHistory = folderHistory.slice(0, index + 1); currentFolderId = folderHistory[folderHistory.length - 1].id; updatePathDisplay(); fetchFiles(currentFolderId); }
window.goBackFolder = function() { if (folderHistory.length > 1) { jumpToFolder(folderHistory.length - 2); } }

function updatePathDisplay() {
    const pathContainer = document.getElementById('archive-path');
    let breadcrumbsHtml = `<span style="color: var(--ibm-key-dark); font-family: 'VT323';">C:\\ARCHIVE</span>`;
    folderHistory.forEach((f, index) => {
        breadcrumbsHtml += `<span style="margin: 0 8px; color: var(--ibm-key-dark);">></span>`;
        breadcrumbsHtml += `<a class="sound-trigger" style="color: #fff; font-family: 'VT323'; text-decoration: none; cursor: pointer; transition: 0.2s;" onmouseover="this.style.color='var(--ibm-accent-blue)'; this.style.textDecoration='underline';" onmouseout="this.style.color='#fff'; this.style.textDecoration='none';" onclick="jumpToFolder(${index})">${f.name}</a>`;
    });
    pathContainer.innerHTML = breadcrumbsHtml;
}

window.filterFiles = function() { const keyword = document.getElementById('search-input').value.toLowerCase(); renderFilesList(allFiles.filter(file => file.name.toLowerCase().includes(keyword))); }

// 5. ระบบ Calendar
function renderCalendar() {
    const grid = document.getElementById('calendar-grid'); const monthYearLabel = document.getElementById('month-year-label');
    if(!grid) return;
    grid.innerHTML = ''; monthYearLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(day => { const el = document.createElement('div'); el.className = 'calendar-day-header'; el.textContent = day; grid.appendChild(el); });

    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) { const empty = document.createElement('div'); empty.className = 'calendar-day empty'; grid.appendChild(empty); }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div'); cell.className = 'calendar-day';
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = scheduleData.filter(e => e.date === dateStr); const activeEvents = dayEvents.filter(e => !e.completed);
        const pinIcon = activeEvents.length > 0 ? ' <span style="font-size: 1rem;">📌</span>' : '';
        cell.innerHTML = `<div class="day-number">${day}${pinIcon}</div>`;
        
        const eventsContainer = document.createElement('div'); eventsContainer.className = 'events-container';
        dayEvents.forEach(ev => {
            const globalIndex = scheduleData.indexOf(ev); const evEl = document.createElement('div');
            evEl.className = 'calendar-event' + (ev.completed ? ' completed' : '');
            const textSpan = document.createElement('span'); textSpan.innerHTML = `> ${ev.title}`;
            textSpan.onclick = (e) => { if(document.body.classList.contains('edit-mode')) { e.stopPropagation(); toggleQuest(globalIndex); } };
            evEl.appendChild(textSpan);
            const delBtn = document.createElement('button'); delBtn.className = 'delete-event-btn sound-trigger'; delBtn.textContent = 'x';
            delBtn.onclick = (e) => { e.stopPropagation(); deleteScheduleEvent(globalIndex); };
            evEl.appendChild(delBtn); eventsContainer.appendChild(evEl);
        });
        cell.appendChild(eventsContainer); cell.onclick = () => { if(document.body.classList.contains('edit-mode')) promptAddEvent(dateStr); }; grid.appendChild(cell);
    }
}
window.changeMonth = function(dir) { currentMonth += dir; if(currentMonth < 0) { currentMonth = 11; currentYear--; } if(currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); }
window.toggleQuest = function(index) { scheduleData[index].completed = !scheduleData[index].completed; if(scheduleData[index].completed) playLevelUpSound(); renderCalendar(); if(document.body.classList.contains('edit-mode')){ document.getElementById('save-btn').click(); } }
function sendLineNotify(dateStr, title) { const formData = new URLSearchParams(); formData.append("action", "notify_now"); formData.append("date", dateStr); formData.append("title", title); fetch(GOOGLE_APP_SCRIPT_URL, { method: "POST", body: formData, mode: 'no-cors' }); }
window.promptAddEvent = function(dateStr) { let title = prompt(`[ ADD NEW TASK ] DATE: ${dateStr}\nกรุณาพิมพ์รายละเอียดภารกิจ:`); if(title && title.trim() !== '') { title = title.replace(/</g, "&lt;").replace(/>/g, "&gt;"); scheduleData.push({ date: dateStr, title: title.trim(), completed: false }); renderCalendar(); sendLineNotify(dateStr, title.trim()); document.getElementById('save-btn').click(); } }
window.deleteScheduleEvent = function(index) { if(confirm("DELETE THIS TASK? (Y/N)")) { scheduleData.splice(index, 1); renderCalendar(); if(document.body.classList.contains('edit-mode')){ document.getElementById('save-btn').click(); } } }

// 6. ระบบ Gallery & Tab Navigation
window.openGallery = function(event, albumId) { if (event.target.classList.contains('editable')) return; document.getElementById('galleryModal').classList.add('active'); document.querySelectorAll('.gallery-content > div').forEach(el => el.style.display = 'none'); const targetAlbum = document.getElementById('album-' + albumId); if (targetAlbum) targetAlbum.style.display = 'flex'; }
window.closeGallery = function() { document.getElementById('galleryModal').classList.remove('active'); }
window.switchTab = function(e, tabId) { document.querySelectorAll('.section').forEach(s => s.classList.remove('active')); document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); document.getElementById(tabId).classList.add('active'); if (e && e.currentTarget) e.currentTarget.classList.add('active'); }

// 7. ระบบเสียง (Audio System)
let audioCtx = null;
window.playRetroClick = function() { if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } if (audioCtx.state === 'suspended') { audioCtx.resume(); } const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'square'; osc.frequency.setValueAtTime(200, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.05); gain.gain.setValueAtTime(0.08, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.05); }
window.playLevelUpSound = function() { if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } if (audioCtx.state === 'suspended') { audioCtx.resume(); } const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'triangle'; osc.frequency.setValueAtTime(440, audioCtx.currentTime); osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.3); }

function playKeystrokeSound() { 
    if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } 
    if (audioCtx.state === 'suspended') { audioCtx.resume(); } 
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); 
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(150 + Math.random() * 50, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.02); 
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime); 
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02); 
    osc.connect(gain); gain.connect(audioCtx.destination); 
    osc.start(); osc.stop(audioCtx.currentTime + 0.02); 
}

// 8. Event Listeners เบ็ดเตล็ดเมื่อเปิดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    // ผูกเสียงคลิก
    document.querySelectorAll('.sound-trigger, .nav-btn, .btn-drive, .btn-social, .logo, .action-btn, .folder-btn').forEach(btn => { btn.addEventListener('mousedown', playRetroClick); });
    // ผูกเสียงพิมพ์
    document.querySelectorAll('input').forEach(input => { input.addEventListener('keydown', playKeystrokeSound); });

    // กด Enter แก้ไขข้อความได้
    document.addEventListener('keydown', function(event) { 
        if (event.key === 'Enter') { 
            if (event.target.classList.contains('editable-block') || event.target.classList.contains('project-desc')) { 
                event.preventDefault(); document.execCommand('insertLineBreak'); 
            } else if (event.target.classList.contains('editable') || event.target.classList.contains('project-title') || event.target.classList.contains('proj-url-edit')) { 
                event.preventDefault(); event.target.blur(); 
            } 
        } 
    });
    // ทำความสะอาดข้อความเมื่อเลิกพิมพ์
    document.querySelectorAll('.editable:not(.editable-block)').forEach(el => { 
        el.addEventListener('blur', function() { let cleanText = this.innerText.replace(/\s+/g, ' ').trim(); this.innerHTML = cleanText; }); 
    });

    // ปุ่ม Login ใน Modal
    const pwInput = document.getElementById('password');
    if(pwInput) pwInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { document.getElementById('login-submit-btn').click(); } });

    // ระบบรหัสลับ TOP SECRET (123456)
    const secretSubmitBtn = document.getElementById('secret-submit-btn');
    const secretInput = document.getElementById('secret-password');
    if(secretSubmitBtn) {
        secretSubmitBtn.onclick = () => {
            const pwd = secretInput.value;
            if (pwd === '6910') { 
                sessionStorage.setItem('secret_unlocked', 'true');
                document.getElementById('secret-modal').style.display = 'none';
                playLevelUpSound();
                if(targetSecretBtn) loadDriveFolder(targetSecretBtn, 'TOP_SECRET', '1waXWwHFGtWFfSpz2wnvld6UNq-CqZgV8');
            } else {
                alert("ACCESS DENIED: INVALID CLEARANCE CODE.");
                secretInput.value = '';
            }
        };
    }
    if(secretInput) { secretInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') secretSubmitBtn.click(); }); }
    
    // โหลด Matrix Canvas
    initMatrix();
});

// 9. ระบบ Boot Screen
window.addEventListener('load', () => {
    if (sessionStorage.getItem('hasBooted')) {
        const bs = document.getElementById('boot-screen');
        if(bs) bs.style.display = 'none';
        return;
    }
    const bootScreen = document.getElementById('boot-screen');
    const bootText = document.getElementById('boot-text');
    const bootCursor = document.getElementById('boot-cursor');
    if(!bootScreen) return;

    const lines = [
        "BIOS Date 10/22/26 12:23:00 Ver 1.01",
        "CPU: IBM Personal Computer AT",
        "Checking RAM: 64000 KB .................... OK",
        "Loading Drivers ........................... OK",
        "Establishing Secure Connection ............ OK",
        "Accessing Mainframe ......................."
    ];
    let delay = 0;
    lines.forEach((line) => {
        setTimeout(() => { bootText.innerHTML += line + "<br>"; }, delay);
        delay += 300 + Math.random() * 350; 
    });
    setTimeout(() => {
        bootCursor.style.display = 'none';
        bootText.innerHTML += "<span style='color:#24a148;'>ACCESS GRANTED. INITIALIZING SYSTEM...</span><br>";
    }, delay + 200);
    setTimeout(() => {
        bootScreen.style.opacity = '0';
        setTimeout(() => {
            bootScreen.style.display = 'none';
            sessionStorage.setItem('hasBooted', 'true');
        }, 500);
    }, delay + 1200);
});

// 10. Matrix Background 
let mCanvas, mCtx, mWidth, mHeight, columns, drops = []; 
const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ</>{}[]~#'.split(''); const fontSize = 14;
function initMatrix() { 
    mCanvas = document.getElementById('matrixCanvas'); 
    if(!mCanvas) return;
    mCtx = mCanvas.getContext('2d'); 
    const resizeMatrix = () => { mWidth = mCanvas.parentElement.clientWidth; mHeight = mCanvas.parentElement.clientHeight; mCanvas.width = mWidth; mCanvas.height = mHeight; columns = Math.floor(mWidth / fontSize); drops = []; for(let i = 0; i < columns; i++) drops[i] = Math.random() * -100; }; 
    window.addEventListener('resize', resizeMatrix); resizeMatrix(); 
    setInterval(drawMatrix, 50); 
}
function drawMatrix() { 
    if(!mCtx) return;
    mCtx.fillStyle = 'rgba(244, 244, 244, 0.3)'; mCtx.fillRect(0, 0, mWidth, mHeight); 
    mCtx.fillStyle = '#a8a8a8'; mCtx.font = fontSize + 'px "VT323", monospace'; 
    for(let i = 0; i < drops.length; i++) { 
        const text = chars[Math.floor(Math.random() * chars.length)]; 
        mCtx.fillText(text, i * fontSize, drops[i] * fontSize); 
        if(drops[i] * fontSize > mHeight && Math.random() > 0.95) drops[i] = 0; drops[i]++; 
    } 
}

// 11. Firebase Setup & Authentication Rules
document.addEventListener('DOMContentLoaded', () => {
    // ตั้งค่า Firebase
    const firebaseConfig = { apiKey: "AIzaSyAME4-lEvIycQnsWHPbi7CaBlwNiu7_qFk", authDomain: "website101-1f97f.firebaseapp.com", projectId: "website101-1f97f", storageBucket: "website101-1f97f.firebasestorage.app", messagingSenderId: "1001758477689", appId: "1:1001758477689:web:80bc85fb1a2e8af90873a8", measurementId: "G-JB4XSPMCLS" };
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    const db = firebase.firestore(); 
    const auth = firebase.auth(); 
    const docRef = db.collection("website").doc("pixel_portfolio");

    async function loadData() {
        try {
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                document.querySelectorAll('.editable').forEach(el => { const fieldName = el.getAttribute('data-field'); if (data[fieldName] !== undefined) { el.innerHTML = data[fieldName]; } });
                if (data.schedule_list) { try { scheduleData = JSON.parse(data.schedule_list); } catch(e) { scheduleData = []; } }
                if (data.project_list) { try { projectData = JSON.parse(data.project_list); } catch(e) {} }
                renderCalendar(); 
                renderProjects();
            } else { renderCalendar(); renderProjects(); }
        } catch (error) { console.error("โหลดข้อมูลล้มเหลว:", error); renderCalendar(); renderProjects(); }
    }

    auth.onAuthStateChanged((user) => {
        if (user) { 
            document.body.classList.add('edit-mode'); 
            document.getElementById('login-show-btn').style.display = 'none'; 
            document.getElementById('save-btn').style.display = 'block'; 
            document.getElementById('logout-btn').style.display = 'block'; 
            document.querySelectorAll('.edit-hint-proj, .edit-hint-cal, #add-project-btn').forEach(el => el.style.display = 'block');
            document.querySelectorAll('.editable').forEach(el => el.setAttribute('contenteditable', 'true')); 
            renderProjects(); 
        } else { 
            document.body.classList.remove('edit-mode'); 
            document.getElementById('login-show-btn').style.display = 'block'; 
            document.getElementById('save-btn').style.display = 'none'; 
            document.getElementById('logout-btn').style.display = 'none'; 
            document.querySelectorAll('.edit-hint-proj, .edit-hint-cal, #add-project-btn').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.editable').forEach(el => el.setAttribute('contenteditable', 'false')); 
            renderProjects(); 

            // เด้งออกจากหน้าโฟลเดอร์ลับ หากกด Logout
            if(currentFolderId === '1waXWwHFGtWFfSpz2wnvld6UNq-CqZgV8') {
                 document.getElementById('file-list').innerHTML = '<span style="color:var(--ibm-shadow); font-family: \'VT323\'; font-size:1.4rem; padding:10px;">> ACCESS DENIED.</span>';
                 folderHistory = [];
                 document.getElementById('archive-path').innerText = "C:\\ARCHIVE\\";
                 document.querySelectorAll('.folder-btn').forEach(b => b.classList.remove('active'));
            }
        }
    });

    const loginShowBtn = document.getElementById('login-show-btn');
    if(loginShowBtn) loginShowBtn.onclick = () => document.getElementById('login-modal').style.display = 'flex';
    
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    if(loginSubmitBtn) {
        loginSubmitBtn.onclick = async () => { 
            try { 
                await auth.signInWithEmailAndPassword(document.getElementById('email').value.trim(), document.getElementById('password').value); 
                document.getElementById('login-modal').style.display = 'none'; 
                alert("SYSTEM ACCESS GRANTED"); 
            } catch (error) { 
                alert("ACCESS DENIED: " + error.message); 
                console.error("Firebase Auth Error:", error); 
            } 
        };
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.onclick = () => auth.signOut();

    const saveBtn = document.getElementById('save-btn');
    if(saveBtn) {
        saveBtn.onclick = async () => {
            const newData = {}; 
            document.querySelectorAll('.editable').forEach(el => { newData[el.getAttribute('data-field')] = el.innerHTML; });
            newData['schedule_list'] = JSON.stringify(scheduleData);
            newData['project_list'] = JSON.stringify(projectData);
            
            const syncData = new URLSearchParams(); syncData.append("action", "sync_data"); syncData.append("data", JSON.stringify(scheduleData));
            fetch(GOOGLE_APP_SCRIPT_URL, { method: "POST", body: syncData, mode: 'no-cors' });

            try {
                const btn = document.getElementById('save-btn'); const originalText = btn.innerHTML;
                btn.innerHTML = "SAVING..."; await docRef.set(newData, { merge: true }); 
                btn.innerHTML = "SAVED!"; setTimeout(() => btn.innerHTML = originalText, 2000);
            } catch (error) { alert("SAVE FAILED: " + error.message); }
        };
    }

    loadData();
});