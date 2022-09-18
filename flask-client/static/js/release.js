'use strict'

import { MyAlert } from './myAlert.js'
import { MyConfirm } from './myConfirm.js'
import { blankStrRegexp, baseUrl, HttpError } from './settings.js'


const username = localStorage.getItem('username');//当前登录用户
const token = localStorage.getItem('blogToken');
const blogContent = localStorage.getItem('blogContent');//将未提交的文章内容保存在本地存储中
const blogText = localStorage.getItem('blogText');//使用text来检测是否为空文本
const myAlert = new MyAlert();
const myConfirm = new MyConfirm();
const visitedUsername = window.location.href.match(/\/([^\/]+)\/topic\/release/)[1];//当前页面所属用户
const E = window.wangEditor;
let timerId;//执行周期保存任务对应的标识符


new Promise(function (resolve, reject) {
    //检测登录状态
    if (!username || !token) {
        myAlert.showAlert('请登录！', () => {
            localStorage.removeItem('blogToken');
            localStorage.removeItem('username');
            window.location.href = '/login-reg/';
        })
    } else if (username != visitedUsername) {
        myAlert.showAlert('无访问权限！', () => {
            window.location.href = `/${username}/topic/release/`;
        });
    } else {
        resolve();
    }
}).then(function () {
    //保证在检测登录之后执行的任务
    if (blogText === null) blogText = '';//当本地存储没有blogText时将其置为空字符串以正则匹配空白字符串
    if (!blankStrRegexp.test(blogText)) myAlert.showAlert('检测到有未提交的内容，已自动恢复！', () => editor.setHtml(blogContent));
    timerId = setInterval(() => {
        //每60s自动执行一次本地存储
        localStorage.setItem('blogContent', editor.getHtml());
        localStorage.setItem('blogText', editor.getText());
    }, 60000);
})

// 标题 DOM 容器
const headerContainer = document.getElementById('header-container');
headerContainer.addEventListener('click', event => {
    if (event.target.tagName !== 'LI') return;
    event.preventDefault();
    const id = event.target.dataset.id;
    editor.scrollToElem(id);// 滚动到标题
})

const editorConfig = {
    placeholder: '不支持纯图片形式上传，文章内容每60s在本地完成一次保存...',
    onChange(editor) {
        //实现菜单
        const headers = editor.getElemsByTypePrefix('header');
        headerContainer.innerHTML = headers.map(header => {
            const text = window.wangEditor.SlateNode.string(header);
            const { id, type } = header;
            return `<li data-id="${id}" type="${type}">${text}</li>`;
        }).join('');
    },
    MENU_CONF: {},
    maxLength: 10000,
}
const editor = E.createEditor({
    selector: '#editor-text-area',
    config: editorConfig,
    mode: 'default',
})

const toolbarConfig = {};
toolbarConfig.insertKeys = {
    index: 22,
    keys: 'insertImage',
}
toolbarConfig.excludeKeys = [
    'group-image',
    'group-video',
    'fullScreen',
]

const toolbar = E.createToolbar({
    editor,
    selector: '#editor-toolbar',
    config: toolbarConfig,
    mode: 'default',
})

document.addEventListener('selectstart', function (event) {
    //禁止选择
    const editorTextArea = document.querySelector('#editor-text-area');
    if (!editorTextArea.contains(event.target) && event.target.tagName != 'INPUT') event.preventDefault();
})

const releaseButton = document.querySelector('#release-button');
const mask = document.querySelector('.mask');
const closeButton = document.querySelector('#close-button');
const onoffMakeCategory = document.querySelector('#onoff-make-category');
const makeCategoryContainer = document.querySelector('#make-category-container');
const makeCategory = document.querySelector('#make-category');
const cancelMakeCategory = document.querySelector('#cancel-make-category');
const newCategory = document.querySelector('#new-category');
const makeTopic = document.querySelector('#make-topic');

const title = document.querySelector('input[name=title]');
const category = document.querySelector('#category');
const limitContainer = document.querySelector('#limit-container');

document.addEventListener('click', function (event) {
    const elem = event.target;
    //展示蒙层
    if (elem == releaseButton) {
        mask.style.display = 'block';
        releaseButton.disabled = true;
        getCategory();
    }
    //取消展示蒙层
    if (elem == closeButton) mask.style.display = 'none';
    //展示新建分类
    if (elem == onoffMakeCategory) makeCategoryContainer.style.display = 'flex';
    //取消新建分类
    if (elem == cancelMakeCategory) makeCategoryContainer.style.display = 'none';
    //提交新建分类
    if (elem == makeCategory) {
        makeCategory.disabled = true;
        createCategory();
    }
    //提交文章
    if (elem == makeTopic) {
        makeTopic.disabled = true;
        myConfirm.showConfirm('确定要发表这篇文章吗？', createTopic, () => makeTopic.disabled = false);
    }
})

function getCategory() {
    (async () => {
        const response = await fetch(baseUrl + `/api/v1/topics/category/${username}/`, {
            headers: {
                authorization: token
            },
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                let option;
                category.innerHTML = '';//清空原来的option
                for (let c of jsonResponse.data.category) {
                    option = document.createElement('option');
                    option.value = c;
                    option.textContent = c;
                    if (c == 'default') option.setAttribute('selected', '');
                    category.append(option);
                }
                break;
            case 403:
                myAlert.showAlert(jsonResponse.error, () => {
                    localStorage.removeItem('blogToken');
                    localStorage.removeItem('username');
                    window.location.href = `/login-reg/?next=${window.location.href}`
                });
                break;
            default:
                throw new Error();//简单粗暴
        }
    })().catch(function (error) {
        myAlert.showAlert('获取文章分类信息失败！');
    }).then(() => releaseButton.disabled = false);
}

function createCategory() {
    (async () => {
        if (blankStrRegexp.test(newCategory.value)) {
            myAlert.showAlert('分类名不能为空！');
            return;
        }
        for (let op of category.querySelectorAll('option')) {
            if (newCategory.value == op.value) {
                myAlert.showAlert('分类名不可重复！');
                return;
            }
        }
        const data = { 'category': newCategory.value };
        const response = await fetch(baseUrl + `/api/v1/topics/category/${username}/`, {
            method: 'POST',
            headers: {
                authorization: token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(data),
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                const option = document.createElement('option');
                option.value = newCategory.value;
                option.textContent = newCategory.value;
                option.setAttribute('selected', '');
                category.append(option);
                myAlert.showAlert(`分类 ${newCategory.value} 创建成功！`);
                cancelMakeCategory.click();
                break;
            case 403:
                myAlert.showAlert(jsonResponse.error, () => {
                    localStorage.removeItem('blogToken');
                    localStorage.removeItem('username');
                    window.location.href = `/login-reg/?next=${window.location.href}`
                });
                break;
            default:
                throw new Error();//简单粗暴
        }
    })().catch(function (error) {
        myAlert.showAlert(`分类 ${newCategory.value} 创建失败！`);
    }).then(() => makeCategory.disabled = false);
}

function createTopic() {
    (async () => {
        const data = {};
        data.title = title.value;
        data.category = category.querySelector('option:checked').value;
        data.limit = limitContainer.querySelector('input:checked').value;//radio、checkbox得用伪类选择器
        data.introduce = editor.getText().slice(0, 90);//截取前九十个字作为简介
        data.content = editor.getHtml();
        if (!checkTopicData(data)) return;
        const response = await fetch(baseUrl + `/api/v1/topics/${username}/`, {
            method: 'POST',
            headers: {
                authorization: token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(data),
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                const topicId = jsonResponse.data.id;
                clearInterval(timerId);//取消本地存储任务
                localStorage.setItem('blogContent', '');//把本地存储的文章删除
                localStorage.setItem('blogText', '');
                myAlert.showAlert('发表成功！', () => window.location.href = `/${username}/topics/detail/${topicId}/`);
                break;
            case 403:
                myAlert.showAlert(jsonResponse.error, () => {
                    localStorage.removeItem('blogToken');
                    localStorage.removeItem('username');
                    window.location.href = `/login-reg/?next=${window.location.href}`
                });
                break;
            case 10707:
                myAlert.showAlert(jsonResponse.error);
                break;
            default:
                throw new Error();//简单粗暴
        }
    })().catch(function (error) {
        myAlert.showAlert(`文章发表失败！`);
    }).then(() => makeTopic.disabled = false);

    function checkTopicData({ title, category, limit, introduce, content }) {
        //检查文章数据，合格则返回true，不合格返回false
        if (blankStrRegexp.test(title)) {
            myAlert.showAlert('文章标题不能为空！');
            return false;
        }
        if (blankStrRegexp.test(editor.getText())) {
            myAlert.showAlert('文章内容不能为空！');
            return false;
        }
        return true;
    }
}

