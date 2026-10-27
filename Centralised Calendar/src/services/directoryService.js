import {
  collection, onSnapshot, orderBy, query
} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import { db,functions } from '../firebase/firebase';

export function watchVenues(callback) {
  const q = query(collection(db, 'venues'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function watchDepartments(callback) {
  const q = query(collection(db, 'departments'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function createVenue(data) {
  return change('venues','create',null, {
    name: data.name,
    capacity: Number(data.capacity) || null,
    hireable: data.hireable !== false,
    openingHours: data.openingHours || '',
    bufferHours: Number(data.bufferHours) || 0,
    active: data.active !== false
  });
}

export async function updateVenue(id, data) {
  return change('venues','update',id,data);
}

export async function deleteVenue(id) {
  return change('venues','delete',id);
}

export async function createDepartment(data) {
  return change('departments','create',null, {
    name: data.name,
    colorHex: data.colorHex || '#2563eb',
    paletteTone: Number.isInteger(data.paletteTone) && data.paletteTone >= 0 && data.paletteTone < 6 ? data.paletteTone : 5,
    approvalRequired: data.approvalRequired !== false,
    active: data.active !== false
  });
}

export async function updateDepartment(id, data) {
  return change('departments','update',id,data);
}

export async function deleteDepartment(id) {
  return change('departments','delete',id);
}

async function change(kind,operation,id,data){return (await httpsCallable(functions,'changeDirectory')({kind,operation,id,data:data||null})).data;}
