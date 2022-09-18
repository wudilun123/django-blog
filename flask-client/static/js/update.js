'use strict'

import { MyAlert } from './myAlert.js'
import { MyConfirm } from './myConfirm.js'
import { blankStrRegexp, baseUrl, HttpError } from './settings.js'

const username = localStorage.getItem('username');//当前登录用户
const token = localStorage.getItem('blogToken');
const myAlert = new MyAlert();
const myConfirm = new MyConfirm();
const visitedUsername = window.location.href.match(/\/([^\/]+)\/topics\/update/)[1];//当前页面所属用户
const topicId = window.location.href.match(/\/*\/topics\/update\/([^\/]+)/)[1];//页面对应文章id
const E = window.wangEditor;
const topicUrl = new URL(baseUrl + `/api/v1/topics/${visitedUsername}/`);

topicUrl.searchParams.set('topic_id', topicId);



// 标题 DOM 容器
const headerContainer = document.getElementById('header-container');
headerContainer.addEventListener('click', event => {
    if (event.target.tagName !== 'LI') return;
    event.preventDefault();
    const id = event.target.dataset.id;
    editor.scrollToElem(id);// 滚动到标题
})

const editorConfig = {
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
    autoFocus: false,
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

const updateButton = document.querySelector('#update-button');
const deleteButton = document.querySelector('#delete-button');
const mask = document.querySelector('.mask');
const closeButton = document.querySelector('#close-button');
const onoffMakeCategory = document.querySelector('#onoff-make-category');
const makeCategoryContainer = document.querySelector('#make-category-container');
const makeCategory = document.querySelector('#make-category');
const cancelMakeCategory = document.querySelector('#cancel-make-category');
const newCategory = document.querySelector('#new-category');
const updateTopic = document.querySelector('#update-topic');

const title = document.querySelector('input[name=title]');
const category = document.querySelector('#category');
const limitContainer = document.querySelector('#limit-container');

(async () => {
    //先检测登录，之后获取文章数据
    if (!username || !token) {
        myAlert.showAlert('请登录！', () => {
            localStorage.removeItem('blogToken');
            localStorage.removeItem('username');
            window.location.href = '/login-reg/';
        })
        return;
    } else if (username != visitedUsername) {
        myAlert.showAlert('无访问权限！', () => {
            window.location.href = `/${username}/topic/release/`;
        });
        return;
    }
    const response = await fetch(topicUrl, {
        headers: {
            authorization: token
        },
    });
    if (response.status != 200) throw new HttpError("Http error", response.status);
    const jsonResponse = await response.json();
    switch (jsonResponse.code) {
        case 200:
            editor.setHtml(jsonResponse.data.content);
            const titleValue = jsonResponse.data.title;
            const limitValue = jsonResponse.data.limit;
            const categoryValue = jsonResponse.data.category;
            //后端验证通过后才赋予删除和更新事件
            updateButton.onclick = () => {
                mask.style.display = 'block';
                updateButton.disabled = true;
                setTopicInfo(titleValue, limitValue, categoryValue);
            }
            //删除文章
            deleteButton.onclick = () => {
                deleteButton.disabled = true;
                //二次确认
                myConfirm.showConfirm('确定要删除文章吗？', () => {
                    setTimeout(() => myConfirm.showConfirm('此操作不可撤销，确定要删除文章吗？', deleteTopic, () => deleteButton.disabled = false), 200)
                }, () => deleteButton.disabled = false);
            }
            break;
        default:
            myAlert.showAlert(jsonResponse.error);
    }
})().catch(function (error) {
    console.log(error);
    if (error instanceof TypeError) {
        myAlert.showAlert("您的网络出了一些问题，请求未成功发送！");
    } else if (error instanceof HttpError) {
        myAlert.showAlert(`请求错误，响应码：${error.status}`)
    } else {
        myAlert.showAlert(`出现了一些未知问题！${error}`);
    }
});

document.addEventListener('click', function (event) {
    const elem = event.target;
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
    //更新文章
    if (elem == updateTopic) {
        updateTopic.disabled = true;
        myConfirm.showConfirm('确定要更新这篇文章吗？', putTopic, () => updateTopic.disabled = false);
    }
})

function setTopicInfo(titleValue, limitValue, categoryValue) {
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
                    if (c == categoryValue) option.setAttribute('selected', '');
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
        console.log(error);
        myAlert.showAlert('获取文章分类信息失败！');
    }).then(() => updateButton.disabled = false);
    title.value = titleValue;
    if (limitValue == '私有') limitContainer.querySelector('#private').checked = true;
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
                myAlert.showAlert(`分类${newCategory.value}创建成功！`);
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
        console.log(error);
        myAlert.showAlert(`分类${newCategory.value}创建失败！`);
    }).then(() => makeCategory.disabled = false);
}

function putTopic() {
    (async () => {
        const data = {};
        data.title = title.value;
        data.category = category.querySelector('option:checked').value;
        data.limit = limitContainer.querySelector('input:checked').value;//radio、checkbox得用伪类选择器
        data.introduce = editor.getText().slice(0, 90);//截取前九十个字作为简介
        data.content = editor.getHtml();
        if (!checkTopicData(data)) return;
        const response = await fetch(topicUrl, {
            method: 'PUT',
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
                myAlert.showAlert('更新成功！', () => window.location.href = `/${username}/topics/detail/${topicId}/`);
                break;
            case 403:
                myAlert.showAlert(jsonResponse.error, () => {
                    localStorage.removeItem('blogToken');
                    localStorage.removeItem('username');
                    window.location.href = `/login-reg/?next=${window.location.href}`
                });
                break;
            case 10738:
                myAlert.showAlert(jsonResponse.error);
                break;
            default:
                throw new Error();//简单粗暴
        }
    })().catch(function (error) {
        console.log(error);
        myAlert.showAlert(`文章更新失败！`);
    }).then(() => updateTopic.disabled = false);

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


function deleteTopic() {
    (async () => {
        const response = await fetch(topicUrl, {
            method: 'DELETE',
            headers: {
                authorization: token,
            },
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                myAlert.showAlert('删除成功！', () => window.location.href = `/${username}/topics/`);
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
        console.log(error);
        myAlert.showAlert(`文章删除失败！`);
    }).then(() => deleteButton.disabled = false);
}