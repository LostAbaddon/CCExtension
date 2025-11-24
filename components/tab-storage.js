/**
 * CCExtension 标签页数据持久化管理模块
 * 使用 IndexedDB 存储标签页和会话数据
 */

(function() {
	'use strict';

	const DB_NAME = 'CCExtensionDB';
	const DB_VERSION = 1;
	const STORE_NAME = 'tabs';

	let db = null;

	/**
	 * 初始化 IndexedDB 数据库
	 * @returns {Promise<IDBDatabase>} 数据库实例
	 */
	function initDB() {
		return new Promise((resolve, reject) => {
			if (db) {
				resolve(db);
				return;
			}

			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => {
				console.error('[TabStorage] 数据库打开失败:', request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				db = request.result;
				console.log('[TabStorage] 数据库初始化成功');
				resolve(db);
			};

			request.onupgradeneeded = (event) => {
				const database = event.target.result;

				// 创建对象存储
				if (!database.objectStoreNames.contains(STORE_NAME)) {
					const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'tabName' });
					objectStore.createIndex('sessionId', 'sessionId', { unique: false });
					console.log('[TabStorage] 对象存储创建成功');
				}
			};
		});
	}

	/**
	 * 保存标签页数据
	 * @param {string} tabName - 标签页名称
	 * @param {Object} data - 标签页数据
	 * @param {string} data.tabContent - 标签页显示内容（HTML）
	 * @param {string} data.workDir - 工作目录
	 * @param {string} data.sessionId - 会话 ID
	 * @param {Array} data.messages - 消息历史
	 * @param {string} data.inputDraft - 输入框草稿
	 * @param {number} data.pendingJobs - 正在进行的任务数
	 * @returns {Promise<void>}
	 */
	async function saveTab(tabName, data) {
		try {
			const database = await initDB();

			const transaction = database.transaction([STORE_NAME], 'readwrite');
			const objectStore = transaction.objectStore(STORE_NAME);

			const tabData = {
				tabName,
				tabContent: data.tabContent || '',
				workDir: data.workDir || null,
				sessionId: data.sessionId || null,
				messages: data.messages || [],
				inputDraft: data.inputDraft || '',
				pendingJobs: data.pendingJobs || 0,
				updatedAt: Date.now(),
			};

			const request = objectStore.put(tabData);

			return new Promise((resolve, reject) => {
				request.onsuccess = () => {
					console.log(`[TabStorage] 标签页 "${tabName}" 数据已保存`);
					resolve();
				};

				request.onerror = () => {
					console.error(`[TabStorage] 保存标签页 "${tabName}" 失败:`, request.error);
					reject(request.error);
				};
			});
		}
		catch (error) {
			console.error('[TabStorage] 保存标签页数据失败:', error);
			throw error;
		}
	}

	/**
	 * 获取单个标签页数据
	 * @param {string} tabName - 标签页名称
	 * @returns {Promise<Object|null>} 标签页数据，不存在返回 null
	 */
	async function getTab(tabName) {
		try {
			const database = await initDB();

			const transaction = database.transaction([STORE_NAME], 'readonly');
			const objectStore = transaction.objectStore(STORE_NAME);
			const request = objectStore.get(tabName);

			return new Promise((resolve, reject) => {
				request.onsuccess = () => {
					const result = request.result;
					if (result) {
						console.log(`[TabStorage] 读取标签页 "${tabName}" 数据成功`);
					}
					else {
						console.log(`[TabStorage] 标签页 "${tabName}" 不存在`);
					}
					resolve(result || null);
				};

				request.onerror = () => {
					console.error(`[TabStorage] 读取标签页 "${tabName}" 失败:`, request.error);
					reject(request.error);
				};
			});
		}
		catch (error) {
			console.error('[TabStorage] 获取标签页数据失败:', error);
			throw error;
		}
	}

	/**
	 * 获取所有标签页数据
	 * @returns {Promise<Array>} 所有标签页数据数组
	 */
	async function getAllTabs() {
		try {
			const database = await initDB();

			const transaction = database.transaction([STORE_NAME], 'readonly');
			const objectStore = transaction.objectStore(STORE_NAME);
			const request = objectStore.getAll();

			return new Promise((resolve, reject) => {
				request.onsuccess = () => {
					const results = request.result || [];
					console.log(`[TabStorage] 读取所有标签页数据成功，共 ${results.length} 个`);
					resolve(results);
				};

				request.onerror = () => {
					console.error('[TabStorage] 读取所有标签页失败:', request.error);
					reject(request.error);
				};
			});
		}
		catch (error) {
			console.error('[TabStorage] 获取所有标签页失败:', error);
			throw error;
		}
	}

	/**
	 * 删除标签页数据
	 * @param {string} tabName - 标签页名称
	 * @returns {Promise<void>}
	 */
	async function deleteTab(tabName) {
		try {
			const database = await initDB();

			const transaction = database.transaction([STORE_NAME], 'readwrite');
			const objectStore = transaction.objectStore(STORE_NAME);
			const request = objectStore.delete(tabName);

			return new Promise((resolve, reject) => {
				request.onsuccess = () => {
					console.log(`[TabStorage] 标签页 "${tabName}" 数据已删除`);
					resolve();
				};

				request.onerror = () => {
					console.error(`[TabStorage] 删除标签页 "${tabName}" 失败:`, request.error);
					reject(request.error);
				};
			});
		}
		catch (error) {
			console.error('[TabStorage] 删除标签页数据失败:', error);
			throw error;
		}
	}

	/**
	 * 清空所有标签页数据
	 * @returns {Promise<void>}
	 */
	async function clearAllTabs() {
		try {
			const database = await initDB();

			const transaction = database.transaction([STORE_NAME], 'readwrite');
			const objectStore = transaction.objectStore(STORE_NAME);
			const request = objectStore.clear();

			return new Promise((resolve, reject) => {
				request.onsuccess = () => {
					console.log('[TabStorage] 所有标签页数据已清空');
					resolve();
				};

				request.onerror = () => {
					console.error('[TabStorage] 清空所有标签页失败:', request.error);
					reject(request.error);
				};
			});
		}
		catch (error) {
			console.error('[TabStorage] 清空所有标签页失败:', error);
			throw error;
		}
	}

	// 导出 API 到全局
	window.TabStorage = {
		init: initDB,
		saveTab,
		getTab,
		getAllTabs,
		deleteTab,
		clearAllTabs,
	};
})();
