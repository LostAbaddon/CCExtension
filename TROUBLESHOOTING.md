# CCExtension 故障排查指南

## 常见错误与解决方案

### 错误 1: Service worker registration failed. Status code: 15

**原因**：manifest.json 中的权限或配置不正确

**解决方案**：
1. 确保 `permissions` 字段中包含需要的权限
2. 确保没有使用已弃用的权限（如 `webRequest`，Manifest v3 已弃用）
3. 检查 `background.service_worker` 是否正确指向脚本

**已修复**：
- ✓ 移除了 `webRequest` 权限（Manifest v3 不支持）
- ✓ 添加了 `alarms` 权限
- ✓ 保留了 `notifications` 和 `tabs` 权限

---

### 错误 2: Cannot read properties of undefined (reading 'onAlarm')

**原因**：`chrome.alarms` API 未初始化或权限缺失

**症状**：
```
Uncaught TypeError: Cannot read properties of undefined (reading 'onAlarm')
```

**解决方案**：

1. **检查 manifest.json 是否包含 `alarms` 权限**
   ```json
   "permissions": [
     "alarms",
     "notifications",
     "tabs"
   ]
   ```

2. **在 background.js 中添加防御性检查**
   ```javascript
   if (chrome.alarms) {
     chrome.alarms.onAlarm.addListener((alarm) => {
       // 处理逻辑
     });
   }
   ```

**已修复**：
- ✓ 添加了 `alarms` 权限到 manifest.json
- ✓ 在 background.js 中添加了 null 检查
- ✓ 在创建 alarm 时添加了 try-catch

---

## 调试步骤

### 1. 查看 Background Service Worker 日志

1. 打开 `chrome://extensions/`
2. 找到 "CCExtension - Claude Code"
3. 点击"背景页"或"Service Worker"
4. 在打开的开发者工具中查看控制台输出

预期看到：
```
[Claude Code Extension] Background Service Worker 已加载
[Claude Code Extension] 可用的 API:
  - chrome.notifications: true
  - chrome.tabs: true
  - chrome.alarms: true
  - chrome.windows: true
  - chrome.runtime: true
[Claude Code Extension] 正在连接到 Claude Code Core...
```

### 2. 检查权限

在 manifest.json 中，`permissions` 应该包括：
- `alarms` - 用于延迟通知
- `notifications` - 用于显示通知
- `tabs` - 用于标签页操作

### 3. 检查 CCCore 连接

如果看到以下错误，说明 CCCore 未运行或地址不正确：
```
[Claude Code Extension] 连接失败: ...
[Claude Code Extension] 将在 5000ms 后尝试重新连接
```

解决方法：
1. 启动 CCCore：`cd CCCore && npm start`
2. 确保 WebSocket 服务运行在 `ws://localhost:3578`
3. 检查防火墙设置

### 4. 重新加载插件

如果修改了代码，需要重新加载：
1. 打开 `chrome://extensions/`
2. 找到 CCExtension
3. 点击刷新按钮或按 Ctrl+R

---

## Manifest v3 常见问题

### 哪些权限在 Manifest v3 中不可用？

| 权限（v2） | v3 替代方案 | 说明 |
|-----------|-----------|------|
| `webRequest` | 不支持 | 改用 `webNavigation` 或其他 API |
| `webRequestBlocking` | 不支持 | 已被移除 |
| `background.scripts` | `background.service_worker` | Service Worker 代替后台页面 |

### Manifest v3 中支持的权限

```json
{
  "permissions": [
    "activeTab",
    "alarms",
    "clipboardRead",
    "clipboardWrite",
    "contentSettings",
    "contextMenus",
    "cookies",
    "debugger",
    "declarativeContent",
    "declarativeNetRequest",
    "declarativeNetRequestFeedback",
    "downloads",
    "history",
    "idle",
    "management",
    "notifications",
    "pageCapture",
    "printerProvider",
    "privacySandboxAccessHandled",
    "search",
    "sessionStorage",
    "sidePanel",
    "storage",
    "system.cpu",
    "system.display",
    "system.memory",
    "system.storage",
    "tabs",
    "tabCapture",
    "topSites",
    "webNavigation",
    "webRequest"
  ]
}
```

注意：`webRequest` 在 Manifest v3 中存在但受限。

---

## 性能优化建议

### 1. 减少不必要的监听器

```javascript
// 不推荐：监听所有标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 任何更改都会触发
});

// 推荐：只在 URL 改变时触发
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    // 仅处理 URL 变化
  }
});
```

### 2. 使用过滤器减少事件

```javascript
// 推荐：使用 URLFilter
const filter = { urls: ['https://*', 'http://*'] };
chrome.tabs.onUpdated.addListener(callback, filter);
```

### 3. 定期清理资源

```javascript
// 清理过期的 alarm
chrome.alarms.getAll((alarms) => {
  alarms.forEach((alarm) => {
    if (isExpired(alarm)) {
      chrome.alarms.clear(alarm.name);
    }
  });
});
```

---

## 测试检查表

- [ ] manifest.json 中有 `"manifest_version": 3`
- [ ] background 使用 `service_worker` 而非 `scripts`
- [ ] 所有权限都是 Manifest v3 兼容的
- [ ] 没有使用已弃用的 API（如 `webRequest`）
- [ ] 所有 `chrome.` API 调用都有 null 检查
- [ ] 在开发者工具中没有 JavaScript 错误
- [ ] Service Worker 已成功加载
- [ ] 所有必要的文件都在扩展目录中
- [ ] 图标文件存在且路径正确
- [ ] popup.html 和 popup.js 存在

---

## 获取更多帮助

- [Chrome 扩展开发者文档](https://developer.chrome.com/docs/extensions/)
- [Manifest v3 迁移指南](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [Chrome 扩展 API 参考](https://developer.chrome.com/docs/extensions/reference/)

---

**最后更新**：2025-10-30
