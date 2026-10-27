const policy = require('./bookingTypePolicy.json');
const normalise = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
// The department comes from Firestore, never from a caller's submitted label.
function isPublicBookingType(department) {
 return !!department && department.active !== false && normalise(department.name) === normalise(policy.publicBookingTypeName);
}
function canSubmitBookingType(department, isAdmin) {
 return !!department && (isAdmin === true || isPublicBookingType(department));
}
module.exports = { isPublicBookingType, canSubmitBookingType };
