'use strict';
const REPO = 'https://github.com/j23wuyifan/j23wuyifan.github.io';
const KEY = 'wyf-blog-workspace-v1';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let posts = [], workspace = null, selected = null, filter = '全部', query = '', toastTimer;
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
function validate(data) {
  if (!Array.isArray(data) || data.length > 5000) throw new Error('文章数据必须是数组，最多 5000 篇');
  const ids = new Set();
  return data.map(p => {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.title !== 'string' || typeof p.content !== 'string' || !['题解','算法笔记','生活随记'].includes(p.category) || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !Number.isFinite(Date.parse(p.date))) throw new Error('文章格式错误、日期无效或 ID 重复');
    ids.add(p.id); return {id:p.id,title:p.title,category:p.category,date:p.date,excerpt:String(p.excerpt || ''),content:p.content};
  });
}
function sorted(data) { return [...data].sort((a,b) => b.date.localeCompare(a.date)); }
function minutes(p) { return Math.max(1,Math.ceil(p.content.length / 500)); }
function meta(p) { return `<span class="tag ${p.category === '生活随记' ? 'life' : ''}">${esc(p.category)}</span><time datetime="${esc(p.date)}">${esc(p.date.replaceAll('-',' / '))}</time><span>约 ${minutes(p)} 分钟</span>`; }
function postURL(p) { return '#/post/' + encodeURIComponent(p.id); }
function listPosts() {
  const list = sorted(posts).filter(p => (filter === '全部' || p.category === filter) && (p.title + p.content).toLowerCase().includes(query.toLowerCase()));
  $('#count').textContent = `${list.length} 篇记录`;
  $('#post-list').innerHTML = list.length ? list.map(p => `<article class="post-card"><div class="post-meta">${meta(p)}</div><h3><a href="${postURL(p)}">${esc(p.title)}</a></h3><p>${esc(p.excerpt || p.content.replace(/[#*`>$]/g,'').slice(0,110))}</p><div class="post-bottom"><span>${p.content.length.toLocaleString()} 字符 · ${esc(p.category)}</span><a href="${postURL(p)}">阅读全文 <span aria-hidden="true">→</span></a></div></article>`).join('') : '<p class="empty">这里还没有记录，换个关键词试试吧。</p>';
}
function home() {
  $('#app').replaceChildren($('#home-template').content.cloneNode(true));
  $('#post-count').textContent = posts.length;
  $('#filters').innerHTML = ['全部','题解','算法笔记','生活随记'].map(t => `<button class="${filter === t ? 'selected' : ''}" data-filter="${t}">${t}</button>`).join('');
  $('#filters').onclick = e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.filter; $('#filters').querySelectorAll('button').forEach(x => x.classList.toggle('selected', x === b)); listPosts(); };
  $('#search').value = query; $('#search').oninput = e => { query = e.target.value; listPosts(); }; listPosts();
}
function article(id) {
  const p = posts.find(p => p.id === id);
  if (!p) { $('#app').innerHTML = '<section class="page"><h1>没有找到这篇文章</h1><a class="back" href="#/">← 回到首页</a></section>'; return; }
  document.title = p.title + ' · wyf 的博客';
  $('#app').innerHTML = `<section class="page"><a class="back" href="#/">← 所有记录</a><article class="card reading"><div class="post-meta">${meta(p)}</div><h1>${esc(p.title)}</h1><div class="prose" id="article-body"></div></article><p class="subtle">写作没有终点，思考也是。</p></section>`;
  renderMarkdown($('#article-body'), p.content);
}
function archive() {
  $('#app').innerHTML = `<section class="page"><p class="eyebrow purple">THE ARCHIVE</p><h1>把日子，写成记录。</h1><p class="subtle">共 ${posts.length} 篇文章，慢慢积累。</p><section class="card reading">${sorted(posts).map(p => `<div class="archive-row"><time>${esc(p.date)}</time><a href="${postURL(p)}">${esc(p.title)}</a><span class="tag">${esc(p.category)}</span></div>`).join('') || '<p>还没有文章。</p>'}</section></section>`;
}
function about() {
  $('#app').innerHTML = `<section class="page"><p class="eyebrow purple">A LITTLE ABOUT ME</p><h1>你好，我是 wyf。</h1><section class="reading card prose"><p>这里是我的个人博客，用来记录算法、题解与学习生活。</p><p>想把那些绕了很久才想明白的问题，写成以后还能看懂的文字。也想在代码之外，留下一点生活的风景。</p><h2>在这里，你会看到</h2><ul><li>题解：从问题出发，把思路讲清楚。</li><li>算法笔记：记下推导、证明和实现细节。</li><li>生活随记：学习之外，也有值得收藏的日常。</li></ul><p><a href="https://github.com/j23wuyifan" target="_blank" rel="noopener">在 GitHub 找到我 ↗</a></p><blockquote>愿每一次记录，都能让下一次出发更轻松。</blockquote></section></section>`;
}
function today() { return new Date().toLocaleDateString('sv-SE'); }
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({version:1, posts:workspace})); if ($('#save-status')) $('#save-status').textContent = '已保存到当前浏览器 · ' + new Date().toLocaleTimeString(); return true; }
  catch { if ($('#save-status')) $('#save-status').textContent = '保存失败，请立即导出备份'; toast('浏览器存储不可用或空间已满，请导出备份'); return false; }
}
function loadWorkspace() {
  if (workspace) return;
  try { const raw = localStorage.getItem(KEY); if (raw) { const stored = JSON.parse(raw); const clean = validate(stored.posts); workspace = clean.map((p,i) => ({...p,include:stored.posts[i].include === true})); } }
  catch { toast('本地草稿读取失败，原数据未覆盖。请先导出原始备份。'); }
  if (!workspace) workspace = posts.map(p => ({...p,include:true}));
}
function download(name, text, type='application/json') {
  const url = URL.createObjectURL(new Blob([text], {type})); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function current() { return workspace.find(p => p.id === selected); }
function draftList() {
  $('#drafts').innerHTML = workspace.map(p => `<button class="draft-item ${p.id === selected ? 'active' : ''}" data-id="${esc(p.id)}">${esc(p.title || '未命名草稿')}<br><small>${p.include ? '已选入发布文件' : '仅本地草稿'}</small></button>`).join('') || '<span class="subtle">点击「新建文章」开始</span>';
}
function selectDraft(id) {
  selected = id; const p = current(); draftList();
  ['title','date','category','content','excerpt'].forEach(k => { $('#' + k).value = p ? p[k] : ''; });
  $('#include').checked = !!p?.include;
  $('#editor-fields').disabled = !p;
  $('#remove').disabled = !p; $('#export-md').disabled = !p;
  renderMarkdown($('#preview'), p ? p.content : '点击「新建文章」，开始你的第一篇记录。');
}
function exportPosts() {
  const included = workspace.filter(p => p.include);
  if (included.some(p => !p.title.trim())) { toast('选入发布文件的文章需要填写标题'); return; }
  let clean; try { clean = validate(included); } catch(e) { toast(e.message); return; }
  download('posts.json', JSON.stringify(clean,null,2) + '\n'); toast(`已导出 ${clean.length} 篇文章；上传到 GitHub 后才会公开更新`);
}
function editor() {
  loadWorkspace();
  $('#app').innerHTML = `<section class="page wide"><div class="editor-heading"><div><p class="eyebrow purple">A SPACE FOR YOUR THOUGHTS</p><h1>写下今天的灵感。</h1><p class="subtle">Markdown 写作空间 · 代码与公式，都可以认真记录</p></div><div class="actions"><button class="btn" id="new-post">＋ 新建文章</button><button class="btn" id="import-posts">导入文章</button><button class="btn primary" id="export-posts">导出发布文件 ↗</button></div></div><div class="notice">草稿仅保存在当前浏览器，不会自动公开，也不会同步设备。勾选「选入发布文件」，导出 posts.json 并提交到仓库，才能更新网站。所有访客都能使用此本地编辑器，但无法修改你的仓库。</div><div class="editor-layout"><aside class="card draft-list" id="drafts" style="display:block"></aside><div><fieldset id="editor-fields" style="border:0;padding:0;margin:0;min-width:0"><div class="fields"><input class="title-input" id="title" aria-label="文章标题" placeholder="给文章起个名字…"><select id="category" aria-label="文章分类"><option>题解</option><option>算法笔记</option><option>生活随记</option></select><input type="date" id="date" aria-label="文章日期" required></div><div class="fields"><input id="excerpt" style="width:100%" placeholder="文章摘要（可选，不填写则自动摘取正文）" aria-label="文章摘要"></div><div class="editor-split"><section class="editor-panel"><div class="panel-label"><span>MARKDOWN / 正文</span><span>支持代码与 LaTeX</span></div><textarea id="content" aria-label="Markdown 正文" spellcheck="false" placeholder="## 从这里开始…"></textarea></section><section class="editor-panel"><div class="panel-label">LIVE PREVIEW / 实时预览</div><div class="prose" id="preview"></div></section></div><label class="subtle"><input type="checkbox" id="include"> 选入发布文件（未勾选的文章仅作为本地草稿保留）</label></fieldset><div class="editor-footer"><span class="subtle" id="save-status">当前内容只保存在此浏览器</span><div class="actions"><button class="btn" id="export-md">导出 .md</button><button class="btn danger" id="remove">删除文章</button></div></div></div></div><details class="card help" id="publish-help"><summary>第一次写博客？查看写作与发布方法</summary><ol><li>点击「新建文章」，填写标题、分类和正文。修改会自动保存到当前浏览器。</li><li>Markdown：用 <code>## 标题</code> 写小标题，用三个反引号加 cpp 写代码块，用 <code>$公式$</code> 或 <code>$$公式$$</code> 写 LaTeX。</li><li>勾选要公开的文章，点击「导出发布文件」。文件包含所有选入的文章，包含已有文章；取消勾选后再次导出可将文章从公开列表移除。</li><li>打开 <a href="${REPO}/upload/main" target="_blank" rel="noopener">GitHub 上传页面 ↗</a>，将导出的 <code>posts.json</code> 上传到仓库根目录，点击 Commit changes。若默认分支不是 main，请在仓库切到实际分支再上传。</li><li>等 GitHub Pages 部署完成，刷新网站即可看到更新。此页面不需要也不会索取你的 GitHub 密码或令牌。</li><li>换设备前可导出本地完整备份（包含未发布草稿）；在另一台设备导入。清理浏览器数据会删除本地草稿。</li></ol><div class="actions"><button class="btn" id="backup">备份全部草稿</button><a class="btn" href="${REPO}" target="_blank" rel="noopener">打开仓库 ↗</a></div></details><input type="file" id="import-file" accept=".json,application/json" hidden></section>`;
  $('#drafts').onclick = e => { const b=e.target.closest('[data-id]'); if(b) selectDraft(b.dataset.id); };
  $('#new-post').onclick = () => { const p={id:crypto.randomUUID ? crypto.randomUUID() : 'post-' + Date.now(),title:'',date:today(),category:'题解',excerpt:'',content:'## 思路\n\n从这里开始记录你的想法。\n\n## 代码\n\n```cpp\n#include<bits/stdc++.h>\nusing namespace std;\nsigned main()\n{\n    return 0;\n}\n```\n',include:false}; workspace.unshift(p);persist();selectDraft(p.id);$('#title').focus(); };
  $('#editor-fields').oninput = () => { const p=current(); if(!p)return; ['title','date','category','content','excerpt'].forEach(k => p[k]=$('#'+k).value); p.include=$('#include').checked; renderMarkdown($('#preview'),p.content); draftList(); persist(); };
  $('#content').onkeydown = e => { if(e.key==='Tab') { e.preventDefault(); const el=e.target;el.setRangeText('    ',el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new Event('input',{bubbles:true})); } };
  $('#export-posts').onclick = exportPosts;
  $('#export-md').onclick = () => { const p=current(); if(p) download((p.title || '未命名文章').replace(/[\\/:*?"<>|]/g,'-')+'.md',p.content,'text/markdown;charset=utf-8'); };
  $('#remove').onclick = () => { const p=current(); if(!p || !confirm(`删除「${p.title || '未命名草稿'}」？此操作删除本地副本，网站需重新导出提交后更新。`))return; workspace=workspace.filter(x=>x.id!==p.id);persist();selectDraft(workspace[0]?.id); };
  $('#backup').onclick = () => download('wyf-backup-'+today()+'.json',JSON.stringify({version:1,posts:workspace},null,2));
  $('#import-posts').onclick = () => $('#import-file').click();
  $('#import-file').onchange = async e => { const file=e.target.files[0];if(!file)return; try { const raw=JSON.parse(await file.text()); const backup=!Array.isArray(raw); const source=backup?raw.posts:raw; const clean=validate(source); if(!confirm('导入将替换当前本地文章列表。请先备份尚未导出的草稿。继续吗？'))return; workspace=clean.map((p,i)=>({...p,include:backup?source[i].include===true:true})); persist();selectDraft(workspace[0]?.id);toast('已导入，仅更新本地写作区'); }catch(err){toast('导入失败：'+err.message);} e.target.value=''; };
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
  try { const response=await fetch('posts.json',{cache:'no-cache'}); if(!response.ok)throw new Error('HTTP '+response.status); posts=validate(await response.json()); }
  catch(e){ $('#app').innerHTML='<section class="page"><h1>文章数据暂时无法读取</h1><p>请通过网站地址访问，并确认仓库根目录存在 posts.json。直接双击 HTML 可能无法读取文章。</p><p class="subtle">'+esc(e.message)+'</p></section>';return; }
  route();window.addEventListener('hashchange',route);
}
init();
