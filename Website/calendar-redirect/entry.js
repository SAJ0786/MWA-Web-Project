export const WEBSITE_ORIGIN = 'https://refreshed.muhammadiwelfare.org.au';
const moduleRoutes = {'islamic-events':'/islamic-events/','calendar-management':'/calendar-management/',tools:'/tools-automation/'};
export function calendarWebsiteUrl(currentUrl, websiteOrigin=WEBSITE_ORIGIN) {
 const current=new URL(currentUrl);
 const view=current.searchParams.get('view');
 const path=current.pathname.replace(/\/$/,'');
 const route=(Object.hasOwn(moduleRoutes,view)?moduleRoutes[view]:null) || ({'/islamic-events':'/islamic-events/','/calendar-management':'/calendar-management/','/tools-automation':'/tools-automation/','/admin-login':'/admin-login'})[path] || '/calendar/';
 return websiteOrigin.replace(/\/$/,'')+route+current.search+current.hash;
}
