    'use strict';

    // 添加Element-UI样式
    GM_addStyle(`
        @import url('https://cdnjs.cloudflare.com/ajax/libs/element-ui/2.15.6/index.js');
    `);

    // 添加自定义样式
    GM_addStyle(`
        .floating-button {
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 9999;
        }
        .floating-window {
            position: fixed;
            top: 180px;
            right: 0;
            width: 650px;
            height: 100%;
            background: white;
            box-shadow: -2px 0 5px rgba(0,0,0,0.5);
            z-index: 1;
            transition: transform 0.3s ease;
            transform: translateX(100%);
        }
        .floating-window.active {
            transform: translateX(0);
        }
        .loading-icon {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
        }
    `);
    
    let output=[]
    let progress = 0
    const countryOrder = ["MY", "PH", "SG", "TH", "VN"];

    
    


    // 创建Vue应用挂载点
    const appContainer = document.createElement('div');
    appContainer.id = 'my-app';
    document.body.appendChild(appContainer);

    // Vue应用
    new Vue({
        el: '#my-app',
        data() {
            return {
                isWindowVisible: false,
                output: '',
                isLoading: false,
                startDate: '',
                endDate: '',
                checkboxValue: false,
                uploadAll: true,
                processBar: 0,
                totolLength: 1,
                percentage:0
            };
        },
        methods: {
            initParams() {
                return new Promise((resolve, reject) => {
                  fetch("https://pbs.yafex.cn/?c=tiktok_shopProduct&a=initParams", {
                    "headers": {
                      "accept": "*/*",
                      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                      "priority": "u=1, i",
                      "sec-ch-ua": "\"Chromium\";v=\"124\", \"Microsoft Edge\";v=\"124\", \"Not-A.Brand\";v=\"99\"",
                      "sec-ch-ua-mobile": "?0",
                      "sec-ch-ua-platform": "\"Windows\"",
                      "sec-fetch-dest": "empty",
                      "sec-fetch-mode": "cors",
                      "sec-fetch-site": "same-origin"
                    },
                    "referrer": "https://pbs.yafex.cn/index.php?c=tiktok_shopProduct&a=index",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "include"
                  }).then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                  })
                  .then(data => {
                      resolve(data); // 解决 Promise，并返回数据
              
                  })
                  .catch(error => {
                      reject(error); // 捕获异常并拒绝 Promise
                  });
                });
                 
              },
              fetchData(id) {
                return new Promise((resolve, reject) => {
                  fetch("https://pbs.yafex.cn/?c=tiktok_shopProduct&a=getList", {
                "headers": {
                  "accept": "*/*",
                  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                  "content-type": "text/plain;charset=UTF-8",
                  "priority": "u=1, i",
                  "sec-ch-ua": "\"Chromium\";v=\"124\", \"Microsoft Edge\";v=\"124\", \"Not-A.Brand\";v=\"99\"",
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": "\"Windows\"",
                  "sec-fetch-dest": "empty",
                  "sec-fetch-mode": "cors",
                  "sec-fetch-site": "same-origin"
                },
                "referrer": "https://pbs.yafex.cn/index.php?c=tiktok_shopProduct&a=index",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": `{\"pageSize\":\"10\",\"page\":\"1\",\"accountId\":[\"${id}\"],\"spu\":\"\",\"salesUser\":\"\",\"productId\":\"\",\"createTime\":[],\"updateTime\":[],\"status\":[\"4\"]}`,
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
              }).then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                  })
                  .then(data => {
                      resolve(data); // 解决 Promise，并返回数据
              
                  })
                  .catch(error => {
                      reject(error); // 捕获异常并拒绝 Promise
                  });
                });
                 
              } ,
              runAsyncOperations(list_frag) {
                  const promises = [];
                  for (let i = 0; i < list_frag.length; i++) {
              
                      promises.push(this.fetchData(list_frag[i].value)
                          .then(data => {
                            list_frag[i].total =data.data.total
                            output.push({
                              label:list_frag[i].label,
                              total:list_frag[i].total
                            })
                            progress++;
                            this.percentage = Math.ceil(progress/ list_frag.length*100);
                              return list_frag;
                          })
              
                      )
                  }
                  return Promise.all(promises);
              },
            toggleWindow() {
                this.isWindowVisible = !this.isWindowVisible;
            },
            closeWindow() {
                this.isWindowVisible = false;
            },
            async handleSubmit() {
                this.initParams().then(data => {
                    let list = data.data.accountList;
                    this.runAsyncOperations(list).then((data)=>{
                          console.log(output);
                          const groupedItems = {};
                  
                          // Iterate through the data and group by the common prefix
                          output.forEach(item => {
                              const prefix = item.label.split("-")[0];
                              if (!groupedItems[prefix]) {
                                  groupedItems[prefix] = [];
                              }
                              groupedItems[prefix].push(item);
                          });
                          
                          // Convert the grouped items back to an array
                          const result = Object.values(groupedItems);
                          let ouputStr=""
                          result.forEach(item => {
                              let templist = item
                              templist.sort((a, b) => {
                                  const aCountry = a.label.split("-")[1];
                                  const bCountry = b.label.split("-")[1];
                                  return countryOrder.indexOf(aCountry) - countryOrder.indexOf(bCountry);
                              });
                              templist.forEach(i => {
                              ouputStr+=`${i.label} ${i.total} `
                            });
                          ouputStr +='\n';
                        });
                        console.log(ouputStr);
                        this.output = ouputStr;
                    })
                  
                  
                  })
            },
        },
        template: `
            <div>
                <el-button class="floating-button" type="primary" @click="toggleWindow">打开窗口</el-button>
                <div :class="['floating-window', { active: isWindowVisible }]">
                    <div style="padding: 20px;">
                        <div v-if="isLoading" class="loading-icon">
                            <el-icon-loading></el-icon-loading>
                        </div>
                        <div v-else style="height: 200px; overflow: auto; border: 1px solid #ccc; margin-bottom: 20px;">
                                <el-input
                                type="textarea"
                                :rows="10"
                                v-model="output"
                                readonly
                                ></el-input>   
                        </div>
                        <el-progress :percentage="percentage"></el-progress>
                        <div slot="footer" class="dialog-footer">
                            <el-button type="primary" @click="handleSubmit">获取店铺数据</el-button>
                        </div>
                      </div>
                    </div>
                </div>
            </div>
        `
    });
