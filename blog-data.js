/* Shared data rules for the static blog. No network or browser storage here. */
(function(root) {
'use strict';
const categories = ['题解','算法笔记','生活随记'];
function fileFor(id) {
  const safe = /^[a-zA-Z0-9_-]+$/.test(id) ? id : 'u-' + Array.from(new TextEncoder().encode(id), b=>b.toString(16).padStart(2,'0')).join('');
  return 'posts/' + safe + '.md';
}
function validate(data) {
  if (!Array.isArray(data) || data.length > 5000) throw new Error('文章列表必须是数组，最多 5000 篇');
  const ids=new Set(), files=new Set();
  return data.map(p=>{
    if (!p || typeof p.id!=='string' || !p.id || ids.has(p.id) || typeof p.title!=='string' || !categories.includes(p.category) || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !Number.isFinite(Date.parse(p.date))) throw new Error('文章格式错误、日期无效或 ID 重复');
    const hasBody=typeof p.content==='string';
    const file=p.file || (hasBody ? fileFor(p.id) : '');
    if (!/^posts\/[a-zA-Z0-9_-]+\.md$/.test(file) || files.has(file)) throw new Error('文章文件路径无效或重复');
    if (!hasBody && (!Number.isSafeInteger(p.length) || p.length<0)) throw new Error('文章索引缺少有效的字数');
    ids.add(p.id);files.add(file);
    const out={id:p.id,title:p.title,category:p.category,date:p.date,excerpt:String(p.excerpt||''),file,length:hasBody?p.content.length:p.length};
    if (p.revision && /^[a-f0-9]{64}$/.test(p.revision)) out.revision=p.revision;
    if (hasBody) out.content=p.content;
    return out;
  });
}
function metadata(p) {
  const out={id:p.id,title:p.title,category:p.category,date:p.date,excerpt:p.excerpt || excerpt(p.content||''),file:p.file||fileFor(p.id),length:typeof p.content==='string'?p.content.length:p.length};
  if(p.revision)out.revision=p.revision;
  return out;
}
function excerpt(body) { return body.replace(/```[\s\S]*?```/g,'').replace(/[#*>`$]/g,'').replace(/\s+/g,' ').trim().slice(0,140); }
function same(a,b) { return !!a && !!b && JSON.stringify(metadata(a))===JSON.stringify(metadata(b)); }
async function revision(body) {
  if(!crypto.subtle){if(typeof root.sha256==='function')return root.sha256(body);throw new Error('正文校验组件未加载，请刷新页面');}
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body));
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
root.BlogData={fileFor,validate,metadata,excerpt,same,revision};
if(typeof module!=='undefined')module.exports=root.BlogData;
})(typeof window==='undefined'?globalThis:window);
