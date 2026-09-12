// Googleスプレッドシート（Web API）のURL

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwc0sP-YtT--xR2QfGgP1QvR2rM9N7VvE7o/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. タブ切り替え処理
    initTabs();

    // 2. Googleスプレッドシートデータの取得処理
    fetchSpreadsheetData();
});

/**
 * タブ切替のセットアップ
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // すべてのボタンとコンテンツから active を解除
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 選択されたタブとコンテンツに active を付与
            button.classList.add('active');
            const targetElement = document.getElementById(targetTab);
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
}

/**
 * Google Apps Script (GAS) 経由でデータを取得
 */
async function fetchSpreadsheetData() {
    const noticeContainer = document.getElementById('notice-container');
    const eventContainer = document.getElementById('event-container');

    try {
        const response = await fetch(GAS_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // お知らせデータの描画
        if (data.notices && data.notices.length > 0) {
            renderNotices(data.notices, noticeContainer);
        } else {
            noticeContainer.innerHTML = '<p class="info-card">現在お知らせはありません。</p>';
        }

        // 行事予定データの描画
        if (data.events && data.events.length > 0) {
            renderEvents(data.events, eventContainer);
        } else {
            eventContainer.innerHTML = '<p class="info-card">現在予定されている行事はありません。</p>';
        }

    } catch (error) {
        console.error('データの取得に失敗しました:', error);
        if (noticeContainer) {
            noticeContainer.innerHTML = '<p class="info-card" style="color: #e74c3c;">お知らせの読み込みに失敗しました。</p>';
        }
        if (eventContainer) {
            eventContainer.innerHTML = '<p class="info-card" style="color: #e74c3c;">行事予定の読み込みに失敗しました。</p>';
        }
    }
}

/**
 * お知らせ一覧の表示処理
 */
function renderNotices(notices, container) {
    container.innerHTML = ''; // ローディング表示を消去

    notices.forEach(item => {
        const card = document.createElement('article');
        card.className = 'notice-card';

        const header = document.createElement('div');
        header.className = 'notice-header';

        if (item.date) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'notice-date';
            dateSpan.textContent = formatDate(item.date);
            header.appendChild(dateSpan);
        }

        if (item.category) {
            const categorySpan = document.createElement('span');
            categorySpan.className = 'notice-category';
            categorySpan.textContent = item.category;
            header.appendChild(categorySpan);
        }

        const title = document.createElement('h2');
        title.className = 'notice-title';
        title.textContent = item.title || '（タイトルなし）';

        const body = document.createElement('div');
        body.className = 'notice-body';
        body.textContent = item.body || '';

        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(body);

        container.appendChild(card);
    });
}

/**
 * 行事予定一覧の表示処理
 */
function renderEvents(events, container) {
    container.innerHTML = ''; // ローディング表示を消去

    events.forEach(item => {
        const card = document.createElement('article');
        card.className = 'notice-card';

        const header = document.createElement('div');
        header.className = 'notice-header';

        if (item.date) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'notice-date';
            dateSpan.textContent = formatDate(item.date);
            header.appendChild(dateSpan);
        }

        const title = document.createElement('h2');
        title.className = 'notice-title';
        title.textContent = item.title || '（行事名なし）';

        const body = document.createElement('div');
        body.className = 'notice-body';
        body.textContent = item.body || item.detail || '';

        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(body);

        container.appendChild(card);
    });
}

/**
 * 日付フォーマットの調整関数
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // 日付型として変換できない場合はそのまま返す
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}