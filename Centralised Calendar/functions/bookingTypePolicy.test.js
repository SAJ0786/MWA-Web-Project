const test = require('node:test');
const assert = require('node:assert/strict');
const {isPublicBookingType,canSubmitBookingType} = require('./bookingTypePolicy');
const types = [
 {id:'events',name:'Events Booking',active:true},
 {id:'programs',name:'MWA Programs',active:true},
 {id:'maintenance',name:'Maintenance',active:true},
 {id:'private',name:'Private Internal Bookings',active:true},
 {id:'volunteers',name:'Volunteers Events',active:true}
];

test('public submissions allow only active Events Booking, not another department or a spoofed label',()=>{
 assert.equal(canSubmitBookingType(types[0],false),true);
 for(const type of types.slice(1))assert.equal(canSubmitBookingType({...type,departmentName:'Events Booking',isAdmin:true},false),false);
 for(const type of [null,{}, {name:'Event Booking'},{name:'Events Booking',active:false}])assert.equal(isPublicBookingType(type),false);
 assert.equal(isPublicBookingType({name:'  EVENTS   BOOKING  '}),true);
});

test('verified admins retain every booking type including Events Booking',()=>{
 for(const type of types)assert.equal(canSubmitBookingType(type,true),true);
 for(const claimedAdmin of [false,undefined,null,'true',1,{}])assert.equal(canSubmitBookingType(types[1],claimedAdmin),false);
});

test('client options and server policy agree; inactive Events Booking is not offered publicly',async()=>{
 const client=await import('../src/utils/bookingTypes.js');
 const catalog=[...types,{id:'inactive',name:'Events Booking',active:false}];
 assert.deepEqual(client.availableBookingTypes(catalog,false).map(type=>type.id),['events']);
 assert.strictEqual(client.availableBookingTypes(catalog,true),catalog);
 for(const type of [...catalog,null,{}])assert.equal(client.isPublicBookingType(type),isPublicBookingType(type));
});
