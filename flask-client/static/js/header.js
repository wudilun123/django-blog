//加载header区域
'use strict'

import { MyAlert } from './myAlert.js'
import { MyConfirm } from './myConfirm.js'

let username = localStorage.getItem('username');//当前登录用户
let token = localStorage.getItem('blogToken');
const myAlert = new MyAlert();
const myConfirm = new MyConfirm();
const baseUrl = 'http://127.0.0.1:8000';
const defaultAvatarUrl = "/static/image/测试头像.png";//默认头像

const navIndex = document.querySelector('#nav-index');
const navRelease = document.querySelector('#nav-release');
const navList = document.querySelector('#nav-list');
const navHome = document.querySelector('#nav-home');
const navIntro = document.querySelector('#nav-intro');

const navUserAvatar = document.querySelector('#nav-user-avatar');
const navUserContainer = document.querySelector('#nav-user-container');
const navUserLink = document.querySelector('#nav-user-link');
const navUserUl = document.querySelector('#nav-user-container>ul');
const navUserSpan = document.querySelector('#nav-user-container>span');

const navUserAbout = document.querySelector('#nav-user-about');
const navUserSecret = document.querySelector('#nav-user-secret');
const navUserCategory = document.querySelector('#nav-user-category');
const navUserLogout = document.querySelector('#nav-user-logout');

class HttpError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}

(async () => {
    const response = await fetch(baseUrl + `/v1/users/avatar/`, {
        headers: {
            authorization: token
        },
    });
    if (response.status != 200) throw new HttpError("Http error", response.status);
    const jsonResponse = await response.json();
    switch (jsonResponse.code) {
        case 200:
            const data = jsonResponse.data;
            username = data.username;
            if (jsonResponse.data.avatar) navUserAvatar.src = baseUrl + '/media/' + jsonResponse.data.avatar;
            else navUserAvatar.src = defaultAvatarUrl;//用户设置了头像就加载对应URL，反之加载默认头像
            navUserContainer.style.display = 'inline-block';
            navUserSpan.textContent = '用户:' + username;
            break;
        default:
            throw new Error();//简单粗暴
    }
})().catch(function (error) {
    username = null;
    navUserLink.style.display = 'inline-block';
    navUserLink.querySelector('a').href = `/login-reg/?next=${window.location.href}`;
}).then(function () {

    navIndex.onclick = () => window.location.href = '//';//有待添加
    navIntro.onclick = () => window.location.href = '//';//有待添加
    if (username) {
        navUserAvatar.onclick = function () {
            navUserUl.hidden = !navUserUl.hidden;
        }
        navRelease.onclick = () => window.location.href = `/${username}/topic/release/`;
        navList.onclick = () => window.location.href = `/${username}/topics/`;
        navHome.onclick = () => window.location.href = `//`; //有待添加
        navUserAbout.onclick = () => window.location.href = `/${username}/info/`;
        navUserSecret.onclick = () => window.location.href = `//`; //有待添加
        navUserCategory.onclick = () => window.location.href = `/${username}/topics/category/`; //有待添加
        navUserLogout.onclick = () => {
            myConfirm.showConfirm('确定要退出登录吗？', () => {
                localStorage.removeItem('username');
                localStorage.removeItem('blogToken');
                window.location.href = `/login-reg/?next=${window.location.href}`;
            })
        }
    } else {
        window.addEventListener('click', function (event) {
            const elem = event.target;
            if ([navRelease, navList, navHome].includes(elem)) {
                myAlert.showAlert('请登录！', () => {
                    localStorage.removeItem('blogToken');
                    localStorage.removeItem('username');
                    window.location.href = `/login-reg/?next=${window.location.href}`
                });
            }
        })
    }
});
