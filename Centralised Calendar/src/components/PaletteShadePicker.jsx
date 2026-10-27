import {BOOKING_SHADE_NAMES} from '@mwa/appearance';
export default function PaletteShadePicker({value=0,onChange,label='Palette shade',compact=false}){
 return <fieldset className={'booking-shade-picker'+(compact?' is-compact':'')}><legend>{label}</legend><div className="booking-shade-options">{BOOKING_SHADE_NAMES.map((name,index)=><button key={name} type="button" aria-label={name+' shade'} title={name} aria-pressed={value===index} onClick={()=>onChange(index)} style={{background:`var(--booking-${index}-bg)`,color:`var(--booking-${index}-ink)`,borderColor:`var(--booking-${index}-edge)`}}>{value===index?'✓':''}</button>)}</div><span className="booking-shade-name">{BOOKING_SHADE_NAMES[value]||BOOKING_SHADE_NAMES[0]}</span></fieldset>;
}
