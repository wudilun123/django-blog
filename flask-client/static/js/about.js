'use strict'

import { MyAlert } from './myAlert.js'
import { blankStrRegexp, baseUrl, HttpError } from './settings.js'

const username = localStorage.getItem('username');//当前登录用户
const token = localStorage.getItem('blogToken');

const myAlert = new MyAlert();
const aboutUsername = window.location.href.match(/\/([^\/]+)\/info/)[1];//当前页面所属用户
const avatarImg = document.querySelector('#avatar img');
const logo = document.querySelector('#logo');
const changeButton = document.querySelector('#change-button');
const cancleChangeButton = document.querySelector('#cancel-change-button');
const submitChangeButton = document.querySelector('#submit-change-button');
const navUserLink = document.querySelector('#nav-user-link a');
const aboutNickname = document.querySelector('#about-nickname');
const aboutSign = document.querySelector('#about-sign');
const aboutCreatedTime = document.querySelector('#about-created-time');
const aboutInfo = document.querySelector('#about-info');



document.addEventListener('selectstart', function (event) {
    //禁用textarea外的选择
    if (event.target.tagName != 'TEXTAREA') event.preventDefault();
})

const uploadButton = document.body.querySelector('#upload-button');
const uploadImg = document.body.querySelector('#upload-img');
const imgRegexp = /^image\//
let originAvatarUrl = null;//原始头像
const defaultAvatarUrl = "/static/image/测试头像.png";//默认头像
let lastImgUrl = null;//最新头像
let imgFile = null;//头像文件
const IMAGE_MAX_SIZE = 200 * 1024; //文件限制大小200kb
uploadImg.addEventListener('change', updateImageDisplay);
uploadButton.onclick = () => uploadImg.click();

function updateImageDisplay(event) {
    const curFile = uploadImg.files[0];
    uploadImg.value = null;//保证每次上传都能触发change事件
    if (!curFile) return;
    else {
        if (!curFile.type.match(imgRegexp)) {
            myAlert.showAlert(`所选文件不是图片:${curFile.name.replace(/(.{0,10})(.*)(\..+)/, '$1$3')}`);
            return;
        }
        if (curFile.size > IMAGE_MAX_SIZE) {
            myAlert.showAlert(`所选文件:${curFile.name.replace(/(.{0,10})(.*)(\..+)/, '$1$3')}大小超过限制:${returnFileSize(curFile.size)}`);
            return;
        }
        if (lastImgUrl) URL.revokeObjectURL(lastImgUrl);//创建新URL的同时把原来的删掉
        lastImgUrl = URL.createObjectURL(curFile);
        avatarImg.src = lastImgUrl;
        imgFile = curFile;//保存文件引用用于表单提交
    }
    function returnFileSize(number) {
        if (number < 1024) {
            return number + 'bytes';
        } else if (number >= 1024 && number < 1048576) {
            return (number / 1024).toFixed(1) + 'KB';
        } else if (number >= 1048576) {
            return (number / 1048576).toFixed(1) + 'MB';
        }
    }
}

let bigAvatarContainer;
let bigAvatarImg;
document.addEventListener('click', function (event) {
    const elem = event.target;
    if (elem == avatarImg) {
        //点击头像可查看大图
        bigAvatarContainer = document.createElement('div');
        bigAvatarImg = document.createElement('img');
        document.body.append(bigAvatarContainer);
        bigAvatarContainer.append(bigAvatarImg);
        bigAvatarContainer.style.cssText = `    
            position: fixed;
            top:0;
            left: 0;
            z-index: 9999;
            width: 100%;
            height: 100%;
            background-color: rgba(255,255,255,0.3);
            `;
        bigAvatarImg.src = avatarImg.src;
        bigAvatarImg.style.cssText = `
            position:absolute;
            top:50%;
            left:50%;
            transform:translate(-50%,-50%);
            width:350px;
            height:350px;
            object-fit: cover;
            cursor:pointer;
            `;
    } else if (elem == bigAvatarImg) {
        //点击大图取消显示
        bigAvatarContainer.remove();
        bigAvatarContainer = null;
        bigAvatarImg = null;
    }
})

changeButton.onclick = changeOn;
cancleChangeButton.onclick = clearChange;
submitChangeButton.onclick = () => {
    submitChangeButton.disabled = true;
    submitChange();
}

loadPage();//异步加载页面 
function loadPage() {
    //异步加载用户数据
    (async () => {
        //加载当前页面所属用户的数据
        const response = await fetch(baseUrl + `/api/v1/users/info/${aboutUsername}/`);
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        if (jsonResponse.code == 200) {
            aboutNickname.children[1].textContent = jsonResponse.data.nickname;
            aboutSign.children[1].textContent = jsonResponse.data.sign;
            const createdTime = new Date(jsonResponse.data.created_time * 1000);
            aboutCreatedTime.children[1].textContent = `${createdTime.getFullYear()}/${createdTime.getMonth() + 1}/${createdTime.getDate()}`;
            aboutInfo.children[1].textContent = jsonResponse.data.info;
            if (jsonResponse.data.avatar) avatarImg.src = baseUrl + '/media/' + jsonResponse.data.avatar;
            else avatarImg.src = defaultAvatarUrl;//用户设置了头像就加载对应URL，反之加载默认头像
            originAvatarUrl = avatarImg.src;//记录原始头像
        } else if (jsonResponse.code == 10300) {
            //用户不存在
            //待添加跳转
            myAlert.showAlert(jsonResponse.error);
        }
        if (aboutUsername == username) {
            //只有当前页面对应的用户可以修改资料
            changeButton.hidden = false;
        }
    })().catch(handleError);
}

function changeOn(event) {
    //显示资料可修改的样式
    cancleChangeButton.hidden = false;
    submitChangeButton.hidden = false;
    changeButton.hidden = true;
    aboutNickname.children[1].hidden = true;
    aboutSign.children[1].hidden = true;
    aboutInfo.children[1].hidden = true;
    aboutNickname.children[2].hidden = false;
    aboutSign.children[2].hidden = false;
    aboutInfo.children[2].hidden = false;
    uploadButton.hidden = false;
    uploadButton.nextElementSibling.hidden = false;

    aboutNickname.children[2].value = aboutNickname.children[1].textContent;
    aboutSign.children[2].value = aboutSign.children[1].textContent;
    aboutInfo.children[2].value = aboutInfo.children[1].textContent;

    aboutNickname.children[2].focus();
}

function clearChange() {
    //恢复成修改前的样式
    cancleChangeButton.hidden = true;
    submitChangeButton.hidden = true;
    changeButton.hidden = false;
    aboutNickname.children[1].hidden = false;
    aboutSign.children[1].hidden = false;
    aboutInfo.children[1].hidden = false;
    aboutNickname.children[2].hidden = true;
    aboutSign.children[2].hidden = true;
    aboutInfo.children[2].hidden = true;
    uploadButton.hidden = true;
    uploadButton.nextElementSibling.hidden = true;
    avatarImg.src = originAvatarUrl;
}

function submitChange() {
    let isChanged = false;
    if (!checkSubmitInfo()) return;
    const form = new FormData();
    if (avatarImg.src != originAvatarUrl) {
        form.append('avatar', imgFile, imgFile.name);
        isChanged = true;
    }
    if (aboutNickname.children[2].value != aboutNickname.children[1].textContent) {
        form.append('nickname', aboutNickname.children[2].value);
        isChanged = true;
    }
    if (aboutSign.children[2].value != aboutSign.children[1].textContent) {
        form.append('sign', aboutSign.children[2].value);
        isChanged = true;
    }
    if (aboutInfo.children[2].value != aboutInfo.children[1].textContent) {
        form.append('info', aboutInfo.children[2].value);
        isChanged = true;
    }
    if (!isChanged) {
        //没有修改就不与后端通信
        myAlert.showAlert('修改成功！', clearChange);
        return;
    }
    (async () => {
        const response = await fetch(baseUrl + `/api/v1/users/info/${aboutUsername}/`, {
            method: 'POST',
            body: form,
            headers: {
                authorization: token
            },
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        handlePostResponse(jsonResponse);
    })().catch(handleError).then(() => submitChangeButton.disabled = false);
}

function checkSubmitInfo() {
    //校验要提交的信息，不符合规则提示信息并返回false，反之返回true
    if (blankStrRegexp.test(aboutNickname.children[2].value)) {
        myAlert.showAlert('用户昵称不能为空！', () => aboutNickname.children[2].focus());
        return false;
    }
    return true;
}

function handlePostResponse(jsonResponse) {
    switch (jsonResponse.code) {
        case 200:
            myAlert.showAlert('修改成功！', () => window.location.href = window.location.href);
            break;
        case 403:
            myAlert.showAlert(jsonResponse.error, () => {
                localStorage.removeItem('blogToken');
                localStorage.removeItem('username');
                window.location.href = '/login-reg/';
            });
            break;
        case 10400:
            myAlert.showAlert(jsonResponse.error, () => window.location.href = `/${username}/info/`);
            break;
        case 10401: case 10402: case 10403: case 10404: case 10405: case 10406: case 10420:
            myAlert.showAlert(jsonResponse.error);
            break;
        default:
            throw new Error('未定义的错误');
    }
}

function handleError(error) {
    //全局error处理
    if (error instanceof TypeError) {
        myAlert.showAlert("您的网络出了一些问题，请求未成功发送！");
    } else if (error instanceof HttpError) {
        myAlert.showAlert(`请求错误，响应码：${error.status}`)
    } else {
        myAlert.showAlert(`出现了一些未知问题！${error}`);
    }
}
