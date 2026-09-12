// ==========================================
// 【重要・引き継ぎ担当者向け】
// このファイルはGoogleスプレッドシートからお知らせを
// 取得して表示するためのコードです。
//
// スプレッドシートのURLを変更する場合は
// 下記の SHEET_ID を書き換えてください。
//
// 「お知らせ」と「行事予定」で別シートを参照する構成です。
// gid（シートのID）はスプレッドシートのURLから確認できます。
// 例）.../edit#gid=123456789 の「123456789」部分
//
// 【列構成（お知らせ・行事予定シート共通）】
// A列:日付(掲載開始日を兼ねる) B列:カテゴリ C列:タイトル
// D列:本文 E列:画像URL F列:PDF URL G列:掲載終了日
// ==========================================

const SHEET_ID = 'ここにスプレッドシートIDを入力';
const NOTICE_GID = '0';                 // お知らせシートのgid（通常は最初のシートなら0）
const EVENT_GID = 'ここに行事予定シートのgidを入力';

const NOTICE_URL = 
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${NOTICE_GID}`;
const EVENT_URL = 
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${EVENT_GID}`;

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
    await loadAndRender(NOTICE_URL, container, 'お知らせ');
}

// ==========================================
// 行事予定読み込み
// ==========================================
async function loadEvents() {
    const container = document.getElementById('event-container');
    await loadAndRender(EVENT_URL, container, 'イベント');
}

// ==========================================
// 共通の読み込み・描画処理
// ==========================================
async function loadAndRender(url, container, defaultCategory) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('スプレッドシートの取得に失敗しました');
        }

        const csvText = await response.text();
        const items = parseCSV(csvText);

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
// CSVパース処理
// スプレッドシートの列構成：
// A列:日付(=掲載開始日) B列:カテゴリ C列:タイトル D列:本文
// E列:画像URL F列:PDF URL G列:掲載終了日
// ==========================================
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');

    const items = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values[0]) {
            items.push({
                date: values[0],
                category: values[1] || '',
                title: values[2] || '',
                body: values[3] || '',
                imageUrl: values[4] || '',
                pdfUrl: values[5] || '',
                endDate: values[6] || ''
            });
        }
    }

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    return items;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result.map(v => v.replace(/^"|"$/g, ''));
}

// ==========================================
// 掲載期間判定
// A列(日付)を「掲載開始日」として扱う
// G列(掲載終了日)が未設定なら「継続掲載」扱い
// ==========================================
function isVisible(dateStr, endDateStr) {
    const now = new Date();

    const startDate = new Date(dateStr);
    if (now < startDate) return false; // まだ掲載開始日が来ていない（予約投稿）

    if (endDateStr) {
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
        if (now > endDate) return false; // 掲載終了日を過ぎている
    }

    return true;
}

// ==========================================
// 新着判定
// ==========================================
function isNew(dateStr) {
    const itemDate = new Date(dateStr);
    const now = new Date();
    const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= NEW_THRESHOLD_DAYS;
}

// ==========================================
// まもなく終了判定
// ==========================================
function isEndingSoon(endDateStr) {
    if (!endDateStr) return false; // 終了日未設定（無期限掲載）は対象外

    const endDate = new Date(endDateStr);
    const now = new Date();
    const diffDays = (endDate - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= ENDING_SOON_THRESHOLD_DAYS;
}

// ==========================================
// 描画処理
// ==========================================
function renderItems(items, container, defaultCategory) {
    // 掲載期間内のものだけに絞り込む
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
            ? `<a href="${escapeHtml(item.pdfUrl)}" class="pdf-link" target="_blank" rel="noopener noreferrer">📄 資料PDFをダウンロード</a>`
            : '';

        const image = item.imageUrl
            ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="notice-image">`
            : '';

        return `
            <article class="notice-card">
                <time class="notice-date">${escapeHtml(item.date)}</time>
                <span class="notice-category">${escapeHtml(category)}</span>
                ${newBadge}
                ${endBadge}
                <h2 class="notice-title">${escapeHtml(item.title)}</h2>
                <p class="notice-body">${escapeHtml(item.body)}</p>
                ${image}
                ${pdfLink}
            </article>
        `;
    }).join('');

    container.innerHTML = html;
}

function escapeHtml(text) {
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
});