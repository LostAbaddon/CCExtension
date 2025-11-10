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
			CurrentCCTab = tabName;

			// 根据 tabName 更新内容区域
			const contentArea = document.getElementById('demo-content');
			if (contentArea) {
				updateContent(contentArea, tabName);
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
 * 根据标签名更新内容区域
 * @param {HTMLElement} contentArea - 内容区域元素
 * @param {string} tabName - 标签名
 */
function updateContent(contentArea, tabName) {
	const contentMap = {
		home: `
			<h3>首页</h3>
			<p>这是首页的内容区域。</p>
			<p>可以在这里显示任何内容,包括文本、图片、表格等。</p>
		`,
		settings: `
			<h3>设置</h3>
			<p>这是设置页面的内容。</p>
			<ul>
				<li>选项 1</li>
				<li>选项 2</li>
				<li>选项 3</li>
			</ul>
		`,
		docs: `
			<h3>文档</h3>
			<p>这是文档页面。</p>
			<p>演示了标签可以不带图标的情况。</p>
		`,
		about: `
			<h3>关于我们</h3>
			<p>CCExtension 是一个强大的 Chrome 扩展。</p>
			<p>版本: 1.0.0</p>
		`,
		help: `
			<h3>帮助中心</h3>
			<p>需要帮助?查看我们的文档和教程。</p>
			<ol>
				<li>快速入门</li>
				<li>常见问题</li>
				<li>联系支持</li>
			</ol>
		`,
		stats: `
			<h3>数据统计</h3>
			<p>查看您的使用数据和统计信息。</p>
			<p>这是第6个标签,用于演示当标签数量增多时的自适应效果。</p>
		`,
	};

	contentArea.innerHTML = contentMap[tabName] || '<p>内容未找到</p>';
}

/**
 * 处理消息提交
 * @param {string} message - 用户输入的消息
 */
function handleMessageSubmit(message) {
	const conversationContainer = document.getElementById('conversation_container');
	if (!conversationContainer) {
		return;
	}

	// 创建消息元素
	const messageElement = document.createElement('div');
	messageElement.style.marginBottom = '12px';
	messageElement.style.padding = '12px';
	messageElement.style.borderRadius = '8px';
	messageElement.style.backgroundColor = 'var(--emphasize-color)';
	messageElement.style.color = 'var(--back-color)';
	messageElement.textContent = message;

	// 添加到对话容器
	conversationContainer.appendChild(messageElement);

	// 滚动到底部
	conversationContainer.scrollTop = conversationContainer.scrollHeight;

	// TODO: 这里可以添加发送消息到后台的逻辑
	// chrome.runtime.sendMessage({ type: 'sendMessage', message: message });
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
