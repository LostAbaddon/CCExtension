/**
 * CCExtension 设置页面脚本
 */

// DOM 元素
const statusDiv = document.getElementById('status');
const connectionStatusSpan = document.getElementById('connectionStatus');
const currentTabSpan = document.getElementById('currentTab');
const notificationToggle = document.getElementById('notificationToggle');
const stopReminderToggle = document.getElementById('stopReminderToggle');
const stopReminderDelay = document.getElementById('stopReminderDelay');
const saveBtn = document.getElementById('saveBtn');
const reconnectBtn = document.getElementById('reconnectBtn');
const remindersList = document.getElementById('remindersList');

// 从 CCCore 获取 stop-reminder 配置
async function fetchStopReminderConfig() {
	try {
		const response = await fetch('http://localhost:3579/api/config/stop-reminder');
		const data = await response.json();
		if (data.ok && data.data) {
			return data.data;
		}
	}
	catch (error) {
		console.error('[Settings] 获取 stop-reminder 配置失败:', error);
	}
	return { enabled: true, delay: 30000 };
}

// 更新 CCCore 的 stop-reminder 配置
async function updateStopReminderConfig(enabled, delay) {
	try {
		const response = await fetch('http://localhost:3579/api/config/stop-reminder', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				enabled,
				delay,
			}),
		});
		const data = await response.json();
		return data.ok;
	}
	catch (error) {
		console.error('[Settings] 更新 stop-reminder 配置失败:', error);
		return false;
	}
}

// 加载设置
async function loadSettings() {
	// 加载通知偏好
	const result = await chrome.storage.local.get('useBrowserNotification');
	if (result.useBrowserNotification !== undefined) {
		notificationToggle.checked = result.useBrowserNotification;
	}
	else {
		notificationToggle.checked = true;
	}

	// 加载 stop-reminder 配置
	const config = await fetchStopReminderConfig();
	stopReminderToggle.checked = config.enabled;
	stopReminderDelay.value = Math.floor(config.delay / 1000); // 转换为秒
}

// 保存设置
async function saveSettings() {
	// 保存通知偏好
	const useBrowserNotification = notificationToggle.checked;
	await chrome.storage.local.set({ useBrowserNotification });

	// 通知 background 更新偏好
	chrome.runtime.sendMessage({
		type: 'SET_NOTIFICATION_PREFERENCE',
		useBrowserNotification,
	});

	// 保存 stop-reminder 配置
	const enabled = stopReminderToggle.checked;
	const delay = parseInt(stopReminderDelay.value) * 1000; // 转换为毫秒

	const success = await updateStopReminderConfig(enabled, delay);

	if (success) {
		alert('设置已保存');
	}
	else {
		alert('保存设置失败，请检查 CCCore 是否运行');
	}
}

// 更新连接状态
function updateConnectionStatus() {
	chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
		if (response && response.connected) {
			statusDiv.className = 'status connected';
			statusDiv.textContent = '已连接到 CCCore';
			connectionStatusSpan.textContent = '已连接';
		}
		else {
			statusDiv.className = 'status disconnected';
			statusDiv.textContent = '未连接到 CCCore';
			connectionStatusSpan.textContent = '未连接';
		}
	});
}

// 更新当前标签页信息
async function updateCurrentTab() {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	if (tabs.length > 0) {
		const tab = tabs[0];
		currentTabSpan.textContent = tab.title || tab.url;
	}
}

// 重新连接
function reconnect() {
	chrome.runtime.sendMessage({ type: 'RECONNECT' }, (response) => {
		if (response && response.ok) {
			setTimeout(updateConnectionStatus, 500);
		}
	});
}

// 事件监听
saveBtn.addEventListener('click', saveSettings);
reconnectBtn.addEventListener('click', reconnect);

// 加载提醒列表
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
		console.error('[Settings] 获取提醒列表失败:', error);
		showRemindersError('无法加载提醒列表，请确保 CCCore 正在运行');
	}
}

// 渲染提醒列表
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
			<div class="reminder-item">
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
					<button class="btn-cancel" onclick="cancelReminder('${escapeHtml(reminder.id)}', '${escapeHtml(reminder.title)}')">
						删除
					</button>
				</div>
			</div>
		`;
	}).join('');
}

// 显示提醒列表错误信息
function showRemindersError(message) {
	remindersList.innerHTML = `
		<div class="empty-state">
			<div class="empty-text">⚠️ ${escapeHtml(message)}</div>
		</div>
	`;
}

// 取消提醒
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
			console.log('[Settings] 提醒已删除:', id);
			loadRemindersList();
		}
		else {
			alert(`删除失败: ${data?.error || '未知错误'}`);
		}
	}
	catch (error) {
		console.error('[Settings] 删除提醒失败:', error);
		alert('删除提醒失败，请重试');
	}
}

// HTML 转义
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

// 初始化
loadSettings();
updateConnectionStatus();
updateCurrentTab();
loadRemindersList();
ThemeToggle.init();

// 定期更新连接状态和提醒列表
setInterval(updateConnectionStatus, 5000);
setInterval(loadRemindersList, 10000);
