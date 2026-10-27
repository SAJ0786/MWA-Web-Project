import {test} from 'node:test';import assert from 'node:assert/strict';
import {publicProgrammes} from './communityCalendar.js';
test('home calendar only contains confirmed unmasked MWA programmes, never other types or pending/private placeholders',()=>{
 const event={id:'public',status:'confirmed',departmentName:'MWA Programs',startAt:'2026-10-29T08:00:00.000Z'};
 assert.deepEqual(publicProgrammes([event,{...event,id:'pending',status:'pending'},{...event,id:'masked',masked:true},{...event,id:'other',departmentName:'Events Booking'},{...event,id:'cancelled',status:'cancelled'}]).map(x=>x.id),['public']);
});
