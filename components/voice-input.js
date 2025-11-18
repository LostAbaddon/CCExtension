/**
 * CCExtension 语音输入组件
 * 使用声明式 HTML 标签方式
 */

(function() {
	'use strict';

	const LongPressDuration = 1000;

	/**
	 * 初始化所有 voice_input 组件
	 */
	function initAll() {
		const voiceInputs = document.querySelectorAll('voice_input');
		voiceInputs.forEach(voiceInput => {
			initVoiceInput(voiceInput);
		});
	}
	/**
	 * 初始化单个 voice_input 组件
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 */
	function initVoiceInput(voiceInputElement) {
		// 获取配置
		const maxHeight = parseInt(voiceInputElement.getAttribute('max_height')) || 200;
		const placeholder = voiceInputElement.getAttribute('placeholder') || '请输入内容...';
		const submitWidth = parseInt(voiceInputElement.getAttribute('submit_width')) || 100;

		// 创建内部结构
		const container = document.createElement('div');
		container.classList.add('voice-input-container');

		// 创建输入区域包装器
		const inputWrapper = document.createElement('div');
		inputWrapper.classList.add('voice-input-wrapper');
		inputWrapper.style.maxHeight = `${maxHeight}px`;

		// 创建 textarea
		const textarea = document.createElement('textarea');
		textarea.classList.add('voice-input-textarea');
		textarea.placeholder = placeholder;
		textarea.rows = 1;

		// 创建语音输入按钮
		const voiceBtn = document.createElement('button');
		voiceBtn.classList.add('voice-input-btn');
		voiceBtn.type = 'button';
		voiceBtn.innerHTML = `
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
				<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
				<line x1="12" y1="19" x2="12" y2="23"></line>
				<line x1="8" y1="23" x2="16" y2="23"></line>
			</svg>
		`;
		voiceBtn.title = '语音输入';

		// 组装输入区域
		inputWrapper.appendChild(textarea);
		inputWrapper.appendChild(voiceBtn);

		// 创建提交按钮
		const submitBtn = document.createElement('button');
		submitBtn.classList.add('voice-input-submit');
		submitBtn.type = 'button';
		submitBtn.textContent = '确认提交';
		submitBtn.style.width = `${submitWidth}px`;

		// 组装容器
		container.appendChild(inputWrapper);
		container.appendChild(submitBtn);

		// 清空原始内容并添加新结构
		voiceInputElement.innerHTML = '';
		voiceInputElement.appendChild(container);
		voiceInputElement.classList.add('voice-input-component');

		// 保存配置到元素上
		voiceInputElement._config = {
			maxHeight,
			textarea,
			voiceBtn,
			submitBtn,
			inputWrapper,
			container,
			recognition: null,
			isRecording: false,
			lastHeight: 0,
			longPressTimer: null, // 长按计时器
			isLongPress: false, // 是否触发了长按
			// 长按模式下保存的状态
			savedCursorPosition: 0, // 保存的光标位置
			savedBeforeText: '', // 光标前的文本
			savedAfterText: '', // 光标后的文本
		};

		// 自动调整高度
		textarea.addEventListener('input', () => {
			autoResize(voiceInputElement, textarea);
		});
		// focus/blur 事件处理
		textarea.addEventListener('focus', () => {
			inputWrapper.classList.add('focused');
		});
		textarea.addEventListener('blur', () => {
			// 如果正在录音，保持 focused 状态（语音按钮继续显示）
			if (!voiceInputElement._config.isRecording) {
				inputWrapper.classList.remove('focused');
			}
		});
		// 支持 Ctrl+Enter 提交
		textarea.addEventListener('keydown', (e) => {
			if (e.ctrlKey && e.key === 'Enter') {
				e.preventDefault();
				handleSubmit(voiceInputElement);
				return;
			}

			// 标签页切换快捷键：macOS 使用 Cmd+← 和 Cmd+→，Windows 使用 Ctrl+← 和 Ctrl+→
			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			const modifierKey = isMac ? e.metaKey : e.ctrlKey;

			if (modifierKey && !e.shiftKey && !e.altKey) {
				const flexTab = document.querySelector('flex_tab');
				if (!flexTab) return;

				// ArrowLeft 的 keyCode 是 37，ArrowRight 的 keyCode 是 39
				if (e.keyCode === 37 || e.key === 'ArrowLeft') {
					// 切换到上一个标签页
					e.preventDefault();
					if (window.FlexibleTabs) {
						window.FlexibleTabs.prevTab(flexTab);
						console.log('[VoiceInput] 快捷键切换到上一个标签页');
					}
				}
				else if (e.keyCode === 39 || e.key === 'ArrowRight') {
					// 切换到下一个标签页
					e.preventDefault();
					if (window.FlexibleTabs) {
						window.FlexibleTabs.nextTab(flexTab);
						console.log('[VoiceInput] 快捷键切换到下一个标签页');
					}
				}
			}
		});

		// 鼠标按下时启动长按计时器
		voiceBtn.addEventListener('mousedown', (e) => {
			e.preventDefault(); // 阻止焦点转移
			const config = voiceInputElement._config;

			// 清除可能存在的旧计时器
			if (config.longPressTimer) {
				clearTimeout(config.longPressTimer);
			}

			// 重置长按标记
			config.isLongPress = false;

			// 启动长按计时器，到时间后自动开始语音识别
			config.longPressTimer = setTimeout(() => {
				console.log('[VoiceInput] 长按触发，自动开始语音识别');
				config.isLongPress = true;
				config.longPressTimer = null;
				// 自动触发长按模式的语音识别
				handleVoiceInput(voiceInputElement, LongPressDuration);
				// 保持 textarea 的焦点
				setTimeout(() => {
					textarea.focus();
				}, 0);
			}, LongPressDuration);
		});
		// 鼠标抬起时处理语音输入
		voiceBtn.addEventListener('mouseup', (e) => {
			e.preventDefault(); // 阻止默认行为
			const config = voiceInputElement._config;

			// 如果定时器还在运行，说明是短按，取消定时器并进入短按模式
			if (config.longPressTimer) {
				clearTimeout(config.longPressTimer);
				config.longPressTimer = null;
				// 短按模式
				handleVoiceInput(voiceInputElement, 0);
				// 保持 textarea 的焦点
				setTimeout(() => {
					textarea.focus();
				}, 0);
			}
			// 如果定时器已经触发（长按），则什么都不做，因为已经在定时器里启动了语音识别
		});
		// 鼠标移出按钮时取消计时器
		voiceBtn.addEventListener('mouseleave', () => {
			const config = voiceInputElement._config;

			// 取消长按计时器
			if (config.longPressTimer) {
				clearTimeout(config.longPressTimer);
				config.longPressTimer = null;
				console.log('[VoiceInput] 鼠标移出，取消长按计时器');
			}
		});

		// 提交按钮点击事件
		submitBtn.addEventListener('click', () => {
			handleSubmit(voiceInputElement);
		});

		// 初始化高度
		autoResize(voiceInputElement, textarea);
	}
	/**
	 * 停止语音识别
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 */
	function stopRecording(voiceInputElement) {
		const config = voiceInputElement._config;
		if (!config) {
			console.error('[VoiceInput] voice_input 未初始化');
			return;
		}
		if (config.isRecording && config.recognition) {
			console.log('[VoiceInput] 停止录音');
			config.recognition.stop();
		}
	}

	/**
	 * 自动调整 textarea 高度
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 * @param {HTMLTextAreaElement} textarea
	 */
	function autoResize(voiceInputElement, textarea) {
		const config = voiceInputElement._config;
		if (!config) return;

		// 重置高度以获取正确的 scrollHeight
		textarea.style.height = 'auto';
		// 设置新高度
		textarea.style.height = textarea.scrollHeight + 'px';

		// 获取容器当前高度
		const currentHeight = config.container.offsetHeight;

		// 如果高度发生变化,触发事件
		if (config.lastHeight !== currentHeight) {
			const oldHeight = config.lastHeight;
			config.lastHeight = currentHeight;

			// 触发 onHeightChange 事件
			const event = new CustomEvent('onHeightChange', {
				detail: {
					oldHeight,
					newHeight: currentHeight,
					delta: currentHeight - oldHeight,
				},
				bubbles: true,
			});
			voiceInputElement.dispatchEvent(event);
		}
	}

	/**
	 * 处理语音输入
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 * @param {number} pressDuration - 按压时长(毫秒)
	 */
	function handleVoiceInput(voiceInputElement, pressDuration = 0) {
		const config = voiceInputElement._config;
		if (!config) return;

		console.log('[VoiceInput] 开始语音输入，按压时长:', pressDuration, 'ms');

		// 检查浏览器是否支持语音识别
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		if (!SpeechRecognition) {
			console.error('[VoiceInput] 浏览器不支持语音识别');
			alert('您的浏览器不支持语音识别功能');
			return;
		}

		const { textarea, voiceBtn, isRecording } = config;

		// 如果正在录音,停止
		if (isRecording) {
			console.log('[VoiceInput] 停止录音');
			if (config.recognition) {
				config.recognition.stop();
			}
			return;
		}

		// 创建语音识别实例
		const recognition = new SpeechRecognition();
		recognition.lang = 'zh-CN'; // 设置语言为中文

		// 根据按压时长决定识别模式
		const isContinuous = pressDuration >= LongPressDuration;
		recognition.continuous = isContinuous;
		recognition.interimResults = isContinuous; // 持续模式返回中间结果
		console.log('[VoiceInput] 语音识别实例已创建，模式:', isContinuous ? '持续识别' : '单次识别');

		// 保存当前光标位置
		let lastResultIndex = -1;

		recognition.onstart = () => {
			console.log('[VoiceInput] 语音识别已启动');
			config.isRecording = true;
			voiceBtn.classList.add('recording');
			lastResultIndex = -1;

			// 长按模式下保存光标位置和前后文本
			if (isContinuous) {
				const cursorPos = textarea.selectionStart;
				config.savedCursorPosition = cursorPos;
				config.savedBeforeText = textarea.value.substring(0, cursorPos);
				config.savedAfterText = textarea.value.substring(cursorPos);
				console.log('[VoiceInput] 长按模式：保存光标位置', cursorPos);
			}
		};
		recognition.onresult = (event) => {
			let newPosition, transcript;
			if (isContinuous) {
				// 长按模式：处理所有结果（包括中间结果）
				let interimText = '';

				// 累计识别结果
				for (let i = 0; i < event.results.length; i++) {
					interimText += event.results[i][0].transcript;
				}
				const last = event.results[event.results.length - 1];
				let lastText = last.isFinal ? last[0].transcript : '';
				console.log('[VoiceInput] 长按模式识别结果:', interimText, '最后之词:', lastText);

				// 如果识别出了最后确定的单词，触发事件
				if (lastText) {
					const wordEvent = new CustomEvent('onFinalWord', {
						detail: {
							word: lastText
						},
						bubbles: true,
					});
					voiceInputElement.dispatchEvent(wordEvent);
				}

				// 使用保存的前后文本拼接
				textarea.value = config.savedBeforeText + interimText + config.savedAfterText;
				// 选中识别的文本
				const start = config.savedBeforeText.length;
				const end = start + interimText.length;
				textarea.setSelectionRange(start, end);
			}
			// 单次识别模式：只取第一个结果
			else {
				const cursorPosition = textarea.selectionStart;
				transcript = event.results[0][0].transcript;
				console.log('[VoiceInput] 单次识别结果:', transcript);

				// 在光标位置插入识别的文本
				const before = textarea.value.substring(0, cursorPosition);
				const after = textarea.value.substring(cursorPosition);
				textarea.value = before + transcript + after;
				newPosition = cursorPosition + transcript.length;

				// 更新光标位置
				textarea.setSelectionRange(newPosition, newPosition);
			}

			// 触发 input 事件以自动调整高度
			textarea.dispatchEvent(new Event('input'));
			// 聚焦回 textarea
			textarea.focus();
		};
		recognition.onerror = (event) => {
			console.error('[VoiceInput] 语音识别错误:', event.error);
			if (event.error === 'no-speech') {
				alert('未检测到语音输入');
			}
			else if (event.error === 'not-allowed') {
				alert('语音识别权限被拒绝,请在浏览器设置中允许麦克风访问');
			}
			else {
				alert('语音识别失败: ' + event.error);
			}
		};
		recognition.onend = () => {
			console.log('[VoiceInput] 语音识别结束');
			config.isRecording = false;
			voiceBtn.classList.remove('recording');
			config.recognition = null;

			// 清空保存的字段
			config.savedCursorPosition = 0;
			config.savedBeforeText = '';
			config.savedAfterText = '';

			// 如果 textarea 失去了焦点，移除 focused 类（隐藏语音按钮）
			if (document.activeElement !== textarea) {
				inputWrapper.classList.remove('focused');
			}
		};

		// 开始识别
		config.recognition = recognition;
		try {
			recognition.start();
			console.log('[VoiceInput] 调用 recognition.start()');
		}
		catch (error) {
			console.error('[VoiceInput] 启动语音识别失败:', error);
			alert('启动语音识别失败: ' + error.message);
		}
	}
	/**
	 * 处理提交
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 */
	function handleSubmit(voiceInputElement) {
		const config = voiceInputElement._config;
		if (!config) return;

		const { textarea } = config;
		const value = textarea.value.trim();

		// 触发 onSubmit 事件
		const event = new CustomEvent('onSubmit', {
			detail: { value },
			bubbles: true,
		});
		voiceInputElement.dispatchEvent(event);
	}

	/**
	 * 获取输入值
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 * @returns {string} 输入框的值
	 */
	function getValue(voiceInputElement) {
		const config = voiceInputElement._config;
		if (!config) {
			console.error('[VoiceInput] voice_input 未初始化');
			return '';
		}
		return config.textarea.value;
	}
	/**
	 * 设置输入值
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 * @param {string} value - 要设置的值
	 */
	function setValue(voiceInputElement, value) {
		const config = voiceInputElement._config;
		if (!config) {
			console.error('[VoiceInput] voice_input 未初始化');
			return;
		}
		config.textarea.value = value;
		autoResize(voiceInputElement, config.textarea);
	}

	/**
	 * 清空输入
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 */
	function clear(voiceInputElement) {
		setValue(voiceInputElement, '');
	}
	/**
	 * 聚焦输入框
	 * @param {HTMLElement} voiceInputElement - voice_input 元素
	 */
	function focus(voiceInputElement) {
		const config = voiceInputElement._config;
		if (!config) {
			console.error('[VoiceInput] voice_input 未初始化');
			return;
		}
		config.textarea.focus();
	}

	// 页面加载完成后自动初始化
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initAll);
	}
	else {
		initAll();
	}

	// 导出 API 到全局
	window.VoiceInput = {
		init: initAll,
		initOne: initVoiceInput,
		getValue,
		setValue,
		clear,
		focus,
		stopRecording,
	};
})();
