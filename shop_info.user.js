// ==UserScript==
// @name         店铺信息显示
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  拦截特定API响应并提取shop_code存储到localStorage
// @author       Your Name
// @match        https://seller.tiktokglobalshop.com/**
// @match        https://affiliate.tiktokglobalshop.com/**
// @match        https://seller.tiktokshopglobalselling.com/**
// @match        https://affiliate.tiktokshopglobalselling.com/**
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      117.72.98.112
// @run-at document-start
// ==/UserScript==

(function () {
    'use strict';
  
    // 检查是否已有shop_code
    const existingShopCode = localStorage.getItem('shop_code');
    if (existingShopCode) {
      console.log('shop_code already exists:', existingShopCode);
      sendShopCodeRequest(existingShopCode);
      return;
    }
  
    // 延迟执行以确保unsafeWindow可用
    const initInterceptor = () => {
      // 获取页面的原始window对象
      const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  
      // 如果fetch已经被重写过，不再重复处理
      if (targetWindow.fetch.__isIntercepted) return;
  
      // 存储原始fetch方法
      const originalFetch = targetWindow.fetch.bind(targetWindow);
  
      // 重写fetch方法以拦截请求
      targetWindow.fetch = async function (...args) {
        try {
          const response = await originalFetch.apply(this, args);
  
          // 只在成功响应时处理
          if (!response.ok) return response;
  
          // 克隆响应以便我们可以读取它而不影响原始响应
          const clonedResponse = response.clone();
  
          // 检查URL是否是我们感兴趣的API
          const targetAPIs = [
            '/api/v3/seller/common/get',
            '/api/v1/affiliate/account/info'
          ];
  
          const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url;
          console.log('API拦截器正在检查请求:', requestUrl);
  
          const isTargetAPI = targetAPIs.some(api => requestUrl && requestUrl.includes(api));
          console.log('API拦截器检查结果:', isTargetAPI ? '是目标API' : '不是目标API');
  
          if (isTargetAPI) {
            try {
              const contentType = clonedResponse.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const data = await clonedResponse.json();
                const shopCode = data?.shop_code || data?.data?.seller?.shop_code;
  
                if (shopCode) {
                  console.log('提取到shop_code:', shopCode);
                  localStorage.setItem('shop_code', shopCode);
                  sendShopCodeRequest(shopCode);
                }
              }
            } catch (error) {
              console.error('处理响应数据时出错:', error);
            }
          }
  
          return response;
        } catch (error) {
          console.error('拦截fetch请求时出错:', error);
          return originalFetch.apply(this, args);
        }
      };
  
      // 标记已重写的fetch
      targetWindow.fetch.__isIntercepted = true;
      console.log('API拦截器已成功安装');
    };
  
    // 尝试立即执行，如果失败则延迟执行
    try {
      initInterceptor();
    } catch (e) {
      console.log('延迟初始化拦截器...');
      setTimeout(initInterceptor, 100);
    }
  
    function sendShopCodeRequest(shopCode) {
      const url = `https://117.72.98.112/api/get_shop_info_by_shop_code?shop_code=${encodeURIComponent(shopCode)}`;
      console.log('Sending shop_code to:', url);
  
      // 使用GM_xmlhttpRequest来绕过CSP限制
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
          console.log('Success:', response.responseText);
          try {
            const data = JSON.parse(response.responseText);
            const { shop_shortname, shop_level, sales_name, shop_Category } = data;
            let retryCount = 0;
            function insertInfo(maxRetries = 30) {
  
              console.log("retryCount",retryCount);
  
              if (retryCount >= maxRetries) {
                console.warn('Max retries reached, element not found');
                return;
              }
              if (!window.location.href.includes('affiliate')) {
                console.log(" not includes('affliate')");
  
                const element = document.querySelector(".theme-arco-menu-overflow-wrap");
                if (element) {
                  element.insertAdjacentHTML('afterend', `
          <div tabindex="0" role="menuitem" class="theme-arco-menu-item"><div >简称：${shop_shortname.substring(0, 4)}</div></div>
          <div tabindex="0" role="menuitem" class="theme-arco-menu-item"><div >层级：${shop_level}</div></div>
          <div tabindex="0" role="menuitem" class="theme-arco-menu-item"><div >运营：${sales_name}</div></div>
          <div tabindex="0" role="menuitem" class="theme-arco-menu-item"><div >类目：${shop_Category}</div></div>
        `);
                } else {
                  retryCount++;
                  setTimeout(insertInfo, 500); // Retry after 200ms if element not found
                }
              } else {
                const element = document.querySelector("#scroll-container")?.children[0]?.children[0];
                if (element) {
                  element.insertAdjacentHTML('afterend', `
          <div class="flex items-center">
            <div style="margin: 0px 16px; display: flex; justify-content: center; align-items: center; height: 36px;">
              <div class="px-16 cursor-pointer h-full flex items-center border-solid border-width-s"
                style="border-radius: 4px; background-color: rgba(255, 255, 255, 0.05); border-color: transparent;">
                <span class="text-neutral-white text-body-m-medium whitespace-nowrap">简称：${shop_shortname.substring(0, 4)}</span>
                <span data-tid="m4b_badge" class="m4b-badge m4b-badge-no-children ml-4 mt-4"></span>
              </div>
              <div class="px-16 cursor-pointer h-full flex items-center border-solid border-width-s"
                style="border-radius: 4px; background-color: rgba(255, 255, 255, 0.05); border-color: transparent;">
                <span class="text-neutral-white text-body-m-medium whitespace-nowrap">层级：${shop_level}</span>
                <span data-tid="m4b_badge" class="m4b-badge m4b-badge-no-children ml-4 mt-4"></span>
              </div>
              <div class="px-16 cursor-pointer h-full flex items-center border-solid border-width-s"
                style="border-radius: 4px; background-color: rgba(255, 255, 255, 0.05); border-color: transparent;">
                <span class="text-neutral-white text-body-m-medium whitespace-nowrap">运营：${sales_name}</span>
                <span data-tid="m4b_badge" class="m4b-badge m4b-badge-no-children ml-4 mt-4"></span>
              </div>
              <div class="px-16 cursor-pointer h-full flex items-center border-solid border-width-s"
                style="border-radius: 4px; background-color: rgba(255, 255, 255, 0.05); border-color: transparent;">
                <span class="text-neutral-white text-body-m-medium whitespace-nowrap">类目：${shop_Category}</span>
                <span data-tid="m4b_badge" class="m4b-badge m4b-badge-no-children ml-4 mt-4"></span>
              </div>
            </div>
          </div>
        `);
                } else {
                  console.log("找不到#scroll-container",retryCount);
  
                  retryCount++;
                  setTimeout(insertInfo, 500); // Retry after 200ms if element not found
                }
              }
            }
  
            // Initial call
            insertInfo();
  
          }
          catch (error) {
            console.error('Error parsing response:', error);
          }
        },
        onerror: function (error) {
          console.error('Error sending shop_code:', error);
        }
      });
    }
  
  })();
