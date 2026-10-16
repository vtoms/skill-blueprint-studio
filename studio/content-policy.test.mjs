import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddedCode} from './skill-model.mjs';

test('English prose may name a quoted tag without allowing source blocks, attributes or tag bodies',()=>{
 for(const prose of ['Do not emit `<script>` tags.','Describe the purpose of `</div>` in English.','Use the configured operation.'])assert.equal(embeddedCode(prose),false,prose);
 for(const source of ['<div>Actual markup</div>','`<script>alert(1)</script>`','`<script src="file.js">`','```html\n<div>content</div>\n```','> ```python\n> print(1)\n> ```','<iframe src="x">'])assert.equal(embeddedCode(source),true,source);
});
