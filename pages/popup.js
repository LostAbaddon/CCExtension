/**
 * Claude Code Extension Popup
 * 自动打开设置页面
 */

// 打开设置页面
chrome.tabs.create({
	url: chrome.runtime.getURL('pages/settings.html')
});

// 关闭 popup
window.close();
