const log = (level, ...message) => {
	chrome.runtime.sendMessage({
		type: 'LOG',
		name: 'Popup',
		level,
		message,
	});
};

let params = {};
(location.search || '').replace(/^\?/i, '').split('&').forEach(line => {
	line = line.split('=');
	const key = line.shift();
	if (line.length === 0) {
		params[key] = true;
	}
	else {
		params[key] = line.join('=');
	}
});

const tag = 'reminder_' + params.id;
let reminderData = null;

chrome.storage.local.get(tag)
.then(data => {
	data = (data || {})[tag] || {};
	log('info', data);
	reminderData = data;
	const title = document.querySelector('.notification .container .title');
	const message = document.querySelector('.notification .container .message');
	if (data.title) {
		title.innerText = "Claudius: " + data.title;
	}
	else {
		title.innerText = "一条来自Claude Code的通知";
	}
	if (data.message) {
		message.innerText = data.message;
	}
	else {
		message.innerText = "去Claude Code看看吧！";
	}
})
.catch(err => console.error(err));

// 监听点击事件
document.addEventListener('click', async () => {
	log('info', '点击了通知', reminderData);

	// 如果有 sessionId，通知 background 处理
	if (reminderData && reminderData.sessionId) {
		try {
			log('info', '通知 Background');
			await chrome.runtime.sendMessage({
				type: 'HANDLE_NOTIFICATION_CLICK',
				sessionId: reminderData.sessionId
			});
			log('info', 'Done');
		}
		catch (error) {
			log('info', '处理失败:', error.message || error);
		}
	}

	// 关闭 popup
	log('info', '关闭窗口');
	// window.close();
});