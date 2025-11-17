/**
 * CCExtension 可变宽标签页组件
 * 使用声明式 HTML 标签方式
 */

(function() {
	'use strict';

	/**
	 * 初始化单个 flex_tab 组件
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 */
	function initFlexTab(flexTabElement) {
		// 获取配置
		const maxTabWidth = parseInt(flexTabElement.getAttribute('max_tab_width')) || 120;
		const minTabWidth = parseInt(flexTabElement.getAttribute('min_tab_width')) || 60;
		const plusable = flexTabElement.getAttribute('plusable') === 'true';

		// 创建内部结构
		const wrapper = document.createElement('div');
		wrapper.classList.add('flexible-tabs-wrapper');

		const scroll = document.createElement('div');
		scroll.classList.add('flexible-tabs-scroll');

		wrapper.appendChild(scroll);

		// 将 flex_tab 的类添加到容器
		flexTabElement.classList.add('flexible-tabs-container');

		// 获取所有 tab 元素
		const tabs = Array.from(flexTabElement.querySelectorAll('tab'));

		// 将原始 tab 移到 scroll 容器中
		tabs.forEach(tab => {
			const tabWrapper = document.createElement('div');
			tabWrapper.classList.add('flexible-tab');

			const name = tab.getAttribute('name');
			if (!name) {
				console.error('[FlexibleTabs] tab 必须有 name 属性');
				return;
			}

			tabWrapper.dataset.tabName = name;

			// 创建内容容器
			const contentWrapper = document.createElement('div');
			contentWrapper.classList.add('flexible-tab-content');

			// 将 tab 的内容移到内容容器中
			while (tab.firstChild) {
				contentWrapper.appendChild(tab.firstChild);
			}

			tabWrapper.appendChild(contentWrapper);

			// 创建删除按钮
			const deleteBtn = document.createElement('div');
			deleteBtn.classList.add('flexible-tab-delete');
			deleteBtn.innerHTML = `
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			`;
			deleteBtn.addEventListener('click', (e) => {
				e.stopPropagation(); // 阻止冒泡到 tab 点击事件
				const event = new CustomEvent('onDel', {
					detail: { tabName: name },
					bubbles: true,
				});
				flexTabElement.dispatchEvent(event);
			});
			tabWrapper.appendChild(deleteBtn);

			// 点击事件
			tabWrapper.addEventListener('click', () => {
				handleTabClick(flexTabElement, tabWrapper, name);
			});

			scroll.appendChild(tabWrapper);
		});

		// 如果启用了 plusable,创建添加按钮（在所有 tab 之后）
		let addButton = null;
		if (plusable) {
			addButton = document.createElement('div');
			addButton.classList.add('flexible-tabs-add-btn');
			addButton.innerHTML = `
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19"></line>
					<line x1="5" y1="12" x2="19" y2="12"></line>
				</svg>
			`;
			addButton.addEventListener('click', () => {
				const event = new CustomEvent('onAdd', {
					bubbles: true,
				});
				flexTabElement.dispatchEvent(event);
			});
			// 将添加按钮放到 scroll 容器内的最后
			scroll.appendChild(addButton);
		}

		// 清空原始内容并添加新结构
		flexTabElement.innerHTML = '';
		flexTabElement.appendChild(wrapper);

		// 保存配置到元素上
		flexTabElement._config = {
			maxTabWidth,
			minTabWidth,
			plusable,
			wrapper,
			scroll,
			addButton,
		};

		// 激活第一个 tab
		const firstTab = scroll.querySelector('.flexible-tab');
		if (firstTab) {
			firstTab.classList.add('active');
		}

		// 初始化宽度
		updateTabWidths(flexTabElement);

		// 监听窗口大小变化
		const resizeObserver = new ResizeObserver(() => {
			updateTabWidths(flexTabElement);
		});
		resizeObserver.observe(wrapper);

		// 鼠标滚轮事件,用于水平滚动
		wrapper.addEventListener('mousewheel', (e) => {
			if (wrapper.classList.contains('scrollable')) {
				e.preventDefault();
				wrapper.scrollLeft += e.deltaX;
			}
		}, { passive: false });
	}

	/**
	 * 更新标签宽度
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 */
	function updateTabWidths(flexTabElement) {
		const config = flexTabElement._config;
		if (!config) return;

		const { maxTabWidth, minTabWidth, plusable, wrapper, scroll, addButton } = config;

		// 计算可用宽度（如果有添加按钮，需要减去按钮宽度）
		let availableWidth = wrapper.offsetWidth;
		if (plusable && addButton) {
			const addButtonWidth = 40; // 添加按钮固定宽度
			availableWidth -= addButtonWidth;
		}

		const tabs = scroll.querySelectorAll('.flexible-tab');
		const tabCount = tabs.length;

		if (tabCount === 0) {
			return;
		}

		// 计算每个标签应该占用的宽度
		const totalMaxWidth = tabCount * maxTabWidth;
		let tabWidth;

		if (totalMaxWidth <= availableWidth) {
			// 空间足够,使用最大宽度
			tabWidth = maxTabWidth;
			wrapper.classList.remove('scrollable');
		}
		else {
			// 空间不足,计算压缩宽度
			const calculatedWidth = availableWidth / tabCount;

			if (calculatedWidth >= minTabWidth) {
				// 压缩宽度大于最小宽度,使用压缩宽度
				tabWidth = calculatedWidth;
				wrapper.classList.remove('scrollable');
			}
			else {
				// 压缩宽度小于最小宽度,使用最小宽度并启用滚动
				tabWidth = minTabWidth;
				wrapper.classList.add('scrollable');
			}
		}

		// 应用宽度
		tabs.forEach(tabEl => {
			tabEl.style.width = `${tabWidth}px`;
		});
	}

	/**
	 * 处理标签点击
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 * @param {HTMLElement} clickedTab - 被点击的 tab 元素
	 * @param {string} tabName - tab 的 name
	 */
	function handleTabClick(flexTabElement, clickedTab, tabName) {
		// 如果点击的是当前激活的 tab,不做任何处理
		if (clickedTab.classList.contains('active')) {
			return;
		}

		// 移除所有 tab 的激活状态
		const config = flexTabElement._config;
		if (!config) return;

		const allTabs = config.scroll.querySelectorAll('.flexible-tab');
		allTabs.forEach(tab => {
			tab.classList.remove('active');
		});

		// 激活被点击的 tab
		clickedTab.classList.add('active');

		// 触发 onSwitch 事件
		const event = new CustomEvent('onSwitch', {
			detail: { tabName },
			bubbles: true,
		});
		flexTabElement.dispatchEvent(event);
	}

	/**
	 * 动态添加 tab
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 * @param {string} name - tab 的 name
	 * @param {string|HTMLElement} content - tab 的内容
	 */
	function addTab(flexTabElement, name, content) {
		const config = flexTabElement._config;
		if (!config) {
			console.error('[FlexibleTabs] flex_tab 未初始化');
			return;
		}

		// 检查是否已存在
		const existing = config.scroll.querySelector(`[data-tab-name="${name}"]`);
		if (existing) {
			console.warn(`[FlexibleTabs] tab "${name}" 已存在`);
			return;
		}

		// 创建新 tab
		const tabWrapper = document.createElement('div');
		tabWrapper.classList.add('flexible-tab');
		tabWrapper.dataset.tabName = name;

		// 创建内容容器
		const contentWrapper = document.createElement('div');
		contentWrapper.classList.add('flexible-tab-content');

		// 添加内容
		if (typeof content === 'string') {
			contentWrapper.innerHTML = content;
		}
		else if (content instanceof HTMLElement) {
			contentWrapper.appendChild(content);
		}

		tabWrapper.appendChild(contentWrapper);

		// 创建删除按钮
		const deleteBtn = document.createElement('div');
		deleteBtn.classList.add('flexible-tab-delete');
		deleteBtn.innerHTML = `
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		`;
		deleteBtn.addEventListener('click', (e) => {
			e.stopPropagation(); // 阻止冒泡到 tab 点击事件
			const event = new CustomEvent('onDel', {
				detail: { tabName: name },
				bubbles: true,
			});
			flexTabElement.dispatchEvent(event);
		});
		tabWrapper.appendChild(deleteBtn);

		// 点击事件
		tabWrapper.addEventListener('click', () => {
			handleTabClick(flexTabElement, tabWrapper, name);
		});

		// 添加到容器（如果有添加按钮，插入到按钮前面）
		if (config.addButton) {
			config.scroll.insertBefore(tabWrapper, config.addButton);
		}
		else {
			config.scroll.appendChild(tabWrapper);
		}

		// 更新宽度
		updateTabWidths(flexTabElement);
	}

	/**
	 * 删除 tab
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 * @param {string} name - tab 的 name
	 * @returns {boolean} 删除成功返回 true,失败返回 false
	 */
	function delTab(flexTabElement, name) {
		const config = flexTabElement._config;
		if (!config) {
			console.error('[FlexibleTabs] flex_tab 未初始化');
			return false;
		}

		const tab = config.scroll.querySelector(`[data-tab-name="${name}"]`);
		if (!tab) {
			console.warn(`[FlexibleTabs] tab "${name}" 不存在`);
			return false;
		}

		const wasActive = tab.classList.contains('active');
		tab.remove();

		// 如果删除的是激活 tab,激活第一个
		if (wasActive) {
			const firstTab = config.scroll.querySelector('.flexible-tab');
			if (firstTab) {
				const firstName = firstTab.dataset.tabName;
				handleTabClick(flexTabElement, firstTab, firstName);
			}
		}

		// 更新宽度
		updateTabWidths(flexTabElement);

		return true;
	}

	/**
	 * 移除 tab（兼容旧版本，内部调用 delTab）
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 * @param {string} name - tab 的 name
	 */
	function removeTab(flexTabElement, name) {
		return delTab(flexTabElement, name);
	}

	/**
	 * 设置激活的 tab
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 * @param {string} name - tab 的 name
	 */
	function setActiveTab(flexTabElement, name) {
		const config = flexTabElement._config;
		if (!config) {
			console.error('[FlexibleTabs] flex_tab 未初始化');
			return;
		}

		const tab = config.scroll.querySelector(`[data-tab-name="${name}"]`);
		if (!tab) {
			console.warn(`[FlexibleTabs] tab "${name}" 不存在`);
			return;
		}

		handleTabClick(flexTabElement, tab, name);
	}

	/**
	 * 获取所有标签页名称
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 * @returns {Array<string>} 标签页名称数组
	 */
	function getAllTabNames(flexTabElement) {
		const config = flexTabElement._config;
		if (!config) {
			console.error('[FlexibleTabs] flex_tab 未初始化');
			return [];
		}

		const tabs = config.scroll.querySelectorAll('.flexible-tab');
		return Array.from(tabs).map(tab => tab.dataset.tabName);
	}

	/**
	 * 获取当前激活的标签页名称
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 * @returns {string|null} 当前激活的标签页名称，如果没有返回 null
	 */
	function getActiveTabName(flexTabElement) {
		const config = flexTabElement._config;
		if (!config) {
			console.error('[FlexibleTabs] flex_tab 未初始化');
			return null;
		}

		const activeTab = config.scroll.querySelector('.flexible-tab.active');
		return activeTab ? activeTab.dataset.tabName : null;
	}

	/**
	 * 切换到下一个标签页（循环）
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 */
	function nextTab(flexTabElement) {
		const config = flexTabElement._config;
		if (!config) {
			console.error('[FlexibleTabs] flex_tab 未初始化');
			return;
		}

		const tabs = config.scroll.querySelectorAll('.flexible-tab');
		if (tabs.length === 0) return;

		const activeTab = config.scroll.querySelector('.flexible-tab.active');
		if (!activeTab) {
			// 如果没有激活的标签页，激活第一个
			const firstName = tabs[0].dataset.tabName;
			handleTabClick(flexTabElement, tabs[0], firstName);
			return;
		}

		// 找到当前激活标签页的索引
		const currentIndex = Array.from(tabs).indexOf(activeTab);
		// 计算下一个标签页的索引（循环）
		const nextIndex = (currentIndex + 1) % tabs.length;
		const nextTabElement = tabs[nextIndex];
		const nextName = nextTabElement.dataset.tabName;

		handleTabClick(flexTabElement, nextTabElement, nextName);
	}

	/**
	 * 切换到上一个标签页（循环）
	 * @param {HTMLElement} flexTabElement - flex_tab 元素
	 */
	function prevTab(flexTabElement) {
		const config = flexTabElement._config;
		if (!config) {
			console.error('[FlexibleTabs] flex_tab 未初始化');
			return;
		}

		const tabs = config.scroll.querySelectorAll('.flexible-tab');
		if (tabs.length === 0) return;

		const activeTab = config.scroll.querySelector('.flexible-tab.active');
		if (!activeTab) {
			// 如果没有激活的标签页，激活最后一个
			const lastName = tabs[tabs.length - 1].dataset.tabName;
			handleTabClick(flexTabElement, tabs[tabs.length - 1], lastName);
			return;
		}

		// 找到当前激活标签页的索引
		const currentIndex = Array.from(tabs).indexOf(activeTab);
		// 计算上一个标签页的索引（循环）
		const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
		const prevTabElement = tabs[prevIndex];
		const prevName = prevTabElement.dataset.tabName;

		handleTabClick(flexTabElement, prevTabElement, prevName);
	}

	/**
	 * 初始化所有 flex_tab 组件
	 */
	function initAll() {
		const flexTabs = document.querySelectorAll('flex_tab');
		flexTabs.forEach(flexTab => {
			initFlexTab(flexTab);
		});
	}

	// 页面加载完成后自动初始化
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initAll);
	}
	else {
		initAll();
	}

	// 导出 API 到全局
	window.FlexibleTabs = {
		init: initAll,
		initOne: initFlexTab,
		addTab,
		delTab,
		removeTab,
		setActiveTab,
		getAllTabNames,
		getActiveTabName,
		nextTab,
		prevTab,
	};
})();
