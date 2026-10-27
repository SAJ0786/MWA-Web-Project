export const BOOKING_SHADE_NAMES=['Deep','Signature','Mid','Soft','Mist','Stone'];
const RGB=hex=>hex.replace('#','').match(/../g).map(value=>parseInt(value,16));
export function mixColour(a,b,amount){const x=RGB(a),y=RGB(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*amount).toString(16).padStart(2,'0')).join('')}
const luminance=hex=>RGB(hex).map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
export function readableInk(background,preferred='#18372c'){if(contrastRatio(background,preferred)>=4.5)return preferred;return contrastRatio(background,'#ffffff')>=contrastRatio(background,'#000000')?'#ffffff':'#000000'}
export function bookingTonePalette(primary,ink,paper,mode='light'){
 const backgrounds=mode==='dark'?[.16,.24,.32,.40,.50,.64].map(amount=>mixColour(paper,primary,amount)):[mixColour(primary,'#000000',.24),primary,mixColour(primary,paper,.25),mixColour(primary,paper,.60),mixColour(primary,paper,.82),mixColour(ink,paper,.79)];
 return backgrounds.map((background,index)=>{let edge=mixColour(background,ink,.55);if(contrastRatio(edge,paper)<4.5)edge=ink;return {name:BOOKING_SHADE_NAMES[index],background,foreground:readableInk(background,ink),edge}});
}
const defaults={'events booking':0,'mwa programs':1,'maintenance':2,'private internal bookings':3,'volunteers events':4};
export function bookingToneIndex(department={}){const tone=department?.paletteTone;if(Number.isInteger(tone)&&tone>=0&&tone<BOOKING_SHADE_NAMES.length)return tone;return defaults[String(department?.name||'').trim().toLowerCase()]??5}
export function bookingTypeStyle(department,selected=true){const i=bookingToneIndex(department);return {background:selected?`var(--booking-${i}-bg)`:'transparent',color:`var(--booking-${i}-${selected?'ink':'edge'})`,borderColor:`var(--booking-${i}-edge)`}}
export function bookingTypeEdge(department){return `var(--booking-${bookingToneIndex(department)}-edge)`}
