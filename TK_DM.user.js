// ==UserScript==
// @name         TK 达人建联DM助手
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  TK 达人建联DM助手，话术存储，辅助回复，达人打标签
// @match        https://affiliate.tiktokglobalshop.com/seller/im**
// @match        https://affiliate.tiktokshopglobalselling.com/seller/im**
// @updateURL    https://raw.githubusercontent.com/1024deer/scripts/main/TK_DM.meta.js
// @downloadURL  https://raw.githubusercontent.com/1024deer/scripts/main/TK_DM.user.js
// @grant        GM_xmlhttpRequest
// @connect      117.72.98.112
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

(function () {
    'use strict';
    // 主应用状态
    const state = {
        showMainPanel: true,
        showFloatButton: true,
        activeTab: 'phrases',
        debugMessages: [],
        debugPanelVisible: false,
        aiLoading: false,
        country: 'EN',
        searchKeyword: '',
        selectedCategory: 'all',
        phrases: [],
        loading: false,
        aiPrompt: '',
        aiResponse: '',
        settings: {
            autoTranslate: false,
            themeColor: '#409EFF',
            username: "", //填自己名字
            showMainPanelDefault: true,
        }

    };
    let usernameChanged = false;
    // 从 localStorage 中获取设置
    const storedSettings = localStorage.getItem('tk-settings');
    if (storedSettings) {
        state.settings = JSON.parse(storedSettings);
        state.showMainPanel = state.settings.showMainPanelDefault;
    }
    const server_url = "https://117.72.98.112";
    // 话术数据结构示例
    // const samplePhrases = [
    //     {
    //         id: 4,
    //         category: '初次触达',
    //         summary: '邀请合作1',
    //         content: {
    //             zh: '我们看了你的短视频主页，风格非常符合我们的产品。我们非常期待与您合作推广我们的产品！',
    //             en: "We have looked at your short video profile, and your style aligns perfectly with our products. We are very much looking forward to collaborating with you to promote our products!",
    //             my: 'Kami telah melihat profil video pendek Anda, dan gaya Anda sangat sesuai dengan produk kami. Kami sangat menantikan untuk berkolaborasi dengan Anda dalam mempromosikan produk kami!',
    //             ph: 'Nakita namin ang iyong maikling video profile, at ang iyong estilo ay talagang akma sa aming mga produkto. Labis kaming umaasa sa pakikipagtulungan sa iyo upang itaguyod ang aming mga produkto!',
    //             th: 'เราได้ดูโปรไฟล์วิดีโอสั้นของคุณ และสไตล์ของคุณตรงกับผลิตภัณฑ์ของเราอย่างมาก เราหวังว่าจะได้ร่วมงานกับคุณเพื่อโปรโมตผลิตภัณฑ์ของเรา!',
    //             vn: 'Chúng tôi đã xem trang video ngắn của bạn, và phong cách của bạn hoàn toàn phù hợp với sản phẩm của chúng tôi. Chúng tôi rất mong được hợp tác với bạn để quảng bá sản phẩm của chúng tôi!'
    //         },
    //         frequency: 41
    //     }
    // ];

    // API相关函数
    const api = {
        // 获取话术列表
        async getPhrases() {
            try {
                debugLog('开始获取话术列表...');
                state.loading = true;

                // 模拟API调用 - 在实际使用时替换为真实的API地址

                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: server_url + `/api/templates/by_username?username=${state.settings.username}`,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer your-token'
                        },
                        onload: function (response) {
                            if (response.status === 200) {
                                resolve(JSON.parse(response.responseText));
                            } else {
                                reject(new Error('API request failed'));
                            }
                        },
                        onerror: function (error) {
                            reject(error);
                        }
                    });
                });
                state.phrases = response.templates;
                console.log(response);


                // 使用示例数据
                // await new Promise(resolve => setTimeout(resolve, 500)); // 模拟网络延迟
                // state.phrases = samplePhrases;

                debugLog(`成功获取 ${state.phrases.length} 条话术`);
                state.loading = false;
                render();
            } catch (error) {
                debugLog(`获取话术失败: ${error.message}`);
                state.loading = false;
                render();
            }
        },

        // 更新话术使用频率
        async updatePhraseFrequency(phraseId) {
            try {
                const phrase = state.phrases.find(p => p.id === phraseId);
                if (phrase) {
                    phrase.frequency += 1;
                    debugLog(`更新话术${phraseId}使用频率: ${phrase.frequency}`);

                    // 实际API调用

                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: server_url + `/api/templates/increment_frequency`,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer your-token'
                        },
                        data: JSON.stringify({ id: phraseId }),
                        onload: function (response) {
                            if (response.status === 200) {
                                debugLog('频率更新成功');
                            }
                        }
                    });

                }
            } catch (error) {
                debugLog(`更新频率失败: ${error.message}`);
            }
        }
    };

    // 话术相关函数
    const phraseUtils = {
        // 获取常用话术（按频率排序，前3个）
        getPopularPhrases() {
            return [...state.phrases]
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 3);
        },

        // 获取所有类别
        getCategories() {
            const categories = [...new Set(state.phrases.map(p => p.category))];
            return ['all', ...categories];
        },

        // 搜索话术
        searchPhrases(keyword = '', category = 'all') {
            let filtered = state.phrases;

            // 按类别过滤
            if (category !== 'all') {
                filtered = filtered.filter(p => p.category === category);
            }

            // 按关键词过滤
            if (keyword.trim()) {
                const searchTerm = keyword.toLowerCase().trim();
                filtered = filtered.filter(p =>
                    p.category.toLowerCase().includes(searchTerm) ||
                    p.summary.toLowerCase().includes(searchTerm) ||
                    p.content.zh.toLowerCase().includes(searchTerm)
                );
            }

            // 按频率排序
            return filtered.sort((a, b) => b.frequency - a.frequency);
        },

        // 获取指定语言的话术内容
        getPhraseContent(phrase, language) {
            const langMap = {
                'EN': 'en',
                'MY': 'my',
                'PH': 'ph',
                'TH': 'th',
                'VN': 'vn'
            };

            const langCode = langMap[language] || 'zh';
            return phrase.content[langCode] || phrase.content.zh;
        }
    };

    // 初始化应用
    const init = () => {
        // 检查是否已存在容器
        if (document.getElementById('tk-dm-helper-container')) return;

        console.log('Initializing TK DM Helper...');

        // 创建主容器
        const appContainer = document.createElement('div');
        appContainer.id = 'tk-dm-helper-container';
        document.body.appendChild(appContainer);

        // 添加全局样式
        addGlobalStyles();
        // 从 localStorage 中获取值
        const selectedShopRegion = localStorage.getItem('ecom-seller-affiliate-selected-shop-region');
        if (selectedShopRegion) {
            console.log('Selected shop region:', selectedShopRegion);
            // 在这里可以对获取到的值进行进一步处理
            state.country = selectedShopRegion;
        } else {
            console.log('No shop region selected or value not found in localStorage');
        }
        // 创建UI元素
        createFloatButton();
        createMainPanel();
        // createDebugPanel();
        // createDebugButton();

        // 初始渲染
        render();
        // 获取话术数据
        api.getPhrases();
    };

    // 添加全局样式
    function addGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 加载状态 */
            .loading {
                text-align: center;
                padding: 20px;
                color: #999;
            }

            .loading:after {
                content: "";
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #409EFF;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-left: 10px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* 搜索和筛选区域 */
            .search-filter-area {
                margin-bottom: 15px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
            }

            .search-input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
                margin-bottom: 10px;
                box-sizing: border-box;
            }

            .category-filter {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
                background: white;
                box-sizing: border-box;
            }

            /* 话术项样式优化 */
            .phrase-item {
                margin-bottom: 10px;
                padding: 12px;
                border: 1px solid #ebeef5;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
            }

            .phrase-item:hover {
                background: #f5f7fa;
                border-color: #409EFF;
                box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
            }

            .phrase-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .phrase-category {
                background: #409EFF;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }

            .phrase-frequency {
                color: #999;
                font-size: 12px;
            }

            .phrase-summary {
                font-weight: bold;
                color: #333;
                margin-bottom: 6px;
            }

            .phrase-content {
                color: #666;
                font-size: 14px;
                line-height: 1.4;
            }

            /* 常用话术区域 */
            /* 常用话术区域 - 原始样式保留 */
            .popular-phrases {
                margin-bottom: 20px;
            }

            .popular-title {
                font-size: 16px;
                font-weight: bold;
                color: #333;
                margin-bottom: 10px;
                padding-left: 8px;
                border-left: 4px solid #409EFF;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
            }

            /* 新增样式 */
            .popular-title .toggle-icon {
                font-size: 12px;
                transition: transform 0.3s ease;
                margin-left: 8px;
            }

            .popular-title.collapsed .toggle-icon {
                transform: rotate(-90deg);
            }

            .phrases-container {
                overflow: hidden;
                transition: 
                    max-height 0.3s ease-out, 
                    opacity 0.2s ease 0.1s;
                max-height: 1000px; /* 足够大的值容纳内容 */
                opacity: 1;
            }

            .phrases-container.collapsed {
                max-height: 0;
                opacity: 0;
                transition: 
                    max-height 0.3s ease-out, 
                    opacity 0.1s ease;
                margin-bottom: 0;
            }

            /* 空状态 */
            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: #999;
            }

            .empty-state img {
                width: 60px;
                height: 60px;
                opacity: 0.3;
                margin-bottom: 10px;
            }

            /* 国家选择框样式 */
            #country-select {
                padding: 0px 12px;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
                background-color: #fff;
                color: #606266;
                font-size: 14px;
                height: 32px;
                line-height: 32px;
                outline: none;
                transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
                box-sizing: border-box;
                appearance: none;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right 8px center;
                background-size: 14px;
                padding-right: 30px;
            }

            #country-select:hover {
                border-color: #c0c4cc;
            }

            #country-select:focus {
                border-color: #409EFF;
                outline: none;
                box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
            }

            /* 主浮动按钮 */
            #tk-float-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #409EFF;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 9999;
                border: none;
                outline: none;
                font-size: 20px;
            }

            /* 主功能面板 */
            #tk-main-panel {
                position: fixed;
                top: 0;
                right: 0;
                width: 25%;
                height: 100vh;
                background: white;
                box-shadow: -2px 0 10px rgba(0,0,0,0.1);
                z-index: 9998;
                overflow-y: auto;
                padding: 20px;
                box-sizing: border-box;
                display: none;
            }

            #tk-main-panel.visible {
                display: block;
            }

            /* 面板标题 */
            .panel-title {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            /* 标签页容器 */
            .tabs-container {
                margin-top: 15px;
            }

            /* 标签页导航 */
            .tab-nav {
                display: flex;
                border-bottom: 1px solid #ebeef5;
                margin-bottom: 15px;
            }

            .tab-nav-item {
                padding: 10px 20px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
            }

            .tab-nav-item.active {
                color: #409EFF;
                border-bottom-color: #409EFF;
            }

            /* 标签页内容 */
            .tab-content {
                padding: 15px 0;
                display: none;
            }

            .tab-content.active {
                display: block;
            }

            /* AI输入区域 */
            .ai-textarea {
                width: 100%;
                min-height: 100px;
                margin-bottom: 10px;
                padding: 10px;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
                box-sizing: border-box;
            }

            /* 按钮样式 */
            .el-button {
                display: inline-block;
                line-height: 1;
                white-space: nowrap;
                cursor: pointer;
                background: #fff;
                border: 1px solid #dcdfe6;
                color: #606266;
                text-align: center;
                box-sizing: border-box;
                outline: none;
                margin: 0;
                transition: .1s;
                font-weight: 500;
                padding: 12px 20px;
                font-size: 14px;
                border-radius: 4px;
            }

            .el-button--primary {
                color: #fff;
                background-color: #409EFF;
                border-color: #409EFF;
            }

            .el-button--small {
                padding: 9px 15px;
                font-size: 12px;
                border-radius: 3px;
            }

            /* 调试面板 */
            #tk-debug-panel {
                position: fixed;
                bottom: 10px;
                left: 10px;
                width: 300px;
                max-height: 200px;
                background: rgba(0,0,0,0.7);
                color: #fff;
                padding: 10px;
                border-radius: 4px;
                overflow-y: auto;
                font-family: monospace;
                font-size: 12px;
                z-index: 99999;
                display: none;
            }

            #tk-debug-panel.visible {
                display: block;
            }

            /* 表单元素 */
            .el-form-item {
                margin-bottom: 18px;
                display: flex;
                align-items: center;
            }

            .el-form-item__label {
                width: 100px;
                text-align: right;
                padding-right: 12px;
                box-sizing: border-box;
            }

            .el-switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
            }

            .el-switch__core {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #dcdfe6;
                border-radius: 10px;
                transition: background-color .3s;
            }

            .el-switch__core:after {
                content: "";
                position: absolute;
                top: 2px;
                left: 2px;
                width: 16px;
                height: 16px;
                background-color: #fff;
                border-radius: 50%;
                transition: all .3s;
            }

            .el-switch.is-checked .el-switch__core {
                background-color: #409EFF;
            }

            .el-switch.is-checked .el-switch__core:after {
                left: 100%;
                margin-left: -18px;
            }

            /* 颜色选择器 */
            .el-color-picker {
                position: relative;
                display: inline-block;
            }

            .el-color-picker__trigger {
                width: 30px;
                height: 30px;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
                cursor: pointer;
            }

            .el-color-picker__color {
                width: 100%;
                height: 100%;
                border-radius: 3px;
            }
        `;
        document.head.appendChild(style);
    }

    // 创建浮动按钮
    function createFloatButton() {
        const floatButton = document.createElement('button');
        floatButton.id = 'tk-float-button';
        floatButton.innerHTML = '💬';
        floatButton.addEventListener('click', () => {
            state.showMainPanel = !state.showMainPanel;
            render();
        });
        document.body.appendChild(floatButton);
    }

    // 创建主面板
    function createMainPanel() {
        const mainPanel = document.createElement('div');
        mainPanel.id = 'tk-main-panel';
        mainPanel.className = state.showMainPanel ? 'visible' : '';

        // 面板标题
        const panelTitle = document.createElement('div');
        panelTitle.className = 'panel-title';

        const title = document.createElement('h3');
        title.textContent = 'TK DM助手';
        title.style.margin = '0';

        // 创建国家选择框
        // 创建国家选择框
        const countrySelect = document.createElement('select');
        countrySelect.id = 'country-select';

        // 国家选项配置
        const countryOptions = [
            { value: 'EN', label: '英语' },
            { value: 'MY', label: '马来语' },
            { value: 'PH', label: '菲律宾语' },
            { value: 'TH', label: '泰语' },
            { value: 'VN', label: '越南语' }
        ];

        // 从localStorage获取保存的国家代码（使用你的key）
        const savedCountry = localStorage.getItem('ecom-seller-affiliate-selected-shop-region');

        // 确定默认国家（优先使用localStorage的值，没有则使用state.country）
        const defaultCountry = savedCountry && countryOptions.some(opt => opt.value === savedCountry)
            ? savedCountry
            : state.country;

        // 添加选项到select
        countryOptions.forEach(option => {
            const optionElement = new Option(option.label, option.value);
            // 如果是默认选项则设置为选中
            if (option.value === defaultCountry) {
                optionElement.selected = true;
            }
            countrySelect.appendChild(optionElement);
        });

        // 确保默认值被正确设置（双重保障）
        countrySelect.value = defaultCountry;

        // 添加change事件监听器
        countrySelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            state.country = selectedValue;
            debugLog(`切换语言: ${selectedValue}`);
            // 这里可以添加其他需要执行的逻辑
        });

        const closeButton = document.createElement('button');
        closeButton.className = 'el-button el-button--small is-circle';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', () => {
            state.showMainPanel = false;
            render();
        });

        panelTitle.appendChild(title);
        panelTitle.appendChild(countrySelect);
        panelTitle.appendChild(closeButton);

        mainPanel.appendChild(panelTitle);

        // 标签页导航
        const tabNav = document.createElement('div');
        tabNav.className = 'tab-nav';

        const tabs = [
            { id: 'phrases', label: '快捷话术' },
            { id: 'ai', label: 'AI辅助' },
            { id: 'settings', label: '设置' }
        ];

        tabs.forEach(tab => {
            const tabItem = document.createElement('div');
            tabItem.className = `tab-nav-item ${state.activeTab === tab.id ? 'active' : ''}`;
            tabItem.textContent = tab.label;
            tabItem.addEventListener('click', () => {
                state.activeTab = tab.id;
                render();
            });
            tabNav.appendChild(tabItem);
        });

        mainPanel.appendChild(tabNav);

        // 标签页内容
        const tabContentContainer = document.createElement('div');
        tabContentContainer.className = 'tabs-container';

        // 话术标签页
        const phrasesTab = document.createElement('div');
        phrasesTab.className = `tab-content ${state.activeTab === 'phrases' ? 'active' : ''}`;
        phrasesTab.id = 'phrases-tab';

        if (state.loading) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading';
            loadingDiv.textContent = '加载话术中...';
            phrasesTab.appendChild(loadingDiv);
        } else {
            // 搜索和筛选区域
            const searchFilterArea = document.createElement('div');
            searchFilterArea.className = 'search-filter-area';

            const searchInput = document.createElement('input');
            searchInput.className = 'search-input';
            searchInput.placeholder = '搜索话术...';
            searchInput.value = state.searchKeyword;
            searchInput.addEventListener('input', (e) => {
                state.searchKeyword = e.target.value;
                renderPhrasesList();
            });

            const categorySelect = document.createElement('select');
            categorySelect.className = 'category-filter';
            categorySelect.value = state.selectedCategory;
            categorySelect.addEventListener('change', (e) => {
                state.selectedCategory = e.target.value;
                renderPhrasesList();
            });

            // 添加类别选项
            const categories = phraseUtils.getCategories();
            categories.forEach(category => {
                const option = new Option(category === 'all' ? '全部类别' : category, category);
                categorySelect.appendChild(option);
            });

            searchFilterArea.appendChild(searchInput);
            searchFilterArea.appendChild(categorySelect);
            phrasesTab.appendChild(searchFilterArea);

            // 话术列表区域
            const phrasesListArea = document.createElement('div');
            phrasesListArea.id = 'phrases-list-area';
            phrasesTab.appendChild(phrasesListArea);

            // 渲染话术列表
            renderPhrasesList();

            // 常用话术区域
            const popularPhrasesArea = document.createElement('div');
            popularPhrasesArea.className = 'popular-phrases';

            const popularTitle = document.createElement('div');
            popularTitle.className = 'popular-title';
            popularTitle.innerHTML = '🔥 常用话术 <span class="toggle-icon">▼</span>';
            popularPhrasesArea.appendChild(popularTitle);

            // Create phrases container
            const phrasesContainer = document.createElement('div');
            phrasesContainer.className = 'phrases-container';

            const popularPhrases = phraseUtils.getPopularPhrases();
            popularPhrases.forEach(phrase => {
                const phraseItem = createPhraseItem(phrase, true);
                phrasesContainer.appendChild(phraseItem);
            });

            popularPhrasesArea.appendChild(phrasesContainer);

            // Add click event to toggle visibility
            popularTitle.addEventListener('click', function () {
                phrasesContainer.classList.toggle('collapsed');
                this.classList.toggle('collapsed');
            });

            phrasesTab.appendChild(popularPhrasesArea);


        }

        tabContentContainer.appendChild(phrasesTab);

        // AI辅助标签页
        const aiTab = document.createElement('div');
        aiTab.className = `tab-content ${state.activeTab === 'ai' ? 'active' : ''}`;
        aiTab.id = 'ai-tab';

        const aiTextarea = document.createElement('textarea');
        aiTextarea.className = 'ai-textarea';
        aiTextarea.placeholder = 'Developing...';
        aiTextarea.value = state.aiPrompt;
        aiTextarea.addEventListener('input', (e) => {
            state.aiPrompt = e.target.value;
        });

        const aiButton = document.createElement('button');
        aiButton.className = 'el-button el-button--primary';
        aiButton.textContent = '生成回复建议';
        if (state.aiLoading) {
            aiButton.disabled = true;
            aiButton.textContent = '生成中...';
        }
        aiButton.addEventListener('click', generateAIResponse);

        const aiResponse = document.createElement('div');
        aiResponse.style.marginTop = '15px';
        aiResponse.style.padding = '10px';
        aiResponse.style.background = '#f5f7fa';
        aiResponse.style.borderRadius = '4px';

        const aiResponseContent = document.createElement('pre');
        aiResponseContent.style.whiteSpace = 'pre-wrap';
        aiResponseContent.style.margin = '0';
        aiResponseContent.textContent = state.aiResponse;

        aiResponse.appendChild(aiResponseContent);

        aiTab.appendChild(aiTextarea);
        aiTab.appendChild(aiButton);
        if (state.aiResponse) {
            aiTab.appendChild(aiResponse);
        }
        tabContentContainer.appendChild(aiTab);

        // 设置标签页
        const settingsTab = document.createElement('div');
        settingsTab.className = `tab-content ${state.activeTab === 'settings' ? 'active' : ''}`;
        settingsTab.id = 'settings-tab';

        const form = document.createElement('div');
        form.className = 'el-form';
        //用户名设置
        const usernameItem = document.createElement('div');
        usernameItem.className = 'el-form-item';

        const usernameLabel = document.createElement('label');
        usernameLabel.className = 'el-form-item__label';
        usernameLabel.textContent = '用户名';

        const usernameInput = document.createElement('input');
        usernameInput.className = 'el-input__inner';
        usernameInput.value = state.settings.username;
        usernameInput.addEventListener('input', (e) => {
            state.settings.username = e.target.value;
            usernameChanged = true;
        });
        usernameItem.appendChild(usernameLabel);
        usernameItem.appendChild(usernameInput);
        form.appendChild(usernameItem);

        // 自动翻译设置
        const autoTranslateItem = document.createElement('div');
        autoTranslateItem.className = 'el-form-item';

        const autoTranslateLabel = document.createElement('label');
        autoTranslateLabel.className = 'el-form-item__label';
        autoTranslateLabel.textContent = '自动翻译';

        const autoTranslateSwitch = document.createElement('span');
        autoTranslateSwitch.className = `el-switch ${state.settings.autoTranslate ? 'is-checked' : ''}`;

        const switchCore = document.createElement('span');
        switchCore.className = 'el-switch__core';

        autoTranslateSwitch.appendChild(switchCore);
        autoTranslateSwitch.addEventListener('click', () => {
            state.settings.autoTranslate = !state.settings.autoTranslate;
            autoTranslateSwitch.className = `el-switch ${state.settings.autoTranslate ? 'is-checked' : ''}`;
        });

        autoTranslateItem.appendChild(autoTranslateLabel);
        autoTranslateItem.appendChild(autoTranslateSwitch);
        form.appendChild(autoTranslateItem);

        //默认开启设置
        const showMainPanelDefaultItem = document.createElement('div');
        showMainPanelDefaultItem.className = 'el-form-item';
        const showMainPanelDefaultLabel = document.createElement('label');
        showMainPanelDefaultLabel.className = 'el-form-item__label';
        showMainPanelDefaultLabel.textContent = '默认开启侧边栏';

        const showMainPanelDefaultSwitch = document.createElement('span');
        showMainPanelDefaultSwitch.className = `el-switch ${state.settings.showMainPanelDefault ? 'is-checked' : ''}`;

        const switchCore2 = document.createElement('span');
        switchCore2.className = 'el-switch__core';

        showMainPanelDefaultSwitch.appendChild(switchCore2);
        showMainPanelDefaultSwitch.addEventListener('click', () => {
            state.settings.showMainPanelDefault = !state.settings.showMainPanelDefault;
            showMainPanelDefaultSwitch.className = `el-switch ${state.settings.showMainPanelDefault ? 'is-checked' : ''}`;
        });

        showMainPanelDefaultItem.appendChild(showMainPanelDefaultLabel);
        showMainPanelDefaultItem.appendChild(showMainPanelDefaultSwitch);
        form.appendChild(showMainPanelDefaultItem);




        // 主题颜色设置
        const themeColorItem = document.createElement('div');
        themeColorItem.className = 'el-form-item';

        const themeColorLabel = document.createElement('label');
        themeColorLabel.className = 'el-form-item__label';
        themeColorLabel.textContent = '主题颜色';

        const colorPicker = document.createElement('div');
        colorPicker.className = 'el-color-picker';

        const colorTrigger = document.createElement('div');
        colorTrigger.className = 'el-color-picker__trigger';

        const colorDisplay = document.createElement('div');
        colorDisplay.className = 'el-color-picker__color';
        colorDisplay.style.backgroundColor = state.settings.themeColor;

        colorTrigger.appendChild(colorDisplay);
        colorPicker.appendChild(colorTrigger);

        // 简单颜色选择实现
        colorTrigger.addEventListener('click', () => {
            const color = prompt('请输入颜色值(如#409EFF):', state.settings.themeColor);
            if (color) {
                state.settings.themeColor = color;
                colorDisplay.style.backgroundColor = color;
                updateThemeColor();
            }
        });

        themeColorItem.appendChild(themeColorLabel);
        themeColorItem.appendChild(colorPicker);
        form.appendChild(themeColorItem);

        // 保存按钮
        const saveButtonItem = document.createElement('div');
        saveButtonItem.className = 'el-form-item';

        const saveButton = document.createElement('button');
        saveButton.className = 'el-button el-button--primary';
        saveButton.textContent = '保存设置';
        saveButton.addEventListener('click', saveSettings);

        saveButtonItem.appendChild(saveButton);
        form.appendChild(saveButtonItem);

        settingsTab.appendChild(form);
        tabContentContainer.appendChild(settingsTab);

        mainPanel.appendChild(tabContentContainer);
        document.body.appendChild(mainPanel);
    }

    // 创建话术项组件
    function createPhraseItem(phrase, isPopular = false) {
        const phraseItem = document.createElement('div');
        phraseItem.className = 'phrase-item';

        const phraseHeader = document.createElement('div');
        phraseHeader.className = 'phrase-header';

        const categoryTag = document.createElement('span');
        categoryTag.className = 'phrase-category';
        categoryTag.textContent = phrase.category;

        const frequencyLabel = document.createElement('span');
        frequencyLabel.className = 'phrase-frequency';
        frequencyLabel.textContent = `使用 ${phrase.frequency} 次`;

        phraseHeader.appendChild(categoryTag);
        phraseHeader.appendChild(frequencyLabel);

        const phraseSummary = document.createElement('div');
        phraseSummary.className = 'phrase-summary';
        phraseSummary.textContent = phrase.summary;

        const phraseContent = document.createElement('div');
        phraseContent.className = 'phrase-content';
        phraseContent.textContent = phrase.content.zh;

        phraseItem.appendChild(phraseHeader);
        phraseItem.appendChild(phraseSummary);
        phraseItem.appendChild(phraseContent);

        // 点击发送话术
        phraseItem.addEventListener('click', () => sendPhrase(phrase));

        return phraseItem;
    }

    // 渲染话术列表
    function renderPhrasesList() {
        const phrasesListArea = document.getElementById('phrases-list-area');
        if (!phrasesListArea) return;

        phrasesListArea.innerHTML = '';

        const filteredPhrases = phraseUtils.searchPhrases(state.searchKeyword, state.selectedCategory);

        if (filteredPhrases.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '📭<br>没有找到匹配的话术';
            phrasesListArea.appendChild(emptyState);
            return;
        }

        // 按类别分组显示
        const groupedPhrases = {};
        filteredPhrases.forEach(phrase => {
            if (!groupedPhrases[phrase.category]) {
                groupedPhrases[phrase.category] = [];
            }
            groupedPhrases[phrase.category].push(phrase);
        });

        Object.keys(groupedPhrases).forEach(category => {
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'popular-title';
            categoryTitle.textContent = category;
            categoryTitle.style.marginTop = '20px';
            phrasesListArea.appendChild(categoryTitle);

            groupedPhrases[category].forEach(phrase => {
                const phraseItem = createPhraseItem(phrase);
                phrasesListArea.appendChild(phraseItem);
            });
        });
    }

    // 创建调试面板
    function createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'tk-debug-panel';
        debugPanel.className = state.debugPanelVisible ? 'visible' : '';

        state.debugMessages.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.style.marginBottom = '5px';
            logEntry.textContent = `[${log.time}] ${log.message}`;
            debugPanel.appendChild(logEntry);
        });

        document.body.appendChild(debugPanel);
    }

    // 创建调试按钮
    function createDebugButton() {
        const debugButton = document.createElement('button');
        debugButton.textContent = '调试面板';
        debugButton.style.position = 'fixed';
        debugButton.style.bottom = '10px';
        debugButton.style.left = '10px';
        debugButton.style.background = '#409EFF';
        debugButton.style.color = 'white';
        debugButton.style.border = 'none';
        debugButton.style.borderRadius = '4px';
        debugButton.style.padding = '5px 10px';
        debugButton.style.cursor = 'pointer';
        debugButton.style.zIndex = '99999';

        debugButton.addEventListener('click', toggleDebugPanel);
        document.body.appendChild(debugButton);
    }

    // 更新主题颜色
    function updateThemeColor() {
        const style = document.createElement('style');
        style.id = 'tk-theme-color';
        style.textContent = `
            #tk-float-button,
            .el-button--primary,
            .tab-nav-item.active,
            .el-switch.is-checked .el-switch__core,
            .phrase-category,
            .popular-title {
                background-color: ${state.settings.themeColor} !important;
                border-color: ${state.settings.themeColor} !important;
            }

            .tab-nav-item.active {
                background-color: transparent !important;
                color: ${state.settings.themeColor} !important;
            }
        `;

        // 移除旧的样式
        const oldStyle = document.getElementById('tk-theme-color');
        if (oldStyle) oldStyle.remove();

        document.head.appendChild(style);
    }
    // 修改输入框的值
    function changeReactInputValue(inputDom, newText) {
        let lastValue = inputDom.value;
        inputDom.value = newText;
        let event = new Event('input', { bubbles: true });
        event.simulated = true;
        let tracker = inputDom._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }
        inputDom.dispatchEvent(event);

    }
    // 发送话术
    function sendPhrase(phrase) {
        const content = phraseUtils.getPhraseContent(phrase, state.country);
        debugLog(`发送话术 [${phrase.category}]: ${phrase.summary}`);
        debugLog(`内容: ${content}`);

        // 更新使用频率
        api.updatePhraseFrequency(phrase.id);

        // TODO: 实现实际发送逻辑
        // 这里需要根据具体的页面结构来实现自动填入聊天框的功能
        try {
            // 尝试查找聊天输入框并填入内容
            // 找到 id 为 im_sdk_chat_input 的 div 下的 textarea
            const chatDiv = document.getElementById('im_sdk_chat_input');
            const textarea = chatDiv.querySelector('textarea');
            if (textarea) {
                changeReactInputValue(textarea, content);
                debugLog('话术已填入聊天框');
                // 3. 模拟按下回车键
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });

                // 先触发keydown事件
                textarea.dispatchEvent(enterEvent);

                // 再触发keyup事件
                const enterUpEvent = new KeyboardEvent('keyup', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                textarea.dispatchEvent(enterUpEvent);

                debugLog('已模拟回车键发送');
            } else {
                // 如果找不到输入框，复制到剪贴板
                navigator.clipboard.writeText(content).then(() => {
                    debugLog('话术已复制到剪贴板');
                    alert('话术已复制到剪贴板，请手动粘贴');
                }).catch(() => {
                    debugLog('复制失败，请手动复制');
                    prompt('请复制以下内容:', content);
                });
            }
        } catch (error) {
            debugLog(`发送话术失败: ${error.message}`);
        }

        // 重新渲染以更新频率显示
        render();
    }

    // 生成AI回复
    function generateAIResponse() {
        debugLog('生成AI回复...');
        state.aiLoading = true;
        render();

        // 模拟AI API调用
        setTimeout(() => {
            const responses = [
                `关于"${state.aiPrompt}"的建议回复:\n\n感谢您的咨询，我们理解您的需求。基于我们的经验，建议您可以这样回复...\n\n请根据具体情况调整用词和语气。`,
                `针对您提到的"${state.aiPrompt}"，推荐以下回复思路:\n\n1. 首先表示理解和重视\n2. 提供具体的解决方案\n3. 表达合作意愿\n\n具体内容可以参考我们的话术库。`,
                `AI分析您的问题"${state.aiPrompt}"后，建议采用以下策略:\n\n- 保持专业和友好的态度\n- 突出我们的优势和特色\n- 给出明确的下一步行动建议\n\n请结合实际情况使用。`
            ];

            state.aiResponse = responses[Math.floor(Math.random() * responses.length)];
            state.aiLoading = false;
            debugLog('AI回复生成完成');
            render();
        }, 2000);
    }

    // 保存设置
    function saveSettings() {
        debugLog('设置已保存');
        updateThemeColor();
        // TODO: 实现本地存储保存逻辑
        alert('设置已保存');
        // 保存设置到本地存储
        localStorage.setItem('tk-settings', JSON.stringify(state.settings));
        if (usernameChanged) {
            // 发送请求更新话术列表
            api.getPhrases().then(() => {
                debugLog('话术列表已更新');
            }).catch(error => {
                debugLog(`更新话术列表失败: ${error.message}`);
            });
            usernameChanged = false;
            // 重新渲染界面
            render();
        }
    }

    // 调试日志
    function debugLog(message) {
        state.debugMessages.push({
            time: new Date().toLocaleTimeString(),
            message
        });

        // 保持最多50条记录
        if (state.debugMessages.length > 50) {
            state.debugMessages.shift();
        }

        console.log(`[TK DM Helper] ${message}`);
    }

    // 切换调试面板
    function toggleDebugPanel() {
        state.debugPanelVisible = !state.debugPanelVisible;
        render();
    }

    // 渲染整个应用
    function render() {
        // 清除旧的面板
        const oldMainPanel = document.getElementById('tk-main-panel');
        if (oldMainPanel) oldMainPanel.remove();

        const oldDebugPanel = document.getElementById('tk-debug-panel');
        if (oldDebugPanel) oldDebugPanel.remove();

        // 重新创建面板
        createMainPanel();
        // createDebugPanel();

        // 更新浮动按钮显示
        const floatButton = document.getElementById('tk-float-button');
        if (floatButton) {
            floatButton.style.display = state.showFloatButton ? 'flex' : 'none';
        }

        // 应用主题颜色
        updateThemeColor();
    }

    // 启动应用
    // if (document.readyState === 'complete' || document.readyState === 'interactive') {
    //     setTimeout(init, 1);
    // } else {
    //     document.addEventListener('DOMContentLoaded', init);
    // }
    init();

})();
