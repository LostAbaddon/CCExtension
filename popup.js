/**
 * CCExtension Popup 脚本
 */

// 更新连接状态
async function updateStatus() {
  const statusDiv = document.getElementById('status');
  const connectionStatus = document.getElementById('connectionStatus');

  // 尝试从 background 获取状态
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_STATUS',
    });

    if (response && response.connected) {
      statusDiv.className = 'status connected';
      statusDiv.textContent = '已连接到 CCCore';
      connectionStatus.textContent = `已连接 (${response.connectionTime}ms)`;
    } else {
      statusDiv.className = 'status disconnected';
      statusDiv.textContent = '未连接';
      connectionStatus.textContent = '等待连接...';
    }
  } catch (error) {
    statusDiv.className = 'status disconnected';
    statusDiv.textContent = '未连接';
    connectionStatus.textContent = '后台进程未响应';
  }
}

// 更新当前标签页信息
async function updateCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const tab = tabs[0];
      const url = new URL(tab.url);
      document.getElementById('currentTab').textContent = `${tab.title}\n${url.hostname}`;
    }
  } catch (error) {
    document.getElementById('currentTab').textContent = '无法获取信息';
  }
}

// 重新连接按钮
document.getElementById('reconnectBtn').addEventListener('click', async () => {
  try {
    await chrome.runtime.sendMessage({
      type: 'RECONNECT',
    });
    updateStatus();
  } catch (error) {
    console.error('重连失败:', error);
  }
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  updateStatus();
  updateCurrentTab();

  // 定期更新状态
  setInterval(() => {
    updateStatus();
  }, 2000);
});
