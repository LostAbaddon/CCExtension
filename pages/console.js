/**
 * CCExtension Console 页面脚本
 */

let CurrentCCTab = null;
let CurrentCCSid = null;

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
		flexTab.addEventListener('onAdd', (event) => {
			console.log('[Console] 点击了添加按钮');

			// 动态添加一个新标签
			const newTabName = `tab_${Date.now()}`;
			const newTabContent = `<span>新 Claude Code 终端</span>`;

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
