
import { baseUrl, HttpError } from './settings.js';
import { loadRanking } from './ranking.js';


document.addEventListener('selectstart', function (event) {
    //禁止选择
    const elem = event.target;
    if (elem.tagName == 'INPUT') return;
    event.preventDefault();
});

loadRanking();

