// 存储原始 Markdown 内容
let originalMarkdownContent = '';
let isShowingSource = false;

// 检查是否是 Markdown 文件
function isMarkdownFile() {
	const pathname = window.location.pathname;
	const isMarkdown = pathname.endsWith('.md') || pathname.endsWith('.mu') || pathname.endsWith('.markdown');

	// 检查文件扩展名
	if (isMarkdown) {
		return true;
	}

	// 检查 Content-Type
	const contentType = document.contentType || document.mimeType;
	if (contentType && contentType.includes('text/plain')) {
		// 可能是 markdown 文件但没有正确的 MIME 类型
		if (isMarkdown) {
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
	originalMarkdownContent = markdownContent;

	// 渲染 Markdown
	if (typeof MarkUp !== 'undefined') {
		try {
			const html = MarkUp.fullParse(markdownContent);

			// 检查是否是本地文件
			const isLocalFile = window.location.href.startsWith('file://');

			// 替换页面内容
			document.body.innerHTML = `<!-- 顶部操作栏 -->
<div id="menu-wrapper">
	<button id="menu-toggle-btn" title="菜单">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</button>
	<div id="action-menu">
		${isLocalFile ? `<button id="edit-btn" class="menu-item" title="编辑文档">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M18.5 2.5C18.8978 2.1022 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.1022 21.5 2.5C21.8978 2.8978 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.1022 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>` : ''}
		<button id="export-word-btn" class="menu-item" title="导出为 Word 文档">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M12 18V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M9 15L12 18L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		<button id="theme-toggle-btn" class="menu-item" title="切换主题">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path class="sun-icon" d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="moon-icon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		<button id="source-toggle-btn" class="menu-item" title="显示源文件">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path class="view-source-icon" d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="view-source-icon" d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="view-source-icon" d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="view-source-icon" d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="view-source-icon" d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="view-rendered-icon" d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="view-rendered-icon" d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="view-rendered-icon" d="M9 15L11 17L15 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
	</div>
</div>

<div id="markdown-container">
<div class="markdown-body">
	${html.content}
</div>
</div>`;
			// 针对本地地址做二次处理
			let path = location.href.replace(/^file:\/\//, '').replace(/\/[^\/]+\.(?:md|mu|markdown)$/, '/');
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
			// 触发显示原文件
			setupSourceToggle();
			// 绑定导出事件
			setupExportButton(markdownContent);
			// 绑定编辑事件（仅本地文件）
			if (isLocalFile) {
				setupEditButton(markdownContent);
			}

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
		chrome.runtime.getURL('style/float-menu.css'),
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

// 设置源文件切换按钮
function setupSourceToggle() {
	const sourceToggleBtn = document.getElementById('source-toggle-btn');
	if (sourceToggleBtn) {
		sourceToggleBtn.addEventListener('click', toggleSource);
	}
}
// 切换源文件显示
function toggleSource() {
	const container = document.getElementById('markdown-container');
	const sourceToggleBtn = document.getElementById('source-toggle-btn');
	if (!container || !sourceToggleBtn) return;

	isShowingSource = !isShowingSource;

	if (isShowingSource) {
		// 显示源文件
		container.innerHTML = `<pre class="markdown-source">${escapeHtml(originalMarkdownContent)}</pre>`;
		sourceToggleBtn.title = '显示渲染结果';
		// 更新图标显示
		updateSourceIcon(true);
	}
	else {
		// 显示渲染结果
		const html = MarkUp.fullParse(originalMarkdownContent);
		container.innerHTML = `<div class="markdown-body">${html.content}</div>`;
		sourceToggleBtn.title = '显示源文件';
		// 更新图标显示
		updateSourceIcon(false);
	}
}
// 更新源文件切换按钮图标
function updateSourceIcon(isSource) {
	const sourceToggleBtn = document.getElementById('source-toggle-btn');
	if (!sourceToggleBtn) return;

	const viewSourceIcons = sourceToggleBtn.querySelectorAll('.view-source-icon');
	const viewRenderedIcons = sourceToggleBtn.querySelectorAll('.view-rendered-icon');

	if (isSource) {
		// 当前显示源文件，按钮表示"切换到渲染视图"
		viewSourceIcons.forEach(icon => icon.style.display = 'none');
		viewRenderedIcons.forEach(icon => icon.style.display = 'block');
	}
	else {
		// 当前显示渲染结果，按钮表示"切换到源文件"
		viewSourceIcons.forEach(icon => icon.style.display = 'block');
		viewRenderedIcons.forEach(icon => icon.style.display = 'none');
	}
}
// HTML 转义函数
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// 设置编辑按钮
function setupEditButton(markdownContent) {
	const editBtn = document.getElementById('edit-btn');
	if (editBtn) {
		editBtn.addEventListener('click', () => {
			// 获取当前文件路径
			const filePath = decodeURIComponent(window.location.pathname);
			// 跳转到编辑器页面，传递文件路径和内容
			const editorUrl = chrome.runtime.getURL('pages/markdown-editor.html') +
				'?file=' + encodeURIComponent(filePath);
			window.location.href = editorUrl;
		});
	}
}

// 设置导出按钮
function setupExportButton(markdownContent) {
	const exportBtn = document.getElementById('export-word-btn');
	if (exportBtn) {
		exportBtn.addEventListener('click', () => exportToWord(markdownContent));
	}
}
// 导出为 Word 文档
async function exportToWord(markdownContent) {
	const exportBtn = document.getElementById('export-word-btn');
	if (!exportBtn) return;

	// 显示加载状态
	const originalHTML = exportBtn.innerHTML;
	exportBtn.disabled = true;
	exportBtn.innerHTML = '<span>导出中...</span>';

	try {
		// 动态加载 html-docx-js 库
		if (typeof htmlDocx === 'undefined') {
			await loadExportLibrary();
		}

		// 获取文档标题（从文件名或第一个标题）
		const fileName = getDocumentTitle();

		// 获取渲染后的 HTML
		const htmlContent = document.querySelector('.markdown-body').innerHTML;

		// 创建完整的 HTML 文档
		const fullHTML = createFullHTML(htmlContent);

		// 转换为 Word 文档
		const converted = htmlDocx.asBlob(fullHTML);

		// 下载文件
		downloadBlob(converted, `${fileName}.docx`);
		console.log('[CCExtension] Word 文档导出成功');
	}
	catch (error) {
		console.error('[CCExtension] Word 文档导出失败:', error);
		alert('导出失败：' + error.message);
	}
	finally {
		// 恢复按钮状态
		exportBtn.disabled = false;
		exportBtn.innerHTML = originalHTML;
	}
}
// 加载导出库
async function loadExportLibrary() {
	// 检查是否已经加载
	if (window.htmlDocx) return;

	await callBGAndWait('amountJS', 'components/html2docx.js');
	console.log('[HTML2DOCX] Amounted');
}
// 获取文档标题
function getDocumentTitle() {
	// 尝试从第一个标题获取
	const firstHeading = document.querySelector('.markdown-body h1, .markdown-body h2');
	if (firstHeading) {
		return firstHeading.textContent.trim();
	}

	// 从文件名获取
	const pathname = window.location.pathname;
	const filename = pathname.split('/').pop();
	return filename.replace(/\.(md|mu|markdown)$/, '') || 'document';
}
// 创建完整的 HTML 文档
function createFullHTML(bodyContent) {
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "Noto Sans", Helvetica, Arial, sans-serif;
		font-size: 14px;
		line-height: 1.6;
		color: #24292e;
		padding: 20px;
	}
	h1, h2, h3, h4, h5, h6 {
		margin-top: 24px;
		margin-bottom: 16px;
		font-weight: 600;
		line-height: 1.25;
	}
	h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
	h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
	h3 { font-size: 1.25em; }
	h4 { font-size: 1em; }
	h5 { font-size: 0.875em; }
	h6 { font-size: 0.85em; color: #6a737d; }
	p { margin-top: 0; margin-bottom: 10px; }
	code {
		font-family: "Courier New", Courier, monospace;
		background-color: rgba(27,31,35,0.05);
		padding: 0.2em 0.4em;
		border-radius: 3px;
		font-size: 85%;
	}
	pre {
		background-color: #f6f8fa;
		border-radius: 3px;
		padding: 16px;
		overflow: auto;
		line-height: 1.45;
	}
	pre code {
		background-color: transparent;
		padding: 0;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		margin: 16px 0;
	}
	table th, table td {
		border: 1px solid #dfe2e5;
		padding: 6px 13px;
	}
	table th {
		background-color: #f6f8fa;
		font-weight: 600;
	}
	blockquote {
		margin: 0;
		padding: 0 1em;
		color: #6a737d;
		border-left: 0.25em solid #dfe2e5;
	}
	ul, ol {
		padding-left: 2em;
		margin-top: 0;
		margin-bottom: 16px;
	}
	li + li {
		margin-top: 0.25em;
	}
	a {
		color: #0366d6;
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
	img {
		max-width: 100%;
	}
</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}
// 下载 Blob
async function downloadBlob(blob, filename) {
	console.log('[CCExtension] 开始下载文件:', filename);
	console.log('[CCExtension] Blob 信息 - 大小:', blob.size, '字节, 类型:', blob.type);

	try {
		// 将 Blob 转换为 ArrayBuffer
		const arrayBuffer = await blob.arrayBuffer();
		// 转换为 Base64
		const base64 = btoa(
			new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
		);

		// 通过 background script 下载
		await callBGAndWait('downloadFile', {
			filename: filename,
			data: base64,
			mimeType: blob.type
		});

		console.log('[CCExtension] 文件下载请求已发送到 background script');
	}
	catch (error) {
		console.error('[CCExtension] 下载失败:', error);
		throw error;
	}
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
<div id="theme-toggle-btn" class="menu-item outside" title="切换主题">
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
		chrome.runtime.getURL('style/float-menu.css'),
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

// 互动模块
const newID = (len=16) => {
	const id = [];
	for (let i = 0; i < len; i ++) {
		id.push((Math.floor(Math.random() * 36)).toString(36));
	}
	return id.join('');
};
const PendingEvents = {};
const callBG = () => {
	const tid = newID();
	chrome.runtime.sendMessage({
		event,
		tid,
		data,
	});
};
const callBGAndWait = (event, ...data) => new Promise((res, rej) => {
	const tid = newID();
	PendingEvents[tid] = [res, rej];
	chrome.runtime.sendMessage({
		event,
		tid,
		data,
	});
});
chrome.runtime.onMessage.addListener((request, sender) => {
	if (request.event === "__reply_action") {
		if (request.tid) {
			const callback = PendingEvents[request.tid];
			if (callback) {
				delete PendingEvents[request.tid];
				if (request.ok) {
					callback[0](request.data);
				}
				else {
					callback[1](request.error);
				}
			}
		}
	}
});