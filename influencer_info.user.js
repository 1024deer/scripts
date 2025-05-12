// ==UserScript==
// @name         复制大人信息
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  在网页右侧添加可拖动的悬浮窗，点击显示表格数据
// @author       You
// @match        https://affiliate.tiktokglobalshop.com/connection/creator/detail*
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/1024deer/scripts/main/influencer_info.meta.js
// @downloadURL  https://raw.githubusercontent.com/1024deer/scripts/main/influencer_info.user.js
// @require  https://raw.githubusercontent.com/1024deer/scripts/main/influencer_info.user.js
// ==/UserScript==


(function () {
  'use strict';

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
      }

      #data-float-btn:hover {
          background: #45a049;
      }

      #data-modal {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
          z-index: 10000;
          max-width: 80%;
          max-height: 80vh;
          overflow: auto;
      }

      #data-modal pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: monospace;
          background: #f5f5f5;
          padding: 10px;
          border-radius: 3px;
      }

      #data-modal .close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          cursor: pointer;
          font-size: 20px;
          color: #888;
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
  `);
    const sales_name ="谭亿龙"
  // 创建悬浮按钮
  const floatBtn = document.createElement('div');
  floatBtn.id = 'data-float-btn';
  floatBtn.className = 'draggable';
  floatBtn.textContent = '表格数据';
  document.body.appendChild(floatBtn);

  // 创建模态框和遮罩
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.id = 'data-modal';

  const closeBtn = document.createElement('span');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';

  const modalContent = document.createElement('div');
  modalContent.id = 'modal-content';
  let currentCountry = "出错"
  modal.appendChild(closeBtn);
  modal.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  document.body.appendChild(modal);

  // 示例数据
  function generateTableData() {
    // 汇率数据（示例汇率，使用时请更新）
    const exchangeRates = {
      'THB': 0.20,    // 1泰铢 ≈ 0.20人民币
      'PHP': 0.13,    // 1菲律宾比索 ≈ 0.13人民币
      'MYR': 1.56,    // 1马来西亚林吉特 ≈ 1.56人民币
      'VND': 0.00029  // 1越南盾 ≈ 0.00029人民币
    };

    // 货币符号识别
    const currencySymbols = {
      '฿': 'THB',
      '₱': 'PHP',
      'RM': 'MYR',
      '₫': 'VND'
    };
    // 货币代码与国家中文名的映射
    const currencyToCountry = {
      'THB': '泰国',
      'PHP': '菲律宾',
      'MYR': '马来西亚',
      'VND': '越南'
      // 可以继续添加其他货币代码和对应的国家
    };
    /**
    * 将带有K/M后缀的数字字符串转换为纯数值
    * @param {string} numStr - 数字字符串，如 "153.99K", "234", "5.2M"
    * @returns {number} 转换后的数值
    */
    function convertNumberString(numStr) {
      // 移除可能存在的逗号(千位分隔符)和加号
      const cleanStr = numStr.replace(/[+,]/g, '').trim().toUpperCase();

      // 检查后缀并计算乘数
      let multiplier = 1;
      if (cleanStr.endsWith('K')) {
        multiplier = 1000;
      } else if (cleanStr.endsWith('M')) {
        multiplier = 1000000;
      }

      // 提取数字部分并转换
      const numberPart = cleanStr.replace(/[KM]$/, '');
      const number = parseFloat(numberPart) || 0;

      return number * multiplier;
    }
    /**
    * 将货币字符串转换为人民币数值
    * @param {string} amountStr - 货币字符串，如 "฿817.3K", "537.3M₫"
    * @returns {number} 人民币数值
    */

    function convertToRMB(amountStr) {
      // 统一处理：去除空格和特殊字符
      const cleanStr = amountStr.replace(/\s+/g, '');

      // 识别货币符号和位置
      let currency = null;
      let symbol = null;
      let numericStr = '';

      // 检查所有可能的货币符号
      for (const [sym, curr] of Object.entries(currencySymbols)) {
        const symPos = cleanStr.indexOf(sym);
        if (symPos >= 0) {
          // 找到货币符号
          currency = curr;
          symbol = sym;

          // 提取数值部分（符号前或符号后）
          if (symPos === 0) {
            // 符号在前，如 "฿5.5K"
            numericStr = cleanStr.slice(sym.length);
          } else {
            // 符号在后，如 "1M₫+"
            numericStr = cleanStr.slice(0, symPos);
          }
          break;
        }
      }

      if (!currency) throw new Error('无法识别的货币类型: ' + amountStr);
      currentCountry =currencyToCountry[currency] || '未知国家';
      // 清理数值字符串（移除千位分隔符和特殊符号）
      const cleanNumeric = numericStr.replace(/[+,]/g, '');

      // 解析数值
      const number = parseNumber(cleanNumeric);

      // 转换为人民币
      return number * exchangeRates[currency];
    }


    /**
    * 解析带有K/M后缀的数字字符串
    * @param {string} str - 数字字符串，如 "817.3K", "10M"
    * @returns {number} 解析后的数字
    */
    function parseNumber(str) {
      const num = parseFloat(str);
      if (str.toUpperCase().includes('K')) return num * 1000;
      if (str.toUpperCase().includes('M')) return num * 1000000;
      return num;
    }

    // 获取达人ID
    const creatorId = document.querySelector("#creator-detail-profile-container").children[0].children[1].children[0].children[0].children[0].children[0].innerText;

    // 获取达人类目（需数据处理）
    const creatorCategory = document.querySelector("#creator-detail-profile-container").children[0].children[1].children[1].children[0].children[0].children[1].innerText.split('\n')[0];

    // 获取达人粉丝量
    const followerCount1 = document.querySelector("#creator-detail-profile-container").children[0].children[1].children[1].children[0].children[1].children[1].innerText;
    const followerCount = parseNumber(followerCount1); // 解析后缀K/M
    // 获取交易数据卡片
    const dataCards = document.querySelectorAll(".creator_video_data_card_trigger_is_display");

    // 从数据卡片中提取各项指标
    const totalTransactionAmount1 = dataCards[0].children[0].children[0].innerText.split('\n')[0]; // 交易总额
    console.log(totalTransactionAmount1);
    const totalTransactionAmount = convertToRMB(totalTransactionAmount1); // 转换为人民币数值
    const completedTransactions1 = dataCards[1].children[0].children[0].innerText; // 成交件数
    const completedTransactions = parseNumber(completedTransactions1); // 解析后缀K/M
    let star = 4; // 星级（示例数据）
    if (completedTransactions>=1000) {
      star = 4;
    }else if (completedTransactions>=200) {
      star = 3;
    }else{
      star = 2;
    }
    const gpmPerThousandImpressions1 = dataCards[2].children[0].children[0].innerText; // 千次曝光成交金额
    const gpmPerThousandImpressions = convertToRMB(gpmPerThousandImpressions1); // 转换为人民币数值
    const gpmPerCustomer1 = dataCards[3].children[0].children[0].innerText; // 每位客户的商品交易总额
    const gpmPerCustomer = convertToRMB(gpmPerCustomer1); // 转换为人民币数值
    const estimatedPublishRate = dataCards[4]?.children[0].children[0].innerText || 'N/A'; // 预计发布率
    const averageCommissionRateText = dataCards[5]?.children[0].children[0].innerText;
    const averageCommissionRate = averageCommissionRateText && averageCommissionRateText.includes('%')
      ? averageCommissionRateText
      : 'N/A';// 平均佣金率
    const productCount = dataCards[6]?.children[0].children[0].innerText || 'N/A'; // 商品数
    const brandCollaborations = dataCards[7]?.children[0].children[0].innerText || 'N/A'; // 品牌合作
    const videoGPM1 = dataCards[8]?.children[0].children[0].innerText || 'N/A'; // 视频GPM
    const videoGPM = convertToRMB(videoGPM1); // 转换为人民币数值
    const videoCount1 = dataCards[9]?.children[0].children[0].innerText || 'N/A'; // 视频数
    const videoCount = parseNumber(videoCount1); // 解析后缀K/M
    const averageVideoViews1 = dataCards[10]?.children[0].children[0].innerText || 'N/A'; // 平均视频播放量
    const averageVideoViews = parseNumber(averageVideoViews1); // 解析后缀K/M
    const videoInteractionRate = dataCards[11]?.children[0].children[0].innerText || 'N/A'; // 视频互动率
   
    // 表头行（制表符分隔）
    const headers = [
      "创作者ID",
      "星级",
      "添加时间",
      "国家",
      "创作者类别",
      "粉丝数",
      "总交易额",
      "完成交易数",
      "千次曝光GPM",
      "单客GPM",
      "预估发布率",
      "平均佣金率",
      "商品数",
      "品牌合作数",
      "视频GPM",
      "视频数",
      "平均视频观看量",
      "视频互动率"
    ].join("\t");

    // 数据行（示例数据，制表符分隔）
    const excelRow = [
      creatorId,
      star,
      new Date().toISOString().split('T')[0],
      creatorCategory,
      currentCountry,
      sales_name,
      "\\",
      "\\",
      followerCount,
      totalTransactionAmount.toFixed(0),
      completedTransactions,
      gpmPerThousandImpressions.toFixed(0),
      "\\",
      gpmPerCustomer.toFixed(0),
      estimatedPublishRate,
      averageCommissionRate,
      productCount,
      brandCollaborations,
      videoGPM.toFixed(0),
      videoCount,
      averageVideoViews,
      videoInteractionRate
    ].join("\t");

    return `${excelRow}`;
  }

  // 显示模态框
  floatBtn.addEventListener('click', function () {
    const str1 = generateTableData();
    modalContent.innerHTML = `<pre>${str1}</pre>
      <pp>已经复制到粘贴板</p>`;
    modalOverlay.style.display = 'block';
    modal.style.display = 'block';
    
    copyToClipboard(str1);
  });

  // 关闭模态框
  closeBtn.addEventListener('click', function () {
    modalOverlay.style.display = 'none';
    modal.style.display = 'none';
  });

  modalOverlay.addEventListener('click', function () {
    modalOverlay.style.display = 'none';
    modal.style.display = 'none';
  });

  // 拖动功能
  let isDragging = false;
  let offsetX, offsetY;

  floatBtn.addEventListener('mousedown', function (e) {
    if (e.target.className.includes('draggable')) {
      isDragging = true;
      offsetX = e.clientX - floatBtn.getBoundingClientRect().left;
      offsetY = e.clientY - floatBtn.getBoundingClientRect().top;
      floatBtn.style.cursor = 'grabbing';
    }
  });

  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;

    floatBtn.style.right = 'auto';
    floatBtn.style.left = (e.clientX - offsetX) + 'px';
    floatBtn.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', function () {
    isDragging = false;
    floatBtn.style.cursor = 'pointer';
  });

  // 防止拖动时选中文本
  document.addEventListener('selectstart', function (e) {
    if (isDragging) e.preventDefault();
  });

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('文本已成功复制到剪贴板');
    } catch (err) {
      console.error('无法复制文本: ', err);
    }
  }
})();
