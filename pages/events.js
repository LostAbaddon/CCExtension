/**
 * CCExtension 事件列表页面脚本
 */

// DOM 元素
const eventsList = document.getElementById('eventsList');
const backBtn = document.getElementById('backBtn');

/**
 * 加载今日事件列表
 */
async function loadEventsList() {
	eventsList.innerHTML = '<div class="loading">加载中...</div>';

	try {
		// 获取所有日志（-1 表示获取全部）
		const response = await fetch('http://localhost:3579/api/logs?limit=-1');
		const data = await response.json();

		if (data?.ok && data?.logs) {
			renderEventsList(data.logs);
		}
		else {
			showEventsError('无法获取事件列表');
		}
	}
	catch (error) {
		console.error('[Events] 获取事件列表失败:', error);
		showEventsError('无法加载事件列表，请确保 CCCore 正在运行');
	}
}
/**
 * 渲染事件列表
 */
function renderEventsList(logs) {
	if (!logs || logs.length === 0) {
		eventsList.innerHTML = `
			<div class="empty-state">
				<div class="empty-text">📭 今日暂无事件</div>
				<div class="empty-hint">您的活动记录将显示在这里</div>
			</div>
		`;
		return;
	}

	eventsList.innerHTML = logs.map(log => {
		// 解析时间戳
		const timestamp = log.timestamp || '';
		const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : '未知时间';

		// 获取来源
		const source = log.source || '未知来源';

		// 获取元数据
		let metaItems = [];

		// if (log.sessionid) {
		// 	metaItems.push(`<div class="event-meta-item">🔖 Session: ${escapeHtml(log.sessionid)}</div>`);
		// }
		if (log.workspace) {
			metaItems.push(`<div class="event-meta-item">📁 工作区: ${escapeHtml(log.workspace)}</div>`);
		}
		if (log.tabid) {
			metaItems.push(`<div class="event-meta-item">🔖 Tab: ${escapeHtml(log.tabid)}</div>`);
		}
		if (log.pid) {
			metaItems.push(`<div class="event-meta-item">⚙️ PID: ${escapeHtml(log.pid)}</div>`);
		}

		let content;
		try {
			content = MarkUp.parse(log.content);
		}
		catch {
			content = escapeHtml(log.content);
		}

		return `
			<div class="event-item">
				<div class="event-header">
					<div class="event-source">${escapeHtml(source)}</div>
					${metaItems.length > 0 ? `<div class="event-meta">${metaItems.join('')}</div>` : ''}
					<div class="event-time">${escapeHtml(timeStr)}</div>
				</div>
				<div class="event-content markdown-body">${content}</div>
			</div>
		`;
	}).join('');
}

/**
 * 显示事件列表错误信息
 */
function showEventsError(message) {
	eventsList.innerHTML = `
		<div class="empty-state">
			<div class="empty-text">⚠️ ${escapeHtml(message)}</div>
		</div>
	`;
}
/**
 * HTML 转义
 */
function escapeHtml(text) {
	if (!text) return '';
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	};
	return String(text).replace(/[&<>"']/g, m => map[m]);
}
function gotoUnicalPage(url) {
	url = chrome.runtime.getURL(url);

	return new Promise(res => {
		chrome.tabs.query({}, (tabs) => {
			// 查找已存在的 settings 页面
			const existingTab = tabs.find(tab => tab.url === url);

			// 如果存在，激活该页面
			if (existingTab) {
				chrome.tabs.update(existingTab.id, { active: true });
				// 将该页面所在窗口也激活
				chrome.windows.update(existingTab.windowId, { focused: true });
			}
			// 如果不存在，新建页面
			else {
				chrome.tabs.create({ url: url });
			}

			res();
		});
	});
}

/**
 * 返回到首页
 */
async function handleBack() {
	await gotoUnicalPage('pages/index.html');
	window.close();
}

// 监听返回按钮
backBtn.addEventListener('click', handleBack);

// 初始化
ThemeToggle.init();
loadEventsList();

// 定期刷新事件列表
setInterval(loadEventsList, 30000);
