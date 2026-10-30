import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=await build({entryPoints:[path.resolve(root,'../Centralised Calendar/src/components/AdminTeam.jsx')],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external',plugins:[{name:'test-session',setup(b){
 b.onResolve({filter:/contexts\/AuthContext\.jsx$/},()=>({path:'auth',namespace:'fixture'}));
 b.onResolve({filter:/services\/adminTeamService\.js$/},()=>({path:'service',namespace:'fixture'}));
 b.onResolve({filter:/^@mwa\/access$/},()=>({path:path.resolve(root,'shared/module-access.js')}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path:p})=>({contents:p==='auth'?`export const OWNER_EMAIL='admin@muhammadiwelfare.org.au';export const useAuth=()=>globalThis.__teamRenderSession;`:`export const watchAdminTeam=()=>()=>{};export const addAdminEmail=()=>{};export const removeAdminEmail=()=>{};export const setAdminModules=()=>{};`,loader:'js'}));
}}]});
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);const Team=module.exports.default;
test('Admin Team renders owner controls without crashing',()=>{globalThis.__teamRenderSession={isOwner:true};const html=renderToStaticMarkup(React.createElement(Team,{currentEmail:'admin@muhammadiwelfare.org.au',canManage:true}));assert.match(html,/Add team member/);assert.match(html,/Module access/);});
test('read-only or signed-out session cannot render owner controls',()=>{for(const [isOwner,canManage]of [[false,true],[true,false],[false,false]]){globalThis.__teamRenderSession={isOwner};const html=renderToStaticMarkup(React.createElement(Team,{currentEmail:'member@example.invalid',canManage}));assert.doesNotMatch(html,/Add team member/);assert.match(html,/Module access/);}delete globalThis.__teamRenderSession;});
