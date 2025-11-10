/**
 * CCExtension 主题切换公共组件
 * 提供统一的主题切换功能和 UI
 */

const ThemeToggle = (function() {
	'use strict';

	/**
	 * 检测并设置主题
	 */
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
			console.log('[CCExtension ThemeToggle] 主题设置为:', theme);
		});
	}

	/**
	 * 更新主题图标显示
	 * @param {string} theme - 当前主题（'dark' 或 'light'）
	 */
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

	/**
	 * 切换主题
	 */
	function toggleTheme() {
		const currentTheme = document.body.getAttribute('theme');
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

		document.body.setAttribute('theme', newTheme);
		updateThemeIcon(newTheme);

		// 保存用户设置
		chrome.storage.local.set({ theme: newTheme });

		console.log('[CCExtension ThemeToggle] 主题切换为:', newTheme);
	}

	/**
	 * 获取主题切换按钮的 HTML（用于菜单项）
	 * @returns {string} 主题切换按钮的 HTML
	 */
	function getMenuItemHTML() {
		return `<div class="menu-item" id="theme-toggle-btn" title="切换主题">
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path class="sun-icon" d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		<path class="moon-icon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
	</svg>
</div>`;
	}

	/**
	 * 获取主题切换按钮的 HTML（用于固定按钮）
	 * @returns {string} 主题切换按钮的 HTML
	 */
	function getFixedButtonHTML() {
		return `<div id="theme-toggle-btn" title="切换主题">
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path class="sun-icon" d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		<path class="moon-icon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
	</svg>
</div>`;
	}

	/**
	 * 初始化主题切换功能
	 * @param {Object} options - 配置选项
	 * @param {boolean} options.autoDetect - 是否自动检测并设置主题（默认：true）
	 * @param {boolean} options.listenStorageChange - 是否监听存储变化以同步主题（默认：true）
	 */
	function init(options = {}) {
		const {
			autoDetect = true,
			listenStorageChange = true,
		} = options;

		// 绑定主题切换事件
		const toggleBtn = document.getElementById('theme-toggle-btn');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', toggleTheme);
		}

		// 自动检测并设置主题
		if (autoDetect) {
			detectAndSetTheme();
		}

		// 监听主题变化（从其他页面同步）
		if (listenStorageChange) {
			chrome.storage.onChanged.addListener((changes, namespace) => {
				if (namespace === 'local' && changes.theme) {
					const newTheme = changes.theme.newValue;
					document.body.setAttribute('theme', newTheme);
					updateThemeIcon(newTheme);
					console.log('[CCExtension ThemeToggle] 主题已从其他页面同步为:', newTheme);
				}
			});
		}
	}

	// 导出公共接口
	return {
		init,
		detectAndSetTheme,
		updateThemeIcon,
		toggleTheme,
		getMenuItemHTML,
		getFixedButtonHTML,
	};
})();
