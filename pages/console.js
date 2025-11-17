/**
 * CCExtension Console 页面脚本
 */

let CurrentCCTab = null;
const Conversations = {};
const PreConversations = [];
const ToolUsages = {};

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

// 初始化 TabStorage
TabStorage.init().catch(err => {
	console.error('[TabStorage] 初始化失败:', err);
});

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
	}

	// 监听标签页切换事件
	const flexTab = document.querySelector('flex_tab');
	if (flexTab) {
		flexTab.addEventListener('onSwitch', (event) => {
			const tabName = event.detail.tabName;
			console.log('[Console] 切换到标签:', tabName);

			CurrentCCTab = tabName;
			// 恢复新 tab 的内容
			restoreTabContent(tabName);

			// 自动聚焦到输入框
			const mainInput = document.getElementById('main-input');
			if (mainInput) {
				VoiceInput.focus(mainInput);
			}
		});
		// 监听添加按钮点击事件
		flexTab.addEventListener('onAdd', async () => {
			console.log('[Console] 点击了添加按钮');

			// 动态添加一个新标签
			const newTabName = `tab_${Date.now()}`;

			// 新标签需要设置 workDir
			console.log('[Console] 新 Tab 需要设置 workDir，显示目录选择弹窗');
			const workDir = await showDirectoryPicker(newTabName);

			if (!workDir) return;

			// 从完整路径中提取目录名
			const dirName = workDir.split('/').filter(Boolean).pop() || workDir;
			const newTabContent = `<span>${dirName}</span>`;
			FlexibleTabs.addTab(flexTab, newTabName, newTabContent);

			// 自动切换到新标签
			FlexibleTabs.setActiveTab(flexTab, newTabName);

			// 保存新标签页数据
			await saveTabData(newTabName);
		});
		// 监听删除按钮点击事件
		flexTab.addEventListener('onDel', async (event) => {
			const tabName = event.detail.tabName;
			console.log('[Console] 请求删除标签:', tabName);

			// 调用 delTab 函数删除标签
			const success = FlexibleTabs.delTab(flexTab, tabName);
			if (success) {
				console.log('[Console] 标签已删除:', tabName);
				// 清理对应的状态
				delete tabStates[tabName];
				// 从数据库中删除
				await TabStorage.deleteTab(tabName).catch(err => {
					console.error('[Console] 删除标签页数据失败:', err);
				});
			}
			else {
				console.log('[Console] 标签删除失败:', tabName);
			}
		});
	}

	// 初始化时恢复所有标签页
	restoreAllTabs();
});

/**
 * 恢复所有标签页（从数据库）
 */
async function restoreAllTabs() {
	try {
		const flexTab = document.querySelector('flex_tab');
		if (!flexTab) {
			console.error('[TabStorage] 未找到 flex_tab 元素');
			return;
		}

		// 从数据库获取所有标签页数据
		const savedTabs = await TabStorage.getAllTabs();
		if (!savedTabs || savedTabs.length === 0) return;

		// 按更新时间排序（最新的在前面）
		savedTabs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

		// 恢复每个标签页
		for (const tabData of savedTabs) {
			const { tabName, workDir, sessionId, messages } = tabData;
			if (!workDir || !sessionId) continue;

			// 恢复标签页状态
			const state = getTabState(tabName);
			state.workDir = workDir;
			state.sessionId = sessionId;
			state.messages = messages || [];
			Conversations[sessionId] = tabName;

			// 添加标签页到 UI（只有在不存在时才添加）
			const existing = flexTab.querySelector(`[data-tab-name="${tabName}"]`);
			if (!existing) {
				const dirName = workDir.split('/').filter(Boolean).pop() || workDir;
				const tabContent = `<span>${dirName}</span>`;
				FlexibleTabs.addTab(flexTab, tabName, tabContent);
			}

			console.log(`[Console] 恢复标签页: ${tabName}, 工作目录: ${workDir}, 消息数: ${messages.length}`);
		}

		// 激活第一个标签页
		if (savedTabs.length > 0) {
			const firstTabName = savedTabs[0].tabName;
			FlexibleTabs.setActiveTab(flexTab, firstTabName);
		}
	}
	catch (error) {
		console.error('[Console] 恢复标签页失败:', error);
	}
}
/**
 * 保存标签页数据到数据库
 * @param {string} tabName - Tab 名称
 */
async function saveTabData(tabName) {
	try {
		const state = getTabState(tabName);

		// 获取标签页的显示内容
		const flexTab = document.querySelector('flex_tab');
		if (!flexTab) return;

		const tabElement = flexTab.querySelector(`[data-tab-name="${tabName}"]`);
		if (!tabElement) return;

		// 保存到数据库
		await TabStorage.saveTab(tabName, {
			workDir: state.workDir,
			sessionId: state.sessionId,
			messages: state.messages,
		});

		console.log(`[TabStorage] 标签页 "${tabName}" 数据已保存`);
	}
	catch (error) {
		console.error(`[Console] 保存标签页 "${tabName}" 数据失败:`, error);
	}
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
			if (msg.type === 'user') {
				showUserMessage(msg.content);
			}
			else if (msg.type === 'ai') {
				showAssistantMessage(msg.content);
			}
			else if (msg.type === 'error') {
				showErrorMessage(msg.content);
			}
			else if (msg.type === 'tool') {
				showToolUsingMessage(msg.content, 'tool-used');
			}
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
		Notification.show(null, '请先选择一个工作目录！', 'middleTop', 'error', 5000);
		console.error('[Console] 没有选中的 Tab');
		return;
	}
	const state = getTabState(CurrentCCTab);
	if (!state.workDir) {
		Notification.show(null, '该标签页没有选中工作目录，请关闭并重开一个新的标签页', 'middleTop', 'error', 5000);
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
		// 保存清空后的状态
		await saveTabData(CurrentCCTab);
		return;
	}

	// 显示"工作中"提示框
	showWorkingIndicator();

	// 提交消息到 CCCore
	state.messages.push({ type: 'user', content: message });
	await sendMessageToCore(CurrentCCTab, message, state);

	// 保存标签页数据
	await saveTabData(CurrentCCTab);
}

/**
 * 发送消息到 CCCore
 * @param {string} message - 用户消息
 * @param {Object} state - Tab 状态
 */
async function sendMessageToCore(tabId, message, state) {
	if (!tabId) return;

	try {
		if (!state.sessionId) {
			PreConversations.push([tabId, message.replace(/\s+/g, '').replace(/\p{P}/ug, '')]);
		}

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
			Conversations[result.sessionId] = tabId;
			state.sessionId = result.sessionId;
			state.messages.push({ type: 'ai', content: result.reply });
			if (tabId === CurrentCCTab) showAssistantMessage(result.reply);

			// 保存标签页数据（包含新的 AI 回复）
			await saveTabData(tabId);
		}
	}
	catch (error) {
		console.error('[Console] 消息提交失败:', error);
		state.messages.push({ type: 'error', content: error.message });
		if (tabId === CurrentCCTab) showErrorMessage('消息提交失败: ' + error.message);

		// 保存标签页数据（包含错误信息）
		await saveTabData(tabId);
	}
	finally {
		// 移除"工作中"提示框
		hideWorkingIndicator();

		const sessionId = state.sessionId;
		if (!sessionId) return;
		for (const key in ToolUsages) {
			const [tid, sid] = ToolUsages[key];
			if (sid !== sessionId) continue;
			delete ToolUsages[key];
			const ui = document.querySelector(`#conversation_container div.chat-item.tool-using[name="${tid}"]`);
			if (!ui) continue;
			ui.classList.remove('tool-using');
			ui.classList.add('tool-failed');
		}
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
		Notification.show(null, '清除对话失败', 'middleTop', 'error', 5000);
		console.error('[Console] 会话清除失败:', error);
	}
}

function writeMarkdownContentToContainer(container, markdown) {
	const renderedContent = MarkUp.parse(markdown);
	container.innerHTML = renderedContent;

	// 针对本地地址做二次处理
	let path = getTabState(CurrentCCTab).workDir;
	if (!path.match(/\/$/)) path = path + '/';
	let pathList = path.split('/').filter(i => i);
	[...container.querySelectorAll('a[href*="file"]')].forEach(link => {
		if (link.href.match(/file:\/\/\./)) {
			let lev = path + link.href.replace(/file:\/\//, '');
			lev = lev.split('/');
			lev = lev.filter(item => item !== '.');
			for (let i = lev.length - 1; i >= 0; i --) {
				const j = lev[i];
				if (j === '..') {
					lev.splice(i - 1, 2);
					i --;
				}
			}
			link.href = 'file://' +  lev.join('/');
		}
		const list = link.innerText.split('/').filter(i => i);
		const len = Math.min(pathList.length, list.length);
		let fork = -1;
		for (let i = 0; i < len; i ++) {
			if (pathList[i] === list[i]) {
				fork = i;
			}
			else {
				break;
			}
		}
		if (fork >= 0) {
			let rel = '../'.repeat(pathList.length - 1 - fork) || './';
			list.splice(0, fork + 1);
			link.innerText = rel + list.join('/');
		}
	});
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

	const messageElement = document.createElement('div');
	messageElement.classList.add('markdown-body');
	messageElement.classList.add('chat-item');
	messageElement.classList.add('user-chat');

	// 使用 MarkUp 渲染消息内容
	writeMarkdownContentToContainer(messageElement, message);

	// 检测是否有工作中提示框
	const workingIndicator = conversationContainer.querySelector('div.chat-item.working-indicator');
	// 添加到提示框前
	if (workingIndicator) {
		conversationContainer.insertBefore(messageElement, workingIndicator);
	}
	// 添加到最后
	else {
		conversationContainer.appendChild(messageElement);
	}
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

	const messageElement = document.createElement('div');
	messageElement.classList.add('markdown-body');
	messageElement.classList.add('chat-item');
	messageElement.classList.add('assistant-chat');

	// 使用 MarkUp 渲染消息内容
	writeMarkdownContentToContainer(messageElement, reply);

	// 检测是否有工作中提示框
	const workingIndicator = conversationContainer.querySelector('div.chat-item.working-indicator');
	// 添加到提示框前
	if (workingIndicator) {
		conversationContainer.insertBefore(messageElement, workingIndicator);
	}
	// 添加到最后
	else {
		conversationContainer.appendChild(messageElement);
	}
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

	const messageElement = document.createElement('div');
	messageElement.classList.add('chat-item');
	messageElement.classList.add('error-chat');
	messageElement.textContent = error;

	// 检测是否有工作中提示框
	const workingIndicator = conversationContainer.querySelector('div.chat-item.working-indicator');
	// 添加到提示框前
	if (workingIndicator) {
		conversationContainer.insertBefore(messageElement, workingIndicator);
	}
	// 添加到最后
	else {
		conversationContainer.appendChild(messageElement);
	}
	conversationContainer.scrollTop = conversationContainer.scrollHeight;
}
/**
 * 显示错误消息
 * @param {string} error - 错误信息
 */
function showToolUsingMessage(toolUsage, status) {
	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) {
		return;
	}

	let name = [];
	for (let i = 0; i < 16; i ++) {
		name.push(Math.floor(Math.random() * 36).toString(36));
	}
	name = 'tool_' + name.join('');

	const messageElement = document.createElement('div');
	messageElement.classList.add('chat-item');
	messageElement.classList.add(status || 'tool-using');
	messageElement.setAttribute('name', name);
	messageElement.innerText = toolUsage;

	// 检测是否有工作中提示框
	const workingIndicator = conversationContainer.querySelector('div.chat-item.working-indicator');
	// 添加到提示框前
	if (workingIndicator) {
		conversationContainer.insertBefore(messageElement, workingIndicator);
	}
	// 添加到最后
	else {
		conversationContainer.appendChild(messageElement);
	}
	conversationContainer.scrollTop = conversationContainer.scrollHeight;

	return name;
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
			Notification.show(null, '目录读取失败', 'middleTop', 'error', 5000);
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
			localStorage.setItem('lastWorkDir', currentPath);
			console.log(`[Console] Tab "${tabName}" 的 workDir 已设置为: ${currentPath}`);
		}
		document.body.removeChild(overlay);
		res(currentPath);
	});

	// 初始加载
	loadFolders(localStorage.getItem('lastWorkDir'));
});

const matchSessionIdWithTabId = (sessionId, content) => {
	let tabId = Conversations[sessionId];
	if (tabId) return; // 该对话已经与标签页绑定，则不再绑定

	// 如果没有可匹配的，则放弃
	if (PreConversations.length === 0) {
		console.log('[TabSession] 没有可用的标签页: ' + sessionId);
		return;
	}
	// 如果只有一个标签页等待与对话绑定
	else if (PreConversations.length === 1) {
		tabId = PreConversations[0][0];
		Conversations[sessionId] = tabId;
		PreConversations.splice(0);
	}
	// 如果有不止一个标签页等待与对话绑定，则做匹配
	else {
		const temp = content.replace(/\s+/g, '').replace(/\p{P}/ug, '');
		let idx = -1;
		PreConversations.some((item, i) => {
			if (item[1] === temp) {
				idx = i;
				return true;
			}
		});
		if (idx < 0) {
			console.log('[TabSession] 没找到匹配的标签页: ' + sessionId);
			return;
		}
		tabId = PreConversations[idx][0];
		PreConversations.splice(idx, 1);
	}

	// 更新标签页信息中的 sessionId
	const state = getTabState(tabId);
	state.sessionId = sessionId;
};

const updateToolUsage = (sessionId, toolName, type) => {
	const tabId = Conversations[sessionId];

	if (type === 'start') {
		if (tabId !== CurrentCCTab) return; // 不是当前标签页或没有对应标签页
		const toolId = showToolUsingMessage(toolName);
		ToolUsages[toolName] = [toolId, sessionId];
	}
	else if (type === 'end') {
		const toolId = ToolUsages[toolName]?.[0];
		if (!toolId) return;
		delete ToolUsages[toolName];
		const ui = document.querySelector(`#conversation_container div.chat-item.tool-using[name="${toolId}"]`);
		if (ui) {
			ui.classList.remove('tool-using');
			ui.classList.add('tool-used');
		}
		const state = getTabState(tabId);
		state.messages.push({
			type: "tool",
			content: toolName
		});

		// 保存标签页数据（包含工具使用信息）
		saveTabData(tabId).catch(err => {
			console.error('[Console] 保存工具使用信息失败:', err);
		});
	}
};

/**
 * 显示"工作中"提示框
 */
function showWorkingIndicator() {
	if (!CurrentCCTab) return;

	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) return;

	// 创建"工作中"提示框
	const indicator = document.createElement('div');
	indicator.classList.add('chat-item');
	indicator.classList.add('working-indicator');
	indicator.innerHTML = `
		<div class="working-spinner"></div>
		<span>Claude 工作中……</span>
	`;

	// 添加到容器末尾
	conversationContainer.appendChild(indicator);
	// 滚动到底部
	conversationContainer.scrollTop = conversationContainer.scrollHeight;
}
/**
 * 隐藏"工作中"提示框
 */
function hideWorkingIndicator() {
	if (!CurrentCCTab) return;

	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) return;

	// 检测是否有工作中提示框
	const workingIndicator = conversationContainer.querySelector('div.chat-item.working-indicator');
	if (!workingIndicator) return;
	workingIndicator.parentElement.removeChild(workingIndicator);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log('[Console] 收到来自 background 的消息:', request);
	if (request.event == 'user_input') {
		const { sessionId, content } = request.data ?? {};
		matchSessionIdWithTabId(sessionId, content);
	}
	else if (request.event == 'tool_use') {
		const type = request.type;
		if (!type) return;
		const { sessionId, toolName } = request.data ?? {};
		updateToolUsage(sessionId, toolName, type);
	}
	else if (request.event == 'query_session_tab') {
		// 查询 sessionId 对应的 tabId
		const { sessionId } = request.data ?? {};
		const tabId = Conversations[sessionId];
		if (tabId) {
			const isActive = tabId === CurrentCCTab;
			console.log(`[Console] 查询到 sessionId ${sessionId} 对应的 tabId: ${tabId}, 是否激活: ${isActive}`);
			sendResponse({ found: true, tabName: tabId, isActive });
		}
		else {
			console.log(`[Console] 未找到 sessionId ${sessionId} 对应的 tabId`);
			sendResponse({ found: false });
		}
		return true;
	}
	else if (request.event == 'switch_to_tab') {
		// 切换到指定的标签页
		const { tabName } = request.data ?? {};
		if (tabName) {
			const flexTab = document.querySelector('flex_tab');
			if (flexTab) {
				FlexibleTabs.setActiveTab(flexTab, tabName);
				console.log(`[Console] 切换到标签页: ${tabName}`);
			}
		}
	}
});
