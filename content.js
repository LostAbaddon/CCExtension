/**
 * Markdown 文件渲染器
 * 监听页面,当检测到 .md 文件时自动渲染
 */

(function() {
	'use strict';

	// 检查是否是 Markdown 文件
	function isMarkdownFile() {
		const url = window.location.href;
		const pathname = window.location.pathname;

		// 检查文件扩展名
		if (pathname.endsWith('.md') || pathname.endsWith('.markdown')) {
			return true;
		}

		// 检查 Content-Type
		const contentType = document.contentType || document.mimeType;
		if (contentType && contentType.includes('text/plain')) {
			// 可能是 markdown 文件但没有正确的 MIME 类型
			if (pathname.includes('.md') || pathname.includes('.markdown')) {
				return true;
			}
		}

		return false;
	}

	// 检查是否是本地目录
	function isLocalDirectory() {
		const url = window.location.href;
		const pathname = window.location.pathname;

		// 必须是 file:// 协议
		if (!url.startsWith('file://')) {
			return false;
		}

		// 检查是否以 / 结尾(表示目录)
		if (pathname.endsWith('/')) {
			return true;
		}

		// 检查页面内容是否为空或只包含默认的目录列表
		const body = document.body;
		if (!body || body.children.length === 0) {
			return true;
		}

		// 检查是否是浏览器默认的目录列表页面
		// Chrome/Firefox 默认会显示一个空白页面或简单的文件列表
		if (body.children.length === 1) {
			const firstChild = body.children[0];
			// 检查是否是空的或只有简单文本
			if (firstChild.tagName === 'PRE' && firstChild.textContent.trim() === '') {
				return true;
			}
		}

		return false;
	}

	// 获取 Markdown 内容
	function getMarkdownContent() {
		const body = document.body;

		// 如果body只包含一个 <pre> 标签（常见于浏览器显示纯文本文件）
		if (body.children.length === 1 && body.children[0].tagName === 'PRE') {
			return body.children[0].textContent;
		}

		// 否则获取整个 body 的文本内容
		return body.textContent || body.innerText;
	}


	// 渲染 Markdown
	function renderMarkdown() {
		if (!isMarkdownFile()) {
			return;
		}

		console.log('[CCExtension] 检测到 Markdown 文件，开始渲染...');

		// 获取 Markdown 内容
		const markdownContent = getMarkdownContent();

		// 渲染 Markdown
		if (typeof MarkUp !== 'undefined') {
			try {
				const html = MarkUp.fullParse(markdownContent);

				// 替换页面内容
				document.body.innerHTML = `<!-- 主题切换按钮 -->
<div id="theme-toggle-btn" title="切换主题">
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path class="sun-icon" d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		<path class="moon-icon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
	</svg>
</div>

<div id="markdown-container">
	<div class="markdown-body">
		${html.content}
	</div>
</div>`;
				// 针对本地地址做二次处理
				let path = location.href.replace(/^file:\/\//, '').replace(/\/[^\/]+\.md$/, '/');
				let pathList = path.split('/').filter(i => i);
				[...document.body.querySelectorAll('a[href*="file"]')].forEach(link => {
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

				// 加载样式
				loadStyles();
				// 绑定事件
				setupThemeToggle();

				console.log('[CCExtension] Markdown 渲染完成');
			}
			catch (error) {
				console.error('[CCExtension] Markdown 渲染失败:', error);
			}
		}
		else {
			console.error('[CCExtension] MarkUp 对象未定义');
		}
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
			updateThemeIcon(theme);
			console.log('[CCExtension] 主题设置为:', theme);
		});
	}

	// 更新主题图标显示
	function updateThemeIcon(theme) {
		const toggleBtn = document.getElementById('theme-toggle-btn');
		if (!toggleBtn) return;

		const sunIcon = toggleBtn.querySelector('.sun-icon');
		const moonIcon = toggleBtn.querySelector('.moon-icon');

		if (!sunIcon || !moonIcon) return;

		if (theme === 'dark') {
			// 暗色模式显示太阳图标（点击后切换到亮色）
			sunIcon.style.display = 'block';
			moonIcon.style.display = 'none';
		}
		else {
			// 亮色模式显示月亮图标（点击后切换到暗色）
			sunIcon.style.display = 'none';
			moonIcon.style.display = 'block';
		}
	}

	// 切换主题
	function toggleTheme() {
		const currentTheme = document.body.getAttribute('theme');
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

		document.body.setAttribute('theme', newTheme);
		updateThemeIcon(newTheme);

		// 保存用户设置
		chrome.storage.local.set({ theme: newTheme });

		console.log('[CCExtension] 主题切换为:', newTheme);
	}

	// 设置主题切换按钮
	function setupThemeToggle() {
		const toggleBtn = document.getElementById('theme-toggle-btn');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', toggleTheme);
		}
	}

	// 加载样式
	function loadStyles() {
		const styles = [
			chrome.runtime.getURL('style/main.css'),
			chrome.runtime.getURL('style/theme-toggle.css'),
			chrome.runtime.getURL('style/markdown.css'),
		];

		styles.forEach(styleUrl => {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = styleUrl;
			document.head.appendChild(link);
		});

		// 设置主题
		detectAndSetTheme();
	}

	// 根据文件名获取图标
	function getFileIcon(filename) {
		const ext = filename.split('.').pop().toLowerCase();

		// 图片文件
		if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) {
			return '🖼️';
		}
		// 视频文件
		if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
			return '🎬';
		}
		// 音频文件
		if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
			return '🎵';
		}
		// 压缩文件
		if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
			return '📦';
		}
		// 代码文件
		if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'swift'].includes(ext)) {
			return '📝';
		}
		// Markdown 文件
		if (['md', 'markdown'].includes(ext)) {
			return '📄';
		}
		// 文档文件
		if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
			return '📋';
		}
		// 文本文件
		if (['txt', 'log', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf'].includes(ext)) {
			return '📃';
		}
		// 可执行文件
		if (['exe', 'app', 'dmg', 'pkg', 'deb', 'rpm'].includes(ext)) {
			return '⚙️';
		}
		// 默认文件图标
		return '📄';
	}

	// 加载目录内容
	async function loadDirectoryContent(path) {
		try {
			const url = path
				? `http://localhost:3579/api/folders?path=${encodeURIComponent(path)}&includeFiles=true`
				: 'http://localhost:3579/api/folders?includeFiles=true';

			const response = await fetch(url);
			const data = await response.json();

			if (!data.ok) {
				throw new Error(data.error || '获取目录内容失败');
			}

			return data;
		}
		catch (error) {
			console.error('[CCExtension] 加载目录内容失败:', error);
			throw error;
		}
	}

	// 渲染目录浏览器
	async function renderDirectory() {
		if (!isLocalDirectory()) {
			return;
		}

		console.log('[CCExtension] 检测到本地目录，开始渲染目录浏览器...');

		// 获取当前目录路径
		let currentPath = decodeURIComponent(window.location.pathname);

		// 替换页面内容
		document.body.innerHTML = `<!-- 主题切换按钮 -->
<div id="theme-toggle-btn" title="切换主题">
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path class="sun-icon" d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		<path class="moon-icon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
	</svg>
</div>

<div id="directory-container">
	<div id="directory-header">
		<div id="directory-title">目录浏览器</div>
		<div id="current-path-display">${currentPath}</div>
	</div>
	<div id="directory-list">
		<div class="directory-loading">加载中</div>
	</div>
</div>`;

		// 加载样式
		loadDirectoryStyles();

		// 设置主题
		detectAndSetTheme();

		// 绑定主题切换事件
		setupThemeToggle();

		// 加载目录内容
		await updateDirectoryList(currentPath);

		console.log('[CCExtension] 目录浏览器渲染完成');
	}

	// 更新目录列表
	async function updateDirectoryList(path) {
		const directoryList = document.getElementById('directory-list');
		if (!directoryList) return;

		try {
			// 显示加载中
			directoryList.innerHTML = '<div class="directory-loading">加载中</div>';

			// 加载目录内容
			const data = await loadDirectoryContent(path);

			// 更新当前路径显示
			const pathDisplay = document.getElementById('current-path-display');
			if (pathDisplay) {
				pathDisplay.textContent = data.currentPath;
			}

			// 清空列表
			directoryList.innerHTML = '';

			// 如果不是根目录，添加返回上级目录选项
			if (data.currentPath !== '/') {
				const parentItem = document.createElement('a');
				parentItem.className = 'directory-item parent-dir';
				const parentPath = data.currentPath.split('/').slice(0, -1).join('/') || '/';
				parentItem.href = `file://${parentPath}/`;
				parentItem.innerHTML = `
					<span class="directory-item-icon">⬆️</span>
					<span class="directory-item-name">..</span>
				`;
				directoryList.appendChild(parentItem);
			}

			// 添加文件夹列表
			const hasFolders = data.folders && data.folders.length > 0;
			const hasFiles = data.files && data.files.length > 0;

			if (!hasFolders && !hasFiles) {
				const emptyMsg = document.createElement('div');
				emptyMsg.className = 'directory-empty';
				emptyMsg.textContent = '当前目录为空';
				directoryList.appendChild(emptyMsg);
			}
			else {
				// 先显示文件夹
				if (hasFolders) {
					data.folders.forEach(folder => {
						const folderItem = document.createElement('a');
						folderItem.className = 'directory-item';
						folderItem.href = `file://${folder.path}/`;
						folderItem.innerHTML = `
							<span class="directory-item-icon">📁</span>
							<span class="directory-item-name">${folder.name}</span>
						`;
						directoryList.appendChild(folderItem);
					});
				}

				// 再显示文件
				if (hasFiles) {
					data.files.forEach(file => {
						const fileItem = document.createElement('a');
						fileItem.className = 'directory-item';
						fileItem.href = `file://${file.path}`;
						// 根据文件类型显示不同图标
						const icon = getFileIcon(file.name);
						fileItem.innerHTML = `
							<span class="directory-item-icon">${icon}</span>
							<span class="directory-item-name">${file.name}</span>
						`;
						directoryList.appendChild(fileItem);
					});
				}
			}
		}
		catch (error) {
			console.error('[CCExtension] 更新目录列表失败:', error);
			directoryList.innerHTML = `
				<div class="directory-error">
					加载失败: ${error.message}
				</div>
			`;
		}
	}

	// 加载目录浏览器样式
	function loadDirectoryStyles() {
		const styles = [
			chrome.runtime.getURL('style/main.css'),
			chrome.runtime.getURL('style/theme-toggle.css'),
			chrome.runtime.getURL('style/directory-browser.css'),
		];

		styles.forEach(styleUrl => {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = styleUrl;
			document.head.appendChild(link);
		});
	}

	// 开始渲染
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			renderMarkdown();
			renderDirectory();
		});
	}
	else {
		renderMarkdown();
		renderDirectory();
	}

	// 监听主题变化（从其他页面同步）
	chrome.storage.onChanged.addListener((changes, namespace) => {
		if (namespace === 'local' && changes.theme) {
			const newTheme = changes.theme.newValue;
			document.body.setAttribute('theme', newTheme);
			updateThemeIcon(newTheme);
			console.log('[CCExtension] 主题已从其他页面同步为:', newTheme);
		}
	});
})();
