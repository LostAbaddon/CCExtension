/**
 * Markdown 编辑器
 * 提供 Markdown 文件的在线编辑功能
 */

(function() {
	'use strict';

	// 全局变量
	let filePath = '';
	let originalContent = '';
	let currentContent = '';
	let isModified = false;

	// DOM 元素
	const editor = document.getElementById('editor');
	const preview = document.getElementById('preview');
	const saveBtn = document.getElementById('save-btn');
	const backBtn = document.getElementById('back-btn');
	const themeBtn = document.getElementById('theme-btn');
	const menuToggleBtn = document.getElementById('menu-toggle-btn');
	const actionMenu = document.getElementById('action-menu');
	const filePathDisplay = document.getElementById('file-path');
	const saveStatus = document.getElementById('save-status');
	const charCount = document.getElementById('char-count');
	const lineCount = document.getElementById('line-count');
	const wordCount = document.getElementById('word-count');

	// 初始化
	async function init() {
		// 从 URL 参数获取文件路径
		const params = new URLSearchParams(window.location.search);
		filePath = decodeURIComponent(params.get('file') || '');

		if (!filePath) {
			alert('错误：未指定文件路径');
			return;
		}

		// 显示文件路径
		filePathDisplay.textContent = filePath;

		// 加载样式
		loadStyles();

		// 加载文件内容
		await loadFileContent();

		// 绑定事件
		setupEventListeners();

		// 设置主题
		detectAndSetTheme();

		console.log('[CCExtension] Markdown 编辑器初始化完成');
	}

	// 加载样式
	function loadStyles() {
		const styles = [
			chrome.runtime.getURL('style/main.css'),
			chrome.runtime.getURL('style/float-menu.css'),
			chrome.runtime.getURL('style/markdown.css'),
		];

		styles.forEach(styleUrl => {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = styleUrl;
			document.head.appendChild(link);
		});
	}

	// 加载文件内容
	async function loadFileContent() {
		try {
			// 使用 fetch 读取本地文件
			const response = await fetch('file://' + filePath);
			if (!response.ok) {
				throw new Error('无法读取文件');
			}

			const content = await response.text();
			originalContent = content;
			currentContent = content;
			editor.value = content;

			// 更新预览
			updatePreview();

			// 更新统计信息
			updateStats();

			console.log('[CCExtension] 文件加载成功');
		}
		catch (error) {
			console.error('[CCExtension] 文件加载失败:', error);
			alert('无法读取文件：' + error.message);
		}
	}

	// 绑定事件监听器
	function setupEventListeners() {
		// 编辑器内容变化
		editor.addEventListener('input', () => {
			currentContent = editor.value;
			updatePreview();
			updateStats();
			checkModified();
		});

		// 菜单展开按钮
		menuToggleBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isVisible = actionMenu.style.display === 'flex';
			actionMenu.style.display = isVisible ? 'none' : 'flex';
		});

		// 点击页面其他地方关闭菜单
		document.addEventListener('click', () => {
			actionMenu.style.display = 'none';
		});

		// 阻止菜单自身点击事件冒泡
		actionMenu.addEventListener('click', (e) => {
			e.stopPropagation();
		});

		// 保存按钮
		saveBtn.addEventListener('click', saveFile);

		// 返回按钮
		backBtn.addEventListener('click', () => {
			if (isModified) {
				if (confirm('文件已修改，确定要离开吗？未保存的更改将丢失。')) {
					goBack();
				}
			}
			else {
				goBack();
			}
		});

		// 主题切换按钮
		themeBtn.addEventListener('click', toggleTheme);

		// 键盘快捷键
		document.addEventListener('keydown', (e) => {
			// Ctrl/Cmd + S 保存
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault();
				if (isModified) {
					saveFile();
				}
			}
		});

		// 监听 Tab 键
		editor.addEventListener('keydown', (e) => {
			if (e.key === 'Tab') {
				e.preventDefault();
				// 插入 tab 字符
				const start = editor.selectionStart;
				const end = editor.selectionEnd;
				const value = editor.value;
				editor.value = value.substring(0, start) + '\t' + value.substring(end);
				editor.selectionStart = editor.selectionEnd = start + 1;
				// 触发 input 事件
				editor.dispatchEvent(new Event('input'));
			}
		});
	}

	// 更新预览
	function updatePreview() {
		if (typeof MarkUp !== 'undefined') {
			try {
				const html = MarkUp.fullParse(currentContent);
				preview.innerHTML = html.content;
			}
			catch (error) {
				console.error('[CCExtension] Markdown 渲染失败:', error);
				preview.innerHTML = '<p style="color: red;">预览失败：' + error.message + '</p>';
			}
		}
		else {
			console.error('[CCExtension] MarkUp 对象未定义');
			preview.innerHTML = '<p style="color: red;">MarkUp 库未加载</p>';
		}
	}

	// 更新统计信息
	function updateStats() {
		const text = editor.value;
		const chars = text.length;
		const lines = text.split('\n').length;
		const words = text.trim() ? text.trim().split(/\s+/).length : 0;

		charCount.textContent = `字符：${chars}`;
		lineCount.textContent = `行数：${lines}`;
		wordCount.textContent = `单词：${words}`;
	}

	// 检查是否已修改
	function checkModified() {
		isModified = currentContent !== originalContent;
		saveBtn.disabled = !isModified;
		saveStatus.textContent = isModified ? '已修改' : '未修改';
		saveStatus.style.color = isModified ? '#d73a49' : '#6a737d';
	}

	// 保存文件
	async function saveFile() {
		if (!isModified) {
			return;
		}

		// 显示保存中状态
		const originalTitle = saveBtn.title;
		saveBtn.title = '保存中...';
		saveBtn.disabled = true;

		try {
			// 调用 CCCore API 保存文件
			const response = await fetch('http://localhost:3579/api/file', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					path: filePath,
					content: currentContent,
				}),
			});

			const data = await response.json();

			if (!data.ok) {
				throw new Error(data.error || '保存失败');
			}

			// 更新原始内容
			originalContent = currentContent;
			isModified = false;
			saveBtn.disabled = true;
			saveStatus.textContent = '已保存';
			saveStatus.style.color = '#2ea44f';

			console.log('[CCExtension] 文件保存成功');

			// 2秒后恢复状态文本
			setTimeout(() => {
				if (!isModified) {
					saveStatus.textContent = '未修改';
					saveStatus.style.color = '#6a737d';
				}
			}, 2000);
		}
		catch (error) {
			console.error('[CCExtension] 文件保存失败:', error);
			alert('保存失败：' + error.message);
			saveBtn.disabled = false;
		}
		finally {
			saveBtn.title = originalTitle;
		}
	}

	// 返回渲染页
	function goBack() {
		// 返回原文件的 file:// URL
		window.location.href = 'file://' + filePath;
	}

	// 检测并设置主题
	function detectAndSetTheme() {
		chrome.storage.local.get(['theme'], (result) => {
			let theme = result.theme;

			// 如果没有用户设置，则根据系统偏好判断
			if (!theme) {
				const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				theme = prefersDark ? 'dark' : 'light';
			}

			document.body.setAttribute('theme', theme);
			console.log('[CCExtension] 主题设置为:', theme);
		});
	}

	// 切换主题
	function toggleTheme() {
		const currentTheme = document.body.getAttribute('theme');
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

		document.body.setAttribute('theme', newTheme);

		// 保存用户设置
		chrome.storage.local.set({ theme: newTheme });

		console.log('[CCExtension] 主题切换为:', newTheme);
	}

	// 监听主题变化（从其他页面同步）
	chrome.storage.onChanged.addListener((changes, namespace) => {
		if (namespace === 'local' && changes.theme) {
			const newTheme = changes.theme.newValue;
			document.body.setAttribute('theme', newTheme);
			console.log('[CCExtension] 主题已从其他页面同步为:', newTheme);
		}
	});

	// 页面加载时初始化
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	}
	else {
		init();
	}
})();
