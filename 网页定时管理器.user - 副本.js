// ==UserScript==
// @name         网页定时管理器
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  网页定时关闭和定时跳转（优化移动设备体验）
// @author       huihuia24
// @homepage     https://github.com/huihuia24
// @source       https://github.com/huihuia24/-/tree/main
// @match        *://*/*
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @icon         https://github.com/huihuia24/-/blob/28a6ac6404aa154168b731a7d632b306febdc7d2/%E7%BD%91%E9%A1%B5%E5%AE%9A%E6%97%B6%E7%AE%A1%E7%90%86%E5%99%A8.png
// ==/UserScript==

(function() {
    'use strict';

    // 加载Font Awesome
    function loadFontAwesome() {
        if (document.querySelector('link[href*="font-awesome"]')) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(link);
    }
    loadFontAwesome();

    // 存储管理模块
    const Storage = {
        get(key, defaultValue) {
            const value = GM_getValue(key);
            return value === undefined ? defaultValue : value;
        },
        set(key, value) {
            GM_setValue(key, value);
        },
        savePos(elementId, x, y) {
            this.set(`${elementId}_x`, x);
            this.set(`${elementId}_y`, y);
        },
        getPos(elementId, defaultX, defaultY) {
            return {
                x: this.get(`${elementId}_x`, defaultX),
                y: this.get(`${elementId}_y`, defaultY)
            };
        },
        saveTasks(tasks) {
            this.set('timer_tasks', JSON.stringify(tasks));
        },
        getTasks() {
            try {
                return JSON.parse(this.get('timer_tasks', '[]'));
            } catch (e) {
                return [];
            }
        },
        saveMultiState(state) {
            this.set('multi_state', JSON.stringify(state));
        },
        getMultiState() {
            try {
                return JSON.parse(this.get('multi_state', '{"running":false,"index":0,"remaining":0}'));
            } catch (e) {
                return { running: false, index: 0, remaining: 0 };
            }
        },
        getTheme() {
            return this.get('timer_theme', 'light'); // light/dark
        },
        setTheme(theme) {
            this.set('timer_theme', theme);
        }
    };

    // 基础样式定义 - 增加响应式设计
    GM_addStyle(`
        #timer-manager {
            position: fixed;
            width: 90%;
            max-width: 380px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 999999;
            padding: 15px;
            display: none;
            transition: all 0.3s ease;
            box-sizing: border-box;
        }
        
        #timer-mini {
            position: fixed;
            border-radius: 8px;
            padding: 10px 16px;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 3px 12px rgba(0,0,0,0.2);
            z-index: 999999;
            cursor: pointer;
            user-select: none;
            transition: all 0.2s ease;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        #timer-mini:hover {
            transform: translateY(-2px);
        }
        
        .timer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid;
        }
        
        .timer-title {
            font-size: 18px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .timer-controls {
            display: flex;
            gap: 8px;
        }
        
        .timer-btn {
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 16px;
            transition: all 0.2s;
        }
        
        .timer-btn:hover {
            transform: scale(1.1);
        }
        
        .timer-tabs {
            display: flex;
            margin-bottom: 15px;
            border-radius: 6px;
            overflow: hidden;
        }
        
        .timer-tab {
            flex: 1;
            padding: 12px 0;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 500;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .timer-tab.active {
            font-weight: 600;
        }
        
        .timer-tab-content {
            display: none;
            animation: fadeIn 0.3s ease;
        }
        
        .timer-tab-content.active {
            display: block;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .form-control {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 16px;
            transition: border-color 0.2s, box-shadow 0.2s;
            pointer-events: auto !important;
            user-select: text !important;
        }
        
        .form-control:focus {
            outline: none;
            box-shadow: 0 0 0 3px;
        }
        
        .time-inputs {
            display: flex;
            gap: 8px;
        }
        
        .time-input-group {
            flex: 1;
        }
        
        .time-label {
            display: block;
            margin-bottom: 4px;
            font-size: 13px;
            text-align: center;
        }
        
        .time-input {
            width: 100%;
            padding: 12px 5px;
            border: 1px solid;
            border-radius: 6px;
            font-size: 20px;
            text-align: center;
            transition: border-color 0.2s;
            -moz-appearance: textfield;
            pointer-events: auto !important;
            user-select: text !important;
            box-sizing: border-box;
        }
        
        .time-input::-webkit-outer-spin-button,
        .time-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        
        .time-input:focus {
            outline: none;
        }
        
        .btn {
            padding: 12px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            flex: 1; /* 按钮在移动设备上平均分配宽度 */
        }
        
        .btn-primary:hover, .btn-secondary:hover {
            transform: translateY(-1px);
        }
        
        .task-list {
            margin: 15px 0;
            max-height: 180px;
            overflow-y: auto;
            border: 1px solid;
            border-radius: 6px;
        }
        
        .task-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid;
            flex-wrap: nowrap;
        }
        
        .task-item:last-child {
            border-bottom: none;
        }
        
        .task-item:hover {
            transition: background-color 0.2s;
        }
        
        .task-url {
            flex: 1;
            word-break: break-all;
            font-size: 13px;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .task-time {
            margin: 0 8px;
            font-size: 14px;
            min-width: 80px;
            text-align: center;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .task-remove {
            cursor: pointer;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            flex-shrink: 0;
            transition: all 0.2s;
        }
        
        .task-remove:hover {
            transform: scale(1.1);
        }
        
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        
        .status {
            margin-top: 12px;
            padding: 10px;
            border-radius: 6px;
            font-size: 14px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border: 1px solid;
        }
        
        .radio-group {
            display: flex;
            gap: 12px;
            margin-top: 6px;
            flex-wrap: wrap;
        }
        
        .radio-item {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            white-space: nowrap;
            font-size: 15px;
        }
        
        .radio-item input {
            margin: 0;
            width: 16px;
            height: 16px;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 10px;
            cursor: pointer;
            font-size: 15px;
        }
        
        .checkbox-item input {
            width: 16px;
            height: 16px;
        }
        
        #target-url {
            margin-top: 10px;
            display: none;
        }

        .overflow-ellipsis {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* 响应式调整 */
        @media (max-width: 480px) {
            #timer-manager {
                width: calc(100% - 20px);
                padding: 12px;
            }
            
            .timer-title {
                font-size: 16px;
            }
            
            .timer-tab {
                padding: 10px 0;
                font-size: 13px;
            }
            
            .time-input {
                font-size: 18px;
                padding: 10px 5px;
            }
            
            .actions {
                gap: 8px;
            }
            
            .btn {
                padding: 10px 12px;
                font-size: 14px;
            }
            
            .task-list {
                max-height: 150px;
            }
        }

        /* 增加触摸反馈 */
        .timer-btn, .btn, .timer-tab, .task-remove, #timer-mini {
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
        }
        
        .timer-btn:active, .btn:active, .timer-tab:active, .task-remove:active, #timer-mini:active {
            transform: scale(0.95);
        }
    `);

    // 创建主题样式
    function createThemeStyles() {
        const style = document.createElement('style');
        style.id = 'timer-theme-styles';
        style.textContent = `
            /* 浅色主题 */
            .timer-light {
                --bg-primary: #ffffff;
                --bg-secondary: #f8f9fa;
                --bg-tertiary: #ecf0f1;
                --text-primary: #2c3e50;
                --text-secondary: #7f8c8d;
                --border-color: #ddd;
                --border-dark: #ccc;
                --accent-color: #3498db;
                --accent-hover: #2980b9;
                --accent-light: rgba(52, 152, 219, 0.1);
                --danger-color: #e74c3c;
                --danger-light: rgba(231, 76, 60, 0.1);
                --shadow: 0 4px 20px rgba(0,0,0,0.15);
            }

            /* 深色主题 */
            .timer-dark {
                --bg-primary: #1e1e1e;
                --bg-secondary: #2d2d2d;
                --bg-tertiary: #3a3a3a;
                --text-primary: #f0f0f0;
                --text-secondary: #ccc;
                --border-color: #444;
                --border-dark: #555;
                --accent-color: #3498db;
                --accent-hover: #2980b9;
                --accent-light: rgba(52, 152, 219, 0.2);
                --danger-color: #e74c3c;
                --danger-light: rgba(231, 76, 60, 0.2);
                --shadow: 0 4px 20px rgba(0,0,0,0.5);
            }

            /* 主题应用 */
            .timer-theme {
                background: var(--bg-primary);
                color: var(--text-primary);
                border-color: var(--border-color);
                box-shadow: var(--shadow);
            }

            #timer-manager.timer-theme {
                border: 1px solid var(--border-color);
            }

            #timer-mini.timer-theme {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .timer-header.timer-theme {
                border-bottom-color: var(--border-color);
            }

            .timer-btn.timer-theme {
                background: var(--bg-secondary);
                color: var(--text-secondary);
            }

            .timer-btn.timer-theme:hover {
                background: var(--bg-tertiary);
                color: var(--text-primary);
            }

            .timer-tabs.timer-theme {
                background: var(--bg-secondary);
            }

            .timer-tab.timer-theme {
                color: var(--text-secondary);
            }

            .timer-tab.timer-theme.active {
                background: var(--accent-color);
                color: white;
            }

            .form-label.timer-theme {
                color: var(--text-primary);
            }

            .form-control.timer-theme {
                background: var(--bg-secondary);
                color: var(--text-primary);
                border-color: var(--border-color);
            }

            .form-control.timer-theme:focus {
                border-color: var(--accent-color);
                box-shadow: 0 0 0 3px var(--accent-light);
            }

            .time-label.timer-theme {
                color: var(--text-secondary);
            }

            .time-input.timer-theme {
                background: var(--bg-secondary);
                color: var(--text-primary);
                border-color: var(--border-color);
            }

            .time-input.timer-theme:focus {
                border-color: var(--accent-color);
            }

            .btn-primary.timer-theme {
                background: var(--accent-color);
                color: white;
            }

            .btn-primary.timer-theme:hover {
                background: var(--accent-hover);
            }

            .btn-secondary.timer-theme {
                background: var(--bg-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }

            .btn-secondary.timer-theme:hover {
                background: var(--bg-tertiary);
            }

            .task-list.timer-theme {
                background: var(--bg-secondary);
                border-color: var(--border-color);
            }

            .task-item.timer-theme {
                border-bottom-color: var(--border-color);
            }

            .task-item.timer-theme:hover {
                background: var(--bg-tertiary);
            }

            .task-url.timer-theme {
                color: var(--text-primary);
            }

            .task-time.timer-theme {
                color: var(--text-secondary);
            }

            .task-remove.timer-theme {
                color: var(--danger-color);
                background: var(--bg-secondary);
            }

            .task-remove.timer-theme:hover {
                background: var(--danger-light);
            }

            .status.timer-theme {
                background: var(--bg-secondary);
                color: var(--text-secondary);
                border-color: var(--border-color);
            }

            .radio-item.timer-theme input,
            .checkbox-item.timer-theme input {
                accent-color: var(--accent-color);
            }
        `;
        document.head.appendChild(style);
    }
    createThemeStyles();

    // 创建UI元素
    function createUI(theme) {
        // 主界面
        const mainUI = document.createElement('div');
        mainUI.id = 'timer-manager';
        mainUI.className = `timer-theme timer-${theme}`;
        mainUI.innerHTML = `
            <div class="timer-header timer-theme">
                <div class="timer-title timer-theme">
                    <i class="fas fa-clock"></i> 网页定时管理器
                </div>
                <div class="timer-controls">
                    <div class="timer-btn timer-theme" id="theme-toggle">
                        <i class="fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
                    </div>
                    <div class="timer-btn timer-theme" id="minimize-btn">
                        <i class="fas fa-compress"></i>
                    </div>
                </div>
            </div>
            <div class="timer-tabs timer-theme">
                <div class="timer-tab timer-theme active" data-tab="current">
                    <i class="fas fa-window-maximize"></i> 当前网页定时
                </div>
                <div class="timer-tab timer-theme" data-tab="multi">
                    <i class="fas fa-exchange-alt"></i> 多网址定时跳转
                </div>
            </div>
            <div class="timer-contents">
                <!-- 当前网页定时 -->
                <div class="timer-tab-content active" id="current-tab">
                    <div class="form-group">
                        <div class="form-label timer-theme">
                            <i class="fas fa-hourglass-half"></i> 定时时长
                        </div>
                        <div class="time-inputs">
                            <div class="time-input-group">
                                <div class="time-label timer-theme">小时</div>
                                <input type="number" id="current-hours" class="time-input timer-theme" min="0" value="0">
                            </div>
                            <div class="time-input-group">
                                <div class="time-label timer-theme">分</div>
                                <input type="number" id="current-minutes" class="time-input timer-theme" min="0" max="59" value="0">
                            </div>
                            <div class="time-input-group">
                                <div class="time-label timer-theme">秒</div>
                                <input type="number" id="current-seconds" class="time-input timer-theme" min="0" max="59" value="30">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="form-label timer-theme">
                            <i class="fas fa-sign-out-alt"></i> 定时结束后操作
                        </div>
                        <div class="radio-group">
                            <div class="radio-item timer-theme">
                                <input type="radio" id="action-blank" name="end-action" value="blank" checked>
                                <label for="action-blank">
                                    <i class="fas fa-file"></i> 跳转至空白页
                                </label>
                            </div>
                            <div class="radio-item timer-theme">
                                <input type="radio" id="action-url" name="end-action" value="url">
                                <label for="action-url">
                                    <i class="fas fa-link"></i> 跳转至指定网页
                                </label>
                            </div>
                        </div>
                        <input type="text" id="target-url" class="form-control timer-theme" placeholder="请输入目标网址">
                    </div>
                    <div class="actions">
                        <button class="btn btn-primary timer-theme" id="start-current">
                            <i class="fas fa-play"></i> 开始定时
                        </button>
                        <button class="btn btn-secondary timer-theme" id="stop-current">
                            <i class="fas fa-stop"></i> 停止定时
                        </button>
                    </div>
                    <div class="status timer-theme" id="current-status">
                        <i class="fas fa-info-circle"></i> 未开始定时
                    </div>
                </div>
                
                <!-- 多网址定时跳转 -->
                <div class="timer-tab-content" id="multi-tab">
                    <div class="form-group">
                        <div class="form-label timer-theme">
                            <i class="fas fa-globe"></i> 网址
                        </div>
                        <input type="text" id="multi-url" class="form-control timer-theme overflow-ellipsis" placeholder="请输入网址">
                    </div>
                    <div class="form-group">
                        <div class="form-label timer-theme">
                            <i class="fas fa-clock"></i> 停留时长（跳转后开始计时）
                        </div>
                        <div class="time-inputs">
                            <div class="time-input-group">
                                <div class="time-label timer-theme">小时</div>
                                <input type="number" id="multi-hours" class="time-input timer-theme" min="0" value="0">
                            </div>
                            <div class="time-input-group">
                                <div class="time-label timer-theme">分</div>
                                <input type="number" id="multi-minutes" class="time-input timer-theme" min="0" max="59" value="0">
                            </div>
                            <div class="time-input-group">
                                <div class="time-label timer-theme">秒</div>
                                <input type="number" id="multi-seconds" class="time-input timer-theme" min="0" max="59" value="30">
                            </div>
                        </div>
                        <div class="checkbox-item timer-theme">
                            <input type="checkbox" id="no-close" name="no-close">
                            <label for="no-close">
                                <i class="fas fa-external-link-alt"></i> 在新标签页打开（不关闭当前页）
                            </label>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn btn-primary timer-theme" id="add-task">
                            <i class="fas fa-plus"></i> 添加到列表
                        </button>
                        <button class="btn btn-secondary timer-theme" id="clear-tasks">
                            <i class="fas fa-trash"></i> 清空列表
                        </button>
                    </div>
                    <div class="task-list timer-theme" id="task-list"></div>
                    <div class="actions">
                        <button class="btn btn-primary timer-theme" id="start-multi">
                            <i class="fas fa-play"></i> 开始执行任务
                        </button>
                        <button class="btn btn-secondary timer-theme" id="stop-multi">
                            <i class="fas fa-stop"></i> 停止执行
                        </button>
                    </div>
                    <div class="status timer-theme" id="multi-status">
                        <i class="fas fa-info-circle"></i> 未开始执行
                    </div>
                </div>
            </div>
        `;

        // 最小化界面
        const miniUI = document.createElement('div');
        miniUI.id = 'timer-mini';
        miniUI.className = `timer-theme timer-${theme}`;
        miniUI.innerHTML = '<i class="fas fa-hourglass"></i> <span id="mini-time">00:00:00</span>';

        document.body.appendChild(mainUI);
        document.body.appendChild(miniUI);

        // 定位UI - 移动设备上默认居中显示
        const isMobile = window.innerWidth <= 768;
        const mainPos = Storage.getPos(
            'timer_manager',
            isMobile ? (window.innerWidth - 380) / 2 : window.innerWidth - 410,
            isMobile ? 20 : 20
        );
        mainUI.style.left = `${mainPos.x}px`;
        mainUI.style.top = `${mainPos.y}px`;

        const miniPos = Storage.getPos(
            'timer_mini',
            isMobile ? (window.innerWidth - 180) / 2 : window.innerWidth - 180,
            isMobile ? window.innerHeight - 70 : 20
        );
        miniUI.style.left = `${miniPos.x}px`;
        miniUI.style.top = `${miniPos.y}px`;

        // 初始显示状态 - 移动设备默认显示完整界面
        if (isMobile) {
            mainUI.style.display = 'block';
            miniUI.style.display = 'none';
        } else {
            mainUI.style.display = 'none';
            miniUI.style.display = 'flex';
        }

        return { mainUI, miniUI };
    }

    // 定时器控制器
    class TimerController {
        constructor(ui) {
            this.ui = ui;
            this.currentTimer = null;
            this.multiTimer = null;
            this.remainingTime = 0;
            this.currentTaskIndex = -1;
            this.tasks = Storage.getTasks();
            this.isMinimized = window.innerWidth > 768; // 移动设备默认不最小化
            this.isMultiRunning = false;
            this.lastUpdateTime = 0;
            this.isCurrentTimerRunning = false;
            this.miniTimeElement = document.getElementById('mini-time');
            this.currentTheme = Storage.getTheme();
            this.doubleClickDelay = 300; // 双击检测延迟
            this.lastClickTime = 0;

            // 恢复多任务状态
            const savedState = Storage.getMultiState();
            if (savedState.running && savedState.index >= 0 && this.tasks.length > savedState.index) {
                this.isMultiRunning = true;
                this.currentTaskIndex = savedState.index;
                this.remainingTime = savedState.remaining;
                this.startTaskTimer();
            }

            this.initEvents();
            this.renderTasks();
            this.fixInputFields();
            
            // 监听窗口大小变化，调整UI位置
            window.addEventListener('resize', () => this.adjustForScreenSize());
        }

        // 根据屏幕尺寸调整UI
        adjustForScreenSize() {
            const isMobile = window.innerWidth <= 768;
            const mainUI = document.getElementById('timer-manager');
            const miniUI = document.getElementById('timer-mini');
            
            // 移动设备显示完整界面，隐藏最小化界面
            if (isMobile) {
                mainUI.style.display = 'block';
                miniUI.style.display = 'none';
                this.isMinimized = false;
            } else if (!this.isCurrentTimerRunning && !this.isMultiRunning) {
                // 非移动设备且无定时器运行时显示最小化界面
                mainUI.style.display = 'none';
                miniUI.style.display = 'flex';
                this.isMinimized = true;
            }
        }

        // 切换主题
        toggleTheme() {
            const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            
            // 更新存储的主题
            Storage.setTheme(newTheme);
            this.currentTheme = newTheme;
            
            // 更新所有主题相关元素的类
            document.querySelectorAll('.timer-theme').forEach(el => {
                el.classList.remove(`timer-${this.currentTheme === 'light' ? 'dark' : 'light'}`);
                el.classList.add(`timer-${newTheme}`);
            });
            
            // 更新主题图标
            const themeIcon = document.querySelector('#theme-toggle i');
            themeIcon.className = `fas ${newTheme === 'light' ? 'fa-moon' : 'fa-sun'}`;
        }

        // 修复输入框交互 - 增强移动设备体验
        fixInputFields() {
            const inputs = document.querySelectorAll('.time-input, .form-control');
            inputs.forEach(input => {
                input.readOnly = false;
                input.disabled = false;
                input.style.pointerEvents = 'auto';
                input.style.fontSize = input.classList.contains('time-input') ? '20px' : '16px';
                
                // 移动设备上优化数字输入
                if (input.type === 'number') {
                    input.inputMode = 'numeric';
                    input.pattern = '[0-9]*';
                }
                
                input.addEventListener('focus', () => {
                    input.style.borderColor = 'var(--accent-color)';
                    // 移动设备上输入框聚焦时滚动到可见区域
                    if (window.innerWidth <= 768) {
                        setTimeout(() => {
                            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                    }
                });
                
                if (input.type === 'number') {
                    input.addEventListener('input', (e) => {
                        const value = parseInt(e.target.value) || 0;
                        if (e.target.max) e.target.value = Math.min(value, parseInt(e.target.max));
                        if (e.target.min) e.target.value = Math.max(value, parseInt(e.target.min));
                    });
                }
            });
        }

        initEvents() {
            // 主题切换
            document.getElementById('theme-toggle').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTheme();
            });

            // 标签页切换
            document.querySelectorAll('.timer-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tabId = tab.getAttribute('data-tab');
                    
                    document.querySelectorAll('.timer-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.timer-tab-content').forEach(c => c.classList.remove('active'));
                    
                    tab.classList.add('active');
                    document.getElementById(`${tabId}-tab`).classList.add('active');
                });
            });

            // 结束操作选择
            const actionUrl = document.getElementById('action-url');
            const targetUrl = document.getElementById('target-url');
            
            document.getElementById('action-blank').addEventListener('change', () => {
                targetUrl.style.display = 'none';
            });
            
            actionUrl.addEventListener('change', () => {
                targetUrl.style.display = 'block';
            });

            // 当前网页定时控制
            document.getElementById('start-current').addEventListener('click', () => this.startCurrentTimer());
            document.getElementById('stop-current').addEventListener('click', () => this.stopCurrentTimer());

            // 多网址任务控制
            document.getElementById('add-task').addEventListener('click', () => this.addTask());
            document.getElementById('clear-tasks').addEventListener('click', () => this.clearTasks());
            document.getElementById('start-multi').addEventListener('click', () => this.startMultiTimer());
            document.getElementById('stop-multi').addEventListener('click', () => this.stopMultiTimer());

            // 最小化/恢复 - 单击最小化，双击恢复
            document.getElementById('minimize-btn').addEventListener('click', () => this.minimize());
            
            // 双击最小化界面打开UI
            this.ui.miniUI.addEventListener('click', (e) => {
                const now = Date.now();
                // 检测双击（300ms内连续点击）
                if (now - this.lastClickTime < this.doubleClickDelay) {
                    this.restore();
                    this.lastClickTime = 0; // 重置双击检测
                } else {
                    this.lastClickTime = now;
                }
            });

            // 使UI可拖动
            this.makeDraggable(this.ui.mainUI, 'timer_manager');
            this.makeDraggable(this.ui.miniUI, 'timer_mini');

            // 防止拖动事件影响输入框
            const inputs = document.querySelectorAll('input, button, .timer-btn');
            inputs.forEach(input => {
                input.addEventListener('mousedown', (e) => e.stopPropagation());
                input.addEventListener('touchstart', (e) => e.stopPropagation());
            });
        }

        // 优化拖动性能，支持触摸设备
        makeDraggable(element, storageKey) {
            let isDragging = false;
            let offsetX, offsetY;
            const originalZIndex = element.style.zIndex;
            let dragStartX, dragStartY;
            let lastDragTime = 0;

            // 同时支持鼠标和触摸事件
            element.addEventListener('pointerdown', startDrag);
            document.addEventListener('pointermove', drag);
            document.addEventListener('pointerup', endDrag);
            document.addEventListener('pointercancel', endDrag);

            function startDrag(e) {
                // 忽略按钮元素的拖动
                if (e.target.closest('.timer-btn, button, input')) return;
                
                e.preventDefault();
                const rect = element.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                isDragging = true;
                element.style.zIndex = '9999999';
                element.style.transition = 'none';
                lastDragTime = Date.now();
            }

            function drag(e) {
                if (!isDragging) return;
                
                // 限制拖动频率，提升性能
                const now = Date.now();
                if (now - lastDragTime < 16) return; // 约60fps
                lastDragTime = now;
                
                requestAnimationFrame(() => {
                    const x = e.clientX - offsetX;
                    const y = e.clientY - offsetY;
                    
                    const maxX = window.innerWidth - element.offsetWidth;
                    const maxY = window.innerHeight - element.offsetHeight;
                    const constrainedX = Math.max(0, Math.min(x, maxX));
                    const constrainedY = Math.max(0, Math.min(y, maxY));
                    
                    element.style.left = `${constrainedX}px`;
                    element.style.top = `${constrainedY}px`;
                });
            }

            function endDrag() {
                if (!isDragging) return;
                
                isDragging = false;
                element.style.zIndex = originalZIndex;
                element.style.transition = '';
                
                // 只有明显移动后才保存位置（防止误触）
                Storage.savePos(
                    storageKey,
                    parseInt(element.style.left),
                    parseInt(element.style.top)
                );
            }
        }

        // 格式化时间
        formatTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return [
                h.toString().padStart(2, '0'),
                m.toString().padStart(2, '0'),
                s.toString().padStart(2, '0')
            ].join(':');
        }

        // 开始当前网页定时
        startCurrentTimer() {
            this.stopCurrentTimer();
            this.stopMultiTimer();
            
            const hours = Math.max(0, parseInt(document.getElementById('current-hours').value) || 0);
            const minutes = Math.max(0, Math.min(59, parseInt(document.getElementById('current-minutes').value) || 0));
            const seconds = Math.max(0, Math.min(59, parseInt(document.getElementById('current-seconds').value) || 0));
            
            this.remainingTime = hours * 3600 + minutes * 60 + seconds;
            
            if (this.remainingTime <= 0) {
                document.getElementById('current-status').innerHTML = '<i class="fas fa-exclamation-triangle"></i> 请设置有效的时间（大于0秒）';
                return;
            }
            
            this.isCurrentTimerRunning = true;
            const timeStr = this.formatTime(this.remainingTime);
            document.getElementById('current-status').innerHTML = `<i class="fas fa-hourglass-start"></i> 定时中: ${timeStr}`;
            this.miniTimeElement.textContent = timeStr;
            
            // 移动设备上保持主界面显示
            if (window.innerWidth <= 768) {
                this.ui.mainUI.style.display = 'block';
                this.ui.miniUI.style.display = 'none';
            } else {
                this.ui.mainUI.style.display = 'none';
                this.ui.miniUI.style.display = 'flex';
            }
            
            this.lastUpdateTime = Date.now();
            this.currentTimer = requestAnimationFrame(this.updateCurrentTimer.bind(this));
        }

        // 更新当前定时器
        updateCurrentTimer() {
            if (!this.currentTimer || !this.isCurrentTimerRunning) return;
            
            const now = Date.now();
            const elapsed = Math.floor((now - this.lastUpdateTime) / 1000);
            
            if (elapsed >= 1) {
                this.remainingTime -= elapsed;
                this.lastUpdateTime = now;
                
                if (this.remainingTime <= 0) {
                    this.stopCurrentTimer();
                    this.executeCurrentAction();
                    document.getElementById('current-status').innerHTML = '<i class="fas fa-check-circle"></i> 定时结束';
                    this.miniTimeElement.textContent = '00:00:00';
                    
                    // 定时结束后根据设备类型调整显示状态
                    if (window.innerWidth > 768) {
                        this.ui.mainUI.style.display = 'none';
                        this.ui.miniUI.style.display = 'flex';
                    }
                    return;
                }
                
                const timeStr = this.formatTime(this.remainingTime);
                document.getElementById('current-status').innerHTML = `<i class="fas fa-hourglass-start"></i> 定时中: ${timeStr}`;
                this.miniTimeElement.textContent = timeStr;
            }
            
            this.currentTimer = requestAnimationFrame(this.updateCurrentTimer.bind(this));
        }

        // 停止当前定时器
        stopCurrentTimer() {
            if (this.currentTimer) {
                cancelAnimationFrame(this.currentTimer);
                this.currentTimer = null;
            }
            this.isCurrentTimerRunning = false;
            document.getElementById('current-status').innerHTML = '<i class="fas fa-info-circle"></i> 已停止';
            this.adjustForScreenSize(); // 根据屏幕尺寸调整显示状态
        }

        // 执行当前网页定时结束后的操作
        executeCurrentAction() {
            const action = document.querySelector('input[name="end-action"]:checked').value;
            
            if (action === 'url') {
                const url = document.getElementById('target-url').value.trim();
                if (url) {
                    window.location.href = url.startsWith('http') ? url : `https://${url}`;
                    return;
                }
            }
            
            // 跳转至空白页
            window.location.href = 'about:blank';
        }

        // 添加多网址任务
        addTask() {
            const urlInput = document.getElementById('multi-url');
            const url = urlInput.value.trim();
            
            if (!url) {
                this.updateMultiStatus('<i class="fas fa-exclamation-triangle"></i> 请输入有效的网址');
                return;
            }
            
            const hours = Math.max(0, parseInt(document.getElementById('multi-hours').value) || 0);
            const minutes = Math.max(0, Math.min(59, parseInt(document.getElementById('multi-minutes').value) || 0));
            const seconds = Math.max(0, Math.min(59, parseInt(document.getElementById('multi-seconds').value) || 0));
            const duration = hours * 3600 + minutes * 60 + seconds;
            
            if (duration <= 0) {
                this.updateMultiStatus('<i class="fas fa-exclamation-triangle"></i> 请设置有效的停留时间（大于0秒）');
                return;
            }
            
            const noClose = document.getElementById('no-close').checked;
            
            // 确保URL格式正确
            const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
            
            this.tasks.push({
                url: formattedUrl,
                duration: duration,
                noClose: noClose
            });
            
            Storage.saveTasks(this.tasks);
            this.renderTasks();
            this.updateMultiStatus('<i class="fas fa-check-circle"></i> 已添加到任务列表');
            
            // 清空输入
            urlInput.value = '';
            document.getElementById('multi-seconds').value = '30';
            document.getElementById('multi-minutes').value = '0';
            document.getElementById('multi-hours').value = '0';
        }

        // 渲染任务列表
        renderTasks() {
            const taskList = document.getElementById('task-list');
            taskList.innerHTML = '';
            
            if (this.tasks.length === 0) {
                taskList.innerHTML = `
                    <div class="task-item timer-theme" style="justify-content: center; padding: 15px;">
                        <i class="fas fa-list-ul"></i> 任务列表为空
                    </div>
                `;
                return;
            }
            
            this.tasks.forEach((task, index) => {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item timer-theme';
                taskItem.innerHTML = `
                    <div class="task-url timer-theme">
                        <i class="fas fa-link"></i>
                        <span class="overflow-ellipsis">${task.url}</span>
                    </div>
                    <div class="task-time timer-theme">
                        <i class="fas fa-clock"></i>
                        ${this.formatTime(task.duration)}
                    </div>
                    <div class="task-remove timer-theme" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </div>
                `;
                taskList.appendChild(taskItem);
            });
            
            // 添加删除任务事件
            document.querySelectorAll('.task-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.getAttribute('data-index'));
                    this.removeTask(index);
                });
            });
        }

        // 删除任务
        removeTask(index) {
            if (index >= 0 && index < this.tasks.length) {
                this.tasks.splice(index, 1);
                Storage.saveTasks(this.tasks);
                this.renderTasks();
                
                // 如果删除的是正在运行的任务，停止计时器
                if (this.isMultiRunning && index === this.currentTaskIndex) {
                    this.stopMultiTimer();
                } else if (this.isMultiRunning && index < this.currentTaskIndex) {
                    // 如果删除的是之前的任务，调整当前任务索引
                    this.currentTaskIndex--;
                    Storage.saveMultiState({
                        running: this.isMultiRunning,
                        index: this.currentTaskIndex,
                        remaining: this.remainingTime
                    });
                }
            }
        }

        // 清空任务列表
        clearTasks() {
            if (this.tasks.length === 0) return;
            
            if (confirm('确定要清空所有任务吗？')) {
                this.tasks = [];
                Storage.saveTasks(this.tasks);
                this.renderTasks();
                
                if (this.isMultiRunning) {
                    this.stopMultiTimer();
                }
            }
        }

        // 开始多网址定时跳转
        startMultiTimer() {
            if (this.tasks.length === 0) {
                this.updateMultiStatus('<i class="fas fa-exclamation-triangle"></i> 任务列表为空，请先添加任务');
                return;
            }
            
            this.stopCurrentTimer();
            this.stopMultiTimer();
            
            this.isMultiRunning = true;
            this.currentTaskIndex = 0;
            this.executeTask(0);
        }

        // 执行指定任务
        executeTask(index) {
            if (index >= this.tasks.length) {
                // 所有任务执行完毕
                this.stopMultiTimer();
                this.updateMultiStatus('<i class="fas fa-check-circle"></i> 所有任务执行完毕');
                return;
            }
            
            const task = this.tasks[index];
            this.remainingTime = task.duration;
            
            // 保存当前状态
            Storage.saveMultiState({
                running: true,
                index: index,
                remaining: this.remainingTime
            });
            
            // 打开URL
            if (task.noClose) {
                GM_openInTab(task.url, { active: true });
            } else {
                window.location.href = task.url;
            }
            
            // 更新状态
            this.updateMultiStatus(`<i class="fas fa-hourglass-start"></i> 正在执行任务 ${index + 1}/${this.tasks.length}，剩余: ${this.formatTime(this.remainingTime)}`);
            this.miniTimeElement.textContent = this.formatTime(this.remainingTime);
            
            // 移动设备上保持主界面显示
            if (window.innerWidth <= 768) {
                this.ui.mainUI.style.display = 'block';
                this.ui.miniUI.style.display = 'none';
            } else {
                this.ui.mainUI.style.display = 'none';
                this.ui.miniUI.style.display = 'flex';
            }
            
            this.lastUpdateTime = Date.now();
            this.multiTimer = requestAnimationFrame(this.updateMultiTimer.bind(this));
        }

        // 更新多任务定时器
        updateMultiTimer() {
            if (!this.multiTimer || !this.isMultiRunning) return;
            
            const now = Date.now();
            const elapsed = Math.floor((now - this.lastUpdateTime) / 1000);
            
            if (elapsed >= 1) {
                this.remainingTime -= elapsed;
                this.lastUpdateTime = now;
                
                // 保存剩余时间
                Storage.saveMultiState({
                    running: true,
                    index: this.currentTaskIndex,
                    remaining: this.remainingTime
                });
                
                if (this.remainingTime <= 0) {
                    // 当前任务执行完毕，执行下一个
                    this.currentTaskIndex++;
                    cancelAnimationFrame(this.multiTimer);
                    this.multiTimer = null;
                    this.executeTask(this.currentTaskIndex);
                    return;
                }
                
                const timeStr = this.formatTime(this.remainingTime);
                this.updateMultiStatus(`<i class="fas fa-hourglass-start"></i> 正在执行任务 ${this.currentTaskIndex + 1}/${this.tasks.length}，剩余: ${timeStr}`);
                this.miniTimeElement.textContent = timeStr;
            }
            
            this.multiTimer = requestAnimationFrame(this.updateMultiTimer.bind(this));
        }

        // 停止多任务定时器
        stopMultiTimer() {
            if (this.multiTimer) {
                cancelAnimationFrame(this.multiTimer);
                this.multiTimer = null;
            }
            
            this.isMultiRunning = false;
            this.currentTaskIndex = -1;
            this.updateMultiStatus('<i class="fas fa-info-circle"></i> 已停止执行');
            Storage.saveMultiState({
                running: false,
                index: 0,
                remaining: 0
            });
            
            this.adjustForScreenSize(); // 根据屏幕尺寸调整显示状态
        }

        // 更新多任务状态
        updateMultiStatus(text) {
            document.getElementById('multi-status').innerHTML = text;
        }

        // 最小化界面
        minimize() {
            if (window.innerWidth <= 768) {
                // 移动设备不最小化，而是显示提示
                alert('移动设备上不支持最小化，保持完整界面显示');
                return;
            }
            
            this.ui.mainUI.style.display = 'none';
            this.ui.miniUI.style.display = 'flex';
            this.isMinimized = true;
        }

        // 恢复界面
        restore() {
            this.ui.mainUI.style.display = 'block';
            this.ui.miniUI.style.display = 'none';
            this.isMinimized = false;
        }

        // 开始任务计时器（用于恢复状态）
        startTaskTimer() {
            this.isMultiRunning = true;
            this.updateMultiStatus(`<i class="fas fa-hourglass-start"></i> 正在执行任务 ${this.currentTaskIndex + 1}/${this.tasks.length}，剩余: ${this.formatTime(this.remainingTime)}`);
            this.miniTimeElement.textContent = this.formatTime(this.remainingTime);
            
            this.lastUpdateTime = Date.now();
            this.multiTimer = requestAnimationFrame(this.updateMultiTimer.bind(this));
        }
    }

    // 初始化
    const theme = Storage.getTheme();
    const ui = createUI(theme);
    const timerController = new TimerController(ui);

    // 注册菜单命令，方便在移动设备上打开
    GM_registerMenuCommand("打开网页定时管理器", () => {
        ui.mainUI.style.display = 'block';
        ui.miniUI.style.display = 'none';
        timerController.isMinimized = false;
    });
})();