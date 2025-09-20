'use strict';
'require fs';
'require poll';
'require ui';
'require view';

// 配置常量
const LOG_FILE_PATH = '/var/log/webauth.log';
const MAX_LOG_LINES = 1000;
const POLL_INTERVAL = 5000; // 5秒轮询间隔

return view.extend({
	async retrieveLog() {
		try {
			const logdata = await fs.read(LOG_FILE_PATH);
			let loglines = logdata.trim().split(/\n/).filter(Boolean);
			
			// 限制日志行数，只保留最新的 MAX_LOG_LINES 行
			if (loglines.length > MAX_LOG_LINES) {
				loglines = loglines.slice(-MAX_LOG_LINES);
			}
			
			const logContent = loglines.join('\n');
			const rows = Math.max(loglines.length + 1, 20);
			
			return { 
				value: logContent, 
				rows: rows,
				lineCount: loglines.length,
				hasNewContent: true
			};
		} catch (err) {
			let errorMessage = 'Unable to load log file';
			if (err.code === 'ENOENT') {
				errorMessage = 'Log file does not exist';
			} else if (err.code === 'EACCES') {
				errorMessage = 'Permission denied to read log file';
			} else if (err.message) {
				errorMessage = err.message;
			}
			
			return { 
				value: `Error: ${errorMessage}`, 
				rows: 5,
				lineCount: 0,
				hasNewContent: false
			};
		}
	},

	async pollLog() {
		const element = document.getElementById('syslog');
		const loadingElement = document.getElementById('log-loading');
		
		if (!element) return;
		
		try {
			// 显示加载状态
			if (loadingElement) {
				loadingElement.style.display = 'inline';
			}
			
			const log = await this.retrieveLog();
			const previousContent = element.value;
			
			element.value = log.value;
			element.rows = log.rows;
			
			// 如果有新内容且用户在底部附近，自动滚动到底部
			if (log.hasNewContent && previousContent !== log.value) {
				const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 100;
				if (isNearBottom) {
					setTimeout(() => {
						element.scrollTop = element.scrollHeight;
					}, 100);
				}
			}
			
		} catch (err) {
			ui.addNotification(null, E('p', {}, _('Unable to load log data: ' + err.message)));
		} finally {
			// 隐藏加载状态
			if (loadingElement) {
				loadingElement.style.display = 'none';
			}
		}
	},

	load() {
		// 设置轮询间隔
		poll.add(this.pollLog.bind(this), POLL_INTERVAL);
		return this.retrieveLog();
	},

	render(loglines) {
		const scrollDownButton = E('button', { 
				id: 'scrollDownButton',
				class: 'cbi-button cbi-button-neutral',
				title: _('Scroll to the bottom of the log')
			}, _('Scroll to Bottom')
		);
		scrollDownButton.addEventListener('click', () => {
			const textarea = document.getElementById('syslog');
			if (textarea) {
				textarea.scrollTop = textarea.scrollHeight;
			}
		});

		const scrollUpButton = E('button', { 
				id : 'scrollUpButton',
				class: 'cbi-button cbi-button-neutral',
				title: _('Scroll to the top of the log')
			}, _('Scroll to Top')
		);
		scrollUpButton.addEventListener('click', () => {
			const textarea = document.getElementById('syslog');
			if (textarea) {
				textarea.scrollTop = 0;
			}
		});

		// 加载指示器
		const loadingIndicator = E('span', {
			id: 'log-loading',
			style: 'display: none; margin-left: 10px; color: #666; font-size: 12px;'
		}, _('Loading...'));

		const textarea = E('textarea', {
			id: 'syslog',
			style: 'font-size:12px; width:100%; height:80vh; resize:none; overflow-y:auto; overflow-x:auto; font-family: monospace;',
			readonly: 'readonly',
			wrap: 'off',
			rows: loglines.rows,
			placeholder: _('Log content will appear here...')
		}, [ loglines.value ]);

		// 优化事件处理
		let wheelTimeout;
		textarea.addEventListener('wheel', (e) => {
			e.stopPropagation();
			// 防抖处理，减少频繁触发
			clearTimeout(wheelTimeout);
			wheelTimeout = setTimeout(() => {
				// 可以在这里添加额外的逻辑
			}, 100);
		});

		// 窗口大小改变时调整高度
		window.addEventListener('resize', () => {
			const textarea = document.getElementById('syslog');
			if (textarea) {
				textarea.style.height = (window.innerHeight * 0.8) + 'px';
			}
		});

		// 增强的CSS样式
		const style = E('style', {}, `
			#syslog {
				border: 1px solid #ddd;
				border-radius: 4px;
				padding: 8px;
				background-color: #fafafa;
			}
			#syslog:focus {
				outline: 2px solid #007cba;
				outline-offset: 2px;
			}
			#syslog::-webkit-scrollbar {
				width: 12px;
				height: 12px;
			}
			#syslog::-webkit-scrollbar-track {
				background: #f1f1f1;
				border-radius: 6px;
			}
			#syslog::-webkit-scrollbar-thumb {
				background: #888;
				border-radius: 6px;
			}
			#syslog::-webkit-scrollbar-thumb:hover {
				background: #555;
			}
			.cbi-button {
				cursor: pointer;
				transition: background-color 0.2s;
			}
			.cbi-button:hover {
				background-color: #e0e0e0 !important;
			}
			#log-loading {
				animation: pulse 1.5s ease-in-out infinite;
			}
			@keyframes pulse {
				0%, 100% { opacity: 1; }
				50% { opacity: 0.5; }
			}
		`);

		return E([], [
			style,
			E('div', { id: 'content_syslog' }, [
				E('div', { 
					style: 'padding-bottom: 10px; display:flex; align-items: center; gap:10px;' 
				}, [
					scrollUpButton,
					scrollDownButton,
					loadingIndicator
				]),
				textarea
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});