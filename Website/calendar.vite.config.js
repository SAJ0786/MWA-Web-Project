import websiteConfig from './vite.config.js';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url));
const calendar=existsSync(path.join(directory,'calendar-app/src'))?path.join(directory,'calendar-app'):path.resolve(directory,'../Centralised Calendar');
// Use this website's installed build tools for both bundles, including on Windows ARM.
export default {
 ...websiteConfig,root:calendar,envDir:calendar,
 build:{emptyOutDir:true,chunkSizeWarningLimit:1000,
  rollupOptions:{output:{manualChunks:{
   'react-vendor':['react','react-dom'],
   'firebase-app':['firebase/app'],
   'firebase-auth':['firebase/auth'],
   'firebase-firestore':['firebase/firestore'],
   'firebase-functions':['firebase/functions']
  }}}
 }
};
