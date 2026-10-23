'use strict';
const REPO = 'https://github.com/j23wuyifan/j23wuyifan.github.io';
const KEY = 'wyf-blog-workspace-v2';
const OLD_KEY = 'wyf-blog-workspace-v1';
const D = BlogData;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let posts = [], workspace = null, selected = null, filter = '全部', query = '', toastTimer, removed = [], selecting = 0, exporting = false, downloadURL = null;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200); }
function renderMarkdown(target, text) {
  if (!window.marked || !window.DOMPurify) { target.textContent = text; return; }
  const maths = [];
  const protectedText = text.replace(/(```[\s\S]*?```|`[^`\n]+`)|(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (all, code, math) => {
    if (code) return code;
    const index = maths.push(math) - 1; return `WYFMATHTOKEN${index}END`;
  });
  let html = marked.parse(protectedText, {gfm:true,breaks:false});
  html = html.replace(/WYFMATHTOKEN(\d+)END/g, (_, n) => {
    const raw = maths[Number(n)];
    if (typeof raw !== 'string') return 'WYFMATHTOKEN' + n + 'END';
    if (!window.katex) return esc(raw);
    const block = raw.startsWith('$$');
    try { return katex.renderToString(raw.slice(block ? 2 : 1, block ? -2 : -1), {displayMode:block,throwOnError:false,trust:false,strict:'ignore'}); } catch { return esc(raw); }
  });
  target.innerHTML = DOMPurify.sanitize(html, {ADD_TAGS:['annotation','semantics'], ADD_ATTR:['xmlns','encoding'], FORBID_TAGS:['style','iframe','form','input','button']});
  target.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
}
const validate = D.validate;
async function readIndex() {
  const response=await fetch('posts.json',{cache:'no-cache'});
  if(!response.ok)throw new Error('无法读取 posts.json：HTTP '+response.status);
  return validate(await response.json());
}
async function bodyOf(p) {
  if(typeof p.content==='string')return p.content;
  const response=await fetch(p.file,{cache:'no-cache'});
  if(!response.ok)throw new Error('正文 '+p.file+' 加载失败：HTTP '+response.status+'。请确认 Markdown 文件已上传。');
  const text=await response.text();
  // A custom 404 page can be returned with status 200 by some static hosts.
  if(/^\s*<!doctype html/i.test(text) && /<title[^>]*>.*404/i.test(text))throw new Error('正文文件不存在，请上传 '+p.file);
  return text;
}
function sorted(data) { return [...data].sort((a,b) => b.date.localeCompare(a.date)); }
function minutes(p) { return Math.max(1,Math.ceil(p.length / 500)); }
function meta(p) { return `<span class="tag ${p.category === '生活随记' ? 'life' : ''}">${esc(p.category)}</span><time datetime="${esc(p.date)}">${esc(p.date.replaceAll('-',' / '))}</time><span>约 ${minutes(p)} 分钟</span>`; }
function postURL(p) { return '#/post/' + encodeURIComponent(p.id); }
function listPosts() {
  const list = sorted(posts).filter(p => (filter === '全部' || p.category === filter) && (p.title + ' ' + p.excerpt).toLowerCase().includes(query.toLowerCase()));
  $('#count').textContent = `${list.length} 篇记录`;
  $('#post-list').innerHTML = list.length ? list.map(p => `<article class="post-card"><div class="post-meta">${meta(p)}</div><h3><a href="${postURL(p)}">${esc(p.title)}</a></h3><p>${esc(p.excerpt || '点击阅读这篇记录。')}</p><div class="post-bottom"><span>${p.length.toLocaleString()} 字符 · ${esc(p.category)}</span><a href="${postURL(p)}">阅读全文 <span aria-hidden="true">→</span></a></div></article>`).join('') : '<p class="empty">这里还没有记录，换个关键词试试吧。</p>';
}
function home() {
  $('#app').replaceChildren($('#home-template').content.cloneNode(true));
  $('#post-count').textContent = posts.length;
  $('#filters').innerHTML = ['全部','题解','算法笔记','生活随记'].map(t => `<button class="${filter === t ? 'selected' : ''}" data-filter="${t}">${t}</button>`).join('');
  $('#filters').onclick = e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.filter; $('#filters').querySelectorAll('button').forEach(x => x.classList.toggle('selected', x === b)); listPosts(); };
  $('#search').value = query; $('#search').oninput = e => { query = e.target.value; listPosts(); }; listPosts();
}
async function article(id) {
  const p=posts.find(p=>p.id===id);
  if(!p){$('#app').innerHTML='<section class="page"><h1>没有找到这篇文章</h1><a class="back" href="#/">← 回到首页</a></section>';return;}
  document.title=p.title+' · wyf 的博客';
  $('#app').innerHTML=`<section class="page"><a class="back" href="#/">← 所有记录</a><article class="card reading"><div class="post-meta">${meta(p)}</div><h1>${esc(p.title)}</h1><div class="prose" id="article-body">正在加载文章…</div></article><p class="subtle">写作没有终点，思考也是。</p></section>`;
  const target=$('#article-body');
  try{const body=await bodyOf(p);if(target.isConnected)renderMarkdown(target,body);}
  catch(e){if(target.isConnected){target.textContent=e.message;const retry=document.createElement('button');retry.className='btn';retry.textContent='重新加载';retry.onclick=()=>article(id);target.append(document.createElement('br'),retry);}}
}
function archive() {
  $('#app').innerHTML = `<section class="page"><p class="eyebrow purple">THE ARCHIVE</p><h1>把日子，写成记录。</h1><p class="subtle">共 ${posts.length} 篇文章，慢慢积累。</p><section class="card reading">${sorted(posts).map(p => `<div class="archive-row"><time>${esc(p.date)}</time><a href="${postURL(p)}">${esc(p.title)}</a><span class="tag">${esc(p.category)}</span></div>`).join('') || '<p>还没有文章。</p>'}</section></section>`;
}
function about() {
  $('#app').innerHTML = `<section class="page"><p class="eyebrow purple">A LITTLE ABOUT ME</p><h1>你好，我是 wyf。</h1><section class="reading card prose"><p>这里是我的个人博客，用来记录算法、题解与学习生活。</p><p>想把那些绕了很久才想明白的问题，写成以后还能看懂的文字。也想在代码之外，留下一点生活的风景。</p><h2>在这里，你会看到</h2><ul><li>题解：从问题出发，把思路讲清楚。</li><li>算法笔记：记下推导、证明和实现细节。</li><li>生活随记：学习之外，也有值得收藏的日常。</li></ul><p><a href="https://github.com/j23wuyifan" target="_blank" rel="noopener">在 GitHub 找到我 ↗</a></p><blockquote>愿每一次记录，都能让下一次出发更轻松。</blockquote></section></section>`;
}
function today() { return new Date().toLocaleDateString('sv-SE'); }
function persist() {
  try{localStorage.setItem(KEY,JSON.stringify({version:2,posts:workspace,removed}));if($('#save-status'))$('#save-status').textContent='已保存到当前浏览器 · '+new Date().toLocaleTimeString();return true;}
  catch{if($('#save-status'))$('#save-status').textContent='保存失败，请立即备份';toast('浏览器存储不可用或空间已满，请备份草稿');return false;}
}
function reconcile(latest) {
  const live=new Map(latest.map(p=>[p.id,p]));
  const excluded=new Set(removed.map(p=>p.id));
  workspace=workspace.map(p=>{
    const remote=live.get(p.id);live.delete(p.id);
    if(!p.dirty)return remote?{...remote,include:true,dirty:false,base:D.metadata(remote)}:null;
    if(p.include && D.same(p,remote))return {...p,dirty:false,base:D.metadata(remote)};
    return p;
  }).filter(Boolean);
  for(const p of live.values())if(!excluded.has(p.id))workspace.push({...p,include:true,dirty:typeof p.content==='string',base:D.metadata(p)});
  removed=removed.filter(p=>latest.some(x=>x.id===p.id));
}
function loadWorkspace() {
  if(workspace)return;
  try{
    const raw=localStorage.getItem(KEY),old=raw?null:localStorage.getItem(OLD_KEY);
    if(raw||old){
      const stored=JSON.parse(raw||old),clean=validate(stored.posts);
      workspace=clean.map((p,i)=>({...p,include:stored.posts[i].include===true,dirty:old?true:stored.posts[i].dirty===true,base:stored.posts[i].base || (posts.find(x=>x.id===p.id)?D.metadata(posts.find(x=>x.id===p.id)):null)}));
      removed=Array.isArray(stored.removed)?stored.removed.filter(p=>p && typeof p.id==='string'):[];
    }
  }catch{toast('本地草稿无法读取，旧数据仍保留；请使用旧版备份恢复。');}
  if(!workspace)workspace=posts.map(p=>({...p,include:true,dirty:typeof p.content==='string',base:D.metadata(p)}));
  reconcile(posts);
}
function download(name,data,type='application/json') {
  if(downloadURL)URL.revokeObjectURL(downloadURL);
  downloadURL=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));
  const a=document.createElement('a');a.href=downloadURL;a.download=name;a.className='btn primary';a.textContent='下载 '+name;
  const ready=$('#download-ready');
  if(ready){ready.replaceChildren(document.createTextNode('文件已准备好，点击保存： '),a);ready.hidden=false;}
  else{document.body.append(a);a.click();a.remove();}
}
function current(){return workspace.find(p=>p.id===selected);}
function draftList(){
  $('#drafts').innerHTML=workspace.map(p=>`<button class="draft-item ${p.id===selected?'active':''}" data-id="${esc(p.id)}">${esc(p.title||'未命名草稿')}<br><small>${p.include?(p.dirty?'待发布更新':'已发布'):'仅本地草稿'}</small></button>`).join('')||'<span class="subtle">点击「新建文章」开始</span>';
}
async function selectDraft(id){
  const token=++selecting;selected=id;const p=current();draftList();
  ['title','date','category','excerpt'].forEach(k=>$('#'+k).value=p?p[k]:'');
  $('#content').value='';$('#include').checked=!!p?.include;$('#editor-fields').disabled=true;$('#remove').disabled=!p;$('#export-md').disabled=true;
  const preview=$('#preview');preview.textContent=p?'正在加载正文…':'点击「新建文章」，开始你的第一篇记录。';
  if(!p)return;
  try{
    p.content=await bodyOf(p);
    if(token!==selecting||!preview.isConnected)return;
    $('#content').value=p.content;$('#editor-fields').disabled=false;$('#export-md').disabled=false;renderMarkdown(preview,p.content);
  }catch(e){if(token===selecting&&preview.isConnected){preview.textContent=e.message;const retry=document.createElement('button');retry.className='btn';retry.textContent='重试加载正文';retry.onclick=()=>selectDraft(id);preview.append(document.createElement('br'),retry);}}
}
function syncConflicts(latest){
  for(const p of workspace){const remote=latest.find(x=>x.id===p.id);if(p.dirty&&p.base&&!D.same(remote,p.base)&&!D.same(remote,p))return p.title;}
  for(const p of removed){const remote=latest.find(x=>x.id===p.id);if(remote&&!D.same(remote,p.base))return p.base?.title||p.id;}
  return null;
}
async function exportPosts(){
  if(exporting)return;exporting=true;$('#export-posts').disabled=true;$('#editor-fields').disabled=true;
  ['new-post','import-posts','remove','export-md','backup'].forEach(id=>$('#'+id).disabled=true);
  try{
    if(!window.JSZip)throw new Error('压缩组件未加载，请刷新页面');
    const latest=await readIndex(),conflict=syncConflicts(latest);
    if(conflict)throw new Error('「'+conflict+'」在网站上已变化。请先备份，再导入最新索引或合并冲突后导出，避免覆盖其他设备的修改。');
    reconcile(latest);
    const zip=new JSZip(),index=[];let changed=0;
    for(const p of workspace.filter(p=>p.include)){
      if(!p.title.trim())throw new Error('选入发布的文章需要填写标题');
      if(p.dirty||typeof latest.find(x=>x.id===p.id)?.content==='string'||!latest.some(x=>x.id===p.id)){
        p.content=await bodyOf(p);p.length=p.content.length;p.file=p.file||D.fileFor(p.id);p.excerpt=p.excerpt||D.excerpt(p.content);p.revision=await D.revision(p.content);
        const remote=latest.find(x=>x.id===p.id);
        if(!D.same(p,remote)||typeof remote?.content==='string'){zip.file(p.file,p.content);changed++;}
        else{p.dirty=false;p.base=D.metadata(remote);}
      }
      index.push(D.metadata(p));
    }
    validate(index);
    zip.file('posts.json',JSON.stringify(index,null,2)+'\n');
    zip.file('发布说明.txt','把压缩包解压，将 posts.json 和 posts 文件夹一起上传到 GitHub 仓库根目录，再提交。\nposts 文件夹只含新增、修改的正文，不要删除仓库里已有的其他文章。\n如果包内只有 posts.json，说明此次只更新索引。\n确认部署完成后刷新写作页，状态会变为已发布。\n');
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    persist();draftList();download('blog-update.zip',blob);toast('更新包已准备好：轻量索引 + '+changed+' 篇新增或修改的正文，请点击下载链接保存');
  }catch(e){toast(e.message);}
  finally{exporting=false;if($('#export-posts')){['export-posts','new-post','import-posts','backup'].forEach(id=>$('#'+id).disabled=false);selectDraft(selected);}}
}
async function backup(){
  try{
    const data=[];for(const p of workspace)data.push({...p,content:await bodyOf(p)});
    download('wyf-backup-'+today()+'.json',JSON.stringify({version:2,posts:data,removed},null,2));toast('完整备份已准备好，请点击下载链接保存；其中包含未发布草稿');
  }catch(e){toast('备份未完成：'+e.message);}
}
function editor(){
  loadWorkspace();
  $('#app').innerHTML=`<section class="page wide"><div class="editor-heading"><div><p class="eyebrow purple">A SPACE FOR YOUR THOUGHTS</p><h1>写下今天的灵感。</h1><p class="subtle">每篇文章一个 Markdown 文件 · 打开时才加载正文</p></div><div class="actions"><button class="btn" id="new-post">＋ 新建文章</button><button class="btn" id="import-posts">导入 / 恢复</button><button class="btn primary" id="export-posts">导出发布更新包 ↗</button></div></div><div id="download-ready" class="notice" role="status" hidden></div><div class="notice">草稿自动保存在当前浏览器。发布时导出更新包，解压后将 posts.json 和 posts 文件夹一起上传到仓库根目录。更新包只包含轻量索引和新增、修改的正文，不会重复打包全部文章。</div><div class="editor-layout"><aside class="card draft-list" id="drafts" style="display:block"></aside><div><fieldset id="editor-fields" style="border:0;padding:0;margin:0;min-width:0"><div class="fields"><input class="title-input" id="title" aria-label="文章标题" placeholder="给文章起个名字…"><select id="category" aria-label="文章分类"><option>题解</option><option>算法笔记</option><option>生活随记</option></select><input type="date" id="date" aria-label="文章日期" required></div><div class="fields"><input id="excerpt" style="width:100%" placeholder="文章摘要（可选，发布时自动摘取正文）" aria-label="文章摘要"></div><div class="editor-split"><section class="editor-panel"><div class="panel-label"><span>MARKDOWN / 正文</span><span>支持代码与 LaTeX</span></div><textarea id="content" aria-label="Markdown 正文" spellcheck="false" placeholder="## 从这里开始…"></textarea></section><section class="editor-panel"><div class="panel-label">LIVE PREVIEW / 实时预览</div><div class="prose" id="preview"></div></section></div><label class="subtle"><input type="checkbox" id="include"> 选入发布（取消勾选后，下次提交索引时从公开列表移除）</label></fieldset><div class="editor-footer"><span class="subtle" id="save-status">草稿只保存在此浏览器，不会自动同步设备</span><div class="actions"><button class="btn" id="export-md">导出 .md</button><button class="btn danger" id="remove">删除文章</button></div></div></div></div><details class="card help"><summary>查看写作、升级和发布方法</summary><ol><li>新建文章并填写标题、分类与正文。已有文章只有在点开时才读取对应 Markdown 文件。</li><li>用三个反引号加 cpp 写代码块，<code>$公式$</code> 写行内公式，<code>$$公式$$</code> 写块公式。</li><li>勾选要公开的文章，点击「导出发布更新包」，再点击出现的下载链接保存。已发布文章保持勾选。包内 <code>posts.json</code> 仅包含标题、日期、摘要等索引；<code>posts/</code> 只包含新增、修改过的正文。</li><li>解压更新包，打开 <a href="${REPO}/upload/main" target="_blank" rel="noopener">GitHub 上传页面 ↗</a>，将 <code>posts.json</code> 和 <code>posts</code> 文件夹一起上传到仓库根目录并提交。不要只上传 ZIP，也不要删除已有的其他正文文件。</li><li>部署完成后刷新写作页，已提交的文章会自动显示为「已发布」；尚未提交的修改仍会保留在下次更新包里。</li><li>删除或取消选入文章后，提交新索引会隐藏文章；仓库中的旧 Markdown 文件仍保留，需要彻底移除时请在仓库中单独删除。</li><li>旧版完整 posts.json 和旧草稿备份可以导入，并转换成单独的 Markdown 文件。新版索引导入后会从当前网站加载正文。</li><li>换设备或清理浏览器数据前，请备份全部草稿。备份包含所有正文和未发布内容，不要上传到公开仓库。其他访客只能编辑自己的浏览器副本。</li></ol><div class="actions"><button class="btn" id="backup">备份全部草稿</button><a class="btn" href="${REPO}" target="_blank" rel="noopener">打开仓库 ↗</a></div></details><input type="file" id="import-file" accept=".json,application/json" hidden></section>`;
  $('#drafts').onclick=e=>{const b=e.target.closest('[data-id]');if(b&&!exporting)selectDraft(b.dataset.id);};
  $('#new-post').onclick=()=>{const id=today().replaceAll('-','')+'-'+Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');const p={id,title:'',date:today(),category:'题解',excerpt:'',file:D.fileFor(id),length:0,content:'## 思路\n\n从这里开始记录你的想法。\n\n## 代码\n\n```cpp\n#include<bits/stdc++.h>\nusing namespace std;\nsigned main()\n{\n    return 0;\n}\n```\n',include:false,dirty:true,base:null};workspace.unshift(p);persist();selectDraft(p.id);};
  $('#editor-fields').oninput=()=>{const p=current();if(!p)return;['title','date','category','content','excerpt'].forEach(k=>p[k]=$('#'+k).value);p.include=$('#include').checked;p.length=p.content.length;p.dirty=true;delete p.revision;renderMarkdown($('#preview'),p.content);draftList();persist();};
  $('#content').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();e.target.setRangeText('    ',e.target.selectionStart,e.target.selectionEnd,'end');e.target.dispatchEvent(new Event('input',{bubbles:true}));}};
  $('#export-posts').onclick=exportPosts;
  $('#export-md').onclick=()=>{const p=current();if(p&&typeof p.content==='string')download(p.file.split('/').pop(),p.content,'text/markdown;charset=utf-8');};
  $('#remove').onclick=()=>{const p=current();if(!p||!confirm('删除「'+(p.title||'未命名草稿')+'」的本地副本？网站会在提交新索引后隐藏此文章。'))return;if(p.base)removed.push({id:p.id,base:p.base});workspace=workspace.filter(x=>x.id!==p.id);persist();selectDraft(workspace[0]?.id);};
  $('#backup').onclick=backup;$('#import-posts').onclick=()=>$('#import-file').click();
  $('#import-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{const raw=JSON.parse(await file.text()),isBackup=!Array.isArray(raw),source=isBackup?raw.posts:raw,clean=validate(source);
      if(!confirm('导入会替换当前本地文章列表。请先备份未发布草稿。继续吗？'))return;
      workspace=clean.map((p,i)=>({...p,include:isBackup?source[i].include===true:true,dirty:typeof p.content==='string'||(isBackup&&source[i].dirty===true),base:isBackup?source[i].base||null:(posts.find(x=>x.id===p.id)?D.metadata(posts.find(x=>x.id===p.id)):null)}));
      removed=isBackup&&Array.isArray(raw.removed)?raw.removed:posts.filter(p=>!workspace.some(x=>x.id===p.id)).map(p=>({id:p.id,base:D.metadata(p)}));
      persist();selectDraft(workspace[0]?.id);toast('已导入本地写作区，公开网站未改变');
    }catch(err){toast('导入失败：'+err.message);}finally{e.target.value='';}
  };
  selectDraft(workspace.some(p=>p.id===selected)?selected:workspace[0]?.id);
}
function route() {
  document.title='wyf 的博客 · 记录与热爱';
  const hash=location.hash || '#/';
  const page=hash.split('/')[1] || 'home';
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===page));
  if (hash==='#articles') { home(); requestAnimationFrame(()=>$('#articles').scrollIntoView());return; }
  if(page==='write')editor();else if(page==='archive')archive();else if(page==='about')about();else if(page==='post'){try{article(decodeURIComponent(hash.slice(7)));}catch{article('');}}else home();
  window.scrollTo(0,0);
}
async function init() {
  try { posts=await readIndex(); }
  catch(e){ $('#app').innerHTML='<section class="page"><h1>文章数据暂时无法读取</h1><p>请通过网站地址访问，并确认仓库根目录存在 posts.json。直接双击 HTML 可能无法读取文章。</p><p class="subtle">'+esc(e.message)+'</p></section>';return; }
  route();window.addEventListener('hashchange',route);
}
init();
