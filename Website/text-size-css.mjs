import postcss from 'postcss';

// Scale declared text sizes, not boxes, icons, spacing or the browser viewport.
// Relative em/% sizes inherit the already-scaled parent. Keep rem's root stable.
export function textSizeCss(){return {postcssPlugin:'mwa-text-size',Declaration(decl){
 if(decl.value.includes('--mwa-text-scale'))return;
 for(let parent=decl.parent;parent;parent=parent.parent){if(parent.type==='atrule'&&parent.name==='media'&&/\bprint\b/.test(parent.params))return;}
 if(decl.parent.type==='rule'&&/(?:^|,)\s*(?:html|:root)\s*(?:,|$)/.test(decl.parent.selector)&&decl.prop==='font-size')return;
 const scale=value=>`calc((${value}) * var(--mwa-text-scale, 1))`;
 if(['font-size','line-height'].includes(decl.prop)&&(/(?:px|rem|vw|vh|vmin|vmax)\b/.test(decl.value)||(decl.prop==='font-size'&&/^var\(/.test(decl.value)))){decl.value=scale(decl.value);}
 else if(decl.prop==='font'){decl.value=decl.value.replace(/(^|\s)(\d*\.?\d+(?:px|rem|vw|vh|vmin|vmax))(?=\s|\/|$)/,(_match,space,size)=>space+scale(size));}
}};}
export function textSizeHtml(){return {name:'mwa-inline-text-size',transformIndexHtml:{order:'pre',async handler(html){const parts=[...html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)];for(const part of parts){const result=await postcss([textSizeCss()]).process(part[2],{from:undefined});html=html.replace(part[0],`<style${part[1]}>${result.css}</style>`);}return html;}}};}
