/**
 * CCExtension Console 页面脚本
 */

// 初始化主题切换
ThemeToggle.init();

// 设置按钮点击事件
document.addEventListener('DOMContentLoaded', () => {
	const settingsBtn = document.getElementById('settings-btn');
	if (settingsBtn)
	{
		settingsBtn.addEventListener('click', () => {
			window.location.href = './settings.html';
		});
	}
});
