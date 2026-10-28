import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,terminate} from 'firebase/firestore';
test('enquiry and OAuth collections deny all direct client access, including admins',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
 for(const uid of [null,'member','listed-admin']){
  const app=initializeApp({projectId:'demo-mwa-enquiries',apiKey:'fake'},'enquiry-rules-'+uid),db=getFirestore(app);
  connectFirestoreEmulator(db,host,Number(port),uid?{mockUserToken:{sub:uid,user_id:uid}}:{});
  if(uid==='listed-admin'){const response=await fetch(`http://${host}:${port}/v1/projects/demo-mwa-enquiries/databases/(default)/documents/users/${uid}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{role:{stringValue:'admin'}}})});assert.equal(response.ok,true);}
  try{for(const path of ['enquiries/private','enquiries/private/messages/private','enquiryOutbox/private','_enquiryPrivate/mailbox','_enquiryOAuthStates/private','_enquiryMailThreads/private','_enquiryMailMessages/private','_enquiryRateLimits/private']){await assert.rejects(getDoc(doc(db,path)),/permission/i);await assert.rejects(setDoc(doc(db,path),{value:'forged'}),/permission/i);}}
  finally{await terminate(db);await deleteApp(app)}
 }
});
