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

	// 存储原始 Markdown 内容
	let originalMarkdownContent = '';
	let isShowingSource = false;

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
				console.log(html);

				// 替换页面内容
				document.body.innerHTML = `<div id="menu-wrapper">
	<div id="menu-toggle-btn" title="展开菜单">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</div>
	<div id="action-menu">
		<div class="menu-item" id="theme-toggle-btn" title="切换主题">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path class="sun-icon" d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path class="moon-icon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>
		<div class="menu-item" id="source-toggle-btn" title="显示源文件">
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
		</div>
	</div>
</div>
<div id="markdown-container">
	<div class="markdown-body">
		${html.content}
	</div>
</div>`;

				// 加载样式
				loadStyles();

				// 绑定事件
				setupThemeToggle();
				setupSourceToggle();

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
		// 优先从存储中获取用户设置
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

	// 加载样式
	function loadStyles() {
		const styles = [
			chrome.runtime.getURL('style/main.css'),
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

	// 开始渲染
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', renderMarkdown);
	}
	else {
		renderMarkdown();
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
