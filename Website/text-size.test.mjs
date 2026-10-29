import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {textSizeCss} from './text-size-css.mjs';
import {normaliseTextSize} from './shared/text-size.js';
test('stored text preferences stay within the supported steps',()=>{assert.deepEqual([undefined,90,100,104,108,500,'bad'].map(normaliseTextSize),[100,100,100,105,110,110,100]);});
test('text scaling leaves layout dimensions and relative inherited sizes unchanged',async()=>{const out=(await postcss([textSizeCss()]).process('html{font-size:16px}.copy{font-size:14px;line-height:20px;width:250px;padding:12px}.child{font-size:1.2em}.title{font:600 24px/1.3 sans-serif}',{from:undefined})).css;assert.match(out,/html\{font-size:16px\}/);assert.match(out,/font-size:calc\(\(14px\) \* var\(--mwa-text-scale, 1\)\)/);assert.match(out,/width:250px;padding:12px/);assert.match(out,/font-size:1.2em/);assert.match(out,/font:600 calc\(\(24px\)/);});
test('processing twice does not compound scaling and printed documents remain unchanged',async()=>{const css='.copy{font-size:clamp(16px,2vw,24px)}@media print{.copy{font-size:14px}}';const first=(await postcss([textSizeCss()]).process(css,{from:undefined})).css;const second=(await postcss([textSizeCss()]).process(first,{from:undefined})).css;assert.equal(first,second);assert.match(first,/@media print\{\.copy\{font-size:14px\}\}/);});
