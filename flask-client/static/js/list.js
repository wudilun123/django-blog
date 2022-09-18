'use strict'
import { MyAlert } from './myAlert.js'
import { loadAuthorCard } from './author-card.js'
import { baseUrl, HttpError } from './settings.js'
import { loadRanking } from './ranking.js'

const username = localStorage.getItem('username');//当前登录用户
const token = localStorage.getItem('blogToken');
const myAlert = new MyAlert();
const currentUrl = new URL(window.location.href);//当前页面url对象
const visitedUsername = window.location.href.match(/\/([^\/]+)\/topics/)[1];//当前页面所属用户
const PAGE_TOPIC_NUM = 10;//页面加载的文章数

const pageParam = currentUrl.searchParams.get('page');
const limitParam = currentUrl.searchParams.get('limit');
const categoryParam = currentUrl.searchParams.get('category');
const orderParam = currentUrl.searchParams.get('order');
const requestUrl = new URL(baseUrl + `/api/v1/topics/${visitedUsername}/`);



document.addEventListener('selectstart', function (event) {
    //禁止选择
    event.preventDefault();
})

loadPage();
function loadPage() {
    if (pageParam !== null) requestUrl.searchParams.append('page', pageParam);
    requestUrl.searchParams.append('page_topic_num', PAGE_TOPIC_NUM);
    if (limitParam !== null) requestUrl.searchParams.append('limit', limitParam);
    if (categoryParam !== null) requestUrl.searchParams.append('category', categoryParam);
    if (orderParam !== null) requestUrl.searchParams.append('order', orderParam);
    (async () => {
        const response = await fetch(requestUrl, {
            headers: {
                authorization: token
            },
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                handleJsonResp(jsonResponse);
                break;
            case 10803:
                //可能是因为修改分类而未清楚缓存
                currentUrl.searchParams.delete('category');
                myAlert.showAlert('分类不存在!', () => window.location.href = currentUrl.href);
                break;
            default:
                myAlert.showAlert(jsonResponse.error);
        }
    })().catch(function (error) {
        console.log(error)
        if (error instanceof TypeError) {
            myAlert.showAlert("您的网络出了一些问题，请求未成功发送！");
        } else if (error instanceof HttpError) {
            myAlert.showAlert(`请求错误，响应码：${error.status}`)
        } else {
            myAlert.showAlert(`出现了一些未知问题！${error}`);
        }
    });
}

function handleJsonResp(jsonResponse) {
    // const nickname = jsonResponse.data.nickname;
    // const avatar = jsonResponse.data.avatar;
    // const sign = jsonResponse.data.sign;
    const topicNum = jsonResponse.data.topic_num;
    const isSameUser = jsonResponse.data.is_same_user;
    const category = jsonResponse.data.category;
    const topics = jsonResponse.data.topics;
    loadFilterArea(isSameUser, category);
    loadListArea(topics);
    loadPageArea(topicNum);
    loadRanking();
    loadAuthorCard(visitedUsername);
}

function loadFilterArea(isSameUser, category) {
    //filter区域加载
    const limitSelect = document.querySelector('#limit');
    const categorySelect = document.querySelector('#category');
    const orderSelect = document.querySelector('#order');
    const filterButton = document.querySelector('#filter-button');
    if (!isSameUser) {
        //只能查看公开权限的文章
        const limitAllOption = document.querySelector('#limit option[value=all]');
        const limitPrivateOption = document.querySelector('#limit option[value=private]');
        limitAllOption.hidden = true;
        limitPrivateOption.hidden = true;
    }
    let option;
    for (let c of category) {
        //加载分类信息
        option = document.createElement('option');
        option.value = c;
        option.textContent = c;
        categorySelect.append(option);
    }
    if (limitParam !== null) limitSelect.querySelector(`option[value='${limitParam}']`).setAttribute('selected', '');
    if (categoryParam !== null) categorySelect.querySelector(`option[value='${categoryParam}']`).setAttribute('selected', '');
    if (orderParam !== null) orderSelect.querySelector(`option[value='${orderParam}']`).setAttribute('selected', '');
    filterButton.onclick = function () {
        currentUrl.searchParams.set('limit', limitSelect.querySelector('option:checked').value);
        currentUrl.searchParams.set('category', categorySelect.querySelector('option:checked').value);
        currentUrl.searchParams.set('order', orderSelect.querySelector('option:checked').value);
        currentUrl.searchParams.delete('page');
        window.location.href = currentUrl;
    }
}

function loadListArea(topics) {
    //文章列表加载
    const pageContainer = document.querySelector('#page-container');
    let topicContainer;
    let a;
    let topicAuthor;
    let topicCategory;
    let topicLimit;
    let topicTime;
    let date;
    let topicIntroduce;
    for (let t of topics) {
        topicContainer = document.createElement('div');
        topicContainer.classList.add('topic-container');
        topicContainer.innerHTML = `
            <h1>
                <a></a>
            </h1>
            <div class="topic-info">
                <span class="topic-author-info"></span>
                <span class="topic-limit-info"></span>
                <span class="topic-category-info"></span>
                <span class="topic-time-info"></span>
                <!-- <span class="topic-time-info"><i class="fa fa-clock-o" aria-hidden="true"></i>修改于:2022/09/06
                    23:31</span> -->
            </div>
            <div class="topic-introduce"></div>
            `;
        a = topicContainer.querySelector('a');
        topicAuthor = topicContainer.querySelector('.topic-author-info');
        topicLimit = topicContainer.querySelector('.topic-limit-info');
        topicCategory = topicContainer.querySelector('.topic-category-info');
        topicTime = topicContainer.querySelector('.topic-time-info');
        topicIntroduce = topicContainer.querySelector('.topic-introduce');

        a.href = `/${visitedUsername}/topics/detail/${t.id}`;
        a.textContent = t.title;
        a.target = '_blank';

        topicAuthor.innerHTML = `<i class="fa fa-user-o" aria-hidden="true"></i> `;//i标签后边跟着的空格保证生成一个文本节点
        topicAuthor.lastChild.data = ` 作者:${t.author}`; //安全插入文本
        topicLimit.innerHTML = `<i class="fa fa-unlock-alt" aria-hidden="true"></i> `;
        topicLimit.lastChild.data = ` 权限:${t.limit}`;
        topicCategory.innerHTML = `<i class="fa fa-tag"aria-hidden="true"></i> `;
        topicCategory.lastChild.data = ` 分类:${t.category}`;
        date = new Date(t.created_time * 1000); //python时间戳是秒为单位，换算成毫秒
        topicTime.innerHTML = `<i class="fa fa-calendar"aria-hidden="true">
            </i> 发表于:${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}
             ${date.getHours()}:${date.getMinutes()}`;
        topicIntroduce.textContent = t.introduce;
        pageContainer.before(topicContainer);
    }
}

function loadPageArea(topicNum) {
    //page区域加载
    const topicCount = document.querySelector('#topic-count');
    const lastPage = document.querySelector('#last-page');
    const pageInfo = document.querySelector('#page-info');
    const nextPage = document.querySelector('#next-page');
    const jumpButton = document.querySelector('#jump-button');
    const pageNum = Math.ceil(topicNum / PAGE_TOPIC_NUM);//分页数
    let currentPage;
    if (pageNum === 0) {
        //未查询到任何数据
        topicCount.textContent = '未查询到任何文章数据';
    } else {
        topicCount.textContent = `共查询到 ${topicNum} 篇文章`;
        if (pageParam === null) currentPage = 1;//默认为第一页
        else currentPage = +pageParam;
        if (currentPage < 1 || currentPage > pageNum) {
            myAlert.showAlert('页面不存在！', () => {
                currentUrl.searchParams.set('page', 1);
                window.location.href = currentUrl;
            })
        }
        pageInfo.textContent = `第 ${currentPage} 页 / 共 ${pageNum} 页`;
        lastPage.onclick = () => {
            currentUrl.searchParams.set('page', currentPage - 1);
            window.location.href = currentUrl;
        }
        nextPage.onclick = () => {
            currentUrl.searchParams.set('page', currentPage + 1);
            window.location.href = currentUrl;
        }
        if (currentPage == 1) lastPage.hidden = true;
        if (currentPage == pageNum) nextPage.hidden = true;
        jumpButton.onclick = () => {
            const pageValue = +jumpButton.previousElementSibling.value;
            if (pageValue < 1 || pageValue > pageNum) {
                myAlert.showAlert('请输入合理范围内的数字！');
                return;
            } else {
                currentUrl.searchParams.set('page', pageValue);
                window.location.href = currentUrl;
            }
        }
    }
}

