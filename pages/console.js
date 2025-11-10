/**
 * CCExtension Console 页面脚本
 */

let CurrentCCTab = null;
let CurrentCCSid = null;

// Tab 状态管理对象，以 tab 的 name 为 key
const tabStates = {};
/**
 * 获取或初始化 tab 状态
 * @param {string} tabName - Tab 名称
 * @returns {Object} Tab 状态对象
 */
function getTabState(tabName) {
	if (!tabStates[tabName]) {
		tabStates[tabName] = {
			workDir: null,
			sessionId: null,
			messages: [], // 存储未渲染的消息，格式: [{type: 'user'|'assistant'|'error', content: string}]
		};
	}
	return tabStates[tabName];
}
/**
 * 检查 tab 状态是否需要设置 workDir
 * @param {string} tabName - Tab 名称
 * @returns {boolean} 是否需要设置
 */
function needsWorkDir(tabName) {
	const state = getTabState(tabName);
	return !state.workDir;
}

// 初始化主题切换
ThemeToggle.init();

// 设置按钮点击事件
document.addEventListener('DOMContentLoaded', () => {
	// 监听输入框提交事件
	const mainInput = document.getElementById('main-input');
	if (mainInput) {
		mainInput.addEventListener('onSubmit', (event) => {
			const message = event.detail.value;
			if (!message) {
				return;
			}

			console.log('[Console] 提交消息:', message);

			// 这里处理消息发送逻辑
			handleMessageSubmit(message);

			// 清空输入框
			VoiceInput.clear(mainInput);
		});
		// 监听输入框高度变化事件
		mainInput.addEventListener('onHeightChange', (event) => {
			const { newHeight } = event.detail;
			conversation_container.style.bottom = (newHeight + 30) + 'px';
		});
	}

	const settingsBtn = document.getElementById('settings-btn');
	if (settingsBtn) {
		settingsBtn.addEventListener('click', () => {
			window.location.href = './settings.html';
		});
	}

	// 监听标签页切换事件
	const flexTab = document.querySelector('flex_tab');
	if (flexTab) {
		flexTab.addEventListener('onSwitch', (event) => {
			const tabName = event.detail.tabName;
			console.log('[Console] 切换到标签:', tabName);

			// 保存当前 tab 的内容到缓存（如果有的话）
			if (CurrentCCTab) {
				saveCurrentTabContent(CurrentCCTab);
			}

			CurrentCCTab = tabName;

			// 恢复新 tab 的内容
			restoreTabContent(tabName);
		});
		// 监听添加按钮点击事件
		flexTab.addEventListener('onAdd', async () => {
			console.log('[Console] 点击了添加按钮');

			// 动态添加一个新标签
			const newTabName = `tab_${Date.now()}`;

			// 新标签需要设置 workDir
			console.log('[Console] 新 Tab 需要设置 workDir，显示目录选择弹窗');
			const workDir = await showDirectoryPicker(newTabName);
			console.log('----------------->', workDir);

			if (!workDir) return;

			const newTabContent = `<span>${workDir}</span>`;
			FlexibleTabs.addTab(flexTab, newTabName, newTabContent);

			// 自动切换到新标签
			FlexibleTabs.setActiveTab(flexTab, newTabName);
		});
		// 监听删除按钮点击事件
		flexTab.addEventListener('onDel', (event) => {
			const tabName = event.detail.tabName;
			console.log('[Console] 请求删除标签:', tabName);

			// 调用 delTab 函数删除标签
			const success = FlexibleTabs.delTab(flexTab, tabName);
			if (success) {
				console.log('[Console] 标签已删除:', tabName);
				// 清理对应的状态
				delete tabStates[tabName];
			}
			else {
				console.log('[Console] 标签删除失败:', tabName);
			}
		});
	}
});

/**
 * 保存当前 tab 的内容到缓存
 * @param {string} tabName - Tab 名称
 */
function saveCurrentTabContent(tabName) {
	// 注意：这里不需要保存，因为消息在 showUserMessage 等函数中已经保存到 state.messages 了
	// 这个函数保留用于未来可能的扩展
	console.log('[Console] 保存 Tab 内容:', tabName);
}

/**
 * 恢复 tab 的内容
 * @param {string} tabName - Tab 名称
 */
function restoreTabContent(tabName) {
	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) {
		return;
	}

	const state = getTabState(tabName);

	// 清空当前显示的内容
	conversationContainer.innerHTML = '';

	// 恢复该 tab 的所有消息
	if (state.messages && state.messages.length > 0) {
		state.messages.forEach(msg => {
			const messageElement = document.createElement('div');
			messageElement.style.marginBottom = '12px';
			messageElement.style.padding = '12px';
			messageElement.style.borderRadius = '8px';

			if (msg.type === 'user') {
				messageElement.style.backgroundColor = 'var(--emphasize-color)';
				messageElement.style.color = 'var(--back-color)';
			}
			else if (msg.type === 'error') {
				messageElement.style.backgroundColor = '#ff4444';
				messageElement.style.color = '#ffffff';
			}
			else {
				messageElement.style.backgroundColor = 'var(--border-color)';
				messageElement.style.color = 'var(--text-color)';
			}

			// 使用 MarkUp 渲染内容
			const renderedContent = MarkUp.parse(msg.content);
			messageElement.innerHTML = renderedContent;

			conversationContainer.appendChild(messageElement);
		});

		// 滚动到底部
		conversationContainer.scrollTop = conversationContainer.scrollHeight;
	}

	console.log('[Console] 恢复 Tab 内容:', tabName, '消息数量:', state.messages.length);
}

/**
 * 处理消息提交
 * @param {string} message - 用户输入的消息
 */
async function handleMessageSubmit(message) {
	// 获取当前 Tab 的状态
	if (!CurrentCCTab) {
		console.error('[Console] 没有选中的 Tab');
		return;
	}
	const state = getTabState(CurrentCCTab);
	if (!state.workDir) {
		console.error('[Console] 当前 Tab 没有设置 workDir');
		return;
	}

	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) {
		return;
	}

	showUserMessage(message);

	// 检查是否是清除命令
	const clearCommands = ['/clear', '/new', '/reset'];
	if (clearCommands.includes(message.trim())) {
		// 发送清除会话请求
		await sendClearRequest(CurrentCCTab);
		// 清空对话容器
		conversationContainer.innerHTML = '';
		// 重置 sessionId 和消息缓存
		state.sessionId = null;
		state.messages = [];
		return;
	}

	// 提交消息到 CCCore
	await sendMessageToCore(CurrentCCTab, message, state);
}

/**
 * 发送消息到 CCCore
 * @param {string} message - 用户消息
 * @param {Object} state - Tab 状态
 */
async function sendMessageToCore(tabId, message, state) {
	if (!tabId) return;

	try {
		const response = await fetch(`http://localhost:3579/claudius/${tabId}/submit`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				workDir: state.workDir,
				prompt: message,
			}),
		});

		const result = await response.json();
		if (!result.ok) {
			throw new Error(result.error || '提交失败');
		}
		console.log('[Console] 消息提交成功:', result);

		// 显示 AI 回复
		if (result.reply) {
			showAssistantMessage(result.reply);
		}
	}
	catch (error) {
		console.error('[Console] 消息提交失败:', error);
		showErrorMessage('消息提交失败: ' + error.message);
	}
}
/**
 * 发送清除会话请求
 * @param {string} tabId - 会话 ID
 */
async function sendClearRequest(tabId) {
	if (!tabId) return;

	try {
		const response = await fetch(`http://localhost:3579/claudius/${tabId}/clear`, {
			method: 'POST',
		});

		const result = await response.json();
		console.log('[Console] 会话清除成功:', result);
	}
	catch (error) {
		console.error('[Console] 会话清除失败:', error);
	}
}

/**
 * 显示用户输入
 * @param {string} message - AI 回复内容
 */
function showUserMessage(message) {
	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) {
		return;
	}

	// 保存未渲染的消息到当前 tab 的状态中
	if (CurrentCCTab) {
		const state = getTabState(CurrentCCTab);
		state.messages.push({
			type: 'user',
			content: message
		});
	}

	const messageElement = document.createElement('div');
	messageElement.style.marginBottom = '12px';
	messageElement.style.padding = '12px';
	messageElement.style.borderRadius = '8px';
	messageElement.style.backgroundColor = 'var(--emphasize-color)';
	messageElement.style.color = 'var(--back-color)';

	// 使用 MarkUp 渲染消息内容
	const renderedContent = MarkUp.parse(message);
	messageElement.innerHTML = renderedContent;

	// 添加到对话容器
	conversationContainer.appendChild(messageElement);
	// 滚动到底部
	conversationContainer.scrollTop = conversationContainer.scrollHeight;
}
/**
 * 显示 AI 回复
 * @param {string} reply - AI 回复内容
 */
function showAssistantMessage(reply) {
	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) {
		return;
	}

	// 保存未渲染的消息到当前 tab 的状态中
	if (CurrentCCTab) {
		const state = getTabState(CurrentCCTab);
		state.messages.push({
			type: 'assistant',
			content: reply
		});
	}

	const messageElement = document.createElement('div');
	messageElement.style.marginBottom = '12px';
	messageElement.style.padding = '12px';
	messageElement.style.borderRadius = '8px';
	messageElement.style.backgroundColor = 'var(--border-color)';
	messageElement.style.color = 'var(--text-color)';

	// 使用 MarkUp 渲染消息内容
	const renderedContent = MarkUp.parse(reply);
	messageElement.innerHTML = renderedContent;

	conversationContainer.appendChild(messageElement);
	conversationContainer.scrollTop = conversationContainer.scrollHeight;
}
/**
 * 显示错误消息
 * @param {string} error - 错误信息
 */
function showErrorMessage(error) {
	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) {
		return;
	}

	// 保存未渲染的消息到当前 tab 的状态中
	if (CurrentCCTab) {
		const state = getTabState(CurrentCCTab);
		state.messages.push({
			type: 'error',
			content: error
		});
	}

	const messageElement = document.createElement('div');
	messageElement.style.marginBottom = '12px';
	messageElement.style.padding = '12px';
	messageElement.style.borderRadius = '8px';
	messageElement.style.backgroundColor = '#ff4444';
	messageElement.style.color = '#ffffff';
	messageElement.textContent = error;

	conversationContainer.appendChild(messageElement);
	conversationContainer.scrollTop = conversationContainer.scrollHeight;
}

/**
 * 显示目录选择弹窗
 * @param {string} tabName - Tab 名称
 */
const showDirectoryPicker = (tabName) => new Promise(res => {
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
	header.textContent = '选择工作目录';

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
			console.error('[Console] 加载文件夹列表失败:', error);
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
		if (currentPath) {
			// 保存 workDir
			const state = getTabState(tabName);
			state.workDir = currentPath;
			console.log(`[Console] Tab "${tabName}" 的 workDir 已设置为: ${currentPath}`);
		}
		document.body.removeChild(overlay);
		res(currentPath);
	});

	// 初始加载（从 homedir 开始）
	loadFolders(null);
});
