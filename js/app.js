// ==========================================
// 【重要・引き継ぎ担当者向け】
// このファイルはGoogleスプレッドシートからお知らせを
// 取得して表示するためのコードです。
//
// スプレッドシートのURLを変更する場合は
// 下記の SHEET_ID を書き換えてください。
//
// gid（シートのID）はスプレッドシートのURLから確認できます。
// 例）.../edit#gid=123456789 の「123456789」部分
// ==========================================

const SHEET_ID = '1rwAyehf35erUJ_RAnHhblQTaVg5f2v0Tmm7LZEKi5pQ';

// コンテンツ用 GID
const NOTICE_GID = '0';
const EVENT_GID = '895056638';
const LINK_GID = '348535548';

// 役員ページ用 GID
const OFFICER_NOTICE_GID = '1832753520';
const OFFICER_FILE_GID = '1119241247';
const OFFICER_LINK_GID = '2118239597';
const OFFICER_CONTACT_GID = '162722256';

const NOTICE_URL = 
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${NOTICE_GID}`;
const EVENT_URL = 
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${EVENT_GID}`;
const LINK_URL = 
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${LINK_GID}`;

const OFFICER_NOTICE_URL = 
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OFFICER_NOTICE_GID}`;
const OFFICER_FILE_URL = 
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OFFICER_FILE_GID}`;
const OFFICER_LINK_URL = 
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OFFICER_LINK_GID}`;
const OFFICER_CONTACT_URL = 
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OFFICER_CONTACT_GID}`;

// 新着マークを表示する日数（この日数以内の投稿にNEWバッジを表示）
const NEW_THRESHOLD_DAYS = 3;

// 「まもなく終了」マークを表示する日数（終了日までこの日数以内でバッジを表示）
const ENDING_SOON_THRESHOLD_DAYS = 3;

// ==========================================
// タブ切り替え機能
// ==========================================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.tab;

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });
}

// ==========================================
// お知らせ読み込み
// ==========================================
async function loadNotices() {
    const container = document.getElementById('notice-container');
    await loadAndRenderNotices(NOTICE_URL, container, 'お知らせ');
}

// ==========================================
// 行事予定読み込み
// ==========================================
async function loadEvents() {
    const container = document.getElementById('event-container');
    await loadAndRenderNotices(EVENT_URL, container, 'イベント');
}

// ==========================================
// リンク読み込み
// ==========================================
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

// ==========================================
// 共通の読み込み・描画処理（お知らせ・行事予定用）
// ==========================================
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

// ==========================================
// 本格的なCSVパーサ（セル内改行・ダブルクォーテーション完全対応）
// ==========================================
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

// ==========================================
// 行データ変換（お知らせ・行事予定用）
// ==========================================
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

// ==========================================
// 行データ変換（リンク用）
// ==========================================
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

// ==========================================
// 掲載期間・新着判定など
// ==========================================
function isVisible(dateStr, endDateStr) {
    const now = new Date();
    const startDate = new Date(dateStr);
    if (now < startDate) return false;
    if (endDateStr) {
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
        if (now > endDate) return false;
    }
    return true;
}

function isNew(dateStr) {
    const itemDate = new Date(dateStr);
    const now = new Date();
    const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= NEW_THRESHOLD_DAYS;
}

function isEndingSoon(endDateStr) {
    if (!endDateStr) return false;
    const endDate = new Date(endDateStr);
    const now = new Date();
    const diffDays = (endDate - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= ENDING_SOON_THRESHOLD_DAYS;
}

// ==========================================
// 描画処理（お知らせ・行事予定用）
// ==========================================
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
        const pdfLink = item.pdfUrl ? `<a href="${escapeHtml(item.pdfUrl)}" class="pdf-link" target="_blank" rel="noopener noreferrer">📄 資料PDFをダウンロード</a>` : '';
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

// ==========================================
// 描画処理（リンク用）
// ==========================================
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
                        <span class="external-icon">↗ 外部サイト</span>
                    </a>
                </li>
            `;
        });
        html += '</ul>';
    }
    container.innerHTML = html;
}

// ==========================================
// 🔒 役員ページ用データ読み込み
// ==========================================
async function loadOfficerPortalData() {
    try {
        // 1. 伝言データの取得
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

        // 2. ファイルデータの取得
        const fileRes = await fetch(OFFICER_FILE_URL);
        if (fileRes.ok) {
            const rows = parseCSVToRows(await fileRes.text());
            const files = [];
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][0].trim() !== '') {
                    files.push({ name: rows[i][0].trim(), meta: rows[i][1] ? rows[i][1].trim() : 'PDF' });
                }
            }
            const fileList = document.getElementById('dynamic-files');
            if (fileList) {
                fileList.innerHTML = files.length > 0
                    ? files.map(file => `
                        <li><a href="#" onclick="handleDownload('${escapeHtml(file.name)}'); return false;">
                            <span>📄 ${escapeHtml(file.name)}</span><span class="file-meta">${escapeHtml(file.meta)}</span>
                        </a></li>`).join('')
                    : '<li>現在、共有ファイルはありません。</li>';
            }
        }

        // 3. クイックリンクデータの取得
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
                        <li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                            <span>${escapeHtml(link.title)}</span><span class="external-icon">↗ 外部</span>
                        </a></li>`).join('')
                    : '<li>リンクはありません。</li>';
            }
        }

        // 4. 緊急連絡先データの取得
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
                            <td style="padding: 6px;">${escapeHtml(c.tel)}</td>
                        </tr>`).join('')
                    : '<tr><td colspan="3" style="padding: 6px;">データがありません。</td></tr>';
            }
        }

    } catch (e) {
        console.error("役員ポータルデータ取得エラー:", e);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// 初期化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadNotices();
    loadEvents();
    loadLinks();
    
    // 役員ページ要素が存在する場合（またはログイン状態の判定後など）にデータを読み込む場合
    // 必要に応じて呼び出しを行ってください（ログイン成功時や役員ページ表示時に loadOfficerPortalData() を実行する設計にしてください）
});