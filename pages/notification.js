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
chrome.storage.local.get(tag)
.then(data => {
	data = (data || {})[tag] || {};
	const title = document.querySelector('.notification .container .title');
	const message = document.querySelector('.notification .container .message');
	if (data.title) {
		title.innerText = "来自CC: " + data.title;
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