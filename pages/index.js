// DOM 元素
const searchInput = document.getElementById('search-input');
const remindersList = document.getElementById('remindersList');
const viewEventsBtn = document.getElementById('viewEventsBtn');

/**
 * 加载提醒列表
 */
async function loadRemindersList() {
	remindersList.innerHTML = '<div class="loading">加载中...</div>';

	try {
		const response = await fetch('http://localhost:3579/api/reminders');
		const data = await response.json();

		if (data?.ok && data?.data?.reminders) {
			renderRemindersList(data.data.reminders);
		}
		else {
			showRemindersError('无法获取提醒列表');
		}
	}
	catch (error) {
		console.error('[Index] 获取提醒列表失败:', error);
		showRemindersError('无法加载提醒列表，请确保 CCCore 正在运行');
	}
}
/**
 * 渲染提醒列表
 */
function renderRemindersList(reminders) {
	if (!reminders || reminders.length === 0) {
		remindersList.innerHTML = `
			<div class="empty-state">
				<div class="empty-text">📭 暂无活跃提醒</div>
			</div>
		`;
		return;
	}

	remindersList.innerHTML = reminders.map(reminder => {
		const triggerDate = new Date(reminder.triggerTime);
		const now = Date.now();
		const timeLeft = reminder.triggerTime - now;

		let timeLeftStr = '';
		if (timeLeft > 0) {
			const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
			const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
			const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
			const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

			if (days > 0) {
				timeLeftStr = `${days}天 ${hours}小时`;
			}
			else if (hours > 0) {
				timeLeftStr = `${hours}小时 ${minutes}分钟`;
			}
			else if (minutes > 0) {
				timeLeftStr = `${minutes}分 ${seconds}秒`;
			}
			else {
				timeLeftStr = `${seconds}秒`;
			}
		}
		else {
			timeLeftStr = '已过期';
		}

		return `
			<div class="reminder-item" rid="${reminder.id}">
				<div class="reminder-info">
					<div class="reminder-title">${escapeHtml(reminder.title)}</div>
					<div class="reminder-message">${escapeHtml(reminder.message)}</div>
					<div class="reminder-meta">
						<div class="reminder-meta-item">
							🕒 ${triggerDate.toLocaleString()}
						</div>
						<div class="reminder-meta-item">
							⏱ 剩余：${timeLeftStr}
						</div>
					</div>
				</div>
				<div class="reminder-actions">
					<button class="btn-remover">删除</button>
				</div>
			</div>
		`;
	}).join('');
}
/**
 * 显示提醒列表错误信息
 */
function showRemindersError(message) {
	remindersList.innerHTML = `
		<div class="empty-state">
			<div class="empty-text">⚠️ ${escapeHtml(message)}</div>
		</div>
	`;
}
/**
 * 取消提醒
 */
async function cancelReminder(id, title) {
	if (!confirm(`确定要删除提醒"${title}"吗？`)) {
		return;
	}

	try {
		const response = await fetch(`http://localhost:3579/api/reminder/${encodeURIComponent(id)}`, {
			method: 'DELETE',
		});
		const data = await response.json();

		if (data?.ok) {
			console.log('[Index] 提醒已删除:', id);
			loadRemindersList();
		}
		else {
			alert(`删除失败: ${data?.error || '未知错误'}`);
		}
	}
	catch (error) {
		console.error('[Index] 删除提醒失败:', error);
		alert('删除提醒失败，请重试');
	}
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	};
	return text.replace(/[&<>"']/g, m => map[m]);
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
 * 处理搜索提交
 */
async function handleSearchSubmit(value) {
	if (!value) {
		return;
	}

	console.log('[Index] 搜索内容:', value);

	// 获取搜索工作区配置
	let searchWorkspace = '~/Searching';
	try {
		const response = await fetch('http://localhost:3579/api/config/workspaces');
		const data = await response.json();
		if (data.ok && data.data && data.data.searchWorkspace) {
			searchWorkspace = data.data.searchWorkspace;
		}
	}
	catch (error) {
		console.error('[Index] 获取工作区配置失败:', error);
	}

	// 打开 console.html 页面
	const consoleURL = chrome.runtime.getURL('pages/console.html');
	const tabs = await chrome.tabs.query({ url: consoleURL });

	if (tabs.length > 0) {
		// 已有 console.html 标签页，激活它
		await chrome.tabs.update(tabs[0].id, { active: true });
		await chrome.windows.update(tabs[0].windowId, { focused: true });
	}
	else {
		// 创建新的 console.html 标签页
		await chrome.tabs.create({ url: consoleURL });
	}

	// 通过 CCCore 打开搜索工作区目录
	try {
		await fetch('http://localhost:3579/api/page', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				url: `file://${searchWorkspace}`,
				activate: true,
			}),
		});
	}
	catch (error) {
		console.error('[Index] 打开工作区失败:', error);
	}

	// 清空输入框
	VoiceInput.clear(searchInput);

	// 关闭弹窗
	window.close();
}

// 监听语音输入提交事件
searchInput.addEventListener('onSubmit', (event) => {
	handleSearchSubmit(event.detail.value);
});
// 监听"查看所有事件"按钮
viewEventsBtn.addEventListener('click', async () => {
	await gotoUnicalPage('pages/events.html');
	window.close();
});
document.getElementById('settings-btn').addEventListener('click', () => {
	// 目标页面的 URL
	const targetURL = chrome.runtime.getURL('pages/settings.html');

	// 查询所有标签页,查找是否已存在 settings.html 页面
	chrome.tabs.query({}, (tabs) => {
		// 查找已存在的 settings 页面
		const existingTab = tabs.find(tab => tab.url === targetURL);

		// 如果存在,激活该页面
		if (existingTab) {
			chrome.tabs.update(existingTab.id, { active: true });
			// 将该页面所在窗口也激活
			chrome.windows.update(existingTab.windowId, { focused: true });
		}
		// 如果不存在,新建页面
		else {
			chrome.tabs.create({ url: targetURL });
		}
	});
});
document.getElementById('gotoWorkshopBtn').addEventListener('click', async () => {
	await gotoUnicalPage('pages/console.html');
	window.close();
});
remindersList.addEventListener('click', ({target}) => {
	if (target.classList.contains('btn-remover')) {
		console.log(target);
		const reminderItem = target.closest('.reminder-item');
		const rid = reminderItem.getAttribute('rid');
		const title = reminderItem.querySelector('.reminder-title').innerText;

		cancelReminder(rid, title);
	}
});

// 初始化
ThemeToggle.init();
loadRemindersList();

// 定期更新提醒列表
setInterval(loadRemindersList, 10000);
