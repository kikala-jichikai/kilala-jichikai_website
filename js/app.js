// ==========================================
// app.js（絵文字アクセシビリティ対応版）
// - 動的に生成する要素に aria-hidden / sr-only を付与
// - ログイン・ログ送信・ダウンロードログを実装
// ==========================================

const SHEET_ID = '1rwAyehf35erUJ_RAnHhblQTaVg5f2v0Tmm7LZEKi5pQ';

const NOTICE_GID = '0';
const EVENT_GID = '895056638';
const LINK_GID = '348535548';

const OFFICER_NOTICE_GID = '1832753520';
const OFFICER_FILE_GID = '1119241247';
const OFFICER_LINK_GID = '2118239597';
const OFFICER_CONTACT_GID = '162722256';

const NOTICE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${NOTICE_GID}`;
const EVENT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${EVENT_GID}`;
const LINK_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${LINK_GID}`;

const OFFICER_NOTICE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OFFICER_NOTICE_GID}`;
const OFFICER_FILE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OFFICER_FILE_GID}`;
const OFFICER_LINK_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OFFICER_LINK_GID}`;
const OFFICER_CONTACT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OFFICER_CONTACT_GID}`;

// GAS Webアプリのエンドポイント（必要に応じて差し替え）
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwQqhJ9dZmh4rZJyiuXJ8t_oTA7U2sOIFiLy1jFgSXWTR94MPzBJJDcg7jgOHJQIHyKTQ/exec";

const NEW_THRESHOLD_DAYS = 3;
const ENDING_SOON_THRESHOLD_DAYS = 3;

function parseCSVToRows(text) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\r') {
                if (nextChar === '\n') i++;
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else if (char === '\n') {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }
    return rows;
}

function escapeHtml(text) {
    if (text === undefined || text === null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function isVisible(dateStr, endDateStr) {
    const now = new Date();
    const startDate = new Date(dateStr);
    if (isNaN(startDate)) return true;
    if (now < startDate) return false;
    if (endDateStr) {
        const endDate = new Date(endDateStr);
        if (!isNaN(endDate)) {
            endDate.setHours(23, 59, 59, 999);
            if (now > endDate) return false;
        }
    }
    return true;
}

function isNew(dateStr) {
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate)) return false;
    const now = new Date();
    const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= NEW_THRESHOLD_DAYS;
}

function isEndingSoon(endDateStr) {
    if (!endDateStr) return false;
    const endDate = new Date(endDateStr);
    if (isNaN(endDate)) return false;
    const now = new Date();
    const diffDays = (endDate - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= ENDING_SOON_THRESHOLD_DAYS;
}

function renderItems(items, container, defaultCategory) {
    const visibleItems = items.filter(item => isVisible(item.date, item.endDate));
    if (visibleItems.length === 0) {
        container.innerHTML = '<p>現在情報はありません。</p>';
        return;
    }

    const html = visibleItems.map(item => {
        const category = item.category || defaultCategory;
        const newBadge = isNew(item.date) ? '<span class="new-badge">NEW</span>' : '';
        const endBadge = isEndingSoon(item.endDate) ? '<span class="end-badge">まもなく終了</span>' : '';
        const pdfLink = item.pdfUrl
            ? `<a href="${escapeHtml(item.pdfUrl)}" class="pdf-link" target="_blank" rel="noopener noreferrer">
                 <span aria-hidden="true" class="icon-inline">📄</span><span class="sr-only">資料PDF</span>
                 資料PDFをダウンロード
               </a>`
            : '';
        const image = item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="notice-image">` : '';
        const formattedBody = escapeHtml(item.body).replace(/\n/g, '<br>');

        return `
            <article class="notice-card">
                <time class="notice-date">${escapeHtml(item.date)}</time>
                <span class="notice-category">${escapeHtml(category)}</span>
                ${newBadge}
                ${endBadge}
                <h2 class="notice-title">${escapeHtml(item.title)}</h2>
                <p class="notice-body">${formattedBody}</p>
                ${image}
                ${pdfLink}
            </article>
        `;
    }).join('');

    container.innerHTML = html;
}

function renderLinks(items, container) {
    if (items.length === 0) {
        container.innerHTML = '<p>現在リンクはありません。</p>';
        return;
    }

    const grouped = {};
    items.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
    });

    let html = '';
    for (const [category, links] of Object.entries(grouped)) {
        html += `<h3 class="section-heading">${escapeHtml(category)}</h3>`;
        html += '<ul class="link-list">';
        links.forEach(link => {
            html += `
                <li>
                    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                        <span>${escapeHtml(link.name)}</span>
                        <span aria-hidden="true" class="external-icon icon-inline">↗</span><span class="sr-only">外部サイト</span>
                    </a>
                </li>
            `;
        });
        html += '</ul>';
    }
    container.innerHTML = html;
}

async function loadAndRenderNotices(url, container, defaultCategory) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('スプレッドシートの取得に失敗しました');
        const csvText = await response.text();
        const rows = parseCSVToRows(csvText);
        const items = parseNoticeRows(rows);
        renderItems(items, container, defaultCategory);
    } catch (error) {
        container.innerHTML = `
            <div class="error-message">
                <p>情報の読み込みに失敗しました。</p>
                <p>しばらくしてから再度アクセスしてください。</p>
            </div>
        `;
        console.error('エラー詳細:', error);
    }
}

async function loadNotices() {
    const container = document.getElementById('notice-container');
    await loadAndRenderNotices(NOTICE_URL, container, 'お知らせ');
}

async function loadEvents() {
    const container = document.getElementById('event-container');
    await loadAndRenderNotices(EVENT_URL, container, 'イベント');
}

async function loadLinks() {
    const container = document.getElementById('links-container');
    try {
        const response = await fetch(LINK_URL);
        if (!response.ok) throw new Error('スプレッドシートの取得に失敗しました');
        const csvText = await response.text();
        const rows = parseCSVToRows(csvText);
        const items = parseLinkRows(rows);
        renderLinks(items, container);
    } catch (error) {
        container.innerHTML = `
            <div class="error-message">
                <p>情報の読み込みに失敗しました。</p>
                <p>しばらくしてから再度アクセスしてください。</p>
            </div>
        `;
        console.error('エラー詳細:', error);
    }
}

function parseNoticeRows(rows) {
    const items = [];
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values && values[0] && values[0].trim() !== '') {
            items.push({
                date: values[0].trim(),
                category: (values[1] || '').trim(),
                title: (values[2] || '').trim(),
                body: (values[3] || '').trim(),
                imageUrl: (values[4] || '').trim(),
                pdfUrl: (values[5] || '').trim(),
                endDate: (values[6] || '').trim()
            });
        }
    }
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return items;
}

function parseLinkRows(rows) {
    const items = [];
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values && values[0] && values[0].trim() !== '' && values[1] && values[2]) {
            items.push({
                category: values[0].trim(),
                name: values[1].trim(),
                url: values[2].trim()
            });
        }
    }
    return items;
}

async function loadOfficerPortalData() {
    try {
        // 1. 伝言
        const noticeRes = await fetch(OFFICER_NOTICE_URL);
        if (noticeRes.ok) {
            const rows = parseCSVToRows(await noticeRes.text());
            const notices = [];
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][0].trim() !== '') {
                    notices.push({ date: rows[i][0].trim(), text: rows[i][1] ? rows[i][1].trim() : '' });
                }
            }
            const noticeList = document.getElementById('dynamic-notices');
            if (noticeList) {
                noticeList.innerHTML = notices.length > 0
                    ? notices.map(item => `<li><strong>${escapeHtml(item.text)}</strong> ${item.date ? '(' + escapeHtml(item.date) + ')' : ''}</li>`).join('')
                    : '<li>現在、新しい伝言はありません。</li>';
            }
        }

        // 2. ファイル共有
        const fileRes = await fetch(OFFICER_FILE_URL);
        if (fileRes.ok) {
            const rows = parseCSVToRows(await fileRes.text());
            const files = [];
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][0].trim() !== '') {
                    files.push({
                        name: rows[i][0].trim(),
                        meta: rows[i][1] ? rows[i][1].trim() : 'PDF',
                        url: rows[i][2] ? rows[i][2].trim() : '#'
                    });
                }
            }
            const fileList = document.getElementById('dynamic-files');
            if (fileList) {
                fileList.innerHTML = files.length > 0
                    ? files.map(file => `
                        <li>
                          <a href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer" data-file-name="${escapeHtml(file.name)}" class="officer-file-link">
                            <span aria-hidden="true" class="icon-inline">📄</span><span class="sr-only">資料アイコン</span>
                            <span> ${escapeHtml(file.name)}</span><span class="file-meta">${escapeHtml(file.meta)}</span>
                          </a>
                        </li>`).join('')
                    : '<li>現在、共有ファイルはありません。</li>';
            }

            // ダウンロードリンクにイベントを付与
            setTimeout(() => {
                document.querySelectorAll('.officer-file-link').forEach(a => {
                    a.addEventListener('click', (e) => {
                        const fileName = a.getAttribute('data-file-name') || a.textContent.trim();
                        handleDownload(fileName);
                    });
                });
            }, 100);
        }

        // 3. クイックリンク
        const linkRes = await fetch(OFFICER_LINK_URL);
        if (linkRes.ok) {
            const rows = parseCSVToRows(await linkRes.text());
            const links = [];
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][0].trim() !== '' && rows[i][1]) {
                    links.push({ title: rows[i][0].trim(), url: rows[i][1].trim() });
                }
            }
            const linkList = document.getElementById('dynamic-links');
            if (linkList) {
                linkList.innerHTML = links.length > 0
                    ? links.map(link => `
                        <li>
                          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                            <span aria-hidden="true" class="icon-inline">↗</span><span class="sr-only">外部サイト</span>
                            <span>${escapeHtml(link.title)}</span>
                          </a>
                        </li>`).join('')
                    : '<li>リンクはありません。</li>';
            }
        }

        // 4. 緊急連絡先
        const contactRes = await fetch(OFFICER_CONTACT_URL);
        if (contactRes.ok) {
            const rows = parseCSVToRows(await contactRes.text());
            const contacts = [];
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][0].trim() !== '') {
                    contacts.push({
                        role: rows[i][0].trim(),
                        name: rows[i][1] ? rows[i][1].trim() : '',
                        tel: rows[i][2] ? rows[i][2].trim() : ''
                    });
                }
            }
            const contactTable = document.getElementById('dynamic-contacts');
            if (contactTable) {
                contactTable.innerHTML = contacts.length > 0
                    ? contacts.map(c => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 6px;">${escapeHtml(c.role)}</td>
                            <td style="padding: 6px;">${escapeHtml(c.name)}</td>
                            <td style="padding: 6px;"><a href="tel:${escapeHtml(c.tel)}" class="mail-link">${escapeHtml(c.tel)}</a></td>
                        </tr>`).join('')
                    : '<tr><td colspan="3" style="padding: 6px;">データがありません。</td></tr>';
            }
        }

    } catch (e) {
        console.error("役員ポータルデータ取得エラー:", e);
    }
}

async function sendAccessLog(type, userId, detail) {
    let clientIp = '取得失敗';
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
            const d = await res.json();
            clientIp = d.ip || clientIp;
        }
    } catch (e) {}

    const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    const deviceInfo = `IP: ${clientIp} | ${window.screen.width}x${window.screen.height} | UA: ${navigator.userAgent}`;

    const payload = {
        timestamp,
        type,
        userId: userId || "未入力",
        detail: detail || "",
        userAgent: deviceInfo
    };

    try {
        const res = await fetch(GAS_WEB_APP_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res && res.ok) {
            console.info("ログ送信成功 (cors):", payload);
            return true;
        } else {
            console.warn("ログ送信 (cors) が成功しませんでした。ステータス:", res ? res.status : "no-response");
        }
    } catch (e) {
        console.warn("ログ送信 (cors) でエラー:", e);
    }

    try {
        await fetch(GAS_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        console.info("ログ送信を試行しました (no-cors)。レスポンスは確認できません。");
        return true;
    } catch (e) {
        console.error("ログ送信 (no-cors) でも失敗:", e);
        return false;
    }
}

function showOfficerUI() {
    const login = document.getElementById('login-container');
    const officer = document.getElementById('officer-content');
    if (login) login.style.display = 'none';
    if (officer) officer.style.display = 'block';
}

function hideOfficerUI() {
    const login = document.getElementById('login-container');
    const officer = document.getElementById('officer-content');
    if (login) login.style.display = 'block';
    if (officer) officer.style.display = 'none';
}

async function handleLogin() {
    const inputId = (document.getElementById('login-id') || {}).value || '';
    const inputPass = (document.getElementById('login-pass') || {}).value || '';
    const errorMsg = document.getElementById('login-error');

    if (inputId.trim() === 'kirara' && inputPass.trim() === 'kanji') {
        sendAccessLog("ログイン", inputId, "成功").catch(() => {});
        if (errorMsg) errorMsg.style.display = 'none';
        showOfficerUI();
        loadOfficerPortalData();
    } else {
        sendAccessLog("ログイン", inputId || "未入力", "失敗").catch(() => {});
        if (errorMsg) errorMsg.style.display = 'block';
    }
}

function handleLogout() {
    const currentId = (document.getElementById('login-id') || {}).value || "未入力";
    sendAccessLog("ログアウト", currentId, "ログアウト実行").catch(() => {});
    const idEl = document.getElementById('login-id');
    const passEl = document.getElementById('login-pass');
    if (idEl) idEl.value = '';
    if (passEl) passEl.value = '';
    hideOfficerUI();
}

function handleDownload(fileName) {
    const currentId = (document.getElementById('login-id') || {}).value || "未入力";
    sendAccessLog("ダウンロード", currentId, fileName).catch(() => {});
    try { alert(fileName + ' のダウンロードログを記録しました。'); } catch (e) {}
}

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const towerBtns = document.querySelectorAll('.tower-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(target) {
        if (!target) return;
        tabButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === target));
        towerBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === target));
        tabContents.forEach(c => c.classList.toggle('active', c.id === target));
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    towerBtns.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadNotices();
    loadEvents();
    loadLinks();

    const loginBtn = document.getElementById('login-button');
    const logoutBtn = document.getElementById('logout-button');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});
