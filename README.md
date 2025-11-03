# CCExtension - Claude Code Chrome 插件

- 版本：1.0.1
- 作者：LostAbaddon

CCExtension 是与 CCCore 配套的 Chrome 插件，为 Claude Code 提供跨平台的通知和页面跟踪功能。

## 相关项目

- [CCCore](https://github.com/LostAbaddon/CCCore) - Node.js 核心服务，提供日志管理、提醒转发和浏览器集成

## 功能

- **统一通知**：接收来自 CCCore 的提醒，使用 Chrome Notifications API 显示
- **页面跟踪**：自动跟踪浏览器中的页面变化（URL 和标题）
- **网页打开**：支持从 CCCore 远程打开网页链接

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
4. CCCore 响应 REGISTER_ACK
5. 通讯建立，等待命令
```

### 通知流程

```
1. Skill 向 CCCore 发送提醒请求（HTTP/Socket）
2. CCCore 通过 WebSocket 转发到 Extension
3. Extension 使用 chrome.notifications API 显示通知
4. 用户点击通知或超时后关闭
```

### 页面跟踪流程

```
1. 用户切换标签页 → 插件监听 onActivated 事件
2. 页面 URL 改变 → 插件监听 onUpdated 事件
3. 插件将页面信息发送到 CCCore
4. CCCore 记录到日志中（SOURCE: Web Page）
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

响应（CCCore→Extension）：
```json
{
  "type": "REGISTER_ACK",
  "clientId": "client_xxx",
  "message": "Extension 已注册"
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
    "success": true,
    "status": "displayed",
    "notificationId": "notification_xxx"
  }
}
```

### 打开网页

请求（CCCore→Extension）：
```json
{
  "type": "REQUEST",
  "messageId": "msg_124",
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
  "messageId": "msg_124",
  "data": {
    "success": true,
    "status": "opened",
    "tabId": 1
  }
}
```

### 页面信息

发送（Extension→CCCore）：
```json
{
  "type": "PAGE_INFO",
  "data": {
    "url": "https://example.com/page",
    "title": "Example Page",
    "tabId": 1,
    "timestamp": 1698668445000
  }
}
```

### 心跳

发送（Extension→CCCore）：
```json
{
  "type": "PING"
}
```

响应（CCCore→Extension）：
```json
{
  "type": "PONG"
}
```

## 文件结构

```
CCExtension/
├── manifest.json           # 插件配置
├── background.js           # 后台服务脚本
├── popup.html              # 弹出窗口 HTML
├── popup.js                # 弹出窗口脚本
├── README.md               # 文档
└── icons/
    ├── icon-16.png         # 16x16 图标
    ├── icon-48.png         # 48x48 图标
    └── icon-128.png        # 128x128 图标
```

## 配置

在 `background.js` 中修改 `CONFIG` 对象：

```javascript
const CONFIG = {
  ccCoreWsUrl: 'ws://localhost:3578',    // CCCore WebSocket 地址
  reconnectInterval: 5000,               // 重连间隔（毫秒）
  reconnectMaxAttempts: 10,              // 最大重连次数
};
```

## 故障排查

### 插件无法连接到 CCCore

1. **检查 CCCore 是否运行**
   ```bash
   ps aux | grep daemon.js
   ```

2. **检查 WebSocket 端口是否开放**
   ```bash
   netstat -an | grep 3578
   ```

3. **查看插件日志**
   - 打开 `chrome://extensions/`
   - 找到 CCExtension，点击"详情"
   - 点击"Background Service Worker"查看控制台日志

4. **检查浏览器安全策略**
   - 某些 Chromium 版本可能限制本地 WebSocket 连接
   - 尝试使用 http://localhost:3578 作为回退

### 通知无法显示

1. **检查通知权限**
   - 在 manifest.json 中确保包含 `"notifications"` 权限

2. **检查系统通知设置**
   - macOS：系统偏好设置 → 通知
   - Windows：设置 → 系统 → 通知
   - Linux：检查通知守护程序

3. **查看 Chrome 日志**
   ```bash
   # macOS
   tail -f ~/Library/Application\ Support/Google/Chrome/Profile\ 1/LOG

   # Linux
   tail -f ~/.config/google-chrome/Default/LOG
   ```

### 页面跟踪不工作

1. **检查 tabs 权限**
   - manifest.json 中应包含 `"tabs"` 权限

2. **检查 host_permissions**
   - 应该有 `"<all_urls>"` 或特定域名

3. **查看事件监听**
   - 在后台脚本中检查 `chrome.tabs.onActivated` 和 `chrome.tabs.onUpdated` 是否正确注册

## Chrome 扩展 API 参考

- [Notifications API](https://developer.chrome.com/docs/extensions/reference/notifications/)
- [Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/)
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 开发提示

### 查看后台脚本日志

1. 打开 `chrome://extensions/`
2. 找到 CCExtension，点击"详情"
3. 点击"Background Service Worker" - 打开新的开发者工具窗口

### 实时刷新插件

```javascript
// 在控制台中运行
chrome.runtime.reload();
```

### 测试 WebSocket 连接

```javascript
// 在浏览器控制台运行
const ws = new WebSocket('ws://localhost:3578');
ws.onopen = () => console.log('已连接');
ws.onmessage = (e) => console.log('收到:', e.data);
ws.onerror = (e) => console.error('错误:', e);
```

## 许可证

[MIT](./LICENSE)
