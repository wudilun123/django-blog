import { baseUrl, HttpError } from './settings.js';

const hot5ListContainer = document.querySelector('#hot5-list-container');
const last5ListContainer = document.querySelector('#last5-list-container');

export function loadRanking() {
    //加载两个榜单
    loadList('hot5');
    loadList('last5');
}

function loadList(type) {
    let requestUrl;
    if (type == 'hot5') {
        requestUrl = new URL(baseUrl + `/api/v1/topics/ranking/hot5/`);
    } else if (type == 'last5') {
        requestUrl = new URL(baseUrl + `/api/v1/topics/ranking/last5/`);
    }
    (async () => {
        const response = await fetch(requestUrl);
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                makeListLink(jsonResponse.data, type);
                break;
            default:
                myAlert.showAlert(jsonResponse.error);
        }
    })().catch(function (error) {
        console.log(error);
    });
}

function makeListLink(data, type) {
    let listContainer;
    if (type == 'hot5') {
        listContainer = hot5ListContainer;
    } else if (type == 'last5') {
        listContainer = last5ListContainer;
    }
    let count = 0
    console.log(data)
    if (data) {
        for (let d of data) {
            const a = document.createElement('a');
            const author = d.author;
            const topicId = d.topic_id;
            a.textContent = d.title
            a.target = '_blank';
            a.href = `/${author}/topics/detail/${topicId}/`;
            listContainer.append(a);
            count++;
        }
    }
    while (count < 5) {
        //使用空的div填充布局
        const div = document.createElement('div');
        div.style.flexGrow = 1;
        listContainer.append(div);
        count++;
    }
}