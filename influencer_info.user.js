// ==UserScript==
// @name         复制达人信息
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  在网页右侧添加可拖动的悬浮窗，点击显示表格数据、数据块信息和Top视频信息（已移除销售名称和星级功能，整合为统一JSON格式，支持未公开数据处理，货币转换为美元，新增直播数据提取，支持范围格式货币数据）
// @author       You
// @match        https://affiliate.tiktokglobalshop.com/connection/creator/detail*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      gaia.yafex.cn
// @updateURL    https://raw.githubusercontent.com/1024deer/scripts/main/influencer_info.meta.js
// @downloadURL  https://raw.githubusercontent.com/1024deer/scripts/main/influencer_info.user.js
// ==/UserScript==

(function () {
  'use strict';

  // 配置常量
  const CONFIG = {
    EXCHANGE_RATES: {
      'THB': 0.028,   // 1泰铢 ≈ 0.028美元
      'PHP': 0.018,   // 1菲律宾比索 ≈ 0.018美元
      'MYR': 0.21,    // 1马来西亚林吉特 ≈ 0.21美元
      'VND': 0.000041 // 1越南盾 ≈ 0.000041美元
    },
    CURRENCY_SYMBOLS: {
      '฿': 'THB',
      '₱': 'PHP',
      'RM': 'MYR',
      '₫': 'VND'
    },
    CURRENCY_TO_COUNTRY: {
      'THB': '泰国',
      'PHP': '菲律宾',
      'MYR': '马来西亚',
      'VND': '越南'
    },
    // 评分规则配置
    SCORING_RULES: {
      // 商业转化力 (40分)
      totalGMV: {
        '>2000': 20,
        '1000-2000': 15,
        '500-1000': 10,
        '<500': 5
      },
      categoryMatch: {
        '>50%': 15,
        '20-50%': 10,
        '5-20%': 5,
        '<5%': 0
      },
      fulfillmentRate: {
        '>=80%': 5,
        '<80%': 0
      },
      // 内容与互动潜力 (45分)
      hotVideo: {
        '>10k': 20,
        '>6k': 10,
        '>3k': 5,
        '<=3k': 0
      },
      avgViews: {
        '>200': 10,
        '>100': 6,
        '<=100': 0
      },
      publishFrequency: {
        '30-100': 10,
        'other': 5
      },
      // 账号健康度 (15分)
      shopRating: {
        'good': 10,
        '-20': -20
      },
      transactionCount: {
        '>200': 5,
        '<=200': 0
      }
    }
  };

  // 添加CSS样式
  GM_addStyle(`
      #data-float-btn {
          position: fixed;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: #4CAF50;
          color: white;
          padding: 10px;
          cursor: pointer;
          border-radius: 5px 0 0 5px;
          z-index: 9999;
          box-shadow: -2px 0 5px rgba(0,0,0,0.2);
          transition: all 0.3s;
          font-size: 14px;
          font-weight: bold;
      }

      #data-float-btn:hover {
          background: #45a049;
          transform: translateY(-50%) scale(1.05);
      }

      #data-modal {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
          z-index: 10000;
          max-width: 90%;
          max-height: 90vh;
          overflow: auto;
          min-width: 300px;
      }

      #data-modal pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: 'Courier New', monospace;
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          border: 1px solid #ddd;
          margin: 10px 0;
          font-size: 12px;
          line-height: 1.4;
      }

      #data-modal .close-btn {
          position: absolute;
          top: 10px;
          right: 15px;
          cursor: pointer;
          font-size: 24px;
          color: #888;
          line-height: 1;
      }

      #data-modal .close-btn:hover {
          color: #555;
      }

      .modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 9999;
      }

      .draggable {
          cursor: move;
          user-select: none;
      }

      .success-message {
          color: #4CAF50;
          font-weight: bold;
          margin-top: 10px;
          text-align: center;
      }

      .error-message {
          color: #f44336;
          font-weight: bold;
          margin-top: 10px;
          text-align: center;
      }

      .influencer-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
      }

      .influencer-table td {
          border: 1px solid #e0e0e0;
          padding: 8px 12px;
          font-size: 14px;
      }

      .influencer-label {
          background: #f7f7f7;
          font-weight: bold;
          width: 30%;
      }

      .influencer-value {
          background: #fff;
          color: #333;
      }

      .section-divider {
          border-top: 2px solid #e0e0e0;
          margin: 30px 0 20px 0;
          padding-top: 20px;
      }

      .section-title {
          color: #333;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #4CAF50;
      }

      .score-section {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 15px;
          box-shadow: 0 4px 15px rgba(76,175,80,0.2);
      }

      .score-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
          margin-top: 10px;
      }

      .score-item {
          background: rgba(255,255,255,0.15);
          padding: 10px 8px;
          border-radius: 8px;
          text-align: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
      }

      .score-label {
          font-size: 12px;
          margin-bottom: 4px;
          opacity: 0.95;
          font-weight: 500;
      }

      .score-value {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 2px;
      }

      .score-detail {
          font-size: 10px;
          opacity: 0.85;
      }

      .total-score {
          background: rgba(255,255,255,0.2);
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          margin-top: 10px;
          border: 1px solid rgba(255,255,255,0.3);
      }

      .total-score-value {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 2px;
      }

      .total-score-label {
          font-size: 12px;
          opacity: 0.9;
      }

      .profile-section {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 0;
          /* border-left: 4px solid #4CAF50;  // 移除绿色左边框 */
      }

      .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin-top: 8px;
      }

      .profile-item {
          background: white;
          padding: 8px 6px;
          border-radius: 6px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: 1px solid #e0e0e0;
      }

      .profile-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 3px;
          font-weight: 500;
      }

      .profile-value {
          font-size: 14px;
          font-weight: bold;
          color: #333;
      }

      .score-breakdown {
          background: rgba(255,255,255,0.95);
          padding: 10px;
          border-radius: 8px;
          margin-top: 10px;
          border: 1px solid rgba(255,255,255,0.3);
      }

      .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255,255,255,0.2);
      }

      .breakdown-item:last-child {
          border-bottom: none;
      }

      .breakdown-label {
          font-size: 12px;
          color: #333;
          font-weight: 500;
      }

      .breakdown-score {
          font-weight: bold;
          color: #4CAF50;
          font-size: 12px;
      }

      .unified-section {
          background: linear-gradient(135deg, #e3eafc 0%, #b6c8e6 100%);
          color: #222;
          padding: 24px 20px 20px 20px;
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 6px 24px rgba(100,120,180,0.15);
          border: 1px solid #dde3ee;
      }
      .total-score, .score-breakdown, .profile-compact {
          background: rgba(255,255,255,0.85);
          color: #222;
          border-radius: 12px;
          border: 1px solid #dde3ee;
          box-shadow: 0 4px 12px rgba(100,120,180,0.08);
      }

      .total-score-container {
          position: relative;
      }

      .score-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #2a4d8f;
          color: white;
          font-size: 12px;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(42,77,143,0.3);
      }

      .score-categories {
          display: flex;
          gap: 16px;
          margin: 20px 0;
      }

      .score-category {
          flex: 1;
          background: rgba(255,255,255,0.9);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid #dde3ee;
          box-shadow: 0 4px 12px rgba(100,120,180,0.08);
          position: relative;
          overflow: hidden;
      }

      .category-icon {
          font-size: 24px;
          margin-bottom: 8px;
      }

      .category-name {
          font-size: 14px;
          font-weight: 500;
          color: #555;
          margin-bottom: 8px;
      }

      .category-score {
          font-size: 28px;
          font-weight: 700;
          color: #2a4d8f;
      }

      .category-total {
          font-size: 14px;
          color: #888;
      }

      .category-bar {
          width: 100%;
          height: 6px;
          background: rgba(200,210,230,0.5);
          border-radius: 3px;
          margin-top: 12px;
          overflow: hidden;
      }

      .category-progress {
          height: 100%;
          border-radius: 3px;
          background: #2a4d8f;
      }

      .high-score .category-progress {
          background: #4CAF50;
      }

      .medium-score .category-progress {
          background: #FFC107;
      }

      .low-score .category-progress {
          background: #F44336;
      }

      .breakdown-title {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #333;
          font-weight: 600;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(200,210,230,0.5);
      }

      .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
      }

      .breakdown-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          grid-template-rows: auto auto;
          gap: 4px 8px;
          padding: 10px;
          background: rgba(255,255,255,0.7);
          border-radius: 8px;
          border: 1px solid rgba(200,210,230,0.5);
          align-items: center;
      }

      .breakdown-icon {
          grid-row: 1 / 3;
          grid-column: 1;
          font-size: 20px;
          margin-right: 8px;
      }

      .breakdown-label {
          grid-row: 1;
          grid-column: 2;
          font-size: 13px;
          font-weight: 500;
          color: #555;
      }

      .breakdown-value {
          grid-row: 2;
          grid-column: 2;
          font-size: 12px;
          color: #777;
      }

      .breakdown-score {
          grid-row: 1 / 3;
          grid-column: 3;
          font-weight: bold;
          color: #2a4d8f;
          font-size: 16px;
      }

      .highlight-item {
          border-color: rgba(42,77,143,0.3);
          background: rgba(230,235,245,0.9);
          box-shadow: 0 2px 8px rgba(42,77,143,0.1);
      }
      .total-score-value {
          color: #2a4d8f;
      }
      .breakdown-score {
          color: #2a4d8f;
      }
      .profile-compact-label, .breakdown-label {
          color: #555;
      }
      .profile-section {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 0;
          /* border-left: 4px solid #4CAF50;  // 移除绿色左边框 */
      }

      .unified-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.2);
      }

      .unified-title {
          font-size: 16px;
          font-weight: bold;
          margin: 0;
      }

      .unified-subtitle {
          font-size: 12px;
          opacity: 0.9;
          margin: 0;
      }

      .unified-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: start;
      }

      .profile-compact {
          background: rgba(255,255,255,0.1);
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
      }

      .profile-compact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
      }

      .profile-compact-item {
          background: rgba(255,255,255,0.15);
          padding: 6px 4px;
          border-radius: 6px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.2);
      }

      .profile-compact-label {
          font-size: 10px;
          margin-bottom: 2px;
          opacity: 0.9;
      }

      .profile-compact-value {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 1px;
      }

      .profile-compact-detail {
          font-size: 9px;
          opacity: 0.8;
      }
      .profile-compact-row {
          display: flex;
          gap: 18px;
          justify-content: space-between;
          margin-bottom: 12px;
      }
      .profile-compact-row .profile-compact-item {
          flex: 1 1 0;
          min-width: 120px;
      }
      .profile-compact-title {
          font-size: 22px;
          font-weight: bold;
          color: #2a4d8f;
          margin-bottom: 12px;
          text-align: left;
          letter-spacing: 2px;
      }
      .profile-compact-level {
          color: #2a4d8f;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 2px;
      }
      .profile-cards-row {
          display: flex;
          gap: 24px;
          justify-content: space-between;
          margin: 32px 0 24px 0;
      }
      .profile-card {
          flex: 1 1 0;
          background: #fff;
          border: 2px solid #e3eafc;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(180,200,230,0.10);
          padding: 22px 10px 18px 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 120px;
          transition: box-shadow 0.2s;
      }
      .profile-card:hover {
          box-shadow: 0 4px 16px rgba(100,120,180,0.13);
          border-color: #b6c8e6;
      }
      .profile-card-label {
          font-size: 13px;
          color: #7a8ca6;
          margin-bottom: 6px;
          font-weight: 500;
          letter-spacing: 1px;
      }
      .profile-card-value {
          font-size: 20px;
          font-weight: 700;
          color: #223355;
          margin-bottom: 2px;
      }
      .profile-card-level {
          color: #2a4d8f;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 2px;
      }
      .profile-card-detail {
          font-size: 12px;
          color: #b0b8c9;
          opacity: 0.85;
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
      }

      .profile-card-icon {
          font-size: 24px;
          margin-bottom: 8px;
      }

      .detail-item {
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(230,235,245,0.5);
      }

      .highlight-text {
          color: #2a4d8f;
          font-weight: bold;
          background: rgba(42,77,143,0.1);
      }

      .highlight-card {
          border-color: #2a4d8f;
          box-shadow: 0 4px 16px rgba(42,77,143,0.15);
          background: linear-gradient(to bottom, white, rgba(230,235,245,0.5));
      }
      .profile-card {
          border: 1.5px solid #e3eafc;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(180,200,230,0.07);
          padding: 16px 8px 12px 8px;
          min-width: 110px;
          transition: box-shadow 0.2s, border-color 0.2s;
      }
      .profile-card:hover {
          border-color: #2a4d8f;
          box-shadow: 0 4px 16px rgba(42,77,143,0.10);
      }
      .profile-cards-title {
          font-size: 20px;
          font-weight: bold;
          color: #2a4d8f;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 2px solid rgba(42,77,143,0.1);
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          letter-spacing: 1px;
          margin-left: 4px;
      }
  `);

  // 工具函数类
  class DataUtils {
    /**
     * 将带有K/M后缀的数字字符串转换为纯数值
     * @param {string} numStr - 数字字符串，如 "153.99K", "234", "5.2M"
     * @returns {number} 转换后的数值
     */
    static parseNumberWithSuffix(numStr) {
      if (!numStr || numStr === 'N/A') return 0;

      const cleanStr = numStr.replace(/[+,]/g, '').trim().toUpperCase();
      let multiplier = 1;

      if (cleanStr.endsWith('K')) {
        multiplier = 1000;
      } else if (cleanStr.endsWith('M')) {
        multiplier = 1000000;
      }

      const numberPart = cleanStr.replace(/[KM]$/, '');
      const number = parseFloat(numberPart) || 0;
      return number * multiplier;
    }

    /**
     * 将货币字符串转换为美元数值
     * @param {string} amountStr - 货币字符串，如 "฿817.3K", "537.3M₫", "₱0-₱292"
     * @returns {number|string} 美元数值或"N/A"
     */
    static convertToRMB(amountStr) {
      if (!amountStr || amountStr === 'N/A') return 0;

      const cleanStr = amountStr.replace(/\s+/g, '');

      // 检查是否包含"+"号，表示未公开数据
      if (cleanStr.includes('+')) {
        return 'N/A';
      }

      // 检查是否为范围格式（如 "₱0-₱292"）
      if (cleanStr.includes('-')) {
        return this.convertRangeToRMB(cleanStr);
      }

      let currency = null;
      let numericStr = '';

      // 识别货币符号
      for (const [symbol, curr] of Object.entries(CONFIG.CURRENCY_SYMBOLS)) {
        const symPos = cleanStr.indexOf(symbol);
        if (symPos >= 0) {
          currency = curr;
          numericStr = symPos === 0
            ? cleanStr.slice(symbol.length)
            : cleanStr.slice(0, symPos);
          break;
        }
      }

      if (!currency) {
        console.warn('无法识别的货币类型:', amountStr);
        return 0;
      }

      const cleanNumeric = numericStr.replace(/[+,]/g, '');
      const number = this.parseNumberWithSuffix(cleanNumeric);
      return number * CONFIG.EXCHANGE_RATES[currency];
    }

    /**
     * 将范围格式的货币字符串转换为美元数值
     * @param {string} rangeStr - 范围格式的货币字符串，如 "₱0-₱292"
     * @returns {number|string} 美元数值或"N/A"
     */
    static convertRangeToRMB(rangeStr) {
      if (!rangeStr || rangeStr === 'N/A') return 0;

      const cleanStr = rangeStr.replace(/\s+/g, '');

      // 检查是否包含"+"号，表示未公开数据
      if (cleanStr.includes('+')) {
        return 'N/A';
      }

      // 分割范围，获取最大值
      const parts = cleanStr.split('-');
      if (parts.length !== 2) {
        console.warn('无法解析范围格式:', rangeStr);
        return 0;
      }

      // 取范围的最大值进行转换
      const maxValueStr = parts[1];
      let currency = null;
      let numericStr = '';

      // 识别货币符号
      for (const [symbol, curr] of Object.entries(CONFIG.CURRENCY_SYMBOLS)) {
        const symPos = maxValueStr.indexOf(symbol);
        if (symPos >= 0) {
          currency = curr;
          numericStr = symPos === 0
            ? maxValueStr.slice(symbol.length)
            : maxValueStr.slice(0, symPos);
          break;
        }
      }

      if (!currency) {
        console.warn('无法识别的货币类型:', maxValueStr);
        return 0;
      }

      const cleanNumeric = numericStr.replace(/[+,]/g, '');
      const number = this.parseNumberWithSuffix(cleanNumeric);
      return number * CONFIG.EXCHANGE_RATES[currency];
    }

    /**
     * 安全获取DOM元素文本内容
     * @param {string} selector - CSS选择器
     * @param {string} defaultValue - 默认值
     * @returns {string} 文本内容或默认值
     */
    static safeGetText(selector, defaultValue = 'N/A') {
      try {
        const element = document.querySelector(selector);
        return element ? element.innerText.trim() : defaultValue;
      } catch (error) {
        console.warn(`获取元素文本失败: ${selector}`, error);
        return defaultValue;
      }
    }

    /**
     * 安全获取DOM元素
     * @param {string} selector - CSS选择器
     * @returns {Element|null} DOM元素或null
     */
    static safeGetElement(selector) {
      try {
        return document.querySelector(selector);
      } catch (error) {
        console.warn(`获取元素失败: ${selector}`, error);
        return null;
      }
    }


  }

  // 评分计算类
  class ScoreCalculator {
    /**
     * 计算达人评分
     * @param {Object} creatorInfo - 创作者信息
     * @param {Object} transactionData - 交易数据
     * @param {Object} dataBlocks - 数据块信息
     * @param {Array} topVideos - Top视频信息
     * @returns {Object} 评分结果
     */
    static calculateScore(creatorInfo, transactionData, dataBlocks, topVideos) {
      const scores = {
        businessConversion: 0, // 商业转化力 (40分)
        contentPotential: 0,   // 内容与互动潜力 (45分)
        accountHealth: 0,      // 账号健康度 (15分)
        total: 0,              // 总分
        breakdown: {}          // 详细得分
      };

      // 1. 商业转化力评分 (40分)
      const businessScores = this.calculateBusinessConversionScore(transactionData, dataBlocks);
      scores.businessConversion = businessScores.total;
      scores.breakdown.business = businessScores;

      // 2. 内容与互动潜力评分 (45分)
      const contentScores = this.calculateContentPotentialScore(transactionData, topVideos);
      scores.contentPotential = contentScores.total;
      scores.breakdown.content = contentScores;

      // 3. 账号健康度评分 (15分)
      const healthScores = this.calculateAccountHealthScore(creatorInfo, transactionData);
      scores.accountHealth = healthScores.total;
      scores.breakdown.health = healthScores;

      // 计算总分
      scores.total = scores.businessConversion + scores.contentPotential + scores.accountHealth;

      return scores;
    }

    /**
     * 计算商业转化力评分
     * @param {Object} transactionData - 交易数据
     * @param {Object} dataBlocks - 数据块信息
     * @returns {Object} 商业转化力评分
     */
    static calculateBusinessConversionScore(transactionData, dataBlocks) {
      const scores = { total: 0, details: {} };

      // 1. 总GMV评分 (20分)
      const totalGMV = typeof transactionData.totalTransactionAmount === 'number'
        ? transactionData.totalTransactionAmount
        : 0;

      if (totalGMV > 2000) {
        scores.details.totalGMV = { score: 20, rule: '>2000' };
      } else if (totalGMV >= 1000) {
        scores.details.totalGMV = { score: 15, rule: '1000-2000' };
      } else if (totalGMV >= 500) {
        scores.details.totalGMV = { score: 10, rule: '500-1000' };
      } else {
        scores.details.totalGMV = { score: 5, rule: '<500' };
      }

      // 2. 类目匹配度评分 (15分) - 这里需要根据实际数据调整
      // 暂时使用默认值，实际应该根据目标类目GMV占比计算
      scores.details.categoryMatch = { score: 10, rule: '20-50%' };

      // 3. 履约率评分 (5分) - 暂时使用默认值
      scores.details.fulfillmentRate = { score: 5, rule: '>=80%' };

      scores.total = scores.details.totalGMV.score + scores.details.categoryMatch.score + scores.details.fulfillmentRate.score;
      return scores;
    }

    /**
     * 计算内容与互动潜力评分
     * @param {Object} transactionData - 交易数据
     * @param {Array} topVideos - Top视频信息
     * @returns {Object} 内容潜力评分
     */
    static calculateContentPotentialScore(transactionData, topVideos) {
      const scores = { total: 0, details: {} };

      // 1. 热门视频评分 (20分)
      let maxViews = 0;
      if (topVideos && topVideos.length > 0) {
        maxViews = Math.max(...topVideos.map(video => video.views || 0));
      }

      if (maxViews > 10000) {
        scores.details.hotVideo = { score: 20, rule: '>10k' };
      } else if (maxViews > 6000) {
        scores.details.hotVideo = { score: 10, rule: '>6k' };
      } else if (maxViews > 3000) {
        scores.details.hotVideo = { score: 5, rule: '>3k' };
      } else {
        scores.details.hotVideo = { score: 0, rule: '<=3k' };
      }

      // 2. 平均播放量评分 (10分)
      const avgViews = transactionData.averageVideoViews || 0;
      if (avgViews > 200) {
        scores.details.avgViews = { score: 10, rule: '>200' };
      } else if (avgViews > 100) {
        scores.details.avgViews = { score: 6, rule: '>100' };
      } else {
        scores.details.avgViews = { score: 0, rule: '<=100' };
      }

      // 3. 发布频率评分 (10分) - 暂时使用默认值
      scores.details.publishFrequency = { score: 5, rule: 'other' };

      scores.total = scores.details.hotVideo.score + scores.details.avgViews.score + scores.details.publishFrequency.score;
      return scores;
    }

    /**
     * 计算账号健康度评分
     * @param {Object} creatorInfo - 创作者信息
     * @param {Object} transactionData - 交易数据
     * @returns {Object} 账号健康度评分
     */
    static calculateAccountHealthScore(creatorInfo, transactionData) {
      const scores = { total: 0, details: {} };

      // 1. 店铺评价评分 (10分) - 暂时使用默认值
      scores.details.shopRating = { score: 10, rule: 'good' };

      // 2. 成交件数评分 (5分)
      const transactionCount = transactionData.completedTransactions || 0;
      if (transactionCount > 200) {
        scores.details.transactionCount = { score: 5, rule: '>200' };
      } else {
        scores.details.transactionCount = { score: 0, rule: '<=200' };
      }

      scores.total = scores.details.shopRating.score + scores.details.transactionCount.score;
      return scores;
    }

    /**
     * 判断达人类型
     * @param {Object} transactionData - 交易数据
     * @param {Object} dataBlocks - 数据块信息，包含销售渠道数据
     * @returns {Object} 达人类型信息
     */
    static getCreatorType(transactionData, dataBlocks) {
      // 如果提供了数据块信息，使用销售渠道数据判断达人类型
      if (dataBlocks && dataBlocks.salesChannel && dataBlocks.salesChannel.data && dataBlocks.salesChannel.data.length > 0) {
        // 查找视频和直播的销售渠道数据
        let videoData = dataBlocks.salesChannel.data.find(item => item.option === '视频数据' || item.option === '视频');
        let liveData = dataBlocks.salesChannel.data.find(item => item.option === '直播数据' || item.option === '直播');
        let productCardData = dataBlocks.salesChannel.data.find(item => item.option === '商品卡片');

        // 获取百分比值
        const videoPercentage = videoData ? videoData.value : 0;
        const livePercentage = liveData ? liveData.value : 0;
        const productCardPercentage = productCardData ? productCardData.value : 0;

        // 计算视频占比（视频数据占总和的百分比）
        const totalPercentage = videoPercentage + livePercentage + productCardPercentage;
        const normalizedVideoPercentage = totalPercentage > 0 ? (videoPercentage / totalPercentage) * 100 : 0;

        // 根据销售渠道百分比判断达人类型（视频占比>55%为视频型，否则为直播型）
        if (normalizedVideoPercentage > 55) {
          return {
            type: '视频型',
            videoPercentage: normalizedVideoPercentage.toFixed(1),
            livePercentage: (totalPercentage > 0 ? (livePercentage / totalPercentage) * 100 : 0).toFixed(1),
            productCardPercentage: (totalPercentage > 0 ? (productCardPercentage / totalPercentage) * 100 : 0).toFixed(1)
          };
        } else {
          return {
            type: '直播型',
            videoPercentage: normalizedVideoPercentage.toFixed(1),
            livePercentage: (totalPercentage > 0 ? (livePercentage / totalPercentage) * 100 : 0).toFixed(1),
            productCardPercentage: (totalPercentage > 0 ? (productCardPercentage / totalPercentage) * 100 : 0).toFixed(1)
          };
        }
      } else {
        // 如果没有销售渠道数据，回退到使用GPM计算
        const videoGPM = transactionData.videoGPM || 0;
        const liveStreamGPM = transactionData.liveStreamGPM || 0;
        const totalGPM = videoGPM + liveStreamGPM;

        if (totalGPM === 0) {
          return { type: '未知', videoPercentage: 0, livePercentage: 0 };
        }

        const videoPercentage = (videoGPM / totalGPM) * 100;
        const livePercentage = (liveStreamGPM / totalGPM) * 100;

        if (videoPercentage > 55) {
          return { type: '视频型', videoPercentage: videoPercentage.toFixed(1), livePercentage: livePercentage.toFixed(1) };
        } else {
          return { type: '直播型', videoPercentage: videoPercentage.toFixed(1), livePercentage: livePercentage.toFixed(1) };
        }
      }
    }

    /**
     * 获取粉丝画像
     * @param {Object} dataBlocks - 数据块信息
     * @returns {Object} 粉丝画像信息
     */
    static getFanProfile(dataBlocks) {
      const genderProfile = dataBlocks.gender?.data?.[0] || { option: 'N/A', percentage: '0%' };
      const ageProfile = dataBlocks.ageGroup?.data?.[0] || { option: 'N/A', percentage: '0%' };
      const categoryProfile = dataBlocks.category?.data?.[0] || { option: 'N/A', percentage: '0%' };

      return {
        gender: {
          main: genderProfile.option,
          percentage: genderProfile.percentage
        },
        age: {
          main: ageProfile.option,
          percentage: ageProfile.percentage
        },
        category: {
          main: categoryProfile.option,
          percentage: categoryProfile.percentage
        }
      };
    }
  }

  // 数据提取类
  class DataExtractor {
    constructor() {
      this.currentCountry = "未知国家";
    }

    /**
     * 提取创作者基本信息
     * @returns {Object} 创作者信息
     */
    extractCreatorInfo() {
      try {
        const profileContainer = DataUtils.safeGetElement("#creator-detail-profile-container");
        if (!profileContainer) {
          throw new Error("无法找到创作者信息容器 #creator-detail-profile-container");
        }

        // 获取达人ID - 使用正确的DOM路径
        const creatorIdElement = profileContainer.children[0]?.children[1]?.children[0]?.children[0]?.children[0]?.children[0];
        const creatorId = creatorIdElement && creatorIdElement.innerText ? creatorIdElement.innerText.trim() : 'N/A';

        // 获取达人类目 - 使用正确的DOM路径
        const categoryElement = profileContainer.children[0]?.children[1]?.children[1]?.children[0]?.children[1]?.children[1];
        const creatorCategory = categoryElement && categoryElement.innerText ? categoryElement.innerText.split('\n')[0] : 'N/A';

        // 获取达人粉丝量 - 使用正确的DOM路径
        const followerElement = profileContainer.children[0]?.children[1]?.children[1]?.children[0]?.children[2]?.children[1];
        const followerCountText = followerElement && followerElement.innerText ? followerElement.innerText : '0';
        const followerCount = DataUtils.parseNumberWithSuffix(followerCountText);

        // 获取评价 - 尝试获取评价信息
        const reviewElement = profileContainer.children[0]?.children[1]?.children[1]?.children[0]?.children[0]?.children[1];
        let tiktokInfluencerReview = 'N/A';

        //reviewElement的length=1 说明没有评价
        if (reviewElement && reviewElement.children.length !== 1) {
          tiktokInfluencerReview = reviewElement.innerText ? reviewElement.innerText.trim() : 'N/A';
        }
        return { creatorId, creatorCategory, followerCount, tiktokInfluencerReview };
      } catch (error) {
        console.error('提取创作者信息失败:', error);
        throw new Error(`提取创作者信息失败: ${error.message}`);
      }
    }

    /**
     * 提取交易数据
     * @returns {Object} 交易数据
     */
    extractTransactionData() {
      try {
        const dataCards = document.querySelectorAll(".creator_video_data_card_trigger_is_display");
        if (dataCards.length < 16) {
          throw new Error(`数据卡片数量不足，期望至少16个，实际找到${dataCards.length}个`);
        }

        const extractCardData = (index, converter = DataUtils.parseNumberWithSuffix) => {
          const card = dataCards[index];
          if (!card) return 0;
          const textElement = card.children[0]?.children[0];
          const text = textElement ? textElement.innerText : '0';
          return converter(text);
        };

        const extractCurrencyData = (index) => {
          const card = dataCards[index];
          if (!card) return 0;
          const textElement = card.children[0]?.children[0];
          const text = textElement ? textElement.innerText.split('\n')[0] : '0';
          return DataUtils.convertToRMB(text);
        };

        // 前12个数据卡片（原有数据）
        let totalTransactionAmount = extractCurrencyData(0);
        const completedTransactions = extractCardData(1);
        const gpmPerThousandImpressions = extractCurrencyData(2);
        const gpmPerCustomer = extractCardData(3);
        const estimatedPublishRate = extractCardData(4, (text) => text || 'N/A');
        const averageCommissionRate = extractCardData(5, (text) =>
          text && text.includes('%') ? text : 'N/A'
        );
        const productCount = extractCardData(6, (text) => text || 'N/A');
        const brandCollaborations = extractCardData(7, (text) => text || 'N/A');
        const videoGPM = extractCurrencyData(8);
        const videoCount = extractCardData(9);
        const averageVideoViews = extractCardData(10);
        const videoInteractionRate = extractCardData(11, (text) => text || 'N/A');

        // 新增的4个直播相关数据卡片
        const liveStreamGPM = extractCurrencyData(12);
        const liveStreamCount = extractCardData(13);
        const averageLiveStreamViews = extractCardData(14);
        const liveStreamInteractionRate = extractCardData(15, (text) => text || 'N/A');

        // 更新当前国家（从第一个货币转换中获取）
        this.currentCountry = CONFIG.CURRENCY_TO_COUNTRY[this.getCurrencyFromFirstTransaction(dataCards[0])] || '未知国家';

        // GMV估算逻辑
        let gmvEstimated = false;
        if (totalTransactionAmount === 'N/A' || totalTransactionAmount === 0) {
          totalTransactionAmount = 3.5 * (completedTransactions || 0);
          gmvEstimated = true;
        }

        return {
          totalTransactionAmount,
          completedTransactions,
          gmvEstimated,
          gpmPerThousandImpressions,
          gpmPerCustomer,
          estimatedPublishRate,
          averageCommissionRate,
          productCount,
          brandCollaborations,
          videoGPM,
          videoCount,
          averageVideoViews,
          videoInteractionRate,
          liveStreamGPM,
          liveStreamCount,
          averageLiveStreamViews,
          liveStreamInteractionRate
        };
      } catch (error) {
        console.error('提取交易数据失败:', error);
        throw new Error(`提取交易数据失败: ${error.message}`);
      }
    }

    /**
     * 从第一个交易数据中获取货币类型
     * @param {Element} firstCard - 第一个数据卡片
     * @returns {string} 货币代码
     */
    getCurrencyFromFirstTransaction(firstCard) {
      if (!firstCard) return 'THB';

      const textElement = firstCard.children[0]?.children[0];
      const text = textElement ? textElement.innerText : '';

      for (const [symbol, currency] of Object.entries(CONFIG.CURRENCY_SYMBOLS)) {
        if (text.includes(symbol)) {
          return currency;
        }
      }
      return 'THB'; // 默认值
    }

    /**
     * 提取四个数据块的信息（销售渠道、类目、性别、年龄段）
     * @returns {Object} 格式化的数据块信息
     */
    extractDataBlocks() {
      try {
        const dataBlocks = document.querySelectorAll(".pcm-pc-content");
        if (dataBlocks.length < 4) {
          throw new Error(`数据块数量不足，期望4个，实际找到${dataBlocks.length}个`);
        }

        // 提取销售渠道数据
        const salesChannelText = dataBlocks[0]?.children[1]?.innerText || '';
        const salesChannelData = this.parseDataBlock(salesChannelText, '销售渠道');

        // 提取类目数据
        const categoryText = dataBlocks[1]?.children[1]?.innerText || '';
        const categoryData = this.parseDataBlock(categoryText, '类目');

        // 提取性别数据
        const genderText = dataBlocks[2]?.children[1]?.innerText || '';
        const genderData = this.parseDataBlock(genderText, '性别');

        // 提取年龄段数据
        const ageGroupText = dataBlocks[3]?.children[1]?.innerText || '';
        const ageGroupData = this.parseDataBlock(ageGroupText, '年龄段');

        return {
          salesChannel: salesChannelData,
          category: categoryData,
          gender: genderData,
          ageGroup: ageGroupData
        };
      } catch (error) {
        console.error('提取数据块信息失败:', error);
        return {
          salesChannel: { type: '销售渠道', data: [] },
          category: { type: '类目', data: [] },
          gender: { type: '性别', data: [] },
          ageGroup: { type: '年龄段', data: [] }
        };
      }
    }

    /**
     * 解析数据块文本
     * @param {string} text - 原始文本
     * @param {string} type - 数据类型
     * @returns {Object} 格式化的数据
     */
    parseDataBlock(text, type) {
      if (!text) {
        return { type, data: [] };
      }

      const lines = text.split('\n').filter(line => line.trim());
      const data = [];

      // 分离选项和百分比
      const options = [];
      const percentages = [];

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('%')) {
          percentages.push(trimmedLine);
        } else {
          options.push(trimmedLine);
        }
      });

      // 匹配选项和百分比
      for (let i = 0; i < Math.min(options.length, percentages.length); i++) {
        data.push({
          option: options[i],
          percentage: percentages[i],
          value: parseFloat(percentages[i].replace('%', '')) || 0
        });
      }

      // 按百分比降序排序
      data.sort((a, b) => b.value - a.value);

      return {
        type,
        data,
        total: data.reduce((sum, item) => sum + item.value, 0)
      };
    }

    /**
     * 获取数据块的JSON格式
     * @returns {string} JSON字符串
     */
    getDataBlocksJSON() {
      const dataBlocks = this.extractDataBlocks();
      return JSON.stringify(dataBlocks, null, 2);
    }

    /**
     * 获取数据块的表格格式
     * @returns {string} 制表符分隔的数据
     */
    getDataBlocksTable() {
      const dataBlocks = this.extractDataBlocks();
      const rows = [];

      // 添加表头
      rows.push(['数据类型', '选项', '百分比', '数值']);

      // 添加数据行
      Object.values(dataBlocks).forEach(block => {
        if (block.data && block.data.length > 0) {
          block.data.forEach(item => {
            rows.push([block.type, item.option, item.percentage, item.value]);
          });
        } else {
          rows.push([block.type, '无数据', '0%', 0]);
        }
      });

      return rows.map(row => row.join('\t')).join('\n');
    }

         /**
      * 获取数据块的HTML表格格式
      * @returns {string} HTML表格字符串
      */
     getDataBlocksHTML() {
       const dataBlocks = this.extractDataBlocks();
       let html = '<div style="margin: 20px 0;">';

       Object.values(dataBlocks).forEach(block => {
         html += `<h3 style="color: #333; margin: 15px 0 10px 0;">${block.type}</h3>`;
         html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
         html += '<thead><tr style="background: #f5f5f5;">';
         html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">选项</th>';
         html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">百分比</th>';
         html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">数值</th>';
         html += '</tr></thead><tbody>';

         if (block.data && block.data.length > 0) {
           block.data.forEach(item => {
             html += '<tr>';
             html += `<td style="border: 1px solid #ddd; padding: 8px;">${item.option}</td>`;
             html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.percentage}</td>`;
             html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.value}</td>`;
             html += '</tr>';
           });
         } else {
           html += '<tr><td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #999;">无数据</td></tr>';
         }

         html += '</tbody></table>';
       });

       html += '</div>';
       return html;
     }

     /**
      * 提取Top视频信息
      * @returns {Array} Top视频数据数组
      */
     extractTopVideos() {
       try {
         const topVideoContainer = document.querySelector("#top_video")?.nextSibling?.children[1]?.children[1]?.children[0]?.children[0];
         if (!topVideoContainer) {
           console.warn('无法找到Top视频容器');
           return [];
         }

         const videoElements = topVideoContainer.children;
         const videos = [];

         for (let i = 0; i < videoElements.length; i++) {
           const videoElement = videoElements[i];
           try {
             const videoDataElement = videoElement?.children[1]?.children[1];
             if (!videoDataElement) continue;

             const videoText = videoDataElement.innerText || '';
             const videoData = this.parseVideoData(videoText);

             if (videoData) {
               videos.push({
                 index: i + 1,
                 ...videoData
               });
             }
           } catch (error) {
             console.warn(`解析第${i + 1}个视频数据失败:`, error);
           }
         }

         return videos;
       } catch (error) {
         console.error('提取Top视频信息失败:', error);
         return [];
       }
     }

     /**
      * 解析视频数据文本
      * @param {string} text - 视频数据文本
      * @returns {Object|null} 解析后的视频数据
      */
     parseVideoData(text) {
       if (!text) return null;

       const lines = text.split('\n').filter(line => line.trim());
       if (lines.length < 4) return null;

       // 第一行是视频标题（包含#标签）
       const title = lines[0] || '';

       // 第二行是发布时间
       const publishTime = lines[1] || '';

       // 第三行是播放量
       const views = lines[2] || '0';

       // 第四行是点赞量
       const likes = lines[3] || '0';

       return {
         title: title.trim(),
         publishTime: publishTime.replace('发布时间：', '').trim(),
         views: DataUtils.parseNumberWithSuffix(views),
         likes: DataUtils.parseNumberWithSuffix(likes)
       };
     }

     /**
      * 获取Top视频的JSON格式
      * @returns {string} JSON字符串
      */
     getTopVideosJSON() {
       const topVideos = this.extractTopVideos();
       return JSON.stringify({ topVideos }, null, 2);
     }

     /**
      * 获取Top视频的表格格式
      * @returns {string} 制表符分隔的数据
      */
     getTopVideosTable() {
       const topVideos = this.extractTopVideos();
       const rows = [];

       // 添加表头
       rows.push(['序号', '视频标题', '发布时间', '播放量', '点赞量']);

       // 添加数据行
       if (topVideos.length > 0) {
         topVideos.forEach(video => {
           rows.push([
             video.index,
             video.title,
             video.publishTime,
             video.views,
             video.likes
           ]);
         });
       } else {
         rows.push(['1', '无视频数据', 'N/A', '0', '0']);
       }

       return rows.map(row => row.join('\t')).join('\n');
     }

     /**
      * 获取Top视频的HTML表格格式
      * @returns {string} HTML表格字符串
      */
     getTopVideosHTML() {
       const topVideos = this.extractTopVideos();

       if (topVideos.length === 0) {
         return '<div style="margin: 20px 0;"><p style="color: #999; text-align: center;">暂无Top视频数据</p></div>';
       }

       let html = '<div style="margin: 20px 0;">';
       html += '<h3 style="color: #333; margin: 15px 0 10px 0;">Top视频信息</h3>';
       html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
       html += '<thead><tr style="background: #f5f5f5;">';
       html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">序号</th>';
       html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">视频标题</th>';
       html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">发布时间</th>';
       html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">播放量</th>';
       html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">点赞量</th>';
       html += '</tr></thead><tbody>';

       topVideos.forEach(video => {
         html += '<tr>';
         html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${video.index}</td>`;
         html += `<td style="border: 1px solid #ddd; padding: 8px; max-width: 300px; word-wrap: break-word;">${video.title}</td>`;
         html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${video.publishTime}</td>`;
         html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${video.views.toLocaleString()}</td>`;
         html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${video.likes.toLocaleString()}</td>`;
         html += '</tr>';
       });

       html += '</tbody></table>';
       html += '</div>';
       return html;
     }

    /**
     * 生成表格数据
     * @returns {string} 制表符分隔的数据行
     */
    generateTableData() {
      try {
        const creatorInfo = this.extractCreatorInfo();
        const transactionData = this.extractTransactionData();

        const currentDate = new Date().toISOString().split('T')[0];

        // 定义数据标题
        const dataTitles = [
          '创作者ID',
          '添加时间',
          '创作者类别',
          '国家',
          '粉丝数',
          '总交易额',
          '成交件数',
          '千次曝光GPM',
          '预估发布率',
          '单客GPM',
          '预估发布率',
          '平均佣金率',
          '商品数',
          '品牌合作数',
          '视频GPM',
          '视频数',
          '平均视频观看量',
          '视频互动率',
          '直播GPM',
          '直播数',
          '平均直播播放量',
          '直播平均互动率'
        ];

        const dataValues = [
          creatorInfo.creatorId,
          currentDate,
          creatorInfo.creatorCategory,
          this.currentCountry,
          "\\",
          "\\",
          creatorInfo.followerCount,
          typeof transactionData.totalTransactionAmount === 'number' ? transactionData.totalTransactionAmount.toFixed(0) + '$' : transactionData.totalTransactionAmount,
          transactionData.completedTransactions,
          typeof transactionData.gpmPerThousandImpressions === 'number' ? transactionData.gpmPerThousandImpressions.toFixed(0) + '$' : transactionData.gpmPerThousandImpressions,
          "\\",
          typeof transactionData.gpmPerCustomer === 'number' ? transactionData.gpmPerCustomer.toFixed(0) + '$' : transactionData.gpmPerCustomer,
          transactionData.estimatedPublishRate,
          transactionData.averageCommissionRate,
          transactionData.productCount,
          transactionData.brandCollaborations,
          typeof transactionData.videoGPM === 'number' ? transactionData.videoGPM.toFixed(0) + '$' : transactionData.videoGPM,
          transactionData.videoCount,
          transactionData.averageVideoViews,
          transactionData.videoInteractionRate,
          typeof transactionData.liveStreamGPM === 'number' ? transactionData.liveStreamGPM.toFixed(0) + '$' : transactionData.liveStreamGPM,
          transactionData.liveStreamCount,
          transactionData.averageLiveStreamViews,
          transactionData.liveStreamInteractionRate
        ];

        // 组合标题和数据
        const combinedData = dataTitles.map((title, index) => `${title}: ${dataValues[index]}`).join("\t");

        return combinedData;
      } catch (error) {
        console.error('生成表格数据失败:', error);
        return '数据提取失败，请检查页面结构';
      }
    }

    /**
     * 生成完整的JSON数据
     * @returns {string} 包含所有数据的JSON字符串
     */
    generateCompleteJSON() {
      try {
        const creatorInfo = this.extractCreatorInfo();
        const transactionData = this.extractTransactionData();
        const dataBlocks = this.extractDataBlocks();
        const topVideos = this.extractTopVideos();

        const currentDate = new Date().toISOString().split('T')[0];

        const completeData = {
          creatorInfo: {
            creatorId: creatorInfo.creatorId,
            creatorCategory: creatorInfo.creatorCategory,
            followerCount: creatorInfo.followerCount,
            tiktokInfluencerReview: creatorInfo.tiktokInfluencerReview || 'N/A',
            currentCountry: this.currentCountry,
            addTime: currentDate
          },
          transactionData: {
            totalTransactionAmount: typeof transactionData.totalTransactionAmount === 'number' ? transactionData.totalTransactionAmount.toFixed(0) + '$' : transactionData.totalTransactionAmount,
            completedTransactions: transactionData.completedTransactions,
            gpmPerThousandImpressions: typeof transactionData.gpmPerThousandImpressions === 'number' ? transactionData.gpmPerThousandImpressions.toFixed(0) + '$' : transactionData.gpmPerThousandImpressions,
            gpmPerCustomer: typeof transactionData.gpmPerCustomer === 'number' ? transactionData.gpmPerCustomer.toFixed(0) + '$' : transactionData.gpmPerCustomer,
            estimatedPublishRate: transactionData.estimatedPublishRate,
            averageCommissionRate: transactionData.averageCommissionRate,
            productCount: transactionData.productCount,
            brandCollaborations: transactionData.brandCollaborations,
            videoGPM: typeof transactionData.videoGPM === 'number' ? transactionData.videoGPM.toFixed(0) + '$' : transactionData.videoGPM,
            videoCount: transactionData.videoCount,
            averageVideoViews: transactionData.averageVideoViews,
            videoInteractionRate: transactionData.videoInteractionRate,
            liveStreamGPM: typeof transactionData.liveStreamGPM === 'number' ? transactionData.liveStreamGPM.toFixed(0) + '$' : transactionData.liveStreamGPM,
            liveStreamCount: transactionData.liveStreamCount,
            averageLiveStreamViews: transactionData.averageLiveStreamViews,
            liveStreamInteractionRate: transactionData.liveStreamInteractionRate
          },
          dataBlocks: dataBlocks,
          topVideos: topVideos,
          extractTime: new Date().toISOString()
        };

        return JSON.stringify(completeData, null, 2);
      } catch (error) {
        console.error('生成完整JSON数据失败:', error);
        return JSON.stringify({ error: '数据提取失败，请检查页面结构' }, null, 2);
      }
    }

    /**
     * 获取用于展示的结构化数据
     * @returns {Array<{label: string, value: string|number}>}
     */
    getDisplayData() {
      const creatorInfo = this.extractCreatorInfo();
      const transactionData = this.extractTransactionData();
      const currentDate = new Date().toISOString().split('T')[0];
      return [
        { label: '创作者ID', value: creatorInfo.creatorId },
        { label: '评价', value: creatorInfo.tiktokInfluencerReview || 'N/A' },
        { label: '添加时间', value: currentDate },
        { label: '国家', value: this.currentCountry },
        { label: '创作者类别', value: creatorInfo.creatorCategory },
        { label: '粉丝数', value: creatorInfo.followerCount },
        { label: '总交易额', value: typeof transactionData.totalTransactionAmount === 'number' ? transactionData.totalTransactionAmount.toFixed(0) + '$' : transactionData.totalTransactionAmount },
        { label: '完成交易数', value: transactionData.completedTransactions },
        { label: '千次曝光GPM', value: typeof transactionData.gpmPerThousandImpressions === 'number' ? transactionData.gpmPerThousandImpressions.toFixed(0) + '$' : transactionData.gpmPerThousandImpressions },
        { label: '单客GPM', value: typeof transactionData.gpmPerCustomer === 'number' ? transactionData.gpmPerCustomer.toFixed(0) + '$' : transactionData.gpmPerCustomer },
        { label: '预估发布率', value: transactionData.estimatedPublishRate },
        { label: '平均佣金率', value: transactionData.averageCommissionRate },
        { label: '商品数', value: transactionData.productCount },
        { label: '品牌合作数', value: transactionData.brandCollaborations },
        { label: '视频GPM', value: typeof transactionData.videoGPM === 'number' ? transactionData.videoGPM.toFixed(0) + '$' : transactionData.videoGPM },
        { label: '视频数', value: transactionData.videoCount },
        { label: '平均视频观看量', value: transactionData.averageVideoViews },
        { label: '视频互动率', value: transactionData.videoInteractionRate },
        { label: '直播GPM', value: typeof transactionData.liveStreamGPM === 'number' ? transactionData.liveStreamGPM.toFixed(0) + '$' : transactionData.liveStreamGPM },
        { label: '直播数', value: transactionData.liveStreamCount },
        { label: '平均直播播放量', value: transactionData.averageLiveStreamViews },
        { label: '直播平均互动率', value: transactionData.liveStreamInteractionRate },
      ];
    }

    /**
     * 生成评分展示HTML
     * @returns {string} 评分展示HTML
     */
    generateScoreDisplayHTML() {
      try {
        const creatorInfo = this.extractCreatorInfo();
        const transactionData = this.extractTransactionData();
        const dataBlocks = this.extractDataBlocks();
        const topVideos = this.extractTopVideos();

        // 计算评分
        const scores = ScoreCalculator.calculateScore(creatorInfo, transactionData, dataBlocks, topVideos);

        // 获取达人类型（使用销售渠道数据）
        const creatorType = ScoreCalculator.getCreatorType(transactionData, dataBlocks);

        // 获取粉丝画像
        const fanProfile = ScoreCalculator.getFanProfile(dataBlocks);

        // 计算达人层级
        function getInfluencerLevel(fans) {
          if (fans >= 5000000) return '顶流达人';
          if (fans >= 1000000) return '头部达人';
          if (fans >= 500000) return '肩部达人';
          if (fans >= 100000) return '腰部达人';
          return '尾部达人';
        }
        const influencerLevel = getInfluencerLevel(creatorInfo.followerCount || 0);

        // 货币显示加美元符号，GMV特殊处理
        let gmv = transactionData.totalTransactionAmount;
        if (gmv === 'N/A') {
          gmv = 3.5 * (transactionData.completedTransactions || 0);
          gmv = '约' + gmv.toFixed(0) + '$（估算）';
        } else if (typeof gmv === 'number') {
          gmv = gmv.toFixed(0) + '$';
        }
        const totalGMV = gmv;
        const avgVideoViews = transactionData.averageVideoViews || 0;

        // 画像区横跨整行 - 美化版本
        const profileHtml = `
          <div class="profile-cards-title">📊 达人画像</div>
          <div class="profile-cards-row">
            <div class="profile-card ${creatorType.type === '视频型' ? 'highlight-card' : ''}">
              <div class="profile-card-icon">🎬</div>
              <div class="profile-card-label">达人类型</div>
              <div class="profile-card-value">${creatorType.type}</div>
              <div class="profile-card-detail">
                <span class="detail-item ${creatorType.videoPercentage > 55 ? 'highlight-text' : ''}" style="font-size: 14px; font-weight: bold;">视频: ${creatorType.videoPercentage}%</span>
              </div>
            </div>
            <div class="profile-card">
              <div class="profile-card-icon">👥</div>
              <div class="profile-card-label">主要性别</div>
              <div class="profile-card-value">${fanProfile.gender.main}</div>
              <div class="profile-card-detail">${fanProfile.gender.percentage}</div>
            </div>
            <div class="profile-card">
              <div class="profile-card-icon">📊</div>
              <div class="profile-card-label">主要类目</div>
              <div class="profile-card-value">${fanProfile.category.main}</div>
              <div class="profile-card-detail">${fanProfile.category.percentage}</div>
            </div>
            <div class="profile-card">
              <div class="profile-card-icon">📊</div>
              <div class="profile-card-label">主要年龄</div>
              <div class="profile-card-value">${fanProfile.age.main}</div>
              <div class="profile-card-detail">${fanProfile.age.percentage}</div>
            </div>
          </div>
        `;

        // 评分详情区 - 美化版本
        const scoreHtml = `
          <div class="unified-section">
            <div class="unified-header">
              <div>
                <h2 class="unified-title">🌟 达人评分</h2>
                <p class="unified-subtitle">快速评估达人合作价值</p>
              </div>
              <div class="total-score-container">
                <div class="total-score" style="margin:0; padding:12px 16px; min-width:100px;">
                  <div class="total-score-value">${scores.total}</div>
                  <div class="total-score-label">总分</div>
                  <div class="score-badge">${scores.total >= 80 ? '优秀' : scores.total >= 60 ? '良好' : '一般'}</div>
                </div>
              </div>
            </div>

            <div class="score-categories">
              <div class="score-category ${scores.businessConversion >= 30 ? 'high-score' : scores.businessConversion >= 20 ? 'medium-score' : 'low-score'}">
                <div class="category-icon">💰</div>
                <div class="category-name">商业转化力</div>
                <div class="category-score">${scores.businessConversion}</div>
                <div class="category-total">/40</div>
                <div class="category-bar">
                  <div class="category-progress" style="width: ${(scores.businessConversion/40)*100}%"></div>
                </div>
              </div>

              <div class="score-category ${scores.contentPotential >= 35 ? 'high-score' : scores.contentPotential >= 25 ? 'medium-score' : 'low-score'}">
                <div class="category-icon">🎯</div>
                <div class="category-name">内容潜力</div>
                <div class="category-score">${scores.contentPotential}</div>
                <div class="category-total">/45</div>
                <div class="category-bar">
                  <div class="category-progress" style="width: ${(scores.contentPotential/45)*100}%"></div>
                </div>
              </div>

              <div class="score-category ${scores.accountHealth >= 12 ? 'high-score' : scores.accountHealth >= 8 ? 'medium-score' : 'low-score'}">
                <div class="category-icon">❤️</div>
                <div class="category-name">账号健康度</div>
                <div class="category-score">${scores.accountHealth}</div>
                <div class="category-total">/15</div>
                <div class="category-bar">
                  <div class="category-progress" style="width: ${(scores.accountHealth/15)*100}%"></div>
                </div>
              </div>
            </div>

            <div class="score-breakdown">
              <h3 class="breakdown-title">详细指标</h3>
              <div class="breakdown-grid">
                <div class="breakdown-item ${scores.breakdown.business.details.totalGMV.score >= 8 ? 'highlight-item' : ''}">
                  <div class="breakdown-icon">💎</div>
                  <span class="breakdown-label">总GMV</span>
                  <span class="breakdown-value" style="font-size: 16px; font-weight: bold; color: #2a4d8f;">${totalGMV}</span>
                  <span class="breakdown-score" style="font-size: 18px;">${scores.breakdown.business.details.totalGMV.score}分</span>
                </div>

                <div class="breakdown-item ${scores.breakdown.content.details.hotVideo.score >= 8 ? 'highlight-item' : ''}">
                  <div class="breakdown-icon">🔥</div>
                  <span class="breakdown-label">热门视频</span>
                  <span class="breakdown-value" style="font-size: 16px; font-weight: bold; color: #2a4d8f;">${Math.max(...(topVideos.map(v => v.views || 0) || [0])).toLocaleString()}</span>
                  <span class="breakdown-score" style="font-size: 18px;">${scores.breakdown.content.details.hotVideo.score}分</span>
                </div>

                <div class="breakdown-item ${scores.breakdown.content.details.avgViews.score >= 8 ? 'highlight-item' : ''}">
                  <div class="breakdown-icon">👁️</div>
                  <span class="breakdown-label">平均播放量</span>
                  <span class="breakdown-value" style="font-size: 16px; font-weight: bold; color: #2a4d8f;">${avgVideoViews.toLocaleString()}</span>
                  <span class="breakdown-score" style="font-size: 18px;">${scores.breakdown.content.details.avgViews.score}分</span>
                </div>

                <div class="breakdown-item ${scores.breakdown.health.details.transactionCount.score >= 4 ? 'highlight-item' : ''}">
                  <div class="breakdown-icon">🛒</div>
                  <span class="breakdown-label">成交件数</span>
                  <span class="breakdown-value" style="font-size: 16px; font-weight: bold; color: #2a4d8f;">${(transactionData.completedTransactions || 0).toLocaleString()}</span>
                  <span class="breakdown-score" style="font-size: 18px;">${scores.breakdown.health.details.transactionCount.score}分</span>
                </div>
              </div>
            </div>
          </div>
        `;

        return profileHtml + scoreHtml;
      } catch (error) {
        console.error('生成评分展示HTML失败:', error);
        return '<div style="color: #f44336; text-align: center; padding: 20px;">评分计算失败，请刷新页面重试</div>';
      }
    }

    /**
     * 生成AI prompt
     */
    generateAIPrompt(creatorInfo, transactionData, dataBlocks, topVideos, score) {
      // 1. 基本信息
      const name = creatorInfo.creatorId || 'N/A';
      const fans = creatorInfo.followerCount ? creatorInfo.followerCount.toLocaleString() : 'N/A';
      // 2. 品类
      const categoryBlock = dataBlocks.category?.data?.[0];
      const category = categoryBlock ? `${categoryBlock.option}` : 'N/A';
      const categoryPercent = categoryBlock ? `${categoryBlock.percentage}` : '';
      // 3. GMV
      let gmv = transactionData.totalTransactionAmount;
      let gmvStr = '';
      if (transactionData.gmvEstimated) {
        gmvStr = `约${gmv.toFixed(0)}$（估算）`;
      } else {
        gmvStr = `$${gmv.toFixed(0)}`;
      }
      // 4. 其它核心数据
      const gpmPerThousand = transactionData.gpmPerThousandImpressions ? `$${transactionData.gpmPerThousandImpressions.toFixed(0)}` : 'N/A';
      const videoGPM = transactionData.videoGPM ? `$${transactionData.videoGPM.toFixed(0)}` : 'N/A';
      const avgVideoViews = transactionData.averageVideoViews || 'N/A';
      const videoInteractionRate = transactionData.videoInteractionRate || 'N/A';
      // 5. 粉丝画像
      const genderArr = (dataBlocks.gender?.data || []).map(g => `${g.option} (${g.percentage})`);
      const genderStr = genderArr.length ? genderArr.join('，') : 'N/A';
      const ageArr = (dataBlocks.ageGroup?.data || []).map(a => `${a.option} (${a.percentage})`);
      const ageStr = ageArr.length ? ageArr.join('，') : 'N/A';
      // 6. 销售渠道
      const salesBlock = dataBlocks.salesChannel?.data?.[0];
      const salesStr = salesBlock ? `${salesBlock.option} ${salesBlock.percentage}` : 'N/A';
      // 7. 热门视频
      let topVideoStr = 'N/A';
      if (topVideos && topVideos.length > 0) {
        const v = topVideos[0];
        topVideoStr = `${v.title} (观看量${v.views}，点赞${v.likes})`;
      }
      // 8. 评分
      const scoreStr = score ? `${score.total}/100` : 'N/A';

      // 组装prompt
      return `你是一名专业的TikTok电商运营专家。请根据以下提供的达人数据，为主要目的"销售转化"，"${category}"品类的店铺运营方，生成一份达人合作价值评估报告。\n\n**【数据输入】**\n* **达人名称**: ${name}\n* **粉丝数**: ${fans}\n* **核心品类**: ${category} (${categoryPercent})\n* **总GMV**: ${gmvStr}\n*   **千次曝光GPM**: ${gpmPerThousand}\n*   **视频GPM**: ${videoGPM}\n*   **平均视频观看量**: ${avgVideoViews}\n*   **视频互动率**: ${videoInteractionRate}\n*   **粉丝画像**:\n    *   性别: ${genderStr}\n    *   核心年龄: ${ageStr}\n*   **销售渠道**: ${salesStr}\n*   **近期热门视频**: ${topVideoStr}\n*   **程序化评分**: ${scoreStr} \n\n**【报告要求】**\n1.  **综合评价**: 一句话总结该达人的合作价值。\n2.  **核心优势 (Strengths)**: 列出3-4个最突出的优点。\n3.  **潜在风险 (Weaknesses)**: 列出2-3个需要注意的风险点或短板。\n4.  **合作建议 (Actionable Advice)**:\n    *   是否建议合作？\n    *   适合推广什么样的产品？\n    *   在合作中应注意什么？\n`;
    }
  }

  // UI管理类
  class UIManager {
    constructor() {
      this.isDragging = false;
      this.offsetX = 0;
      this.offsetY = 0;
      this.init();
    }

    /**
     * 初始化UI
     */
    init() {
      this.createFloatingButton();
      this.createModal();
      this.bindEvents();
    }

    /**
     * 创建悬浮按钮
     */
    createFloatingButton() {
      this.floatBtn = document.createElement('div');
      this.floatBtn.id = 'data-float-btn';
      this.floatBtn.className = 'draggable';
      this.floatBtn.textContent = '达人数据';
      document.body.appendChild(this.floatBtn);
    }

    /**
     * 创建模态框
     */
    createModal() {
      // 创建遮罩
      this.modalOverlay = document.createElement('div');
      this.modalOverlay.className = 'modal-overlay';

      // 创建模态框
      this.modal = document.createElement('div');
      this.modal.id = 'data-modal';

      // 创建关闭按钮
      this.closeBtn = document.createElement('span');
      this.closeBtn.className = 'close-btn';
      this.closeBtn.innerHTML = '&times;';

      // 创建内容容器
      this.modalContent = document.createElement('div');
      this.modalContent.id = 'modal-content';

      this.modal.appendChild(this.closeBtn);
      this.modal.appendChild(this.modalContent);
      document.body.appendChild(this.modalOverlay);
      document.body.appendChild(this.modal);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
      // 悬浮按钮点击事件
      this.floatBtn.addEventListener('click', () => this.showModal());

      // 关闭模态框事件
      this.closeBtn.addEventListener('click', () => this.hideModal());
      this.modalOverlay.addEventListener('click', () => this.hideModal());

      // 拖动事件
      this.floatBtn.addEventListener('mousedown', (e) => this.startDragging(e));
      document.addEventListener('mousemove', (e) => this.drag(e));
      document.addEventListener('mouseup', () => this.stopDragging());

      // 防止拖动时选中文本
      document.addEventListener('selectstart', (e) => {
        if (this.isDragging) e.preventDefault();
      });
    }

    /**
     * 显示模态框
     */
    async showModal() {
      try {
        // 每次点击都新建 DataExtractor 实例，确保数据是最新的
        const dataExtractor = new DataExtractor();
        const tableData = dataExtractor.generateTableData();
        const displayData = dataExtractor.getDisplayData();
        const dataBlocks = dataExtractor.extractDataBlocks();
        const htmlDataBlocks = dataExtractor.getDataBlocksHTML();
        const topVideos = dataExtractor.extractTopVideos();
        const topVideosHtml = dataExtractor.getTopVideosHTML();
        const completeJson = dataExtractor.generateCompleteJSON();

        // 评分
        const creatorInfo = dataExtractor.extractCreatorInfo();
        const transactionData = dataExtractor.extractTransactionData();
        const score = ScoreCalculator.calculateScore(creatorInfo, transactionData, dataBlocks, topVideos);
        // 生成AI prompt
        const aiPrompt = dataExtractor.generateAIPrompt(creatorInfo, transactionData, dataBlocks, topVideos, score);

        // 生成评分展示HTML
        const scoreHtml = dataExtractor.generateScoreDisplayHTML();

        // 生成美观的表格HTML
        const tableHtml = `
          <table class="influencer-table">
            <tbody>
              ${displayData.map(item => `
                <tr>
                  <td class="influencer-label">${item.label}</td>
                  <td class="influencer-value">${item.value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        const dataBlocksHtml = `
          <div class="section-divider"></div>
          <h2 class="section-title">数据块信息</h2>
          ${htmlDataBlocks}
        `;

        const topVideosSectionHtml = `
          <div class="section-divider"></div>
          <h2 class="section-title">Top视频信息</h2>
          ${topVideosHtml}
        `;

        const jsonInfoHtml = `
          <div class="section-divider"></div>
          <h2 class="section-title">数据格式说明</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px;">
            <strong>完整JSON数据已复制到剪贴板</strong><br><br>
            包含以下四个部分：<br>
            • <strong>creatorInfo</strong>: 创作者基本信息（ID、类别、粉丝数、评价、国家、添加时间）<br>
            • <strong>transactionData</strong>: 交易数据（总交易额、完成交易数、GPM、佣金率等）<br>
            • <strong>dataBlocks</strong>: 数据块信息（销售渠道、类目、性别、年龄段）<br>
            • <strong>topVideos</strong>: Top视频信息（标题、发布时间、播放量、点赞量）<br>
            • <strong>extractTime</strong>: 数据提取时间
          </div>
        `;

        // 复制AI prompt到剪贴板
        await this.copyToClipboard(aiPrompt);
        this.modalContent.innerHTML = `
          ${scoreHtml}
          <div id="ai-analysis-result" style="margin:24px 0 0 0;padding:18px 12px;background:#f8f9fd;border-radius:10px;min-height:48px;color:#223355;font-size:15px;"></div>
          <div class="section-divider"></div>
          <h2 class="section-title">详细数据</h2>
          ${tableHtml}
          ${dataBlocksHtml}
          ${topVideosSectionHtml}
          ${jsonInfoHtml}
          <div class="success-message">✓ AI分析Prompt已成功复制到剪贴板</div>
        `;
        this.modalOverlay.style.display = 'block';
        this.modal.style.display = 'block';
        // 发起AI流式分析
        this.fetchAIAssessment(aiPrompt);
      } catch (error) {
        console.error('显示模态框失败:', error);
        this.modalContent.innerHTML = `
          <div class="error-message">操作失败，请刷新页面重试</div>
        `;
        this.modalOverlay.style.display = 'block';
        this.modal.style.display = 'block';
      }
    }

    /**
     * 隐藏模态框
     */
    hideModal() {
      this.modalOverlay.style.display = 'none';
      this.modal.style.display = 'none';
    }

    /**
     * 开始拖动
     */
    startDragging(e) {
      if (e.target.className.includes('draggable')) {
        this.isDragging = true;
        this.offsetX = e.clientX - e.target.offsetLeft;
        this.offsetY = e.clientY - e.target.offsetTop;
        e.target.style.cursor = 'grabbing';
      }
    }

    /**
     * 拖动中
     */
    drag(e) {
      if (!this.isDragging) return;

      const floatBtn = document.getElementById('data-float-btn');
      if (floatBtn) {
        floatBtn.style.right = 'auto';
        floatBtn.style.left = (e.clientX - this.offsetX) + 'px';
        floatBtn.style.top = (e.clientY - this.offsetY) + 'px';
      }
    }

    /**
     * 停止拖动
     */
    stopDragging() {
      const floatBtn = document.getElementById('data-float-btn');
      if (floatBtn) {
        floatBtn.style.cursor = 'pointer';
      }
      this.isDragging = false;
    }

    /**
     * 复制到剪贴板（仅支持Chrome）
     */
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        console.log('文本已成功复制到剪贴板');
      } catch (err) {
        console.error('无法复制文本: ', err);
        this.modalContent.innerHTML = `
          <div class="error-message">复制失败，请手动复制内容</div>
        `;
      }
    }

    /**
     * 发起AI流式分析请求并实时显示
     */
    async fetchAIAssessment(prompt) {
      const apiKey = 'app-123';
      const resultDiv = document.getElementById('ai-analysis-result');
      if (!resultDiv) return;
      resultDiv.innerText = 'AI分析生成中...';
      let lastLength = 0;
      let result = '';
      const body = {
        inputs: { query: prompt },
        response_mode: 'streaming',
        user: 'user-frontend-demo'
      };
      try {
        const GMxhr = window.GM_xmlhttpRequest || GM_xmlhttpRequest;
        console.log('即将发送AI请求', body);
        GMxhr({
          method: 'POST',
          url: 'https://gaia.yafex.cn/v1/completion-messages',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
          },
          data: JSON.stringify(body),
          onprogress: function(resp) {
            console.log('onprogress', resp);
            const chunk = resp.responseText.substring(lastLength);
            lastLength = resp.responseText.length;
            chunk.split('\n\n').forEach(line => {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5));
                  if (data.event === 'message') {
                    result += data.answer;
                    resultDiv.innerText = result;
                  }
                } catch (e) {console.log('parse error', e, line);}
              }
            });
          },
          onload: function(resp) {
            console.log('onload', resp);
            console.log('onload responseText:', resp.responseText);
            // 兼容SSE流式块和非流式返回
            try {
              let result = '';
              resp.responseText.split('\n\n').forEach(line => {
                if (line.startsWith('data:')) {
                  try {
                    const data = JSON.parse(line.slice(5));
                    if (data.event === 'message' && data.answer) {
                      result += data.answer;
                    }
                  } catch (e) {console.log('parse error', e, line);}
                }
              });
              if (result) {
                resultDiv.innerText = result;
              }
            } catch (e) {
              resultDiv.innerText = 'AI分析解析失败';
            }
          },
          onerror: function(resp) { resultDiv.innerText = 'AI分析请求失败'; console.log('onerror', resp); },
          onabort: function(resp) { console.log('onabort', resp); },
          ontimeout: function(resp) { console.log('ontimeout', resp); }
        });
      } catch (err) {
        resultDiv.innerText = 'AI分析请求失败：' + err.message;
        console.log('catch error', err);
      }
    }
  }

  // 初始化应用
  new UIManager();
})();
