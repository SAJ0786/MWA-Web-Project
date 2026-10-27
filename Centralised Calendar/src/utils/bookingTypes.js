import policy from '../../functions/bookingTypePolicy.json' with { type: 'json' };
const normalise = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
export function isPublicBookingType(department) {
 return !!department && department.active !== false && normalise(department.name) === normalise(policy.publicBookingTypeName);
}
export function availableBookingTypes(departments, isAdmin) {
 return isAdmin === true ? departments : departments.filter(isPublicBookingType);
}
