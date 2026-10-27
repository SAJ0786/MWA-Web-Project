import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './styles.css';
import './theme.css';
import './website-appearance.css';
import {defaults} from '@mwa/appearance';

const embedded=window.self!==window.top;
if(embedded){document.documentElement.dataset.mwaEmbedded='true';document.documentElement.dataset.mwaView=new URLSearchParams(window.location.search).get('view')||'calendar';}
if(!embedded && import.meta.env.PROD){
 const route=new URLSearchParams(window.location.search).get('view')==='islamic-events'?'/islamic-events/':'/calendar/';
 window.location.replace(defaults.websiteUrl+route+window.location.search+window.location.hash);
}else ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
