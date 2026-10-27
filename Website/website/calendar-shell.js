// Keep calendar styles and booking dialogs isolated while sharing the website origin/session.
export function mountCalendarShell() {
 const route=location.pathname.replace(/\/$/,'');
 if (!['/calendar','/islamic-events'].includes(route)) return;
 const islamic=route==='/islamic-events';
 document.body.classList.add('mwa-calendar-page');
 document.querySelector('#main').hidden = true;
 const main = document.createElement('main');
 main.id = 'calendar-main';
 main.tabIndex = -1;
 const frame = document.createElement('iframe');
 frame.id = 'mwa-calendar-frame';
 frame.title = islamic?'MWA Key Islamic Events':'MWA Events & Bookings Calendar';
 const query=new URLSearchParams(location.search);
 if(islamic)query.set('view','islamic-events');
 frame.src = '/calendar-app/' + (query.size?'?'+query.toString():'') + location.hash;
 main.append(frame);
 document.querySelector('#main').after(main);
 document.querySelector('.skip').setAttribute('href','#calendar-main');
 document.querySelector('.nav a[href="'+route+'/"]').setAttribute('aria-current','page');
 const resize = () => document.documentElement.style.setProperty('--mwa-header-height',main.getBoundingClientRect().top+'px');
 new ResizeObserver(resize).observe(document.querySelector('.header'));
 window.addEventListener('resize',resize);
 resize();
}
