/**
 * Claude Code Extension Background Service Worker
 * 处理与 Claude Code Core 的 WebSocket 连接和通知
 */

// 配置
const CONFIG = {
	ccCoreWsUrl: 'ws://localhost:3578',
	reconnectInterval: 30000, // 30秒周期重连
};

// 全局状态
let wsConnection = null;
let reconnectTimer = null; // 周期重连定时器
let isConnecting = false;
let useBrowserNotification = true; // 是否使用浏览器通知
let localRemindersList = []; // 本地提醒列表副本
let localReminderTimers = {};
let isBrowserFocused = true; // 浏览器窗口是否获得焦点

/**
 * 初始化通知偏好设置
 */
async function initNotificationPreference() {
	try {
		const result = await chrome.storage.local.get('useBrowserNotification');
		if (result.useBrowserNotification !== undefined) {
			useBrowserNotification = result.useBrowserNotification;
			console.log('[Claudius] 已加载通知偏好:', { useBrowserNotification });
		}
		else {
			// 如果未设置过，使用默认值 true
			useBrowserNotification = true;
			await chrome.storage.local.set({ useBrowserNotification });
			console.log('[Claudius] 已初始化通知偏好为默认值: true');
		}
	}
	catch (error) {
		console.error('[Claudius] 初始化通知偏好失败:', error.message);
	}
}

/**
 * 连接到 CCCore
 */
function connectToCCCore() {
	if (isConnecting || wsConnection?.readyState === WebSocket.OPEN) {
		return;
	}

	isConnecting = true;
	console.log('[Claudius] 正在连接到 Claude Code Core...');

	try {
		wsConnection = new WebSocket(CONFIG.ccCoreWsUrl);

		wsConnection.addEventListener('open', () => {
			console.log('[Claudius] 已连接到 Claude Code Core');
			isConnecting = false;

			// 清除重连定时器（连接成功）
			stopReconnectTimer();

			// 发送注册消息
			sendMessage({
				type: 'REGISTER',
				clientType: 'extension',
			});

			// 连接后获取初始提醒列表
			fetchInitialRemindersList();

			// 启动定期心跳
			startHeartbeat();
		});

		wsConnection.addEventListener('message', (event) => {
			handleMessage(JSON.parse(event.data));
		});

		wsConnection.addEventListener('close', () => {
			console.log('[Claudius] 已断开连接');
			isConnecting = false;
			wsConnection = null;
			attemptReconnect();
		});

		wsConnection.addEventListener('error', (error) => {
			console.error('[Claudius] WebSocket 错误:', error);
			isConnecting = false;
			attemptReconnect();
		});
	}
	catch (error) {
		console.error('[Claudius] 连接失败:', error.message);
		isConnecting = false;
		attemptReconnect();
	}
}
/**
 * 清除重连定时器
 */
function stopReconnectTimer() {
	if (reconnectTimer !== null) {
		clearInterval(reconnectTimer);
		reconnectTimer = null;
		console.log('[Claudius] 已停止周期重连');
	}
}
/**
 * 启动周期重连
 */
function startReconnectTimer() {
	// 如果已有重连定时器，不再创建
	if (reconnectTimer !== null) {
		return;
	}

	console.log(`[Claudius] 启动 30 秒周期重连，每 ${CONFIG.reconnectInterval}ms 尝试一次`);

	reconnectTimer = setInterval(() => {
		if (!isConnecting && (!wsConnection || wsConnection.readyState !== WebSocket.OPEN)) {
			console.log('[Claude Code Extension] 执行周期重连尝试...');
			connectToCCCore();
		}
	}, CONFIG.reconnectInterval);
}
/**
 * 尝试重新连接
 */
function attemptReconnect() {
	// 启动周期重连（如果还没有启动）
	startReconnectTimer();
}

/**
 * 发送消息到 Claude Code Core
 */
function sendMessage(message) {
	if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
		console.warn('[Claudius] WebSocket 未连接，无法发送消息');
		return false;
	}

	try {
		wsConnection.send(JSON.stringify(message));
		return true;
	}
	catch (error) {
		console.error('[Claudius] 发送消息失败:', error.message);
		return false;
	}
}
/**
 * 处理来自 Claude Code Core 的消息
 */
function handleMessage(message) {
	console.log('[Claudius] 收到消息:', message);

	const { type, action, data, messageId } = message;

	// 处理心跳
	if (type === 'PING') {
		sendMessage({ type: 'PONG' });
		return;
	}

	// 处理请求
	if (type === 'REQUEST') {
		handleRequest(action, data, messageId);
		return;
	}

	// 处理响应
	if (type === 'RESPONSE') {
		// 可选：处理响应确认
		return;
	}
}

/**
 * 处理请求
 */
async function handleRequest(action, data, messageId) {
	try {
		let result;

		switch (action) {
			case 'CREATE_NOTIFICATION':
				result = await handleCreateNotification(data);
				break;

			case 'CANCEL_NOTIFICATION':
				result = await handleCancelNotification(data);
				break;

			case 'REMINDER_LIST_UPDATE':
				result = handleReminderListUpdate(data);
				break;

			case 'QUERY_NOTIFICATION_PREFERENCE':
				result = handleQueryNotificationPreference();
				break;

			case 'OPEN_PAGE':
				result = await handleOpenPage(data);
				break;

			case 'TOOL_EVENT':
				result = handleToolEvent(data);
				break;

			case 'USER_INPUT_EVENT':
				result = handleUserInputEvent(data);
				break;

			case 'STOP_REMINDER_CONFIG_UPDATE':
				result = handleStopReminderConfigUpdate(data);
				break;

			case 'CHECK_REMINDER_NEEDED':
				result = await handleCheckReminderNeeded(data);
				break;

			default:
				result = { ok: false, error: `未知的操作: ${action}` };
		}

		// 发送响应
		sendMessage({
			type: 'RESPONSE',
			messageId: messageId,
			data: result,
		});
	}
	catch (error) {
		console.error('[Claudius] 处理请求失败:', error.message);
		sendMessage({
			type: 'RESPONSE',
			messageId: messageId,
			data: { ok: false, error: error.message },
		});
	}
}

/**
 * 创建通知
 */
async function handleCreateNotification(data) {
	const { title, message, triggerTime, id, sessionId } = data;

	// 检查是否使用浏览器通知
	if (!useBrowserNotification) {
		console.log(`[Notification] 通知(${id})回退到系统原生通知`);
		return {
			ok: false,
			fallback: true,
		};
	}

	// 检查用户是否离开浏览器
	if (!isBrowserFocused) {
		console.log(`[Notification] 用户已离开浏览器,通知(${id})回退到系统原生通知`);
		return {
			ok: false,
			fallback: true,
		};
	}

	const storage = await chrome.storage.local.get('remindersList');
	const now = Date.now();
	let list = storage.remindersList || [];
	list = list.filter(item => item.triggerTime > now);
	list.push(data);
	localRemindersList = list;
	storage.remindersList = list;
	chrome.storage.local.set(storage);

	// 计算延迟时间
	const delay = Math.max(0, triggerTime - now);

	console.log(`[Notification] 创建通知(${id}): "${title}", 延迟 ${delay}ms, sessionId: ${sessionId}`);
	return showNotification(id, title, message, delay, sessionId);
}
/**
 * 取消通知
 */
async function handleCancelNotification(id) {
	const timer = localReminderTimers[id];
	if (timer) clearTimeout(timer);

	const storage = await chrome.storage.local.get('remindersList');
	const now = Date.now();
	let list = storage.remindersList || [];
	list = list.filter(item => item.triggerTime > now);
	list = list.filter(item => item.id !== id);
	localRemindersList = list;
	storage.remindersList = list;
	chrome.storage.local.set(storage);
}
/**
 * 显示通知
 */
function showNotification(id, title, message, delay, sessionId) {
	const timer = setTimeout(async () => {
		clearTimeout(timer);
		delete localReminderTimers[id];

		const storage = await chrome.storage.local.get('remindersList');
		const now = Date.now();
		let list = storage.remindersList || [];
		const rawCount = list.length;
		list = list.filter(item => item.id !== id);
		const newCount = list.length;
		list = list.filter(item => item.triggerTime > now);
		if (list.length !== rawCount) {
			storage.remindersList = list;
			chrome.storage.local.set(storage);
		}
		if (newCount === rawCount) return;

		const tag = 'reminder_' + id;
		const reminder = {};
		reminder[tag] = { title, message, sessionId }
		chrome.storage.local.set(reminder).then(() => {
			chrome.action.setPopup({
				popup: `pages/notification.html?id=${id}`,
			}).then(() => {
				chrome.action.openPopup();
			}).catch(err => {
				console.error(`[Notification] 提醒失败\n`, err);
			}).finally(() => {
				chrome.action.setPopup({ popup: `pages/popup.html` });
			});
		});

		console.log(`[Notification] 显示通知: ${id}`);
		chrome.notifications.create(id, {
			type: 'basic',
			iconUrl: 'icons/icon-128.png',
			title: title,
			message: message,
			requireInteraction: true,
		}).catch(err => {
			console.error(`[Notification] 提醒失败\n`, err);
		});
	}, delay);
	localReminderTimers[id] = timer;
	return { ok: true, status: 'displayed', id };
}
/**
 * 处理提醒列表更新
 */
function handleReminderListUpdate(data) {
	const { reminders, count } = data;

	console.log('[Reminder] 收到提醒列表更新:', { count });

	// 更新本地副本
	localRemindersList = reminders || [];

	// 存储到 chrome storage 用于 reminders 页面访问
	chrome.storage.local.set({
		remindersList: localRemindersList,
		lastUpdateTime: Date.now(),
	}, () => {
		console.log('[Reminder] 提醒列表已保存到 storage');
	});

	return { ok: true, status: 'updated', count };
}

/**
 * 打开网页
 */
async function handleOpenPage(data) {
	const { url, activate } = data;

	console.log(`[Browser] 打开网页: ${url} (激活: ${activate})`);

	try {
		// 尝试在已打开的标签页中查找该 URL
		const tabs = await chrome.tabs.query({ url: url });

		let targetTab;
		if (tabs.length > 0) {
			// 标签页已存在，激活它
			targetTab = tabs[0];
			await chrome.tabs.update(targetTab.id, { active: activate });
		}
		else {
			// 创建新标签页
			targetTab = await chrome.tabs.create({ url: url, active: activate });
		}

		// 如果需要激活，还要激活窗口
		if (activate && targetTab.windowId) {
			await chrome.windows.update(targetTab.windowId, { focused: true });
		}

		return { ok: true, status: 'opened', tabId: targetTab.id };
	}
	catch (error) {
		console.error('[Browser] 打开网页失败:', error.message);
		return { ok: false, error: error.message };
	}
}

/**
 * 处理通知偏好查询
 */
function handleQueryNotificationPreference() {
	console.log('[Notification] 返回通知偏好:', { useBrowserNotification });
	return {
		ok: true,
		useBrowserNotification,
		message: useBrowserNotification ? '使用浏览器通知' : '使用本地系统通知',
	};
}
/**
 * 设置通知偏好
 */
function setNotificationPreference(useChrome) {
	useBrowserNotification = useChrome;
	console.log('[Notification] 通知偏好已更新:', { useBrowserNotification });

	chrome.storage.local.set({
		useBrowserNotification,
	}, () => {
		console.log('[Notification] 通知偏好已保存');
	});
}

/**
 * 处理 stop-reminder 配置更新
 */
function handleStopReminderConfigUpdate(data) {
	const { enabled, delay } = data;
	console.log('[Claudius] Stop-reminder 配置已更新:', { enabled, delay });

	// 可以在这里添加额外的处理逻辑
	// 目前只记录日志即可

	return { ok: true, message: '配置已更新' };
}

/**
 * 检查是否需要发送提醒
 * 如果浏览器已聚焦且当前标签页匹配任务的 sessionId，则不需要发送提醒
 * 返回数据中，available 表示是否可以前端完成通知，needed 表示是否需要后端完成通知
 */
async function handleCheckReminderNeeded(data) {
	const { sessionId } = data;

	// 如果没有 sessionId，需要发送提醒
	if (!sessionId) {
		console.log('[FocusStatus] 没有 sessionId，所以是定时提醒事件');
		return { ok: true, available: isBrowserFocused, needed: true };
	}

	// 检查浏览器是否聚焦
	if (!isBrowserFocused) {
		console.log('[FocusStatus] 浏览器未聚焦，需要发送提醒');
		return { ok: true, available: false, needed: true };
	}

	// 查找 console.html 标签页
	const consoleURL = chrome.runtime.getURL('pages/console.html');
	const tabs = await findTabsByUrl(consoleURL);
	if (!tabs || tabs.length === 0) {
		console.log('[FocusStatus] 没有找到 console.html 页面，需要发送提醒');
		return { ok: true, available: true, needed: false };
	}

	// 向所有 console.html 页面查询 sessionId 对应的标签页
	const sidResult = (await Promise.all(tabs.map(async tab => {
		try {
			const response = await chrome.tabs.sendMessage(tab.id, {
				event: 'query_session_tab',
				data: { sessionId }
			});
			console.log(tab, response, tab.active);
			return { tabId: tab.id, isActive: tab.active, ...response };
		}
		catch (error) {
			console.error('[FocusStatus] 查询标签页失败:', error);
			return null;
		}
	}))).find(r => r && r.found);
	if (!sidResult) {
		// 该 sessionId 不属于任何打开的标签页，则可能是命令行任务，需要后台发送提醒
		console.log(`[FocusStatus] sessionId ${sessionId} 不属于任何打开的标签页，需要发送提醒`);
		return { ok: true, available: false, needed: true };
	}

	// 检查该标签页是否激活
	if (!sidResult.isActive) {
		// 标签页存在但未激活，需要发送提醒
		console.log(`[FocusStatus] sessionId ${sessionId} 对应的标签页未激活，需要发送提醒`);
		return { ok: true, available: true, needed: false };
	}

	// 浏览器已聚焦，且当前标签页匹配任务的 sessionId，不需要发送提醒
	console.log(`[FocusStatus] 浏览器已聚焦且当前标签页匹配 sessionId ${sessionId}，不需要发送提醒`);
	return { ok: true, available: false, needed: false };
}

/**
 * 处理工具使用事件
 */
async function handleToolEvent(data) {
	const { sessionId, toolName, eventType, timestamp } = data;
	console.log(`[Claudius] 工具事件: ${toolName} - ${eventType} (Session: ${sessionId})`);

	const tabs = await findTabsByUrl('chrome-extension://mknfpdalpbjjlhkdajnaamomibdhjkdb/pages/console.html');
	if (!tabs || !tabs.length) return;
	await Promise.all(tabs.map(async tab => {
		await chrome.tabs.sendMessage(tab.id, {
			event: 'tool_use',
			type: eventType,
			data: { sessionId, toolName }
		});
	}));

	return {ok: true, message: "已接受"}
}

/**
 * 处理用户输入事件
 */
async function handleUserInputEvent(data) {
	const { sessionId, content } = data;
	console.log(`[Claudius] 用户输入事件: ${content} (Session: ${sessionId})`);

	const tabs = await findTabsByUrl('chrome-extension://mknfpdalpbjjlhkdajnaamomibdhjkdb/pages/console.html');
	if (!tabs || !tabs.length) return;
	await Promise.all(tabs.map(async tab => {
		await chrome.tabs.sendMessage(tab.id, {
			event: 'user_input',
			data: { sessionId, content }
		});
	}));

	return {ok: true, message: "已接受"}
}

/**
 * 启动心跳
 */
function startHeartbeat() {
	setInterval(() => {
		if (wsConnection?.readyState === WebSocket.OPEN) {
			sendMessage({ type: 'PING' });
		}
	}, 30000);
}

/**
 * 净化文件名，移除或替换不合法字符
 * @param {string} filename - 原始文件名
 * @returns {string} - 净化后的文件名
 */
function sanitizeFilename(filename) {
	if (!filename) return 'document';

	// 分离文件名和扩展名
	const lastDotIndex = filename.lastIndexOf('.');
	let name, ext;
	if (lastDotIndex > 0) {
		name = filename.substring(0, lastDotIndex);
		ext = filename.substring(lastDotIndex);
	}
	else {
		name = filename;
		ext = '';
	}

	// 净化文件名部分
	let sanitized = name
		.replace(/[<>:"/\\|?*]/g, '')  // 移除 Windows 禁止的字符
		.replace(/[\x00-\x1f\x7f]/g, '')  // 移除控制字符
		.replace(/\s+/g, ' ')  // 将连续空格替换为单个空格
		.trim()  // 移除首尾空格
		.replace(/^\.+|\.+$/g, '');  // 移除首尾的点号

	// 如果净化后为空，使用默认名称
	if (!sanitized) {
		sanitized = 'document';
	}

	// 限制文件名长度（避免过长的文件名）
	if (sanitized.length > 200) {
		sanitized = sanitized.substring(0, 200);
	}

	return sanitized + ext;
}

/**
 * 监听 alarm 事件（用于延迟通知）
 */
if (chrome.notifications) {
	chrome.notifications.onClosed.addListener((notifyName) => {
		if (notifyName.startsWith('notification_')) {
			console.log(`[Notification] Triggered: ${notifyName}`);
		}
	});
}
else {
	console.warn('[Notification] chrome.notifications API 不可用');
}

/**
 * 监听标签页变化
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
	const tab = await chrome.tabs.get(activeInfo.tabId);
	sendPageInfo(tab);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	// 只在 URL 改变时发送
	if (changeInfo.url) {
		sendPageInfo(tab);
	}
});

/**
 * 监听浏览器窗口焦点变化
 */
chrome.windows.onFocusChanged.addListener((windowId) => {
	const focused = windowId !== chrome.windows.WINDOW_ID_NONE;

	// 只在状态发生变化时更新和发送
	if (isBrowserFocused !== focused) {
		isBrowserFocused = focused;
		console.log('[Claudius] 浏览器焦点状态变化:', { focused, windowId });
		sendBrowserStateUpdate(focused);
	}
});

/**
 * 发送页面信息到 CCCore
 */
function sendPageInfo(tab) {
	if (wsConnection?.readyState !== WebSocket.OPEN) {
		return;
	}

	const pageInfo = {
		type: 'PAGE_INFO',
		data: {
			url: tab.url,
			title: tab.title,
			tabId: tab.id,
			timestamp: Date.now(),
		},
	};

	sendMessage(pageInfo);
	console.log('[Claudius] 页面信息已发送:', pageInfo);
}

/**
 * 发送浏览器窗口焦点状态到 CCCore
 */
function sendBrowserStateUpdate(focused) {
	if (wsConnection?.readyState !== WebSocket.OPEN) {
		return;
	}

	const stateInfo = {
		type: 'BROWSER_STATE_UPDATE',
		data: {
			focused: focused,
			timestamp: Date.now(),
		},
	};

	sendMessage(stateInfo);
	console.log('[Claudius] 浏览器状态已发送:', stateInfo);
}

/**
 * 从 CCCore 获取初始提醒列表
 */
function fetchInitialRemindersList() {
	// 这是一个同步操作，无需等待，直接通过 HTTP 获取会更简单
	const ccCoreHost = 'localhost';
	const ccCorePort = 3579;

	fetch(`http://${ccCoreHost}:${ccCorePort}/api/reminders`)
		.then(res => res.json())
		.then(data => {
			if (data?.ok && data?.data?.reminders) {
				localRemindersList = data.data.reminders;
				chrome.storage.local.set({
					remindersList: localRemindersList,
					lastUpdateTime: Date.now(),
				}, () => {
					console.log('[Reminder] 初始提醒列表已加载:', { count: localRemindersList.length });
				});
			}
		})
		.catch(error => {
			console.warn('[Reminder] 获取初始提醒列表失败:', error.message);
		});
}

async function findTabsByUrl(urlPattern) {
	try {
		const tabs = await chrome.tabs.query({url: urlPattern});
		return tabs;
	}
	catch (error) {
		console.error("查询失败:", error);
		return [];
	}
}

/**
 * 处理通知点击
 * @param {string} sessionId - 会话 ID
 */
async function handleNotificationClick(sessionId) {
	// 如果没有 sessionId，只打开 console.html
	if (!sessionId) {
		console.log(`[Popup] 没有 SessionID`);
		const consoleURL = chrome.runtime.getURL('pages/console.html');
		const tabs = await chrome.tabs.query({ url: consoleURL });
		if (tabs.length > 0) {
			await chrome.tabs.update(tabs[0].id, { active: true });
			await chrome.windows.update(tabs[0].windowId, { focused: true });
		}
		else {
			await chrome.tabs.create({ url: consoleURL });
		}
		return;
	}
	console.log(`[Popup] 处理通知点击, sessionId: ${sessionId}`);

	// 查找 console.html 标签页
	const consoleURL = chrome.runtime.getURL('pages/console.html');
	const tabs = await findTabsByUrl(consoleURL);
	if (!tabs || tabs.length === 0) {
		console.log(`[Popup] 没有找到 console.html 页面`);
		return;
	}

	// 向所有 console.html 页面查询 sessionId 对应的 tabId
	const sidResult = (await Promise.all(tabs.map(async tab => {
		try {
			const response = await chrome.tabs.sendMessage(tab.id, {
				event: 'query_session_tab',
				data: { sessionId }
			});
			return { tabId: tab.id, winId: tab.windowId, ...response };
		}
		catch (error) {
			console.error(`[Popup] 查询标签页失败:`, error);
			return null;
		}
	}))).find(r => r && r.found);
	if (!sidResult) {
		// 该 sessionId 不属于任何打开的标签页，不做处理
		console.log(`[Popup] sessionId ${sessionId} 不属于任何打开的标签页`);
		return;
	}

	// 切换到 console.html 页面
	console.log(`[Popup] 切换到 Console 所在的窗体与页面`, sidResult);
	await chrome.windows.update(sidResult.winId, { focused: true });
	await chrome.tabs.update(sidResult.tabId, { active: true });
	// 如果该标签页未激活，发送切换标签的消息
	if (!sidResult.isActive) {
		console.log(`[Popup] 切换到标签页: ${sidResult.tabName}`);
		await chrome.tabs.sendMessage(sidResult.tabId, {
			event: 'switch_to_tab',
			data: { tabName: sidResult.tabName }
		});
	}
}

/**
 * 初始化
 */
chrome.runtime.onInstalled.addListener(async () => {
	console.log('[Claudius] 插件已安装');
	await initNotificationPreference();
	connectToCCCore();
});

const ActionCenter = {};
ActionCenter.amountJS = async (sender, ...jsFiles) => {
	await chrome.scripting.executeScript({
		target: {tabId: sender.tab?.id},
		files: jsFiles,
	});
	return true;
};
ActionCenter.downloadFile = async (sender, fileInfo) => {
	try {
		// 直接使用 Data URL（base64 编码）
		const dataUrl = `data:${fileInfo.mimeType};base64,${fileInfo.data}`;

		// 净化文件名，移除非法字符
		const safeFilename = sanitizeFilename(fileInfo.filename);

		// 使用 chrome.downloads API 下载
		const downloadId = await chrome.downloads.download({
			url: dataUrl,
			filename: safeFilename,
			saveAs: true
		});

		console.log('[Background] 文件下载已启动, ID:', downloadId, '文件名:', safeFilename);

		return true;
	}
	catch (error) {
		console.error('[Background] 下载文件失败:', error);
		throw error;
	}
};
/**
 * 通讯事件处理
 */
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	if (request.event) {
		const callback = ActionCenter[request.event];
		if (callback) {
			const tabId = sender.tab?.id;
			const taskId = request.tid;
			try {
				const reply = await callback(sender, ...request.data);
				if (tabId) chrome.tabs.sendMessage(tabId, {
					event: "__reply_action",
					tid: taskId,
					ok: true,
					data: reply
				});
			}
			catch (err) {
				console.error(err);
				if (tabId) chrome.tabs.sendMessage(tabId, {
					event: "__reply_action",
					tid: taskId,
					ok: false,
					error: err.message || err.msg || err.data || err,
				});
			}
		}
		else {
			console.log('[ActionCenter] Missing Event Callback: ' + request.event);
		}
	}
	else if (request.type === 'LOG') {
		(console[(request.level || '').toLowerCase() || 'log'] || console.log)('[' + request.name.toUpperCase() + ']', ...request.message);
		return true;
	}
	else if (request.type === 'GET_STATUS') {
		// 返回连接状态
		sendResponse({
			connected: wsConnection?.readyState === WebSocket.OPEN,
		});
	}
	else if (request.type === 'RECONNECT') {
		// 触发重新连接
		connectToCCCore();
		sendResponse({ ok: true });
	}
	else if (request.type === 'SET_NOTIFICATION_PREFERENCE') {
		// 更新通知偏好
		setNotificationPreference(request.useBrowserNotification);
		sendResponse({ ok: true });
	}
	else if (request.type === 'HANDLE_NOTIFICATION_CLICK') {
		// 处理通知点击
		handleNotificationClick(request.sessionId);
		return true;
	}

	return false;
});

// 初始化日志
console.log('[Claudius] Background Service Worker 已加载');
console.log('[Claudius] 可用的 API:');
console.log('  - chrome.notifications:', !!chrome.notifications);
console.log('  - chrome.tabs:', !!chrome.tabs);
console.log('  - chrome.notifications:', !!chrome.notifications);
console.log('  - chrome.windows:', !!chrome.windows);
console.log('  - chrome.runtime:', !!chrome.runtime);

// 启动时初始化通知偏好和连接
(async () => {
	await initNotificationPreference();

	// 初始化浏览器焦点状态
	try {
		const currentWindow = await chrome.windows.getCurrent();
		isBrowserFocused = currentWindow.focused;
		console.log('[Claudius] 初始浏览器焦点状态:', { focused: isBrowserFocused });
	}
	catch (error) {
		console.warn('[Claudius] 获取初始焦点状态失败:', error.message);
		// 默认假设浏览器有焦点
		isBrowserFocused = true;
	}

	connectToCCCore();
})();
