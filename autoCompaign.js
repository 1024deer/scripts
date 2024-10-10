    'use strict';
    'use strict';
    let cur_country_code = ""
    // Your code here...
    let completeFlag = false;
    let abortFlag = false;
    let savedDateobj = null;
    let autoCompeignFlag = localStorage.getItem('autoCompeignFlag') || "false";
    let sameAsflashsellFlag = localStorage.getItem('sameAsflashsellFlag') || "false";
    let countryInfoObject = localStorage.getItem('countryInfoObject')
    if (countryInfoObject == null) {
        abortFlag = true;
    }
    let compaignInfo = null;
    let compaignTitle = ""
    let storedCtObject = JSON.parse(countryInfoObject);
    function checkAbort() {
        if (abortFlag) {
            autoCompeignFlag = "false";
            localStorage.setItem('autoCompeignFlag', "false");
            throw new Error('Process aborted');
        }
    }
    function findFirstNonOneCountry(storedCtObject) {

        for (var country in storedCtObject) {
            // 检查值是否不为 1
            //alert(country,storedCtObject[country]);
            if (storedCtObject.hasOwnProperty(country) && storedCtObject[country][0] == 0) {
                // 返回第一个不为 1 的国家代码
                return country;
            }
        }
        // 如果对象中所有值都为 1，则返回 null
        return null;
    }

    var floatingWindow = document.createElement('div');
    floatingWindow.innerHTML = `
    <div id="floatingBox" style="
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        background-color: #f5f5f5;
        border-radius: 10px 0 0 10px;
        padding: 20px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif;
        width: 220px;
        transition: right 0.3s ease;
    ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <p style="margin: 0; color: #333;">折扣力度<span id="discountRate" style="color: #666; margin-left: 5px;"></span></p>
            <button id="closeBtn" style="
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
            ">×</button>
        </div>
        <form style="display: flex; flex-direction: column;">
            <label style="margin-bottom: 10px; color: #444;">
                <input type="radio" name="option" value="option1" style="margin-right: 10px;" class="option-radio">
                与秒杀一致
            </label>
            <label style="margin-bottom: 10px; color: #444;">
                <input type="radio" name="option" value="option2" style="margin-right: 10px;"  class="option-radio">
                秒杀+1
            </label>
            <input type="date" id="date-picker" name="date-picker">
        </form>
        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
            <button id="autoBtn" style="
                padding: 8px 16px;
                background-color: #808080;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">自动</button>
                        <button id="startBtn" style="
                padding: 8px 16px;
                background-color: #808080;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">开始</button>
            <button id="endBtn" style="
                padding: 8px 16px;
                background-color: #a9a9a9;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">结束</button>
                        <button id="clearBtn" style="
                padding: 8px 16px;
                background-color: #a9a9a9;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">清空</button>
        </div>
    </div>
`;
    document.body.appendChild(floatingWindow);
    const datePicker = document.getElementById('date-picker');

    const savedDate = localStorage.getItem('selectedDate');
    if (savedDate) {
        datePicker.value = savedDate;
        savedDateobj = new Date(savedDate);
    } else {
        // 如果selectedDate不存在，设置为两周后
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

        // 格式化日期为 YYYY-MM-DD
        const formattedDate = twoWeeksLater.toISOString().split('T')[0];

        datePicker.value = formattedDate;
        savedDateobj = twoWeeksLater;
    }
    // 当日期变更时，保存到localStorage
    datePicker.addEventListener('change', function () {
        localStorage.setItem('selectedDate', this.value);

    });


    // 添加关闭功能
    document.getElementById('closeBtn').addEventListener('click', function () {
        var box = document.getElementById('floatingBox');
        box.style.right = '-250px';
        setTimeout(() => box.remove(), 300); // 等待动画完成后移除元素
    });

    // 添加按钮点击事件（可选）
    document.getElementById('startBtn').addEventListener('click', function () {
        console.log('开始按钮被点击');
        abortFlag = false;
        main();
    });
    // 添加按钮点击事件（可选）
    document.getElementById('autoBtn').addEventListener('click', function () {
        clearStatus();
        console.log('开始按钮被点击');
        autoCompeignFlag = 'true';
        localStorage.setItem('autoCompeignFlag', "true");
        waitDomLoading();
    });
    handleOptionChange();


    document.getElementById('endBtn').addEventListener('click', function () {
        console.log('结束按钮被点击');
        abortFlag = true;
    });
    document.getElementById('clearBtn').addEventListener('click', function () {
        console.log('清空按钮被点击');
        localStorage.removeItem('compaignInfoMY');
        localStorage.removeItem('compaignInfoPH');
        localStorage.removeItem('compaignInfoSG');
        localStorage.removeItem('compaignInfoTH');
        localStorage.removeItem('compaignInfoVN');
    });
    
    selectOption();
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
    function matchCountry() {
        let countryCode = ''
        let countryKeyword = document.querySelector('#WB-GEC-nav-bar').children[0].children[4].children[5].children[0].children[0].children[1].children[0].innerText
        if (countryKeyword.includes('马来西亚')) {
            countryCode = 'MY';
        } else if (countryKeyword.includes('菲律宾')) {
            countryCode = 'PH';
        } else if (countryKeyword.includes('新加坡')) {
            countryCode = 'SG';
        } else if (countryKeyword.includes('泰国')) {
            countryCode = 'TH';
        }
        else if (countryKeyword.includes('越南')) {
            countryCode = 'VN';
        }
        return countryCode
    }

    function sleep(ms) {
        console.log("sleep ", ms);

        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function executeWithRetry(name, func) {
        let count = 0;
        do {
            // 调用传入的函数并获取返回值
            const result = await func();
            // 如果返回值为真，则继续执行下一步操作
            if (result == true) {
                break; // 退出循环
            } else {
                console.log(`${name}未找到`);
                // 如果返回值为假，则等待一段时间后再次执行函数
                count++;
                await sleep(500);
            }
            if (count > 60) {
                alert(`${name}超时未找到`);
                abortFlag = true;
                break;
            }
            if (abortFlag) {
                break;
            }
        } while (true);
    }



    async function waitDomLoading() {

        const url = window.location.href;
        // alert(url);
        if (url.includes("https://seller.tiktokglobalshop.com/promotion/campaign-tools/all")) {
            await sleep(2000);
            await executeWithRetry("等待页面加载完毕", async function () {
                let flag = 1;
                let links = document.querySelectorAll(".theme-arco-link") || [];

                if (links.length != 0) {
                    let index = -1;
                    const obj = [

                    ]
                    links.forEach((linkNode) => {
                        const title = linkNode.innerText;
                        if (title == "" || title.includes("查看全部")) return false;
                        
                        if (title.includes("GMT")) {
                            obj.push({
                                compaignName: title,
                                children: [],
                                el: linkNode
                            });
                            index++;
                        } else {
                            const str1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KICA8cGF0aCBma"

                            const svgEL = linkNode.querySelector("img");
                            if (!svgEL || !svgEL.src.startsWith(str1)) {
                                return;
                            }
                            obj[index].children.push({
                                compaignName: title,
                                children: [],
                                el: linkNode
                            });
                        }
                    });
                    cur_country_code = matchCountry();
                    if (findFirstNonOneCountry(storedCtObject) == null) {
                        clearStatus();
                        autoCompeignFlag = "false";
                        abortFlag = true;
                        localStorage.setItem('autoCompeignFlag', "false");
                        alert("全部完成");
                    }
                    if (storedCtObject[cur_country_code][0] == 1) {
                        const userConfirmed = confirm(`似乎已经设置过，继续为${cur_country_code}设置吗？`);
                        if (userConfirmed) {
                            // process(cur_country_code);
                        } else {
                            let next_country_code = findFirstNonOneCountry(storedCtObject);
                            window.location.href = `https://seller.tiktokglobalshop.com/promotion/campaign-tools/all?page_index=1&page_size=20&shop_region=${next_country_code}`
                        }
                    }
                    // 遍历obj
                    let unParsedCompaignInfo = localStorage.getItem('compaignInfo' + matchCountry());
                    if (unParsedCompaignInfo) {
                        compaignInfo = new Set(JSON.parse(unParsedCompaignInfo));
                    } else {
                        compaignInfo = new Set();
                    }
                    obj.forEach((compaign, index) => {

                        const compaignDateObj = extractStartDate(compaign.compaignName);

                        if (compaignDateObj <= savedDateobj) {
                            compaign.children.forEach((childCompaign) => {
                                if (!compaignInfo.has(childCompaign.compaignName) && flag == 1) {
                                    compaignTitle = childCompaign.compaignName;
                                    flag = 0;
                                    const btn = childCompaign.el.parentNode.parentNode.parentNode.children[1].children[0];

                                    if (btn) {
                                        btn.click();
                                    }
                                }
                            });
                        }

                    });
                    if (flag == 1) {
                        completeFlag = true;
                        return true; // 假设条件始终为真
                    } else {
                        return true; // 假设条件始终为真
                    }
                } else {
                    const el = document.querySelector(".theme-arco-space");
                    if (el) {
                        const text = el.nextSibling.innerText;
                        if (text.includes("目前暂无可用活动。请稍后再来查看。")) {
                            completeFlag = true;
                            return true; // 假设条件始终为真
                        }
                    }
                }
                return false;
            });
            if (completeFlag) {
                cur_country_code = matchCountry();
                console.log("countryInfoObject", storedCtObject);
                storedCtObject[cur_country_code][0] = 1;
                localStorage.setItem("countryInfoObject", JSON.stringify(storedCtObject));
                console.log("countryInfoObject", storedCtObject);

                // alert("完成");
                if (findFirstNonOneCountry(storedCtObject) == null) {
                    clearStatus();
                    autoCompeignFlag = "false";
                    abortFlag = true;
                    localStorage.setItem('autoCompeignFlag', "false");
                    alert("全部完成");
                }
                let next_country_code = findFirstNonOneCountry(storedCtObject);
                window.location.href = `https://seller.tiktokglobalshop.com/promotion/campaign-tools/all?page_index=1&page_size=20&shop_region=${next_country_code}`
                // window.location.href = "https://seller.tiktokglobalshop.com/promotion/campaign-tools/all?page_index=1&page_size=20";
            }
            await executeWithRetry("等待页面跳转", async function () {
                const curUrl = window.location.href;
                if (url != curUrl) {

                    return true; // 假设条件始终为真
                }
                return false;
            });
            await sleep(3000);
            await main();

        }

    }

    async function main() {
        const compaignId = window.location.href.match(/detail\/(\d+)/)[1];
        let unParsedCompaignInfo = localStorage.getItem('compaignInfo' + matchCountry());
        if (unParsedCompaignInfo) {
            compaignInfo = new Set(JSON.parse(unParsedCompaignInfo));
        } else {
            compaignInfo = new Set();
        }
        if (compaignInfo.has(compaignId)) {
            let confirm = window.confirm("您已经报名了该活动，是否重新报名?");
            if (!confirm) {
                compaignInfo.add(compaignTitle);
                localStorage.setItem('compaignInfo' + matchCountry(), JSON.stringify(Array.from(compaignInfo)));
                return;
            }
        }
        const curDiscountRate = document.getElementById('discountRate');
        curDiscountRate.textContent = sameAsflashsellFlag == "true" ? storedCtObject[matchCountry()][1] : storedCtObject[matchCountry()][1] + 1;
        await executeWithRetry("点击同意", async function () {
            let DivEL = document.querySelector("#campaign-detail-basic-info");
            if (!DivEL)return false;
            let tempBtn = DivEL.querySelectorAll(".theme-arco-btn-shape-square")[0];
            if(tempBtn.classList.contains('theme-arco-btn-loading'))return false;
            if (tempBtn.innerText.includes("下载失败报告")||tempBtn.innerText.includes("报名中")||tempBtn.innerText.includes("不可参与")){
                compaignInfo.add(compaignTitle);
                localStorage.setItem('compaignInfo' + matchCountry(), JSON.stringify(Array.from(compaignInfo)));
                window.location.href = "https://seller.tiktokglobalshop.com/promotion/campaign-tools/all?page_index=1&page_size=20";
                return true;
            }
            if (tempBtn) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(2000);
        checkAbort();
        let tempBtn = Array.from(document.getElementsByTagName('button')).find(button =>
            button.textContent.trim() === '同意'
        );
        if (tempBtn) {
            tempBtn.click();
        }
        await sleep(2000);
        checkAbort();
        await executeWithRetry("点击radio图片", async function () {
            let tempBtn = document.querySelectorAll(".theme-arco-image-img")[3];
            if (tempBtn) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(2000);
        checkAbort();

        await executeWithRetry("点击下一步", async function () {
            let tempBtn = Array.from(document.getElementsByTagName('button')).find(button =>
                button.textContent.trim() === '下一步'
            );
            if (tempBtn) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(2000);
        checkAbort();


        await executeWithRetry("点击百分比", async function () {
            const radioGroup = document.querySelectorAll(".theme-arco-radio-group")[1];
            if (!radioGroup) {
                return false;
            }
            const divs = radioGroup.querySelectorAll('div');
            let tempBtn = null;
            for (const div of divs) {
                if (div.textContent.trim() === '折扣将适用于所有已选商品') {
                    tempBtn = div;
                    break;
                }
            }
            if (tempBtn) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });





        await sleep(1000);
        checkAbort();
        await executeWithRetry("点击下一步", async function () {
            const inputEls = document.querySelectorAll(".theme-arco-input");
            console.log("inputEls", inputEls.length);

            if (inputEls.length === 0) {
                return false;
            }
            const discountRateInput = inputEls[0];
            const curCountry = matchCountry();
            let discountRate = Number.parseInt(storedCtObject[curCountry][1]);
            if (sameAsflashsellFlag == "false") {
                discountRate += 1;
            }
            changeReactInputValue(discountRateInput, discountRate);
            if (inputEls.length == 2) {
                const stockInput = inputEls[1];
                changeReactInputValue(stockInput, 100);
            }
            return true; // 假设条件始终为真
        });

        await sleep(1000);
        checkAbort();
        await executeWithRetry("点击下一步", async function () {
            let tempBtn = Array.from(document.getElementsByTagName('button')).find(button =>
                button.textContent.trim() === '下一步'
            );
            const spanEL = tempBtn.children[0];
            if (tempBtn && window.getComputedStyle(spanEL).cursor != "not-allowed") {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(2000);
        checkAbort();

        await executeWithRetry("点击提交", async function () {
            const pageNum = document.querySelector(".theme-arco-pagination-jumper-separator").nextSibling.innerText;
            let tempBtn = Array.from(document.getElementsByTagName('button')).find(button =>
                button.textContent.trim() === '提交'
            );
            if (tempBtn && pageNum != 0) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });

        await sleep(1000);
        checkAbort();
        await executeWithRetry("查找报名中，验证是否完成", async function () {
            let tempBtn = Array.from(document.getElementsByTagName('button')).find(button =>
                button.textContent.trim().includes("报名中")
            );
            if (tempBtn) {
                compaignInfo.add(compaignId);
                compaignInfo.add(compaignTitle);
                localStorage.setItem('compaignInfo' + matchCountry(), JSON.stringify(Array.from(compaignInfo)));
                if (autoCompeignFlag == "true") {
                    window.location.href = "https://seller.tiktokglobalshop.com/promotion/campaign-tools/all?page_index=1&page_size=20";
                }
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(2000);
    }
    if (autoCompeignFlag == "true") {
        waitDomLoading();
    }

    function extractStartDate(campaignInfo) {
        // 使用正则表达式匹配日期格式 YYYY/MM/DD
        const dateRegex = /(\d{4}\/\d{2}\/\d{2})/;
        const match = campaignInfo.match(dateRegex);

        if (match) {
            // 提取匹配到的日期字符串
            const dateStr = match[1];
            // 将日期字符串转换为Date对象
            const startDate = new Date(dateStr);
            return startDate;
        } else {
            // 如果没有匹配到日期，返回null或抛出错误
            return null; // 或者 throw new Error("未找到有效的开始日期");
        }
    }

    function entance() {
        if (storedCtObject[cur_country_code][0] != 0) {
            const userConfirmed = confirm(`似乎已经设置过，继续为${cur_country_code}设置吗？`);
            if (userConfirmed) {
                // process(cur_country_code);
            } else {
                let next_country_code = findFirstNonOneCountry(storedCtObject);
                window.location.href = `https://seller.tiktokglobalshop.com/promotion/campaign-tools/all?page_index=1&page_size=20&shop_region=${next_country_code}`
            }
        }
    }

    function clearStatus() {

        for (var country in storedCtObject) {
            storedCtObject[country][0] = 0
        }
        localStorage.setItem("countryInfoObject", JSON.stringify(storedCtObject));
        // updatecountryCheckbox();
    }
    function handleOptionChange() {
        const options = document.querySelectorAll('.option-radio');

        options.forEach(option => {
            option.addEventListener('change', function () {
                if (this.checked) {
                    console.log('选中的选项是: ' + this.value);
                    // 这里可以添加其他您想要执行的操作
                    if (this.value == "option1") {
                        sameAsflashsellFlag = "true";
                    } else {
                        sameAsflashsellFlag = "false";
                    }
                    localStorage.setItem('sameAsflashsellFlag', sameAsflashsellFlag);
                }
            });
        });
    }
    function selectOption() {
        let option = document.querySelector('.option-radio[value="option1"]');;
        if (sameAsflashsellFlag) {
            option = document.querySelector('.option-radio[value="option2"]');
        }
        option.checked = true;
    }
