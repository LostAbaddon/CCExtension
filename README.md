# CCExtension (Claudius) - Claude Code Chrome 插件

- 版本：1.1.2
- 作者：LostAbaddon

CCExtension（插件名称：Claudius）是与 CCCore 配套的 Chrome 插件，为 Claude Code 提供跨平台的通知管理、Markdown 渲染和浏览器集成功能。

## 相关项目

- [CCCore](https://github.com/LostAbaddon/CCCore) - Node.js 核心服务，提供日志管理、提醒转发和浏览器集成

## 主要功能

### 1. 提醒管理系统
- **本地提醒显示**：使用 Chrome Notifications API 显示来自 CCCore 的提醒通知
- **提醒列表管理**：通过弹出窗口查看和管理所有待触发的提醒
- **通知回退机制**：支持在关闭浏览器通知时回退到系统原生通知
- **自动同步**：与 CCCore 保持提醒列表的实时同步

### 2. Markdown 文件渲染
- **自动渲染**：检测并自动渲染浏览器中打开的 .md 和 .markdown 文件
- **主题切换**：支持明暗主题切换
- **源码查看**：可在渲染视图和源码视图之间切换
- **浮动菜单**：提供便捷的功能控制菜单

### 3. 浏览器集成
- **远程页面打开**：支持从 CCCore 远程打开网页链接
- **通知偏好设置**：可配置是否使用浏览器通知
- **连接状态管理**：实时显示与 CCCore 的连接状态

## 安装

### 开发模式安装

1. 打开 Chrome，进入 `chrome://extensions/`
2. 打开右上角的 **开发者模式** (Developer mode)
3. 点击 **加载未封装的扩展程序** (Load unpacked)
4. 选择 `CCExtension` 文件夹

### 验证安装

1. 在扩展程序列表中找到 "CCExtension"
2. 可以在扩展程序的详情页面查看控制台输出

## 工作原理

### 连接流程

```
1. Chrome 启动 → 插件加载
2. 插件后台脚本尝试连接 ws://localhost:3578
3. 连接成功后发送 REGISTER 消息
4. CCCore 响应确认
5. 插件请求初始提醒列表并启动心跳
6. 通讯建立，进入正常工作状态
```

### 提醒管理流程

```
1. CCCore 发送 CREATE_NOTIFICATION 请求
2. Extension 检查通知偏好设置
   - 如果启用浏览器通知：存储到本地并设置定时器
   - 如果禁用：返回 fallback 标志，由系统原生通知处理
3. 到达触发时间时显示 Chrome 通知
4. 通知结束后自动清理本地存储
```

### Markdown 渲染流程

```
1. Content Script 检测到 .md/.markdown 文件
2. 提取页面中的 Markdown 原始内容
3. 使用 MarkUp 库解析 Markdown
4. 渲染为 HTML 并应用样式
5. 添加主题切换和源码查看等功能菜单
```

### 周期重连机制

```
1. 插件启动时尝试连接 CCCore
2. 连接失败或断开时启动周期重连定时器
3. 每 30 秒自动尝试重新连接
4. 连接成功后停止重连定时器
5. 保持心跳以维持连接状态
```

## WebSocket 消息格式

### 注册

发送（Extension→CCCore）：
```json
{
  "type": "REGISTER",
  "clientType": "extension"
}
```

### 创建通知

请求（CCCore→Extension）：
```json
{
  "type": "REQUEST",
  "messageId": "msg_123",
  "action": "CREATE_NOTIFICATION",
  "data": {
    "id": "reminder_xxx",
    "title": "提醒标题",
    "message": "提醒内容",
    "triggerTime": 1698668445000
  }
}
```

响应（Extension→CCCore）：
```json
{
  "type": "RESPONSE",
  "messageId": "msg_123",
  "data": {
    "ok": true
  }
}
```

或当禁用浏览器通知时：
```json
{
  "type": "RESPONSE",
  "messageId": "msg_123",
  "data": {
    "ok": false,
    "fallback": true
  }
}
```

### 取消通知

请求（CCCore→Extension）：
```json
{
  "type": "REQUEST",
  "messageId": "msg_124",
  "action": "CANCEL_NOTIFICATION",
  "data": "reminder_xxx"
}
```

### 提醒列表更新

请求（CCCore→Extension）：
```json
{
  "type": "REQUEST",
  "messageId": "msg_125",
  "action": "REMINDER_LIST_UPDATE",
  "data": {
    "reminders": [
      {
        "id": "reminder_xxx",
        "title": "提醒标题",
        "message": "提醒内容",
        "triggerTime": 1698668445000
      }
    ]
  }
}
```

### 查询通知偏好

请求（CCCore→Extension）：
```json
{
  "type": "REQUEST",
  "messageId": "msg_126",
  "action": "QUERY_NOTIFICATION_PREFERENCE"
}
```

响应（Extension→CCCore）：
```json
{
  "type": "RESPONSE",
  "messageId": "msg_126",
  "data": {
    "ok": true,
    "useBrowserNotification": true
  }
}
```

### 打开网页

请求（CCCore→Extension）：
```json
{
  "type": "REQUEST",
  "messageId": "msg_127",
  "action": "OPEN_PAGE",
  "data": {
    "url": "https://example.com",
    "activate": true
  }
}
```

响应（Extension→CCCore）：
```json
{
  "type": "RESPONSE",
  "messageId": "msg_127",
  "data": {
    "ok": true,
    "tabId": 1
  }
}
```

### 工具事件

请求（CCCore→Extension）：
```json
{
  "type": "REQUEST",
  "messageId": "msg_128",
  "action": "TOOL_EVENT",
  "data": {
    "event": "event_name",
    "params": {}
  }
}
```

### 心跳

发送（CCCore→Extension）：
```json
{
  "type": "PING"
}
```

响应（Extension→CCCore）：
```json
{
  "type": "PONG"
}
```

## 文件结构

```
CCExtension/
├── manifest.json              # 插件配置（Manifest V3）
├── background.js              # 后台服务脚本（Service Worker）
├── content.js                 # 内容脚本（Markdown 渲染）
├── README.md                  # 文档
├── LICENSE                    # MIT 许可证
├── components/
│   └── markup.js              # Markdown 解析库
├── pages/
│   ├── popup.html             # 弹出窗口（提醒列表）
│   ├── popup.js               # 弹出窗口脚本
│   ├── settings.html          # 设置页面
│   ├── settings.js            # 设置页面脚本
│   ├── reminders.html         # 提醒管理页面
│   ├── reminders.js           # 提醒管理脚本
│   ├── notification.html      # 通知页面
│   └── notification.js        # 通知脚本
├── style/
│   ├── main.css               # Markdown 渲染样式
│   └── popup.css              # 弹出窗口样式
└── icons/
    ├── icon-16.png            # 16x16 图标
    ├── icon-48.png            # 48x48 图标
    └── icon-128.png           # 128x128 图标
```

## 配置

### 后台服务配置

在 `background.js` 中修改 `CONFIG` 对象：

```javascript
const CONFIG = {
  ccCoreWsUrl: 'ws://localhost:3578',    // CCCore WebSocket 地址
  reconnectInterval: 30000,              // 周期重连间隔（毫秒，默认 30 秒）
};
```

### 用户偏好设置

用户可以通过设置页面配置：
- **浏览器通知开关**：控制是否使用 Chrome 通知 API 显示提醒
  - 开启：使用浏览器通知（默认）
  - 关闭：回退到系统原生通知

设置保存在 Chrome 的 `storage.local` 中，重启浏览器后保持。

## 使用指南

### 查看提醒列表
1. 点击浏览器工具栏中的 Claudius 图标
2. 弹出窗口会显示所有待触发的提醒
3. 每个提醒显示标题和剩余时间

### 打开设置页面
1. 点击 Claudius 图标
2. 在弹出窗口中点击"设置"按钮
3. 可以查看连接状态和配置通知偏好

### 使用 Markdown 渲染
1. 在浏览器中打开任意 .md 或 .markdown 文件
2. 插件自动检测并渲染文件内容
3. 使用浮动菜单切换主题或查看源码
4. 支持的功能：
   - 明暗主题切换
   - 查看原始 Markdown 源码
   - 响应式布局

## 故障排查

### 插件无法连接到 CCCore

1. **检查 CCCore 是否运行**
   ```bash
   ps aux | grep daemon.js
   ```

2. **检查 WebSocket 端口是否开放**
   ```bash
   netstat -an | grep 3578
   # 或在 Linux 上
   ss -tlnp | grep 3578
   ```

3. **查看插件日志**
   - 打开 `chrome://extensions/`
   - 找到 Claudius，点击"详情"
   - 点击"Service Worker"查看控制台日志
   - 查找连接错误或 WebSocket 状态信息

4. **检查防火墙设置**
   - 确保本地端口 3578 未被防火墙阻止
   - macOS：系统设置 → 网络 → 防火墙
   - Windows：Windows Defender 防火墙设置

### 通知无法显示

1. **检查通知偏好设置**
   - 打开插件设置页面
   - 确认"使用浏览器通知"开关状态
   - 如果关闭，提醒会回退到系统原生通知

2. **检查浏览器通知权限**
   - 打开 `chrome://settings/content/notifications`
   - 确保 Chrome 有通知权限
   - 检查 Claudius 是否在允许列表中

3. **检查系统通知设置**
   - macOS：系统设置 → 通知 → Google Chrome
   - Windows：设置 → 系统 → 通知 → Google Chrome
   - Linux：检查通知守护程序（如 dunst、notify-osd）

4. **检查本地存储**
   - 打开 `chrome://extensions/`
   - 找到 Claudius，点击"详情"
   - 在 Service Worker 控制台中运行：
     ```javascript
     chrome.storage.local.get(['remindersList', 'useBrowserNotification'], console.log)
     ```

### Markdown 渲染不工作

1. **检查文件扩展名**
   - 确保文件以 .md 或 .markdown 结尾
   - 某些服务器可能返回错误的 MIME 类型

2. **检查内容脚本注入**
   - 打开 .md 文件
   - 按 F12 打开开发者工具
   - 在 Console 中查找 `[CCExtension]` 相关日志
   - 确认 `markup.js` 和 `content.js` 已加载

3. **查看样式加载**
   - 检查 `style/main.css` 是否正确加载
   - 在开发者工具的 Network 标签中查看资源加载情况

4. **检查 MarkUp 库**
   - 在控制台中检查 `typeof MarkUp`，应返回 `"object"`
   - 如果返回 `"undefined"`，表示 MarkUp 库未正确加载

## 技术栈

- **Chrome Extension Manifest V3**：使用最新的扩展规范
- **Service Worker**：后台处理和 WebSocket 连接
- **Content Scripts**：页面内容注入和 Markdown 渲染
- **Chrome Storage API**：持久化提醒列表和用户偏好
- **Chrome Notifications API**：原生浏览器通知
- **WebSocket**：与 CCCore 的实时双向通信
- **MarkUp.js**：自定义 Markdown 解析库

## Chrome 扩展 API 参考

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Service Workers in Extensions](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [Notifications API](https://developer.chrome.com/docs/extensions/reference/notifications/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 开发提示

### 查看 Service Worker 日志

1. 打开 `chrome://extensions/`
2. 找到 Claudius，点击"详情"
3. 点击"Service Worker" - 打开新的开发者工具窗口
4. 查看 Console 输出和网络请求

### 查看内容脚本日志

1. 打开一个 .md 文件
2. 按 F12 打开开发者工具
3. 在 Console 标签中查找 `[CCExtension]` 前缀的日志
4. 可以看到 Markdown 渲染的详细过程

### 实时刷新插件

方法 1 - 在扩展页面刷新：
1. 打开 `chrome://extensions/`
2. 找到 Claudius
3. 点击刷新图标

方法 2 - 在控制台运行：
```javascript
chrome.runtime.reload();
```

### 测试 WebSocket 连接

在浏览器控制台运行：
```javascript
const ws = new WebSocket('ws://localhost:3578');
ws.onopen = () => {
  console.log('已连接');
  ws.send(JSON.stringify({ type: 'REGISTER', clientType: 'test' }));
};
ws.onmessage = (e) => console.log('收到:', JSON.parse(e.data));
ws.onerror = (e) => console.error('错误:', e);
ws.onclose = () => console.log('连接关闭');
```

### 调试 Markdown 渲染

在渲染后的 Markdown 页面控制台中：
```javascript
// 查看 MarkUp 库是否加载
console.log('MarkUp loaded:', typeof MarkUp);

// 查看原始内容
console.log('Original content:', originalMarkdownContent);

// 查看主题状态
console.log('Theme:', document.body.classList.contains('dark-theme') ? 'dark' : 'light');

// 查看源码模式状态
console.log('Source mode:', isShowingSource);
```

### 测试提醒功能

在 Service Worker 控制台中：
```javascript
// 查看当前提醒列表
chrome.storage.local.get(['remindersList', 'useBrowserNotification'], console.log);

// 清除所有提醒
chrome.storage.local.set({ remindersList: [] });

// 查看通知偏好
chrome.storage.local.get('useBrowserNotification', (result) => {
  console.log('Browser notification enabled:', result.useBrowserNotification);
});

// 手动创建测试提醒
handleCreateNotification({
  id: 'test_' + Date.now(),
  title: '测试提醒',
  message: '这是一条测试消息',
  triggerTime: Date.now() + 5000  // 5秒后触发
});
```

## 许可证

[MIT](./LICENSE)
