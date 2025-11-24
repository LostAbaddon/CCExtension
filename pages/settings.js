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
const searchWorkspaceInput = document.getElementById('searchWorkspace');
const writingWorkspaceInput = document.getElementById('writingWorkspace');
const selectSearchWorkspaceBtn = document.getElementById('selectSearchWorkspace');
const selectWritingWorkspaceBtn = document.getElementById('selectWritingWorkspace');

// 从 CCCore 获取工作区配置
async function fetchWorkspacesConfig() {
	try {
		const response = await fetch('http://localhost:3579/api/config/workspaces');
		const data = await response.json();
		if (data.ok && data.data) {
			return data.data;
		}
	}
	catch (error) {
		console.error('[Settings] 获取工作区配置失败:', error);
	}
	return {
		searchWorkspace: '~/Searching',
		writingWorkspace: '~/Writing',
	};
}

// 更新 CCCore 的工作区配置
async function updateWorkspacesConfig(searchWorkspace, writingWorkspace) {
	try {
		const response = await fetch('http://localhost:3579/api/config/workspaces', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				searchWorkspace,
				writingWorkspace,
			}),
		});
		const data = await response.json();
		return data.ok;
	}
	catch (error) {
		console.error('[Settings] 更新工作区配置失败:', error);
		return false;
	}
}

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

	// 加载工作区配置
	const workspaces = await fetchWorkspacesConfig();
	searchWorkspaceInput.value = workspaces.searchWorkspace || '';
	writingWorkspaceInput.value = workspaces.writingWorkspace || '';
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

	const stopReminderSuccess = await updateStopReminderConfig(enabled, delay);

	// 保存工作区配置
	const searchWorkspace = searchWorkspaceInput.value;
	const writingWorkspace = writingWorkspaceInput.value;

	const workspacesSuccess = await updateWorkspacesConfig(searchWorkspace, writingWorkspace);

	if (stopReminderSuccess && workspacesSuccess) {
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

// 显示目录选择器
const showDirectoryPicker = (title = '选择工作目录') => new Promise(res => {
	// 创建弹窗遮罩
	const overlay = document.createElement('div');
	overlay.id = 'directory-picker-overlay';
	overlay.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	`;

	// 创建弹窗内容
	const modal = document.createElement('div');
	modal.id = 'directory-picker-modal';
	modal.style.cssText = `
		background: var(--back-color);
		color: var(--text-color);
		border-radius: 12px;
		width: 600px;
		max-height: 70vh;
		display: block;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	`;

	// 创建标题栏
	const header = document.createElement('div');
	header.style.cssText = `
		padding: 20px;
		border-bottom: 1px solid var(--border-color);
		font-size: 18px;
		font-weight: bold;
	`;
	header.textContent = title;

	// 创建当前路径显示
	const pathDisplay = document.createElement('div');
	pathDisplay.id = 'current-path-display';
	pathDisplay.style.cssText = `
		padding: 15px 20px;
		background: var(--emphasize-color);
		color: var(--back-color);
		font-family: monospace;
		font-size: 14px;
		border-bottom: 1px solid var(--border-color);
		overflow-x: auto;
		white-space: nowrap;
	`;

	// 创建文件夹列表容器
	const listContainer = document.createElement('div');
	listContainer.id = 'folder-list-container';
	listContainer.style.cssText = `
		height: 400px;
		overflow-y: auto;
		padding: 10px;
	`;

	// 创建底部按钮栏
	const footer = document.createElement('div');
	footer.style.cssText = `
		padding: 15px 20px;
		border-top: 1px solid var(--border-color);
		text-align: right;
	`;

	const cancelBtn = document.createElement('button');
	cancelBtn.textContent = '取消';
	cancelBtn.style.cssText = `
		padding: 8px 20px;
		border: 1px solid var(--border-color);
		background: transparent;
		color: var(--text-color);
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		margin-right: 10px;
	`;

	const confirmBtn = document.createElement('button');
	confirmBtn.textContent = '确定';
	confirmBtn.style.cssText = `
		padding: 8px 20px;
		border: none;
		background: var(--emphasize-color);
		color: var(--back-color);
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: bold;
	`;

	footer.appendChild(cancelBtn);
	footer.appendChild(confirmBtn);

	modal.appendChild(header);
	modal.appendChild(pathDisplay);
	modal.appendChild(listContainer);
	modal.appendChild(footer);

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	// 当前路径
	let currentPath = null;

	// 加载文件夹列表
	async function loadFolders(path) {
		try {
			listContainer.innerHTML = '<div style="padding: 20px; text-align: center;">加载中...</div>';

			const url = path
				? `http://localhost:3579/api/folders?path=${encodeURIComponent(path)}`
				: 'http://localhost:3579/api/folders';

			const response = await fetch(url);
			const data = await response.json();

			if (!data.ok) {
				throw new Error(data.error || '获取文件夹列表失败');
			}

			currentPath = data.currentPath;
			pathDisplay.textContent = currentPath;

			// 清空列表
			listContainer.innerHTML = '';

			// 如果不是根目录，添加返回上级目录选项
			if (currentPath !== '/') {
				const parentItem = document.createElement('div');
				parentItem.style.cssText = `
					padding: 12px 15px;
					cursor: pointer;
					border-radius: 6px;
					margin-bottom: 5px;
				`;
				parentItem.innerHTML = `
					<span style="font-size: 20px; margin-right: 10px; vertical-align: middle;">⬆️</span>
					<span style="font-weight: bold; vertical-align: middle;">..</span>
				`;
				parentItem.addEventListener('mouseenter', () => {
					parentItem.style.background = 'var(--emphasize-color)';
					parentItem.style.color = 'var(--back-color)';
				});
				parentItem.addEventListener('mouseleave', () => {
					parentItem.style.background = 'transparent';
					parentItem.style.color = 'var(--text-color)';
				});
				parentItem.addEventListener('click', () => {
					const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
					loadFolders(parentPath);
				});
				listContainer.appendChild(parentItem);
			}

			// 添加文件夹列表
			if (data.folders.length === 0) {
				const emptyMsg = document.createElement('div');
				emptyMsg.style.cssText = 'padding: 20px; text-align: center; color: var(--text-color-secondary);';
				emptyMsg.textContent = '当前目录下没有文件夹';
				listContainer.appendChild(emptyMsg);
			}
			else {
				data.folders.forEach(folder => {
					const folderItem = document.createElement('div');
					folderItem.style.cssText = `
						padding: 12px 15px;
						cursor: pointer;
						border-radius: 6px;
						margin-bottom: 5px;
					`;
					folderItem.innerHTML = `
						<span style="font-size: 20px; margin-right: 10px; vertical-align: middle;">📁</span>
						<span style="vertical-align: middle;">${folder.name}</span>
					`;
					folderItem.addEventListener('mouseenter', () => {
						folderItem.style.background = 'var(--emphasize-color)';
						folderItem.style.color = 'var(--back-color)';
					});
					folderItem.addEventListener('mouseleave', () => {
						folderItem.style.background = 'transparent';
						folderItem.style.color = 'var(--text-color)';
					});
					folderItem.addEventListener('click', () => {
						loadFolders(folder.path);
					});
					listContainer.appendChild(folderItem);
				});
			}
		}
		catch (error) {
			console.error('[Settings] 加载文件夹列表失败:', error);
			listContainer.innerHTML = `
				<div style="padding: 20px; text-align: center; color: red;">
					加载失败: ${error.message}
				</div>
			`;
		}
	}

	// 绑定按钮事件
	cancelBtn.addEventListener('click', () => {
		document.body.removeChild(overlay);
		res(null);
	});
	confirmBtn.addEventListener('click', () => {
		document.body.removeChild(overlay);
		res(currentPath);
	});

	// 初始加载（从用户主目录开始）
	loadFolders(null);
});

// 事件监听
saveBtn.addEventListener('click', saveSettings);
reconnectBtn.addEventListener('click', reconnect);

// 工作区选择器事件监听
selectSearchWorkspaceBtn.addEventListener('click', async () => {
	const path = await showDirectoryPicker('选择搜索工作区');
	if (path) {
		searchWorkspaceInput.value = path;
	}
});

selectWritingWorkspaceBtn.addEventListener('click', async () => {
	const path = await showDirectoryPicker('选择写作工作区');
	if (path) {
		writingWorkspaceInput.value = path;
	}
});

// 初始化
loadSettings();
updateConnectionStatus();
updateCurrentTab();
ThemeToggle.init();

// 定期更新连接状态
setInterval(updateConnectionStatus, 5000);
