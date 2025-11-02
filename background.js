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

/**
 * 连接到 CCCore
 */
function connectToCCCore() {
  if (isConnecting || wsConnection?.readyState === WebSocket.OPEN) {
    return;
  }

  isConnecting = true;
  console.log('[Claude Code Extension] 正在连接到 Claude Code Core...');

  try {
    wsConnection = new WebSocket(CONFIG.ccCoreWsUrl);

    wsConnection.addEventListener('open', () => {
      console.log('[Claude Code Extension] 已连接到 Claude Code Core');
      isConnecting = false;

      // 清除重连定时器（连接成功）
      stopReconnectTimer();

      // 发送注册消息
      sendMessage({
        type: 'REGISTER',
        clientType: 'extension',
      });

      // 启动定期心跳
      startHeartbeat();
    });

    wsConnection.addEventListener('message', (event) => {
      handleMessage(JSON.parse(event.data));
    });

    wsConnection.addEventListener('close', () => {
      console.log('[Claude Code Extension] 已断开连接');
      isConnecting = false;
      wsConnection = null;
      attemptReconnect();
    });

    wsConnection.addEventListener('error', (error) => {
      console.error('[Claude Code Extension] WebSocket 错误:', error);
      isConnecting = false;
      attemptReconnect();
    });
  } catch (error) {
    console.error('[Claude Code Extension] 连接失败:', error.message);
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
    console.log('[Claude Code Extension] 已停止周期重连');
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

  console.log(`[Claude Code Extension] 启动 30 秒周期重连，每 ${CONFIG.reconnectInterval}ms 尝试一次`);

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
    console.warn('[Claude Code Extension] WebSocket 未连接，无法发送消息');
    return false;
  }

  try {
    wsConnection.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('[Claude Code Extension] 发送消息失败:', error.message);
    return false;
  }
}
/**
 * 处理来自 Claude Code Core 的消息
 */
function handleMessage(message) {
  console.log('[Claude Code Extension] 收到消息:', message);

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

      case 'OPEN_PAGE':
        result = await handleOpenPage(data);
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
    console.error('[Claude Code Extension] 处理请求失败:', error.message);
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
  const { title, message, triggerTime } = data;

  // 计算延迟时间
  const now = Date.now();
  const delay = Math.max(0, triggerTime - now);

  console.log(`[Claude Code Extension] 创建通知: "${title}", 延迟 ${delay}ms`);
  return showNotification(title, message, delay);
}
/**
 * 显示通知
 */
async function showNotification(title, message, delay) {
  try {
    const notificationId = `notification_${Date.now()}`;

    setTimeout(() => {
      console.log(`[Claude Code Extension] 通知已显示: ${notificationId}`);
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/cyprite.png',
        title: title,
        message: message,
        requireInteraction: true,
      });
    }, delay);
    return { ok: true, status: 'displayed', notificationId };
  }
  catch (error) {
    console.error('[Claude Code Extension] 显示通知失败:', error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * 打开网页
 */
async function handleOpenPage(data) {
  const { url, activate } = data;

  console.log(`[Claude Code Extension] 打开网页: ${url} (激活: ${activate})`);

  try {
    // 尝试在已打开的标签页中查找该 URL
    const tabs = await chrome.tabs.query({ url: url });

    let targetTab;
    if (tabs.length > 0) {
      // 标签页已存在，激活它
      targetTab = tabs[0];
      await chrome.tabs.update(targetTab.id, { active: activate });
    } else {
      // 创建新标签页
      targetTab = await chrome.tabs.create({ url: url, active: activate });
    }

    // 如果需要激活，还要激活窗口
    if (activate && targetTab.windowId) {
      await chrome.windows.update(targetTab.windowId, { focused: true });
    }

    return { ok: true, status: 'opened', tabId: targetTab.id };
  } catch (error) {
    console.error('[Claude Code Extension] 打开网页失败:', error.message);
    return { ok: false, error: error.message };
  }
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
 * 监听 alarm 事件（用于延迟通知）
 */
if (chrome.notifications) {
  chrome.notifications.onClosed.addListener((notifyName) => {
    if (notifyName.startsWith('notification_')) {
      console.log(`[Claude Code Extension] Notification triggered: ${notifyName}`);
    }
  });
}
else {
  console.warn('[Claude Code Extension] chrome.notifications API 不可用');
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
  console.log('[Claude Code Extension] 页面信息已发送:', pageInfo);
}

/**
 * 初始化
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Claude Code Extension] 插件已安装');
  connectToCCCore();
});

// 初始化日志
console.log('[Claude Code Extension] Background Service Worker 已加载');
console.log('[Claude Code Extension] 可用的 API:');
console.log('  - chrome.notifications:', !!chrome.notifications);
console.log('  - chrome.tabs:', !!chrome.tabs);
console.log('  - chrome.notifications:', !!chrome.notifications);
console.log('  - chrome.windows:', !!chrome.windows);
console.log('  - chrome.runtime:', !!chrome.runtime);

// 启动时连接
connectToCCCore();
