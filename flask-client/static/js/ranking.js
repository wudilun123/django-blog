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
    let aArray;
    if (type == 'hot5') {
        aArray = Array.from(hot5ListContainer.querySelectorAll('a'));
    } else if (type == 'last5') {
        aArray = Array.from(last5ListContainer.querySelectorAll('a'));
    }
    let count = 0;
    for (let a of aArray) {
        a.textContent = data[count].title;
        const author = data[count].author;
        const topicId = data[count].topic_id;
        a.href = `/${author}/topics/detail/${topicId}/`;
        count++;
    }
}