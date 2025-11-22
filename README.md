# CCExtension (Claudius) - Claude Code Chrome 插件

- 版本：1.1.5
- 作者：LostAbaddon

CCExtension（插件名称：Claudius）是与 CCCore 配套的 Chrome 插件，为 Claude Code 提供跨平台的通知管理、Markdown 渲染、语音交互和浏览器集成功能。

## 相关项目

- [CCCore](https://github.com/LostAbaddon/CCCore) - Node.js 核心服务，提供日志管理、提醒转发和浏览器集成

## 主要功能

### 1. 控制台界面（Console）
- **多标签页管理**：支持在同一窗口中管理多个 Claude Code 对话会话
- **标签页持久化**：自动保存标签页状态，关闭后重新打开会恢复之前的对话
- **标签页导航**：支持键盘快捷键快速切换标签页
- **工作目录管理**：每个标签页可以设置独立的工作目录
- **消息历史管理**：自动保存和恢复对话历史
- **消息状态展示**：实时显示消息发送状态和 AI 响应状态
- **消息悬浮操作**：鼠标悬停在消息上时显示操作按钮（复制、删除等）
- **AI 工作状态提示**：实时显示 Claude Code 的工作状态（思考中、执行中等）
- **工具使用可视化**：清晰展示 AI 使用的工具及其参数和结果

### 2. 语音交互系统
- **语音输入**：支持语音识别将语音转为文字
- **双模式识别**：
  - 短按：单次语音识别
  - 长按：持续语音识别，松开后停止
- **语音命令**：支持特定语音指令控制 Claude Code
  - “提交”：自动提交当前识别的文本
  - 更多命令持续扩展中
- **智能文本插入**：识别结果自动插入光标位置或替换选中文本
- **实时反馈**：录音过程中实时显示状态

### 3. 提醒管理系统
- **本地提醒显示**：使用 Chrome Notifications API 显示来自 CCCore 的提醒通知
- **提醒列表管理**：通过弹出窗口查看和管理所有待触发的提醒
- **提醒关联会话**：提醒可以关联到特定的对话会话，点击通知自动跳转
- **通知回退机制**：支持在关闭浏览器通知时回退到系统原生通知
- **自动同步**：与 CCCore 保持提醒列表的实时同步

### 4. Markdown 文件渲染
- **自动渲染**：检测并自动渲染浏览器中打开的 .md 和 .markdown 文件
- **主题切换**：支持明暗主题切换，设置会持久化保存
- **源码查看**：可在渲染视图和源码视图之间切换
- **浮动菜单**：提供便捷的功能控制菜单
- **相对路径解析**：支持 Markdown 中的相对路径链接
- **代码高亮**：自动高亮代码块

### 5. 本地目录浏览
- **目录展示**：在浏览器中直接浏览本地文件系统（file:// 协议）
- **文件列表**：清晰展示目录中的文件和子目录
- **路径导航**：支持点击路径快速跳转
- **文件预览**：点击文件直接在浏览器中打开

### 6. 浏览器集成
- **远程页面打开**：支持从 CCCore 远程打开网页链接
- **通知偏好设置**：可配置是否使用浏览器通知
- **连接状态管理**：实时显示与 CCCore 的连接状态
- **主题持久化**：主题设置在所有页面间同步

## 安装

### 开发模式安装

1. 打开 Chrome，进入 `chrome://extensions/`
2. 打开右上角的 **开发者模式** (Developer mode)
3. 点击 **加载未封装的扩展程序** (Load unpacked)
4. 选择 `CCExtension` 文件夹

### 验证安装

1. 在扩展程序列表中找到 "Claudius"
2. 可以在扩展程序的详情页面查看控制台输出
3. 点击工具栏中的 Claudius 图标打开控制台

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

### 控制台工作流程

```
1. 用户打开控制台页面
2. 加载已保存的标签页和对话历史
3. 用户在输入框中输入或语音输入消息
4. 消息通过 WebSocket 发送到 CCCore
5. CCCore 转发到 Claude Code 处理
6. Claude Code 返回响应和工具使用信息
7. 控制台实时显示 AI 的工作状态和结果
8. 对话历史自动保存到本地存储
```

### 语音识别流程

```
1. 用户点击语音输入按钮
2. 请求麦克风权限
3. 开始录音（短按/长按模式）
4. 使用 Web Speech API 进行语音识别
5. 识别结果实时显示在输入框
6. 支持语音命令（如“提交”）直接执行操作
```

### 提醒管理流程

```
1. CCCore 发送 CREATE_NOTIFICATION 请求
2. Extension 检查通知偏好设置
   - 如果启用浏览器通知：存储到本地并设置定时器
   - 如果禁用：返回 fallback 标志，由系统原生通知处理
3. 到达触发时间时显示 Chrome 通知
4. 点击通知时跳转到关联的对话会话（如果有）
5. 通知结束后自动清理本地存储
```

### Markdown 渲染流程

```
1. Content Script 检测到 .md/.markdown 文件
2. 提取页面中的 Markdown 原始内容
3. 使用 MarkUp 库解析 Markdown
4. 渲染为 HTML 并应用样式
5. 添加主题切换和源码查看等功能菜单
6. 解析相对路径链接为绝对路径
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
    "triggerTime": 1698668445000,
    "sessionId": "session_xxx"
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
        "triggerTime": 1698668445000,
        "sessionId": "session_xxx"
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
├── content.js                 # 内容脚本（Markdown 渲染 & 目录浏览）
├── README.md                  # 文档
├── LICENSE                    # MIT 许可证
├── components/
│   ├── markup.js              # Markdown 解析库
│   ├── flexible-tabs.js       # 灵活标签页组件
│   ├── voice-input.js         # 语音输入组件
│   ├── theme-toggle.js        # 主题切换组件
│   ├── notification.js        # 通知组件
│   └── tab-storage.js         # 标签页存储管理
├── pages/
│   ├── popup.html             # 弹出窗口（提醒列表）
│   ├── popup.js               # 弹出窗口脚本
│   ├── console.html           # 控制台主页面
│   ├── console.js             # 控制台脚本
│   ├── settings.html          # 设置页面
│   ├── settings.js            # 设置页面脚本
│   ├── notification.html      # 通知页面
│   └── notification.js        # 通知脚本
├── style/
│   ├── main.css               # Markdown 渲染样式
│   ├── markdown.css           # Markdown 元素样式
│   ├── popup.css              # 弹出窗口样式
│   ├── console.css            # 控制台样式
│   ├── flexible-tabs.css      # 标签页样式
│   ├── voice-input.css        # 语音输入样式
│   ├── theme.css              # 主题基础样式
│   ├── theme-toggle.css       # 主题切换按钮样式
│   ├── notification.css       # 通知样式
│   ├── directory-browser.css  # 目录浏览器样式
│   └── settings.css           # 设置页面样式
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
- **主题设置**：明暗主题切换，设置在所有页面间同步

设置保存在 Chrome 的 `storage.local` 中，重启浏览器后保持。

## 使用指南

### 使用控制台

1. 点击浏览器工具栏中的 Claudius 图标打开控制台
2. 使用"+"按钮创建新的对话标签页
3. 在输入框中输入文本或点击麦克风图标进行语音输入
4. 按 Ctrl+Enter 或点击“提交”按钮发送消息
5. 使用标签页切换不同的对话会话
6. 点击标签页上的目录图标设置工作目录

### 使用语音输入

1. 点击输入框右侧的麦克风图标
2. 首次使用需要授权麦克风权限
3. 短按:进行一次语音识别
4. 长按：持续识别，松开后停止
5. 说“提交”可以直接发送当前输入的内容

### 查看提醒列表

1. 点击浏览器工具栏中的 Claudius 图标
2. 弹出窗口会显示所有待触发的提醒
3. 每个提醒显示标题和剩余时间
4. 点击通知会自动跳转到关联的对话会话

### 打开设置页面

1. 在控制台页面点击右上角的菜单按钮
2. 点击"设置"图标
3. 可以查看连接状态和配置通知偏好

### 使用 Markdown 渲染

1. 在浏览器中打开任意 .md 或 .markdown 文件
2. 插件自动检测并渲染文件内容
3. 点击右上角的主题切换按钮切换明暗主题
4. 支持的功能:
   - 明暗主题切换
   - 查看原始 Markdown 源码
   - 响应式布局
   - 相对路径链接解析

### 浏览本地目录

1. 在浏览器中打开 file:// 协议的本地目录
2. 插件自动检测并展示目录内容
3. 点击文件或子目录可以直接打开
4. 支持路径导航和文件预览

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
   - 找到 Claudius，点击“详情”
   - 点击"Service Worker"查看控制台日志
   - 查找连接错误或 WebSocket 状态信息

4. **检查防火墙设置**
   - 确保本地端口 3578 未被防火墙阻止
   - macOS：系统设置 → 网络 → 防火墙
   - Windows：Windows Defender 防火墙设置

### 语音输入不工作

1. **检查麦克风权限**
   - 打开 `chrome://settings/content/microphone`
   - 确保 Chrome 有麦克风权限
   - 检查控制台页面是否在允许列表中

2. **检查浏览器支持**
   - 语音识别需要较新版本的 Chrome（建议 90+）
   - 某些浏览器可能不支持 Web Speech API

3. **检查网络连接**
   - 语音识别可能需要网络连接
   - 确保网络畅通

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
   - 找到 Claudius，点击“详情”
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

### 标签页丢失或无法恢复

1. **检查本地存储**
   - 打开控制台页面
   - 按 F12 打开开发者工具
   - 在 Console 中运行:
     ```javascript
     chrome.storage.local.get('claudeTabsState', console.log)
     ```

2. **清除损坏的数据**
   - 如果数据损坏，可以手动清除：
     ```javascript
     chrome.storage.local.remove('claudeTabsState')
     ```
   - 刷新页面重新开始

## 技术栈

- **Chrome Extension Manifest V3**：使用最新的扩展规范
- **Service Worker**：后台处理和 WebSocket 连接
- **Content Scripts**：页面内容注入和 Markdown 渲染
- **Chrome Storage API**：持久化提醒列表、对话历史和用户偏好
- **Chrome Notifications API**：原生浏览器通知
- **WebSocket**：与 CCCore 的实时双向通信
- **Web Speech API**：语音识别功能
- **MarkUp.js**：自定义 Markdown 解析库
- **Web Components**：自定义组件（flexible-tabs、voice-input 等）

## Chrome 扩展 API 参考

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Service Workers in Extensions](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [Notifications API](https://developer.chrome.com/docs/extensions/reference/notifications/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## 开发提示

### 查看 Service Worker 日志

1. 打开 `chrome://extensions/`
2. 找到 Claudius，点击“详情”
3. 点击“Service Worker” - 打开新的开发者工具窗口
4. 查看 Console 输出和网络请求

### 查看内容脚本日志

1. 打开一个 .md 文件
2. 按 F12 打开开发者工具
3. 在 Console 标签中查找 `[CCExtension]` 前缀的日志
4. 可以看到 Markdown 渲染的详细过程

### 查看控制台页面日志

1. 打开控制台页面
2. 按 F12 打开开发者工具
3. 在 Console 标签中查看消息流、WebSocket 通信等日志
4. 可以调试标签页管理、语音输入等功能

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

### 测试语音输入

在控制台页面的开发者工具中:
```javascript
// 检查 Web Speech API 支持
console.log('SpeechRecognition:', 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

// 查看语音输入组件
const voiceInput = document.querySelector('#main-input');
console.log('Voice input component:', voiceInput);
```

## 更新日志

### v1.1.4（2025-11-21）

**功能优化：**
- 优化 Skill 工具的状态显示：Skill 相关工具直接显示为已完成状态，避免不必要的加载动画
- 优化控制台滚动行为：移除部分自动滚动功能，提升用户浏览体验

### v1.1.3（2025-11-18）

**新增功能：**
- **控制台界面**：全新的控制台界面，支持与 Claude Code 进行交互
- **多标签页管理**：支持在同一窗口中管理多个对话会话
- **标签页持久化**：自动保存和恢复标签页状态及对话历史
- **语音输入系统**：支持语音识别输入，包括短按和长按两种模式
- **语音命令**：支持“提交”等语音命令直接控制操作
- **本地目录浏览**：支持在浏览器中浏览本地文件系统
- **提醒关联会话**：提醒可以关联到特定对话，点击通知自动跳转
- **AI 工作状态提示**：实时显示 Claude Code 的工作状态
- **消息悬浮操作**：鼠标悬停显示消息操作按钮
- **工具使用可视化**：清晰展示 AI 使用的工具及结果
- **工作目录选择**：每个标签页可以设置独立的工作目录
- **主题切换**：支持明暗主题切换，设置在所有页面间同步

**功能优化：**
- 优化 Markdown 文件渲染，支持相对路径解析
- 优化标签页导航，支持键盘快捷键
- 优化消息状态展示，支持换行符渲染
- 优化长按录音模式的文本插入与选中逻辑
- 优化本地路径链接支持

**问题修复：**
- 修复 Markdown 文件渲染中的多个 BUG
- 修复消息状态保存和标签页显示问题
- 修复工具使用状态管理和会话绑定逻辑
- 修正对 file:// 开头的本地文件与文件夹 URL 的解析与渲染

**技术改进：**
- 将阻塞式的 Claude Code 调用调整到线程中完成
- 完成 Claude Code 对话 Session 与页面标签页的绑定
- 完善对话记录缓存与标签切换机制
- 新增多个 Web Components 组件（flexible-tabs、voice-input 等）

### v1.1.2 及更早版本

详见项目提交历史。

## 许可证

[MIT](./LICENSE)
