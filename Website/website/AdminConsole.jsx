import React from 'react';
import {CalendarDays,CalendarRange,UtensilsCrossed,HandHeart,Users,Workflow,Wrench,Receipt,HeartHandshake,Megaphone,MicVocal,PanelsTopLeft,ArrowUpRight} from 'lucide-react';

export const adminModules=[
 {name:'Events & Bookings Hub',icon:CalendarDays,description:'Manage bookings, venues and event requests.',href:'/calendar/?view=admin'},
 {name:'Calendar Management',icon:CalendarRange,description:'Manage calendars, schedules and shared dates.'},
 {name:'Niaz Administration',icon:UtensilsCrossed,description:'Coordinate Niaz arrangements and contributions.'},
 {name:'Volunteer Administration',icon:HandHeart,description:'Organise volunteer teams and responsibilities.'},
 {name:'Member Administration',icon:Users,description:'Manage membership and community records.'},
 {name:'Tools & Automation',icon:Workflow,description:'Coordinate tools, workflows and automated tasks.'},
 {name:'Maintenance Administration',icon:Wrench,description:'Coordinate facility care and maintenance requests.'},
 {name:'Expense Administration',icon:Receipt,description:'Manage expenses and related records.'},
 {name:'Donation Administration',icon:HeartHandshake,description:'Manage donations and contribution records.'},
 {name:'Social Media Administration',icon:Megaphone,description:'Coordinate community communications and updates.'},
 {name:'Speakers & Reciters',icon:MicVocal,description:'Coordinate speakers, reciters and programme participation.'},
 {name:'Website CMS',icon:PanelsTopLeft,description:'Publish website content, branding and appearance.',href:'/cms'}
];

export default function AdminConsole({email}){
 return <section className="admin-console" aria-labelledby="admin-console-title">
  <div className="admin-console-intro"><div className="eyebrow">MWA · ADMINISTRATION</div><h1 id="admin-console-title">Welcome to Admin Console.</h1><p>Manage MWA’s services and website from one place.</p><span className="admin-console-account">Signed in as {email}</span></div>
  <div className="admin-module-grid">{adminModules.map(({name,icon:Icon,description,href})=>{
   const Tag=href?'a':'article';
   return <Tag key={name} {...(href?{href}:{})} className={'admin-module'+(href?' is-live':' is-planned')}>
    <div className="admin-module-top"><span className="admin-module-icon"><Icon aria-hidden="true"/></span><span className="admin-module-status">{href?'Live':'Coming soon'}</span></div>
    <h2>{name}{href&&<ArrowUpRight aria-hidden="true"/>}</h2><p>{description}</p>
   </Tag>;
  })}</div>
 </section>;
}
