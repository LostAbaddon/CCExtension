/**
 * Claude Code Extension Popup
 * 自动打开设置页面
 */

// 目标页面的 URL
const targetURL = chrome.runtime.getURL('pages/settings.html');

// 查询所有标签页，查找是否已存在 settings.html 页面
console.log('CHROME.TABS    9');
chrome.tabs.query({}, (tabs) => {
	// 查找已存在的 settings 页面
	const existingTab = tabs.find(tab => tab.url === targetURL);

	// 如果存在，激活该页面
	if (existingTab) {
		console.log('CHROME.TABS    10');
		chrome.tabs.update(existingTab.id, { active: true });
		// 将该页面所在窗口也激活
		console.log('CHROME.WINDOWS    2');
		chrome.windows.update(existingTab.windowId, { focused: true });
	}
	// 如果不存在，新建页面
	else {
		console.log('CHROME.TABS    11');
		chrome.tabs.create({ url: targetURL });
	}

	// 关闭 popup
	window.close();
});
