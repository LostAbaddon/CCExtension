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

// 初始化
loadSettings();
updateConnectionStatus();
updateCurrentTab();

// 定期更新连接状态
setInterval(updateConnectionStatus, 5000);
