import {calendarWebsiteUrl} from './entry.js';
const destination=calendarWebsiteUrl(location.href);
document.querySelector('#continue').href=destination;
location.replace(destination);
