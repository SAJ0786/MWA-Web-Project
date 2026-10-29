import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarWebsiteUrl,WEBSITE_ORIGIN} from './calendar-redirect/entry.js';
test('legacy calendar entry retains query and fragment on the website',()=>{
 assert.equal(calendarWebsiteUrl('https://eventscalendar.muhammadiwelfare.org.au/?view=admin&date=2026-10-30#booking'),WEBSITE_ORIGIN+'/calendar/?view=admin&date=2026-10-30#booking');
});
test('module links retain their destination and authentication remains in the website',()=>{
 for(const [view,route] of [['tools','tools-automation'],['calendar-management','calendar-management'],['islamic-events','islamic-events']])assert.equal(calendarWebsiteUrl('https://old.example/?view='+view),WEBSITE_ORIGIN+'/'+route+'/?view='+view);
 assert.equal(calendarWebsiteUrl('https://old.example/admin-login?returnTo=%2Fcalendar%2F'),WEBSITE_ORIGIN+'/admin-login?returnTo=%2Fcalendar%2F');
});
test('direct embedded URL returns to its current website origin without an open redirect',()=>{
 assert.equal(calendarWebsiteUrl('https://mwa-community-web.web.app/calendar-app/?next=https://evil.example','https://mwa-community-web.web.app'),'https://mwa-community-web.web.app/calendar/?next=https://evil.example');
});
