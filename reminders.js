/**
 * 提醒管理页面脚本
 */

const CCCORE_HOST = 'localhost';
const CCCORE_PORT = 3579;

// 页面元素
const remindersList = document.getElementById('remindersList');
const refreshBtn = document.getElementById('refreshBtn');
const browserBtn = document.getElementById('browserBtn');
const systemBtn = document.getElementById('systemBtn');

/**
 * 初始化页面
 */
function init() {
	loadNotificationPreference();
	loadRemindersList();
	setupEventListeners();
}

/**
 * 设置事件监听
 */
function setupEventListeners() {
	refreshBtn.addEventListener('click', () => {
		loadRemindersList();
	});

	browserBtn.addEventListener('click', () => {
		setNotificationPreference(true);
		updatePreferenceUI(true);
	});

	systemBtn.addEventListener('click', () => {
		setNotificationPreference(false);
		updatePreferenceUI(false);
	});

	// 监听 storage 变化
	chrome.storage.onChanged.addListener((changes) => {
		if (changes.remindersList) {
			renderRemindersList(changes.remindersList.newValue || []);
		}
		if (changes.useBrowserNotification) {
			updatePreferenceUI(changes.useBrowserNotification.newValue);
		}
	});
}

/**
 * 加载通知偏好
 */
function loadNotificationPreference() {
	chrome.storage.local.get(['useBrowserNotification'], (result) => {
		const useChrome = result.useBrowserNotification !== false; // 默认为 true
		updatePreferenceUI(useChrome);
	});
}

/**
 * 更新偏好 UI
 */
function updatePreferenceUI(useChrome) {
	if (useChrome) {
		browserBtn.classList.add('active');
		systemBtn.classList.remove('active');
	} else {
		browserBtn.classList.remove('active');
		systemBtn.classList.add('active');
	}
}

/**
 * 设置通知偏好
 */
function setNotificationPreference(useChrome) {
	chrome.storage.local.set({ useBrowserNotification: useChrome }, () => {
		console.log('通知偏好已设置:', useChrome ? 'Chrome' : '系统');
	});
}

/**
 * 加载提醒列表
 */
function loadRemindersList() {
	remindersList.innerHTML = '<div class="loading">加载中...</div>';

	fetch(`http://${CCCORE_HOST}:${CCCORE_PORT}/api/reminders`)
		.then(res => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		})
		.then(data => {
			if (data?.ok && data?.data?.reminders) {
				chrome.storage.local.set({
					remindersList: data.data.reminders,
					lastUpdateTime: Date.now(),
				});
				renderRemindersList(data.data.reminders);
			} else {
				showError('无法获取提醒列表');
			}
		})
		.catch(error => {
			console.error('获取提醒列表失败:', error);
			// 尝试从 storage 加载
			chrome.storage.local.get(['remindersList'], (result) => {
				if (result.remindersList && result.remindersList.length > 0) {
					renderRemindersList(result.remindersList);
					showWarning('(离线模式)');
				} else {
					showError('无法加载提醒列表，请确保 CCCore 正在运行');
				}
			});
		});
}

/**
 * 渲染提醒列表
 */
function renderRemindersList(reminders) {
	if (!reminders || reminders.length === 0) {
		remindersList.innerHTML = `
			<div class="empty-state">
				<div class="empty-icon">📭</div>
				<div class="empty-text">暂无活跃提醒</div>
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

			if (days > 0) {
				timeLeftStr = `${days}天 ${hours}小时`;
			} else if (hours > 0) {
				timeLeftStr = `${hours}小时 ${minutes}分钟`;
			} else {
				timeLeftStr = `${minutes}分钟`;
			}
		} else {
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

/**
 * 取消提醒
 */
function cancelReminder(id, title) {
	if (!confirm(`确定要删除提醒"${title}"吗？`)) {
		return;
	}

	fetch(`http://${CCCORE_HOST}:${CCCORE_PORT}/api/reminder/${encodeURIComponent(id)}`, {
		method: 'DELETE',
	})
		.then(res => res.json())
		.then(data => {
			if (data?.ok) {
				console.log('提醒已删除:', id);
				loadRemindersList();
			} else {
				alert(`删除失败: ${data?.error || '未知错误'}`);
			}
		})
		.catch(error => {
			console.error('删除提醒失败:', error);
			alert('删除提醒失败，请重试');
		});
}

/**
 * 显示错误信息
 */
function showError(message) {
	remindersList.innerHTML = `
		<div class="empty-state">
			<div class="empty-icon">⚠️</div>
			<div class="empty-text">${escapeHtml(message)}</div>
		</div>
	`;
}

/**
 * 显示警告信息
 */
function showWarning(message) {
	const elem = document.querySelector('.empty-text');
	if (elem) {
		elem.textContent += ' ' + message;
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
