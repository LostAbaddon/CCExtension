/**
 * CCExtension Popup 脚本
 */

// 更新连接状态
async function updateStatus() {
	const statusDiv = document.getElementById('status');
	const connectionStatus = document.getElementById('connectionStatus');

	// 尝试从 background 获取状态
	try {
		const response = await chrome.runtime.sendMessage({
			type: 'GET_STATUS',
		});

		if (response && response.connected) {
			statusDiv.className = 'status connected';
			statusDiv.textContent = '已连接到 CCCore';
			connectionStatus.textContent = `已连接`;
		} else {
			statusDiv.className = 'status disconnected';
			statusDiv.textContent = '未连接';
			connectionStatus.textContent = '等待连接...';
		}
	} catch (error) {
		statusDiv.className = 'status disconnected';
		statusDiv.textContent = '未连接';
		connectionStatus.textContent = '后台进程未响应';
	}
}

// 更新当前标签页信息
async function updateCurrentTab() {
	try {
		const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
		if (tabs.length > 0) {
			const tab = tabs[0];
			const url = new URL(tab.url);
			document.getElementById('currentTab').textContent = `${tab.title}\n${url.hostname}`;
		}
	} catch (error) {
		document.getElementById('currentTab').textContent = '无法获取信息';
	}
}

// 加载通知偏好设置
async function loadNotificationPreference() {
	try {
		const result = await chrome.storage.local.get('useBrowserNotification');
		const useBrowserNotification = result.useBrowserNotification !== false; // 默认为 true
		document.getElementById('notificationToggle').checked = useBrowserNotification;
	} catch (error) {
		console.error('加载通知偏好失败:', error);
	}
}

// 重新连接按钮
document.getElementById('reconnectBtn').addEventListener('click', async () => {
	try {
		await chrome.runtime.sendMessage({
			type: 'RECONNECT',
		});
		updateStatus();
	} catch (error) {
		console.error('重连失败:', error);
	}
});

// 管理提醒按钮
// document.getElementById('remindersBtn').addEventListener('click', () => {
// 	chrome.tabs.create({
// 		url: chrome.runtime.getURL('reminders.html'),
// 	});
// });

// 通知方式开关
document.getElementById('notificationToggle').addEventListener('change', async (e) => {
	const useBrowserNotification = e.target.checked;
	try {
		// 保存到 storage
		await chrome.storage.local.set({
			useBrowserNotification,
		});
		// 发送消息到 background 更新设置
		await chrome.runtime.sendMessage({
			type: 'SET_NOTIFICATION_PREFERENCE',
			useBrowserNotification,
		});
		console.log('通知偏好已更新:', { useBrowserNotification });
	} catch (error) {
		console.error('更新通知偏好失败:', error);
	}
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
	updateStatus();
	updateCurrentTab();
	loadNotificationPreference();

	// 定期更新状态
	setInterval(() => {
		updateStatus();
	}, 2000);
});
