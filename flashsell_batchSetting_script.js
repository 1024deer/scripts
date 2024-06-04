 'use strict';
    // Your code here...
let storedCtObject = null;
let cur_country_code = '';
const  defalutValue={
    'MY': [0,42],
    'PH': [0,42],
    'SG': [0,42],
    'TH': [0,42],
    'VN': [0,45]
};
var flashsellIsRuning = localStorage.getItem('flashsellIsRuning') || "false";
var productTypeIsSku = localStorage.getItem('productTypeIsSku') || "true";
var discountRateObj = null
let abortFlag =false
if (localStorage.getItem('countryInfoObject') == null) {
    storedCtObject = defalutValue
    localStorage.setItem("countryInfoObject", JSON.stringify(storedCtObject));
} else {
    var countryInfoObject = localStorage.getItem('countryInfoObject')
    storedCtObject = JSON.parse(countryInfoObject);
}

function isManagementURL(url) {
    // 定义正则表达式，匹配最后一个斜杠 '/' 和问号 '?' 之间的部分是否为 "management"
    var regex = /\/([^\/?]+)\?/;

    // 使用正则表达式匹配 URL
    var match = url.match(regex);

    // 如果匹配成功，并且匹配的部分为 "management"，返回 true，否则返回 false
    return match && match[1] === 'management';
}
function getLocalTime(countryCode,index) {
    let timeStr = localStorage.getItem('flashsellbeginTime');
    if (timeStr) {
        let time = new Date(timeStr);
        if (countryCode == "TH" || countryCode == "VN") {
            // 获取原始时间的年、月、日、小时和分钟
            time.setHours(time.getHours() - 1);

        }
        if(index==1){
            time.setDate(time.getDate() + 3);
        }
        return {
            day: time.getDate(),
            hour: String(time.getHours()).padStart(2, '0'),
            minites: time.getMinutes()
        };
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


function matchCountry() {
    let countryCode=''
    let countryKeyword =document.querySelector('#WB-GEC-nav-bar').children[0].children[4].children[5].children[0].children[0].children[1].children[0].innerText
    if(countryKeyword.includes('马来西亚')){
        countryCode='MY';
    }else if(countryKeyword.includes('菲律宾')){
        countryCode='PH';
    }else if(countryKeyword.includes('新加坡')){
        countryCode='SG';
    }else if(countryKeyword.includes('泰国')){
        countryCode='TH';
    }
    else if(countryKeyword.includes('越南')){
        countryCode='VN';
    }
    return countryCode
}

function entance() {
        cur_country_code = matchCountry()
        console.log("cur_country_code",cur_country_code);
        if(!isManagementURL(window.location.href)){
            const userConfirmed = confirm("页面似乎不正确，是否跳转到促销管理页面");
            // 检查用户的选择并执行相应操作
            if (userConfirmed) {
                window.location.href = "https://seller.tiktokglobalshop.com/promotion/marketing-tools/management"
            } else {
                return
            }
        }else{
            if (storedCtObject[cur_country_code][0]==0) {
                process(cur_country_code);
            } else {
                const userConfirmed = confirm(`似乎已经设置过，继续为${cur_country_code}设置秒杀吗？`);
                // 检查用户的选择并执行相应操作
                if (userConfirmed) {
                    process(cur_country_code);
                } else {
                    let next_country_code = findFirstNonOneCountry(storedCtObject)
                    window.location.href = `https://seller.tiktokglobalshop.com/promotion/marketing-tools/management?tab=1&promotion_type=1&shop_region=${next_country_code}`
                }

            }

        }
}
var floatingWindow = document.createElement('div');
floatingWindow.innerHTML = `

  <div style="position: fixed; top: 50%; right: 20px; transform: translateY(-50%); z-index: 9999; background-color: #fff; border: 1px solid #ccc; padding: 10px;">
  <div style="display: flex; flex-direction: column;" id="countryCheckbox">
  <label style="margin-bottom: 10px;">
      <input type="checkbox" name="country" value="MY"  class ="countrycheck"> 马来西亚
      <input type="number" name="MY" class="countryDiscount" style="margin-left: 10px; border:1px,solid,black;">
  </label>
  <label style="margin-bottom: 10px;">
      <input type="checkbox" name="country" value="PH" class ="countrycheck"> 菲律宾
      <input type="number" name="PH" class="countryDiscount" style="margin-left: 10px; border:1px,solid,black;">
  </label>
  <label style="margin-bottom: 10px;">
      <input type="checkbox" name="country" value="SG"  class ="countrycheck"> 新加坡
      <input type="number" name="SG" class="countryDiscount" style="margin-left: 10px; border:1px,solid,black;">
  </label>
  <label style="margin-bottom: 10px;">
      <input type="checkbox" name="country" value="TH"  class ="countrycheck"> 泰国
      <input type="number" name="TH" class="countryDiscount" style="margin-left: 10px; border:1px,solid,black;">
  </label>
  <label style="margin-bottom: 10px;">
      <input type="checkbox" name="country" value="VN"  class ="countrycheck"> 越南
      <input type="number" name="VN" class="countryDiscount" style="margin-left: 10px; border:1px,solid,black;">
  </label>
</div>
    <input type="checkbox" name="productType" id="productType" > 指定销售变体
        <br/>
      <label for="begin-time">开始时间</label>
      <br/>
      <input
        type="datetime-local"
        id="begin-time"
        name="begin-time"/>
        <br/>
      <button id="startButton" style="margin-bottom: 5px;">开始</button>
      <br>
      <button id="clearButton">结束</button>
      <button id="setTimeButton">设置时间</button>
  </div>
`;
document.body.appendChild(floatingWindow);

// 获取按钮元素
var startButton = document.getElementById('startButton');
var clearButton = document.getElementById('clearButton');

var setTimeButton = document.getElementById('setTimeButton');
var productTypeBox = document.getElementById('productType');
var countryCheckbox = document.querySelector('#countryCheckbox')
// discountRate_input.value = discountRate
var countryDiscount = document.querySelectorAll('.countryDiscount');
// 遍历每个复选框，并为其绑定点击事件
productTypeBox.checked=productTypeIsSku=='true'?true:false;
productTypeBox.addEventListener('click', function() {
    // 获取复选框的状态（checked 或 unchecked）
    var isChecked = productTypeBox.checked;
    console.log(isChecked);
    productTypeIsSku=isChecked?"true":"false"
    localStorage.setItem("productTypeIsSku",productTypeIsSku)
    // 如果需要，可以在这里执行其他操作
});
countryDiscount.forEach(function(inputEl) {
    inputEl.addEventListener('blur', function() {
        // 获取复选框的状态（checked 或 unchecked）
        // 打印状态和值
        let str = inputEl.value;
        let country = inputEl.name
        storedCtObject[country][1]=parseInt(str)
        localStorage.setItem("countryInfoObject", JSON.stringify(storedCtObject))
        // 如果需要，可以在这里执行其他操作
    });
});
var checkboxes = document.querySelectorAll('.countrycheck');

// 遍历每个复选框，并为其绑定点击事件
checkboxes.forEach(function(checkbox) {
    checkbox.addEventListener('click', function() {
        // 获取复选框的状态（checked 或 unchecked）
        var isChecked = checkbox.checked;

        // 获取复选框的值
        var country = checkbox.value;
        storedCtObject[country][0]=isChecked?1:0;
        localStorage.setItem("countryInfoObject", JSON.stringify(storedCtObject))
        // 如果需要，可以在这里执行其他操作
    });
});
function updatecountryCheckbox() {
    for (var country in storedCtObject) {
        if (storedCtObject.hasOwnProperty(country)) {
            if(country=='MY'){
                console.log(storedCtObject[country][0]);
                console.log(typeof storedCtObject[country][0]);
                countryCheckbox.children[0].children[0].checked=storedCtObject[country][0] === 1 ? true : false;
                countryCheckbox.children[0].children[1].value=storedCtObject[country][1];
            }else if(country=='PH'){
                countryCheckbox.children[1].children[0].checked=storedCtObject[country][0] === 1 ? true : false;
                countryCheckbox.children[1].children[1].value=storedCtObject[country][1];
            }else if(country=='SG'){
                countryCheckbox.children[2].children[0].checked=storedCtObject[country][0] === 1 ? true : false;
                countryCheckbox.children[2].children[1].value=storedCtObject[country][1];
            }else if(country=='TH'){
                countryCheckbox.children[3].children[0].checked=storedCtObject[country][0] === 1 ? true : false;
                countryCheckbox.children[3].children[1].value=storedCtObject[country][1];
            }
            else if(country=='VN'){
                countryCheckbox.children[4].children[0].checked=storedCtObject[country][0] === 1 ? true : false;
                countryCheckbox.children[4].children[1].value=storedCtObject[country][1];
            }
        }
    }
}
function clearStatus() {

    for (var country in storedCtObject) {
        storedCtObject[country][0] = 0
    }
    localStorage.setItem("countryInfoObject", JSON.stringify(storedCtObject));
    updatecountryCheckbox();
}

updatecountryCheckbox()

async function checkAutoExe() {

    if(flashsellIsRuning == "true"){
        await sleep(8000);
        executeWithRetry("name",async function () {
            let tempBtn = document.querySelector('#WB-GEC-nav-bar').children[0].children[4].children[5].children[0].children[0].children[1].children[0]
            if (tempBtn) {
                entance();
                return true; // 假设条件始终为真
            }
            return false;
        })

    }
}
checkAutoExe();
startButton.addEventListener('click', function () {
    let str = document.querySelector('#begin-time').value
    // let num = parseInt(document.querySelector('#discountRate').value)
    // alert(`当前折扣率${num}%`);
    if (str != '') {
        localStorage.setItem("flashsellbeginTime", str)
    }
    flashsellIsRuning = "true"
    localStorage.setItem("flashsellIsRuning", flashsellIsRuning)
    localStorage.setItem("countryInfoObject", JSON.stringify(storedCtObject))
    entance();
})

clearButton.addEventListener('click', function () {
    abortFlag=true;
    localStorage.setItem("flashsellIsRuning", "false");
    clearStatus()
})
setTimeButton.addEventListener('click', function () {
    setTime();

})
clearButton.addEventListener('click', function () {
    localStorage.setItem("flashsellIsRuning", "false")
    clearStatus()
})


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
async function setTime() {
    cur_country_code=matchCountry()
    let str = document.querySelector('#begin-time').value
    if (str != '') {
        localStorage.setItem("flashsellbeginTime", str)
    }
    for (let index = 0; index < 2; index++) {

        await executeWithRetry("选择开始时间",async function () {
            let tempBtn = document.querySelectorAll('.theme-arco-picker-start-time')[index];
            if (tempBtn) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(1000);

        var inputElement = document.querySelectorAll('.theme-arco-picker-start-time')[index];
        // 检查是否找到了匹配的元素
        if (inputElement) {
            let results = getLocalTime(cur_country_code,index);
            let startHour = results.hour;
            let startMinites = results.minites;
            let startDay = results.day;
            inputElement.click();
            let beginTimePickerElement = document.querySelector('.theme-arco-picker-container');
            let currentCell=null
            // if(index==0){
            //     currentCell = beginTimePickerElement.querySelector(".theme-arco-picker-cell-today");
            // }else{

            // }
            currentCell = beginTimePickerElement.querySelector(".theme-arco-picker-cell-selected");
            let count = 14;
            while (count > 0) {
                let innerDiv = currentCell.childNodes[0].childNodes[0];
                if (innerDiv.innerHTML == startDay) {
                    innerDiv.click();
                    break;
                }
                let tempel=currentCell.nextSibling;
                if(!tempel){
                    currentCell = currentCell.parentNode.nextSibling.childNodes[0];

                }else{
                    currentCell = currentCell.nextSibling;
                }
                count--;
            }
            let hourPickerBtn = beginTimePickerElement.querySelector(".theme-arco-picker-btn-select-time");
            let beginTimeconfirmBtn = hourPickerBtn.nextSibling;

            setTimeout(() => {
                beginTimeconfirmBtn.click();
            }, 1000);
            hourPickerBtn.click();
            // beginTimePickerElement = document.querySelector('.theme-arco-picker-container');
            let hourPickerList = beginTimePickerElement.querySelectorAll(".theme-arco-timepicker-list")[0].childNodes[0];
            for (let i = 0; i <= hourPickerList.childNodes.length; i++) {
                if (hourPickerList.childNodes[i] && hourPickerList.childNodes[i].childNodes[0].innerHTML == startHour) {
                    hourPickerList.childNodes[i].childNodes[0].click()
                }
            }

            let minitePickerList = beginTimePickerElement.querySelectorAll(".theme-arco-timepicker-list")[1].childNodes[0];
            for (let i = 0; i <= minitePickerList.childNodes.length; i++) {
                if (minitePickerList.childNodes[i] && minitePickerList.childNodes[i].childNodes[0].innerHTML == startMinites) {
                    minitePickerList.childNodes[i].childNodes[0].click()
                }
            }
        } else {
            console.log('未找到开始时间按钮。');
        }
        await sleep(1500);
    }
}
function checkAbort() {
    if (abortFlag) {
        throw new Error('Process aborted');
    }
}
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
async function executeWithRetry(name,func) {
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
            if (count > 60 ) {
                alert(`${name}超时未找到`);
                break;
            }
            if(abortFlag){
                break;
            }
        } while (true);
}
let repeatCount = 1;
let curCount = 1;
let firstExecute = true;
async function process(cur_country_code) {
    checkAbort();
    await executeWithRetry("创建促销工具",async function () {
        let titleSelectBtn = document.querySelectorAll('.theme-arco-tabs-header-title')[0]
        if (titleSelectBtn) {
            titleSelectBtn.click();
            return true; // 假设条件始终为真
        }
        return false;
    });
    await sleep(2500);
    checkAbort();
    // // 点击秒杀
    await executeWithRetry("点击秒杀",async function () {
        let tempBtn = document.querySelector('.theme-arco-tabs-pane').childNodes[1].childNodes[1].childNodes[1].childNodes[1].childNodes[0]
        if (tempBtn) {
            tempBtn.click();
            return true; // 假设条件始终为真
        }
        return false;
    });
    await sleep(2000);

    for (let index = 0; index < 2; index++) {
        checkAbort();
        await executeWithRetry("选择开始时间",async function () {
            let tempBtn = document.querySelectorAll('.theme-arco-picker-start-time')[index];
            if (tempBtn) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(1000);

        var inputElement = document.querySelectorAll('.theme-arco-picker-start-time')[index];
        // 检查是否找到了匹配的元素
        if (inputElement) {
            let results = getLocalTime(cur_country_code,index);
            let startHour = results.hour;
            let startMinites = results.minites;
            let startDay = results.day;
            inputElement.click();
            let beginTimePickerElement = document.querySelector('.theme-arco-picker-container');
            let currentCell=null
            // if(index==0){
            //     currentCell = beginTimePickerElement.querySelector(".theme-arco-picker-cell-today");
            // }else{

            // }
            currentCell = beginTimePickerElement.querySelector(".theme-arco-picker-cell-selected");
            let count = 14;
            while (count > 0) {
                let innerDiv = currentCell.childNodes[0].childNodes[0];
                if (innerDiv.innerHTML == startDay) {
                    innerDiv.click();
                    break;
                }
                let tempel=currentCell.nextSibling;
                if(!tempel){
                    currentCell = currentCell.parentNode.nextSibling.childNodes[0];

                }else{
                    currentCell = currentCell.nextSibling;
                }
                count--;
            }
            let hourPickerBtn = beginTimePickerElement.querySelector(".theme-arco-picker-btn-select-time");
            let beginTimeconfirmBtn = hourPickerBtn.nextSibling;

            setTimeout(() => {
                beginTimeconfirmBtn.click();
            }, 1000);
            hourPickerBtn.click();
            // beginTimePickerElement = document.querySelector('.theme-arco-picker-container');
            let hourPickerList = beginTimePickerElement.querySelectorAll(".theme-arco-timepicker-list")[0].childNodes[0];
            for (let i = 0; i <= hourPickerList.childNodes.length; i++) {
                if (hourPickerList.childNodes[i] && hourPickerList.childNodes[i].childNodes[0].innerHTML == startHour) {
                    hourPickerList.childNodes[i].childNodes[0].click()
                }
            }

            let minitePickerList = beginTimePickerElement.querySelectorAll(".theme-arco-timepicker-list")[1].childNodes[0];
            for (let i = 0; i <= minitePickerList.childNodes.length; i++) {
                if (minitePickerList.childNodes[i] && minitePickerList.childNodes[i].childNodes[0].innerHTML == startMinites) {
                    minitePickerList.childNodes[i].childNodes[0].click()
                }
            }
        } else {
            console.log('未找到开始时间按钮。');
        }
        await sleep(1500);
    }
    checkAbort();
    if (productTypeIsSku=='true') {
        await executeWithRetry("指定销售变体",async function () {
            let tempBtn = Array.from(document.querySelectorAll('span')).find(div => div.textContent.trim() === '指定销售变体');
            if (tempBtn) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(500);
    }
    do {
    checkAbort();
    await executeWithRetry("选择商品",async function () {
        let buttons = document.querySelectorAll('button');
        let res = false;
        // 遍历按钮并找到包含选择商品的按钮
        buttons.forEach(button => {
            button.querySelectorAll('span').forEach(span => {
                if (span.textContent.trim() === '选择商品') {
                    // 如果找到，模拟点击
                    button.click();
                    res = true; // 假设条件始终为真
                }
            });
        });
        return res;
    });
    await sleep(2000);
    let modalDiv = document.querySelector('.theme-arco-modal-content');
    // // 点击秒杀
    checkAbort();
    await executeWithRetry("页面num选择",async function () {
        let tempBtn = modalDiv.querySelector('div[title="50/页"]');
        if (tempBtn) {
            tempBtn.click();
            return true; // 假设条件始终为真
        }
        return false;
    });
    await sleep(2000);
    checkAbort();
    // 在divElement内部查找文本内容为"1000/页"的span元素
    await executeWithRetry("页码选择",async function () {
        let tempBtn = document.querySelector('.theme-arco-select-popup');
        if (tempBtn) {
            return true; // 假设条件始终为真
        }
        return false;
    });
    await sleep(2000);

    let popupdivElement = document.querySelector('.theme-arco-select-popup');
    // 在divElement内部查找文本内容为"1000/页"的span元素
    checkAbort();
    await executeWithRetry("1000/页",async function () {
        let tempBtn = Array.from(popupdivElement.querySelectorAll('span')).find(span => span.textContent.trim() === '1000/页');
        if (tempBtn) {
            tempBtn.click();
            return true; // 假设条件始终为真
        }
        return false;
    });
    await sleep(1000);

    if(true){
                // 在divElement内部查找文本内容为"1000/页"的span元素
    checkAbort();
    await executeWithRetry("等待1000商品加载完成",async function () {
        var tempDiv = modalDiv.querySelector('.theme-arco-pagination');
        if (tempDiv.style.visibility == "visible") {
            return true;
        }
        return false;
    });

    }
    await sleep(2000);
    let ulElement = modalDiv.querySelector('.theme-arco-pagination-list');
    if (!ulElement) {
        console.error("页码ulElement 找不到");
    }

    if (firstExecute) {
        firstExecute = false
        repeatCount = ulElement.childNodes.length - 2
    } else {
        // // 点击秒杀
        await executeWithRetry("选择页码",async function () {
            let cur_page_node = ulElement.childNodes[curCount];
            if (cur_page_node) {
                cur_page_node.click();
                return true; // 假设条件始终为真
            }
            return false;
        });
        await sleep(2000);

        // 在divElement内部查找文本内容为"1000/页"的span元素
        await executeWithRetry("等待1000商品加载完成2",async function () {
            var tempDiv = modalDiv.querySelector('.theme-arco-pagination');
            if (tempDiv.style.visibility == "visible") {
                return true;
            }
            return false;
        });
        await sleep(2000);
    }

    console.log("开始执行选择全部勾选");
    // // 选择全部勾选
    checkAbort();
    await executeWithRetry("123",async function () {
        let tempBtn = modalDiv.querySelector('.theme-arco-checkbox-mask');
        if (tempBtn) {
            tempBtn.click();
            return true; // 假设条件始终为真
        }
        console.log("暂未检测到全部勾选元素");
        return false;
    });
    await sleep(2000);
    checkAbort();
    await executeWithRetry("完成按钮",async function () {
        let tempBtn = Array.from(modalDiv.querySelectorAll('button')).find(button =>
            Array.from(button.querySelectorAll('span')).some(span => span.textContent.trim() === '完成')
        );
        if (tempBtn) {
            tempBtn.click();
            return true; // 假设条件始终为真
        }
        return false;
    });
    await sleep(2000);
    curCount++;
    repeatCount--;
    } while (repeatCount>0);


    console.log("开始执行点击选择页码数");
    // 点击选择页码数
    checkAbort();
    await executeWithRetry("123",async function () {
        let tempBtn = document.querySelector('.theme-arco-select-view-value');
        if (tempBtn) {
            tempBtn.click();
            return true; // 假设条件始终为真
        }
        console.log("暂未检测到页码数元素");
        return false;
    });
    await sleep(2000);

    console.log("开始执行点击第二个1000");
    // 点击选择页码数
    checkAbort();
    await executeWithRetry("123",async function () {
        // 获取页面上所有的<li>元素
        var listItems = document.getElementsByTagName('li');

        // 遍历这些元素以找到匹配的文本内容
        for (var i = 0; i < listItems.length; i++) {
            if (listItems[i].textContent.trim() === '1000 /页') {
                // 如果找到匹配的元素，输出元素的信息或进行其他操作
                console.log('找到匹配的<li>元素:', listItems[i]);
                listItems[i].click()
                return true;
            }
        }
        console.log("暂未检测到 第二个1000");
        return false;
    });
    await sleep(2000);

    console.log("开始执行点击选择页码数");
    // 点击选择页码数
    checkAbort();
    await executeWithRetry("123",async function () {
        var tempDiv = document.querySelector('.theme-arco-spin');
        if (!tempDiv.classList.contains("theme-arco-spin-loading")) {
            return true;
        }
        return false;
    });
    await sleep(2000);

    console.log("开始执行选择全部勾选");
    // // 选择全部勾选
    checkAbort();
    await executeWithRetry("123",async function () {
        let tempBtn = document.querySelector('.theme-arco-checkbox-mask');
        if (tempBtn) {
            tempBtn.click();
            return true; // 假设条件始终为真
        }
        console.log("暂未检测到全部勾选元素");
        return false;
    });
    await sleep(1000);

    console.log("开始执行设置秒杀折扣百分比");
    // // 设置秒杀折扣百分比
    checkAbort();
    await executeWithRetry("123",async function () {
        // 获取页面上所有的<input>元素
        var inputElements = document.querySelectorAll('input');
        // 遍历这些元素以找到具有特定placeholder的元素
        for (var j = 0; j < inputElements.length; j++) {
            if (inputElements[j].placeholder === '请输入 ') {
                // 如果找到匹配的元素，输出元素的信息或进行其他操作
                console.log('找到匹配的<input>元素:', inputElements[j]);
                changeReactInputValue(inputElements[j], storedCtObject[cur_country_code][1]);
                return true;
            }
        }
        console.log("暂未检测到输入框");
        return false;
    });
    await sleep(2000);

    console.log("开始执行选择批量更新");
    // // 找到文本为“批量更新”的<span>元素
    checkAbort();
    await executeWithRetry("123",async function () {
        let tempBtn = Array.from(document.querySelectorAll('button > span')).find(el => el.textContent === '批量更新');
        if (tempBtn) {
            tempBtn.parentNode.click();
            return true; // 假设条件始终为真
        }
        console.log("暂未检测到批量更新元素");
        return false;
    });
    await sleep(2000);
    // await sleep(3000);

    let ulElement2 =document.querySelector('.theme-arco-pagination-list');
    curCount =1
    repeatCount = ulElement2.childNodes.length - 3;
    while (repeatCount>0) {
        curCount++;
        repeatCount--;
        ulElement2.childNodes[curCount].click();
        console.log("开始执行选择全部勾选");
        // // 选择全部勾选
        checkAbort();
        await executeWithRetry("123",async function () {
            let tempBtn = document.querySelector('.theme-arco-checkbox-mask');
            if (tempBtn) {
                tempBtn.click();
                return true; // 假设条件始终为真
            }
            console.log("暂未检测到全部勾选元素");
            return false;
        });
        await sleep(1000);


        console.log("开始执行选择批量更新");
        // // 找到文本为“批量更新”的<span>元素
        checkAbort();
        await executeWithRetry("123",async function () {
            let tempBtn = Array.from(document.querySelectorAll('button > span')).find(el => el.textContent === '批量更新');
            if (tempBtn) {
                tempBtn.parentNode.click();
                return true; // 假设条件始终为真
            }
            console.log("暂未检测到批量更新元素");
            return false;
        });
        await sleep(2000);

    }
    console.log("开始执行同意并发布");
    // // 找到文本为“批量更新”的<span>元素
    checkAbort();
    await executeWithRetry("123",async function () {
        let tempBtn = Array.from(document.querySelectorAll('button > span')).find(el => el.textContent === '同意并发布');
        if (tempBtn) {
            tempBtn.click();
            return true; // 假设条件始终为真
        }
        console.log("暂未检测到同意并发布元素");
        return false;
    });
    await sleep(2000);
    checkAbort();
    await executeWithRetry("等待加载结束",async function () {
        let tempBtn = document.querySelectorAll('#popUpContainer')[2];
        if (tempBtn.innerHTML=='') {
            return true
        }
        return false;
    });
    await sleep(1000);
    checkAbort();
    let submitBtn = Array.from(document.querySelectorAll('button > span')).find(el => el.textContent === 'OK');
    if(submitBtn){
        submitBtn.click();

    }
    await sleep(1000);

    storedCtObject[cur_country_code][0] = 1;
    localStorage.setItem('countryInfoObject', JSON.stringify(storedCtObject));
    let next_country_code = findFirstNonOneCountry(storedCtObject)
    checkAbort();
    await executeWithRetry("等待页面跳转",async function () {
        let cur_herf = "https://seller.tiktokglobalshop.com/promotion/marketing-tools/flash-sale/create"
        if(window.location.href!=cur_herf){
                await sleep(1000);
            if (next_country_code) {

                window.location.href = `https://seller.tiktokglobalshop.com/promotion/marketing-tools/management?tab=1&promotion_type=1&shop_region=${next_country_code}`
            }
            else {

                localStorage.removeItem('flashsellIsRuning');
                clearStatus();
                alert("全部执行完毕")
            }
            return true;
        }
        return false;
    });

}
