'use strict'

import { MyAlert } from './myAlert.js'
import { MyConfirm } from './myConfirm.js'


const blankStrRegexp = /^\s*$/;//纯空白字符串的正则,JS把' '这样的字符串也视为true
const baseUrl = 'http://127.0.0.1:8000';
const username = localStorage.getItem('username');//当前登录用户
const token = localStorage.getItem('blogToken');
const myAlert = new MyAlert();
const myConfirm = new MyConfirm();
const visitedUsername = window.location.href.match(/\/([^\/]+)\/topics\/category/)[1];//当前页面所属用户
const categoryUrl = new URL(baseUrl + `/v1/topics/category/${username}/`);

class HttpError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}


const onoffMakeCategory = document.querySelector('#onoff-make-category');
const makeCategoryContainer = document.querySelector('#make-category-container');
const makeCategory = document.querySelector('#make-category');
const cancelMakeCategory = document.querySelector('#cancel-make-category');
const newCategory = document.querySelector('#new-category');

const categoryList = document.querySelector('#category-list');

document.addEventListener('click', function (event) {
    const elem = event.target;
    //展示新建分类
    if (elem == onoffMakeCategory) makeCategoryContainer.style.display = 'flex';
    //取消新建分类
    if (elem == cancelMakeCategory) makeCategoryContainer.style.display = 'none';
    //提交新建分类
    if (elem == makeCategory) {
        makeCategory.disabled = true;
        createCategory();
    }
    //编辑已有分类
    if (elem.classList.contains('edit-category-button')) {
        const li = elem.closest('li');
        const a = li.querySelector('a');
        const href = a.href;
        const text = a.textContent;
        li.innerHTML = `
        <input type="text" id='update-category' name="update-category" maxlength="15">
        <button class='update-category-button'>修改</button>
        <button class='cancel-update-category-button'>取消</button>
        `;
        const input = li.querySelector('input');
        input.value = text;
        input.setAttribute('data-a-text', text);
        input.setAttribute('data-a-href', href);
    }
    //删除已有分类
    if (elem.classList.contains('delete-category-button')) {
        elem.disabled = true;
        const li = elem.closest('li');
        const category = li.querySelector('a').textContent;
        //成功则删除li
        myConfirm.showConfirm(`分类 ${category} 删除后其下所有文章将转入默认分类，确定删除吗？`, temp, () => elem.disabled = false);
        function temp() {
            deleteCategory(li, category).catch(function (error) {
                console.log(error);
                myAlert.showAlert(`分类 ${category} 删除失败！`);
            }).then(() => elem.disabled = false);
        }
    }
    //修改分类名
    if (elem.classList.contains('update-category-button')) {
        elem.disabled = true;
        const li = elem.closest('li');
        const input = li.querySelector('input');
        const category = input.value;
        updateCategory(li, input, category).catch(function (error) {
            console.log(error);
            myAlert.showAlert(`分类 ${input.dataset.aText} 更新失败！`);
            li.querySelector('.cancel-update-category-button').click();
        }).then(() => elem.disabled = false);
    }
    //取消修改分类名
    if (elem.classList.contains('cancel-update-category-button')) {
        const li = elem.closest('li');
        const input = li.querySelector('input');
        const text = input.dataset.aText;
        const href = input.dataset.aHref;
        li.innerHTML = `
        <a target='_blank'></a>
        <button class="edit-category-button">编辑</button>
        <button class="delete-category-button">删除</button>   
        `;
        const a = li.querySelector('a');
        a.href = href;
        a.textContent = text;
    }
})

document.addEventListener('selectstart', function (event) {
    //禁止选择
    if (event.target.tagName != 'INPUT') event.preventDefault();
})

loadCategory()

function loadCategory() {
    (async () => {
        if (!username || !token) {
            myAlert.showAlert('请登录！', () => {
                localStorage.removeItem('blogToken');
                localStorage.removeItem('username');
                window.location.href = '/login-reg/';
            })
        } else if (username != visitedUsername) {
            myAlert.showAlert('无访问权限！', () => {
                window.location.href = `/${username}/topics/category/`;
            });
        }
        const response = await fetch(categoryUrl, {
            headers: {
                authorization: token
            },
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                for (let c of jsonResponse.data.category) {
                    const li = document.createElement('li');
                    if (c == 'default') {
                        li.innerHTML = ` <a target='_blank'></a>`;
                        const a = li.querySelector('a');
                        a.href = `/${visitedUsername}/topics/?category=${c}`;
                        a.textContent = c + '(默认分类,不可修改)';
                    } else {
                        li.innerHTML = `
                        <a target='_blank'></a>
                        <button class="edit-category-button">编辑</button>
                        <button class="delete-category-button">删除</button>
                        `;
                        const a = li.querySelector('a');
                        a.href = `/${visitedUsername}/topics/?category=${c}`;
                        a.textContent = c;
                    }
                    categoryList.append(li);

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
        console.log(error)
        myAlert.showAlert('获取文章分类信息失败！');
    });
}


function createCategory() {
    (async () => {
        if (blankStrRegexp.test(newCategory.value)) {
            myAlert.showAlert('分类名不能为空！');
            return;
        }
        for (let a of categoryList.querySelectorAll('a')) {
            if (newCategory.value == a.textContent) {
                myAlert.showAlert('分类名不可重复！');
                return;
            }
        }
        const data = { 'category': newCategory.value };
        const response = await fetch(categoryUrl, {
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
                const c = newCategory.value;
                const li = document.createElement('li');
                li.innerHTML = `
                <a target='_blank'></a>
                <button class="edit-category-button">编辑</button>
                <button class="delete-category-button">删除</button>
                `;
                const a = li.querySelector('a');
                a.href = `/${visitedUsername}/topics/?category=${c}`;
                a.textContent = c;
                categoryList.prepend(li);
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

async function updateCategory(li, input, category) {
    if (blankStrRegexp.test(category)) {
        myAlert.showAlert('分类名不能为空！');
        return;
    }
    if (input.dataset.aText == category) {
        //分类名未改变
        li.querySelector('.cancel-update-category-button').click();
        return;
    }
    for (let a of categoryList.querySelectorAll('a')) {
        if (category == a.textContent) {
            myAlert.showAlert('分类名不可重复！');
            return;
        }
    }
    const data = { 'origin-category': input.dataset.aText, 'new-category': category };
    const response = await fetch(categoryUrl, {
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
            myAlert.showAlert(`分类 ${input.dataset.aText} 成功更名为 ${category} ！`);
            input.dataset.aText = category;
            input.dataset.aHref = `/${visitedUsername}/topics/?category=${category}`;
            li.querySelector('.cancel-update-category-button').click();
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
}

async function deleteCategory(li, category) {
    const response = await fetch(categoryUrl.href + `?category=${category}`, {
        method: 'DELETE',
        headers: {
            authorization: token,
        },
    });
    if (response.status != 200) throw new HttpError("Http error", response.status);
    const jsonResponse = await response.json();
    switch (jsonResponse.code) {
        case 200:
            myAlert.showAlert(`分类 ${category} 删除成功！`);
            li.remove();
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
}