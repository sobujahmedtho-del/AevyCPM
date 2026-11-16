(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Icons ---------- */
var ICON={
  dl:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 20h14"/></svg>',
  x:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg>'
};

/* ---------- Local storage ---------- */
var K={scripts:'aevy.scripts.v1',videos:'aevy.videos.v1',theme:'aevy.theme',author:'aevy.author'};
var store={
  get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){toast('Local storage is full or blocked');return false}}
};
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}

/* ---------- Languages and highlighting ---------- */
var C_SLASH=String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`;
var LANGS={
  javascript:{label:'JavaScript',ext:'js',color:'#e8c547',c:C_SLASH,bt:1,k:'const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof this null undefined true false of in yield'},
  typescript:{label:'TypeScript',ext:'ts',color:'#4a90d9',c:C_SLASH,bt:1,k:'const let var function return if else for while do switch case break continue new class extends implements interface type enum import export from default async await try catch finally throw typeof instanceof this null undefined true false of in readonly public private protected as keyof'},
  python:{label:'Python',ext:'py',color:'#5b9bd5',c:String.raw`#[^\n]*`,k:'def class return if elif else for while in not and or is import from as with try except finally raise pass break continue lambda yield None True False global nonlocal async await'},
  bash:{label:'Bash',ext:'sh',color:'#7bc96f',c:String.raw`#[^\n]*`,k:'if then else elif fi for while do done case esac function in return exit echo local export set unset readonly trap source cd test'},
  lua:{label:'Lua',ext:'lua',color:'#6a7fd8',c:String.raw`--[^\n]*`,k:'local function return if then else elseif end for while do repeat until break in and or not nil true false'},
  go:{label:'Go',ext:'go',color:'#4cc3d9',c:C_SLASH,bt:1,k:'package import func return if else for range switch case default break continue go defer chan select struct interface type map var const nil true false'},
  rust:{label:'Rust',ext:'rs',color:'#d98a5b',c:C_SLASH,k:'fn let mut pub use mod struct enum impl trait return if else for while loop match break continue as in ref self Self const static true false'},
  html:{label:'HTML',ext:'html',color:'#e5734f',c:String.raw`<!--[\s\S]*?-->`,k:''},
  css:{label:'CSS',ext:'css',color:'#8d72d8',c:String.raw`\/\*[\s\S]*?\*\/`,k:''},
  json:{label:'JSON',ext:'json',color:'#9aa3b2',c:null,k:'true false null'},
  text:{label:'Plain text',ext:'txt',color:'#7d8493',c:null,k:''}
};
var EXT={js:'javascript',mjs:'javascript',ts:'typescript',py:'python',sh:'bash',bash:'bash',lua:'lua',go:'go',rs:'rust',html:'html',htm:'html',css:'css',json:'json',txt:'text',md:'text'};
var reCache={};
function getRe(lang){
  if(reCache[lang])return reCache[lang];
  var L=LANGS[lang]||LANGS.text;
  var str=String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'`+(L.bt?'|`(?:\\\\.|[^`\\\\])*`':'');
  var kw=L.k?String.raw`\b(?:`+L.k.split(' ').join('|')+String.raw`)\b`:'(?!)';
  var src='('+(L.c||'(?!)')+')|('+str+')|('+String.raw`\b\d+(?:\.\d+)?\b`+')|('+kw+')';
  return (reCache[lang]=new RegExp(src,'g'));
}
function highlight(code,lang){
  if(lang==='text'||!code)return esc(code);
  var re=getRe(lang);re.lastIndex=0;
  var out='',last=0,m;
  while((m=re.exec(code))){
    if(m[0]==='')break;
    out+=esc(code.slice(last,m.index));
    out+='<span class="'+(m[1]?'tc':m[2]?'ts':m[3]?'tn':'tk')+'">'+esc(m[0])+'</span>';
    last=m.index+m[0].length;
  }
  return out+esc(code.slice(last));
}
function lineCount(s){return s?s.split('\n').length:0}
function langLabel(k){return (LANGS[k]||LANGS.text).label}
function langExt(k){return (LANGS[k]||LANGS.text).ext}
function langColor(k){return (LANGS[k]||LANGS.text).color}
function slug(s){return (s||'script').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'script'}
function fmtDate(t){try{return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(t))}catch(e){return ''}}
function byteLen(s){return new Blob([s]).size}
function fmtSize(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(n<10240?1:0)+' KB':(n/1048576).toFixed(1)+' MB'}
function fileNameOf(s){return slug(s.title)+'.'+langExt(s.lang)}
function uniqueNames(list){
  var seen={},map={};
  list.forEach(function(s){
    var base=slug(s.title),ext=langExt(s.lang),n=base+'.'+ext,i=2;
    while(seen[n.toLowerCase()]){n=base+'-'+i+'.'+ext;i++}
    seen[n.toLowerCase()]=1;map[s.id]=n;
  });
  return map;
}

/* ---------- Seed data ---------- */
function seed(){
  var now=Date.now(),d=864e5;
  return [
  {id:uid(),title:'Debounce utility',lang:'javascript',author:'Aevy',owner:'sys',cat:'Tools & Utilities',vis:'public',desc:'Delay a function until input has settled. Useful for search boxes and resize handlers.',tags:['utility','performance'],video:'',created:now-d*2,updated:now-d*2,
   code:"function debounce(fn, wait = 250) {\n  let timer;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}\n\n// Usage\nconst onSearch = debounce((value) => {\n  console.log('Searching for', value);\n}, 300);\n\ndocument.querySelector('#q').addEventListener('input', (e) => onSearch(e.target.value));\n"},
  {id:uid(),title:'Batch rename files',lang:'python',author:'Aevy',owner:'sys',cat:'Tools & Utilities',vis:'public',desc:'Rename every file in a folder with a prefix and zero padded counter.',tags:['files','cli'],video:'',created:now-d*4,updated:now-d*4,
   code:"import sys\nfrom pathlib import Path\n\ndef rename(folder, prefix):\n    files = sorted(p for p in Path(folder).iterdir() if p.is_file())\n    for index, path in enumerate(files, start=1):\n        target = path.with_name(f\"{prefix}_{index:03d}{path.suffix}\")\n        path.rename(target)\n        print(f\"{path.name} -> {target.name}\")\n\nif __name__ == \"__main__\":\n    if len(sys.argv) != 3:\n        sys.exit(\"usage: rename.py <folder> <prefix>\")\n    rename(sys.argv[1], sys.argv[2])\n"},
  {id:uid(),title:'Timestamped backup',lang:'bash',author:'Aevy',owner:'sys',cat:'Tools & Utilities',vis:'public',desc:'Archive a directory into a dated tarball and keep the last seven copies.',tags:['backup','shell'],video:'',created:now-d*6,updated:now-d*6,
   code:"#!/usr/bin/env bash\nset -euo pipefail\n\nSRC=\"${1:?source directory required}\"\nDEST=\"${2:-$HOME/backups}\"\nSTAMP=$(date +%Y%m%d-%H%M%S)\n\nmkdir -p \"$DEST\"\ntar -czf \"$DEST/backup-$STAMP.tar.gz\" -C \"$SRC\" .\n\n# keep only the newest 7 archives\nls -1t \"$DEST\"/backup-*.tar.gz | tail -n +8 | xargs -r rm --\necho \"Saved $DEST/backup-$STAMP.tar.gz\"\n"},
  {id:uid(),title:'Slugify',lang:'typescript',author:'Aevy',owner:'sys',cat:'Tools & Utilities',vis:'public',desc:'Turn any title into a clean, URL safe slug with accent folding.',tags:['strings','web'],video:'',created:now-d*9,updated:now-d*9,
   code:"export function slugify(input: string, max = 60): string {\n  return input\n    .normalize('NFKD')\n    .replace(/[\\u0300-\\u036f]/g, '')\n    .toLowerCase()\n    .replace(/[^a-z0-9]+/g, '-')\n    .replace(/^-+|-+$/g, '')\n    .slice(0, max);\n}\n"},
  {id:uid(),title:'Minimal reset',lang:'css',author:'Aevy',owner:'sys',cat:'Tools & Utilities',vis:'public',desc:'A small, opinionated stylesheet reset for new projects.',tags:['css','starter'],video:'',created:now-d*12,updated:now-d*12,
   code:"/* Minimal reset */\n*, *::before, *::after { box-sizing: border-box; }\n* { margin: 0; }\nhtml { -webkit-text-size-adjust: 100%; }\nbody { line-height: 1.6; -webkit-font-smoothing: antialiased; }\nimg, svg, video { display: block; max-width: 100%; }\ninput, button, textarea, select { font: inherit; }\np { overflow-wrap: break-word; }\n"}
  ];
}
var scripts=(function(){var s=store.get(K.scripts,null);if(!s){s=seed();store.set(K.scripts,s)}return s})();
var videos=store.get(K.videos,[]);
function saveScripts(){return store.set(K.scripts,scripts)}
function saveVideos(){return store.set(K.videos,videos)}
var CATS=['Vehicles & Tuning','Visual & Graphics','Gameplay & Physics','Tools & Utilities','Maps & Environment','Other'];
function me(){return window.AevyAuth.current()}
function isOwner(s){var m=me();return !!(m&&s&&s.owner===m.id)}
function canSee(s){return !!s&&(s.vis!=='private'||isOwner(s))}
function vis(){return scripts.filter(canSee)}
function mine(){return scripts.filter(isOwner)}
function needOwner(s){if(isOwner(s))return true;toast('Only the publisher can do that');return false}
scripts.forEach(function(s){if(!s.owner)s.owner=(s.author==='Aevy'?'sys':'legacy');if(!s.cat)s.cat='Tools & Utilities';if(!s.vis)s.vis='public'});
function byId(id){var s=scripts.filter(function(x){return x.id===id})[0];return canSee(s)?s:undefined}
function ownerOf(s){var u=window.AevyAuth.byId(s.owner);return u?u.username:''}

/* ---------- Toast ---------- */
var tt;
function toast(msg){var t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show')},2600)}

/* ---------- Downloads, zip ---------- */
function download(name,content,type){
  var blob=content instanceof Blob?content:new Blob([content],{type:type||'text/plain;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href)},2000);
}
var CRC=(function(){var t=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){var c=0xFFFFFFFF;for(var i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
/*ZIP_START*/
function makeZip(files){
  var enc=new TextEncoder(),chunks=[],central=[],offset=0,d=new Date();
  var dt=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  var dd=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  files.forEach(function(f){
    var name=enc.encode(f.name),data=enc.encode(f.content),crc=crc32(data),size=data.length;
    var lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);
    lh.setUint16(10,dt,true);lh.setUint16(12,dd,true);lh.setUint32(14,crc,true);lh.setUint32(18,size,true);lh.setUint32(22,size,true);
    lh.setUint16(26,name.length,true);lh.setUint16(28,0,true);
    chunks.push(new Uint8Array(lh.buffer),name,data);
    var ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);
    ch.setUint16(12,dt,true);ch.setUint16(14,dd,true);ch.setUint32(16,crc,true);ch.setUint32(20,size,true);ch.setUint32(24,size,true);
    ch.setUint16(28,name.length,true);ch.setUint16(30,0,true);ch.setUint16(32,0,true);ch.setUint16(34,0,true);ch.setUint16(36,0,true);
    ch.setUint32(38,0,true);ch.setUint32(42,offset,true);
    central.push(new Uint8Array(ch.buffer),name);
    offset+=30+name.length+size;
  });
  var cd=0;central.forEach(function(c){cd+=c.length});
  var end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);
  end.setUint32(12,cd,true);end.setUint32(16,offset,true);
  return new Blob(chunks.concat(central,[new Uint8Array(end.buffer)]),{type:'application/zip'});
}
/*ZIP_END*/
function zipScripts(list,label){
  if(!list.length){toast('There are no scripts to download');return}
  var names=uniqueNames(list);
  var files=list.map(function(s){return {name:names[s.id],content:s.code}});
  var d=new Date().toISOString().slice(0,10);
  download('aevy-'+(label||'scripts')+'-'+d+'.zip',makeZip(files));
  toast('Downloaded '+list.length+' file'+(list.length===1?'':'s')+' as a zip');
}
function downloadOne(s){
  var n=fileNameOf(s);download(n,s.code);toast('Downloaded '+n);
}
function copyText(text){
  var p=(navigator.clipboard&&navigator.clipboard.writeText)?navigator.clipboard.writeText(text):Promise.reject();
  p.then(function(){toast('Copied to clipboard')},function(){
    var t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();
    try{document.execCommand('copy');toast('Copied to clipboard')}catch(x){toast('Copy failed')}t.remove();
  });
}

/* ---------- Theme ---------- */
function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  var m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='light'?'#f6f6f2':'#0b0c0f';
  try{localStorage.setItem(K.theme,t)}catch(e){}
}
(function(){var t;try{t=localStorage.getItem(K.theme)}catch(e){}
  if(!t)t=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  setTheme(t)})();
$('#theme').addEventListener('click',function(){setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark')});

/* ---------- Router ---------- */
var VIEWS=['home','scripts','files','publish','watch','auth','profile','u','publishers'],current='';
function route(){
  var h=(location.hash||'#/').replace(/^#\/?/,'').split('/')[0]||'home';
  if(h==='library')h='scripts';
  if(VIEWS.indexOf(h)<0)h='home';
  var raw=(location.hash||'#/').replace(/^#\/?/,'');
  if((h==='publish'||h==='files'||h==='profile')&&!me()){location.hash='#/auth';return}
  if(h==='auth'&&me()){location.hash='#/profile';return}
  if(h===current&&h!=='u')return;
  current=h;
  $$('.view').forEach(function(v){v.classList.toggle('active',v.dataset.view===h)});
  $$('#nav a').forEach(function(a){if(a.dataset.route===h)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  closeMenu();window.scrollTo(0,0);
  document.title=h==='home'?'Aevy | Script Publishing':'Aevy | '+({scripts:'Scripts',files:'Local files',publish:'Publish',watch:'Watch',auth:'Account',profile:'Profile',u:'Publisher',publishers:'Publishers'})[h];
  if(h==='home'){renderHome();observeReveals();runStats()}
  if(h==='scripts')renderScripts();
  if(h==='files')renderFiles();
  if(h==='publish')updatePreview();
  if(h==='watch')renderVList();
  if(window.AevyEco)AevyEco.render(h,raw);
}
window.addEventListener('hashchange',route);
window.addEventListener('aevy:auth',function(){current='';route()});
function closeMenu(){$('#nav').classList.remove('open');$('#burger').setAttribute('aria-expanded','false')}
$('#burger').addEventListener('click',function(){var o=$('#nav').classList.toggle('open');this.setAttribute('aria-expanded',o)});
document.addEventListener('click',function(e){if(!e.target.closest('.site-header'))closeMenu()});

/* ---------- Reveal and stats ---------- */
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -5% 0px'}):null;
function observeReveals(){$$('.reveal:not(.in)').forEach(function(el){io?io.observe(el):el.classList.add('in')})}
function runStats(){
  var langs={},lines=0;vis().forEach(function(s){langs[s.lang]=1;lines+=lineCount(s.code)});
  var vals={scripts:vis().length,langs:Object.keys(langs).length,lines:lines,videos:videos.length};
  $$('[data-count]').forEach(function(el){
    var to=vals[el.dataset.count]||0;
    if(reduce){el.textContent=to.toLocaleString();return}
    var t0=performance.now(),dur=1100;
    (function step(t){var p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,4);el.textContent=Math.round(to*e).toLocaleString();if(p<1)requestAnimationFrame(step)})(t0);
  });
}

/* ---------- Cards ---------- */
function cardHTML(s,idx){
  var peek=s.code.split('\n').slice(0,7).join('\n');
  return '<article class="card" style="--i:'+(idx||0)+'" tabindex="0" data-open="'+esc(s.id)+'" aria-label="Open '+esc(s.title)+'">'+
   '<div class="card-top"><span class="fchip"><i style="background:'+langColor(s.lang)+'"></i><span>'+esc(fileNameOf(s))+'</span></span>'+(s.vis==='private'?'<span class="vtag">Private</span>':'<span class="vtag">'+esc(s.cat||'Other')+'</span>')+'</div>'+
   '<h3>'+esc(s.title)+'</h3><p class="d">'+esc(s.desc||'No description.')+'</p>'+
   '<pre class="peek" aria-hidden="true">'+highlight(peek,s.lang)+'</pre>'+
   '<div class="card-foot"><small>'+esc(s.author||'Anonymous')+' &middot; '+fmtSize(byteLen(s.code))+'</small>'+
   '<div class="card-btns"><button class="btn" data-act="copy" data-id="'+esc(s.id)+'">Copy</button><button class="btn btn-primary" data-act="dl" data-id="'+esc(s.id)+'">'+ICON.dl+'Download</button></div></div></article>';
}
document.addEventListener('click',function(e){
  var a=e.target.closest('[data-act]');
  if(a&&a.dataset.id&&!a.closest('#dlgBody')){
    e.stopPropagation();
    var s=byId(a.dataset.id);if(!s)return;
    var act=a.dataset.act;
    if(act==='dl')downloadOne(s);
    if(act==='copy')copyText(s.code);
    if(act==='open')openScript(s.id);
    if(act==='del')deleteScript(s);
    return;
  }
  var c=e.target.closest('[data-open]');if(c)openScript(c.dataset.open);
});
document.addEventListener('keydown',function(e){
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.card')){e.preventDefault();openScript(e.target.dataset.open)}
});
function deleteScript(s){
  if(!needOwner(s))return;
  if(!confirm('Delete "'+s.title+'" from this browser? Download it first if you want a copy.'))return;
  scripts=scripts.filter(function(x){return x.id!==s.id});saveScripts();toast('Script deleted');refreshLists();
}
function refreshLists(){
  if(current==='scripts')renderScripts();
  if(current==='home'){renderHome()}
  if(current==='files')renderFiles();
}

/* ---------- Home ---------- */
function renderHome(){
  var latest=vis().slice().sort(function(a,b){return b.created-a.created}).slice(0,3);
  $('#latest').innerHTML=latest.length?latest.map(cardHTML).join(''):'<div class="empty"><h3>No scripts yet</h3><p>Publish your first script to see it here.</p></div>';
}
var SNIPS=[
 {n:'debounce.js',l:'javascript',t:"function debounce(fn, wait = 250) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), wait);\n  };\n}\n\n// Publish it. Edit it. Download it.\nexport default debounce;"},
 {n:'backup.sh',l:'bash',t:"#!/usr/bin/env bash\nset -euo pipefail\n\nSTAMP=$(date +%Y%m%d)\ntar -czf \"backup-$STAMP.tar.gz\" ./src\n\n# Stored on your device only\necho \"Archive ready\""},
 {n:'greet.py',l:'python',t:"def greet(name: str) -> str:\n    return f\"Hello, {name}\"\n\nfor person in [\"Ada\", \"Linus\", \"Grace\"]:\n    print(greet(person))\n\n# Scripts worth keeping"}
];
(function typer(){
  var body=$('#termBody'),i=0,pos=0;
  function show(txt,caret){
    body.innerHTML=highlight(txt,SNIPS[i].l)+(caret?'<span class="caret"></span>':'');
    $('#termMeta').textContent=fmtSize(byteLen(txt))+' · '+lineCount(txt)+' lines';
  }
  function head(){$('#termName').textContent=SNIPS[i].n;$('#termLang').textContent=langLabel(SNIPS[i].l)}
  head();
  if(reduce){show(SNIPS[0].t,false);return}
  function tick(){
    if(current!=='home'||document.hidden){setTimeout(tick,600);return}
    var s=SNIPS[i].t;
    if(pos<=s.length){show(s.slice(0,pos),true);pos++;setTimeout(tick,pos%7===0?55:20)}
    else{
      show(s,false);var f=$('#fakeDl');f.classList.remove('pulse');void f.offsetWidth;f.classList.add('pulse');
      setTimeout(function(){pos=0;i=(i+1)%SNIPS.length;head();tick()},2800);
    }
  }
  setTimeout(tick,800);
})();

/* ---------- Scripts view ---------- */
var filter='all';
function renderScripts(){
  var used={};vis().forEach(function(s){used[s.lang]=1});
  var keys=['all'].concat(Object.keys(used).sort());
  if(keys.indexOf(filter)<0)filter='all';
  $('#chips').innerHTML=keys.map(function(k){return '<button class="chip'+(k===filter?' on':'')+'" data-f="'+k+'" aria-pressed="'+(k===filter)+'">'+(k==='all'?'All ('+vis().length+')':esc(langLabel(k)))+'</button>'}).join('');
  var q=$('#q').value.trim().toLowerCase(),sort=$('#sort').value;
  var list=vis().filter(function(s){
    if(window.catFilter&&window.catFilter!=='all'&&s.cat!==window.catFilter)return false;
    if(filter!=='all'&&s.lang!==filter)return false;
    if(!q)return true;
    return (s.title+' '+(s.desc||'')+' '+(s.tags||[]).join(' ')+' '+(s.author||'')).toLowerCase().indexOf(q)>-1;
  });
  list.sort(function(a,b){
    if(sort==='az')return a.title.localeCompare(b.title);
    if(sort==='old')return a.created-b.created;
    if(sort==='upd')return b.updated-a.updated;
    return b.created-a.created;
  });
  $('#cards').innerHTML=list.length?list.map(cardHTML).join(''):'<div class="empty"><h3>'+(vis().length?'Nothing matches':'Your library is empty')+'</h3><p>'+(vis().length?'Try a different search or language.':'Publish a script to get started.')+'</p></div>';
}
$('#chips').addEventListener('click',function(e){var b=e.target.closest('[data-f]');if(!b)return;filter=b.dataset.f;renderScripts()});
$('#q').addEventListener('input',renderScripts);
$('#sort').addEventListener('change',renderScripts);
$('#zipAllTop').addEventListener('click',function(){zipScripts(vis(),'all-scripts')});

/* ---------- Local files view ---------- */
var selected={};
function selCount(){return Object.keys(selected).length}
function renderFiles(){
  var names=uniqueNames(mine());
  var rows=mine().slice().sort(function(a,b){return b.updated-a.updated});
  var all=rows.length&&rows.every(function(s){return selected[s.id]});
  var html='<div class="frow fhead"><label><input type="checkbox" id="selAll" aria-label="Select all"'+(all?' checked':'')+'></label><span></span><span>File</span><span>Size</span><span>Lines</span><span>Modified</span><span></span></div>';
  html+=rows.map(function(s){
    return '<div class="frow"><label><input type="checkbox" data-sel="'+esc(s.id)+'" aria-label="Select '+esc(s.title)+'"'+(selected[s.id]?' checked':'')+'></label>'+
      '<div class="fext">'+esc(langExt(s.lang))+'</div>'+
      '<div class="fmain"><b>'+esc(names[s.id])+'</b><small>'+esc(s.title)+'</small></div>'+
      '<span class="fmeta">'+fmtSize(byteLen(s.code))+'</span><span class="fmeta">'+lineCount(s.code)+'</span><span class="fmeta">'+fmtDate(s.updated)+'</span>'+
      '<div class="fact"><button class="btn btn-primary" data-act="dl" data-id="'+esc(s.id)+'">'+ICON.dl+'Download</button><button class="btn" data-act="open" data-id="'+esc(s.id)+'">Open</button><button class="btn btn-danger" data-act="del" data-id="'+esc(s.id)+'">Delete</button></div></div>';
  }).join('');
  if(!rows.length)html='<div class="empty" style="border:0"><h3>No local files yet</h3><p>Publish a script or import files to see them here.</p></div>';
  $('#ftable').innerHTML=html;
  updateSelLabel();
  var bytes=byteLen(JSON.stringify(scripts))+byteLen(JSON.stringify(videos)),cap=5*1024*1024,pct=Math.min(100,Math.round(bytes/cap*100));
  $('#meter').innerHTML='Browser storage used: '+fmtSize(bytes)+' of roughly 5 MB<div class="bar-track"><div class="bar-fill" style="width:'+Math.max(pct,1)+'%"></div></div>';
  $('#saveFolder').style.display=window.showDirectoryPicker?'':'none';
}
function updateSelLabel(){
  var n=selCount();
  $('#dlSelectedLabel').textContent=n?'Download selected ('+n+')':'Download all (.zip)';
}
$('#ftable').addEventListener('change',function(e){
  if(e.target.id==='selAll'){
    selected={};if(e.target.checked)mine().forEach(function(s){selected[s.id]=1});
    $$('[data-sel]').forEach(function(c){c.checked=e.target.checked});
  }else if(e.target.dataset.sel){
    if(e.target.checked)selected[e.target.dataset.sel]=1;else delete selected[e.target.dataset.sel];
  }
  updateSelLabel();
});
$('#dlSelected').addEventListener('click',function(){
  var n=selCount();
  if(n===1){downloadOne(byId(Object.keys(selected)[0]));return}
  zipScripts(n?mine().filter(function(s){return selected[s.id]}):mine(),n?'selected':'all-scripts');
});
$('#saveFolder').addEventListener('click',function(){
  if(!window.showDirectoryPicker){toast('Your browser cannot save to a folder. Use Download all instead.');return}
  window.showDirectoryPicker({mode:'readwrite'}).then(function(dir){
    var list=selCount()?mine().filter(function(s){return selected[s.id]}):mine(),names=uniqueNames(list),n=0;
    return list.reduce(function(p,s){
      return p.then(function(){return dir.getFileHandle(names[s.id],{create:true})}).then(function(h){return h.createWritable()}).then(function(w){return w.write(s.code).then(function(){return w.close()})}).then(function(){n++});
    },Promise.resolve()).then(function(){toast('Saved '+n+' file'+(n===1?'':'s')+' to your folder')});
  }).catch(function(err){if(err&&err.name!=='AbortError')toast('Could not save to that folder')});
});
function importFileList(files){
  if(!me()){toast('Sign in to import files');location.hash='#/auth';return}
  var list=Array.prototype.slice.call(files||[]),done=0,added=0;
  if(!list.length)return;
  var author='';try{author=localStorage.getItem(K.author)||''}catch(e){}
  list.forEach(function(f){
    if(f.size>2*1024*1024){toast(f.name+' is larger than 2 MB');if(++done===list.length)finish();return}
    var r=new FileReader();
    r.onload=function(){
      var ext=(f.name.split('.').pop()||'').toLowerCase(),code=String(r.result);
      if(code.indexOf('\u0000')<0){
        scripts.unshift({id:uid(),owner:me().id,cat:'Other',vis:'public',title:f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '),lang:EXT[ext]||'text',author:author,desc:'Imported from '+f.name,tags:[],video:'',code:code,created:Date.now(),updated:Date.now()});added++;
      }
      if(++done===list.length)finish();
    };
    r.onerror=function(){if(++done===list.length)finish()};
    r.readAsText(f);
  });
  function finish(){if(added)saveScripts();refreshLists();toast(added+' file'+(added===1?'':'s')+' imported')}
}
$('#importFiles').addEventListener('click',function(){$('#importFilesInput').click()});
$('#importFilesInput').addEventListener('change',function(){importFileList(this.files);this.value=''});
var fdrop=$('#fileDrop');
fdrop.addEventListener('click',function(){$('#importFilesInput').click()});
['dragenter','dragover'].forEach(function(ev){fdrop.addEventListener(ev,function(e){e.preventDefault();fdrop.classList.add('over')})});
['dragleave','drop'].forEach(function(ev){fdrop.addEventListener(ev,function(e){e.preventDefault();fdrop.classList.remove('over')})});
fdrop.addEventListener('drop',function(e){importFileList(e.dataTransfer.files)});
$('#backupBtn').addEventListener('click',function(){
  var d=new Date().toISOString().slice(0,10);
  download('aevy-backup-'+d+'.json',JSON.stringify({app:'aevy',version:2,scripts:mine(),videos:videos},null,2),'application/json');
  toast('Backup downloaded');
});
$('#restoreBtn').addEventListener('click',function(){$('#restoreInput').click()});
$('#restoreInput').addEventListener('change',function(){
  var f=this.files[0];this.value='';if(!f)return;
  var r=new FileReader();
  r.onload=function(){
    try{
      var data=JSON.parse(r.result),arr=Array.isArray(data)?data:data.scripts,n=0;
      if(!Array.isArray(arr))throw 0;
      var ids={};scripts.forEach(function(s){ids[s.id]=1});
      arr.forEach(function(s){
        if(!s||typeof s.title!=='string'||typeof s.code!=='string')return;
        var o={id:(!s.id||ids[s.id])?uid():String(s.id),title:s.title.slice(0,80),lang:LANGS[s.lang]?s.lang:'text',author:String(s.author||'').slice(0,40),desc:String(s.desc||'').slice(0,220),tags:Array.isArray(s.tags)?s.tags.slice(0,8).map(String):[],video:String(s.video||''),created:+s.created||Date.now(),updated:+s.updated||Date.now(),code:s.code};
        o.owner=me().id;o.vis=o.vis||'public';o.cat=o.cat||'Other';scripts.push(o);ids[o.id]=1;n++;
      });
      if(data.videos&&Array.isArray(data.videos)){data.videos.forEach(function(v){if(v&&v.url&&!videos.some(function(x){return x.url===v.url}))videos.push({id:uid(),url:String(v.url),title:String(v.title||'')})});saveVideos()}
      saveScripts();refreshLists();toast(n+' script'+(n===1?'':'s')+' restored');
    }catch(e){toast('That file is not a valid Aevy backup')}
  };
  r.readAsText(f);
});

/* ---------- Script dialog ---------- */
var dlg=$('#dlg'),openId=null;
function codeHTML(code,lang){
  var n=lineCount(code),g=[];for(var i=1;i<=n;i++)g.push(i);
  return '<div class="code"><pre class="gut" aria-hidden="true">'+g.join('\n')+'</pre><pre class="src"><code>'+highlight(code,lang)+'</code></pre></div>';
}
function catOptions(sel){return CATS.map(function(c){return '<option'+(c===sel?' selected':'')+'>'+esc(c)+'</option>'}).join('')}
function langOptions(sel){return Object.keys(LANGS).map(function(k){return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(LANGS[k].label)+'</option>'}).join('')}
function splitTags(s){return s.split(',').map(function(t){return t.trim()}).filter(Boolean).slice(0,8)}
function tabKey(e){
  if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();var t=e.target,a=t.selectionStart;t.value=t.value.slice(0,a)+'  '+t.value.slice(t.selectionEnd);t.selectionStart=t.selectionEnd=a+2;t.dispatchEvent(new Event('input'))}
}
function openScript(id,edit){
  var s=byId(id);if(!s)return;
  if(edit&&!needOwner(s))edit=false;
  openId=id;
  $('#dlgTitle').textContent=s.title;
  $('#dlgSub').innerHTML='<span class="fchip"><i style="background:'+langColor(s.lang)+'"></i>'+esc(langLabel(s.lang))+'</span><span>'+(ownerOf(s)?'<a href="#/u/'+esc(ownerOf(s))+'" data-close>'+esc(s.author||ownerOf(s))+'</a>':esc(s.author||'Anonymous'))+'</span><span>'+esc(s.cat||'Other')+'</span>'+(s.vis==='private'?'<span>Private</span>':'')+'<span>'+lineCount(s.code)+' lines</span><span>'+fmtSize(byteLen(s.code))+'</span><span>Updated '+fmtDate(s.updated)+'</span>';
  var body=$('#dlgBody');
  if(edit){
    body.innerHTML='<form class="form" id="editForm">'+
      '<div><label class="l" for="eTitle">Title</label><input class="field" id="eTitle" maxlength="80" required value="'+esc(s.title)+'"></div>'+
      '<div class="row2"><div><label class="l" for="eLang">Language</label><select class="field sel" id="eLang" style="width:100%">'+langOptions(s.lang)+'</select></div>'+
      '<div><label class="l" for="eTags">Tags</label><input class="field" id="eTags" value="'+esc((s.tags||[]).join(', '))+'"></div></div>'+
      '<div class="row2"><div><label class="l" for="eCat">Category</label><select class="field sel" id="eCat" style="width:100%">'+catOptions(s.cat)+'</select></div><div><label class="l" for="eVis">Visibility</label><select class="field sel" id="eVis" style="width:100%"><option value="public"'+(s.vis!=='private'?' selected':'')+'>Public</option><option value="private"'+(s.vis==='private'?' selected':'')+'>Private (only you)</option></select></div></div>'+
      '<div><label class="l" for="eDesc">Description</label><input class="field" id="eDesc" maxlength="220" value="'+esc(s.desc||'')+'"></div>'+
      '<div><label class="l" for="eVideo">Video link</label><input class="field" id="eVideo" inputmode="url" value="'+esc(s.video||'')+'" placeholder="YouTube or video URL"></div>'+
      '<div><label class="l" for="eCode">Code</label><textarea class="field" id="eCode" spellcheck="false" style="min-height:340px">'+esc(s.code)+'</textarea></div>'+
      '<div class="actions"><button class="btn btn-primary" type="submit">Save changes</button><button class="btn" type="button" id="eCancel">Cancel</button></div></form>';
    $('#eCancel').onclick=function(){openScript(id)};
    $('#eCode').addEventListener('keydown',tabKey);
    $('#editForm').onsubmit=function(ev){
      ev.preventDefault();
      if(!needOwner(s))return;
      s.cat=$('#eCat').value;s.vis=$('#eVis').value;
      s.title=$('#eTitle').value.trim()||s.title;s.lang=$('#eLang').value;
      s.tags=splitTags($('#eTags').value);s.desc=$('#eDesc').value.trim();s.video=$('#eVideo').value.trim();
      s.code=$('#eCode').value;s.updated=Date.now();
      if(saveScripts()){toast('Changes saved');openScript(id);refreshLists()}
    };
  }else{
    var v=parseVideo(s.video);
    body.innerHTML=
      '<div class="dlg-bar"><button class="btn btn-primary btn-lg" data-a="download">'+ICON.dl+'Download '+esc(fileNameOf(s))+'</button>'+
        (isOwner(s)?'<button class="btn btn-lg" data-a="edit">Edit</button>':'')+'<button class="btn btn-lg" data-a="copy">Copy</button><button class="btn btn-lg" data-a="fork">Fork</button>'+(isOwner(s)?'<button class="btn btn-lg btn-danger" data-a="delete">Delete</button>':'')+'</div>'+
      (s.desc?'<p class="desc">'+esc(s.desc)+'</p>':'')+
      ((s.tags&&s.tags.length)?'<div class="tags">'+s.tags.map(function(t){return '<span class="tag">'+esc(t)+'</span>'}).join('')+'</div>':'')+
      (v?'<div>'+playerHTML(v)+'</div>':'')+
      codeHTML(s.code,s.lang);
  }
  if(!dlg.open){dlg.showModal();document.body.classList.add('lock')}
  body.scrollTop=0;
}
$('#dlgBody').addEventListener('click',function(e){
  var b=e.target.closest('[data-a]');if(!b)return;
  var s=byId(openId);if(!s)return;
  var a=b.dataset.a;
  if(a==='edit'){if(needOwner(s))openScript(openId,true)}
  if(a==='download')downloadOne(s);
  if(a==='copy')copyText(s.code);
  if(a==='fork'){
    if(!me()){toast('Sign in to fork');location.hash='#/auth';return}
    var c=JSON.parse(JSON.stringify(s));c.id=uid();c.owner=me().id;c.author=me().name;c.vis='private';c.title=s.title+' (copy)';c.created=c.updated=Date.now();
    scripts.unshift(c);if(saveScripts()){toast('Forked as a new script');openScript(c.id);refreshLists()}
  }
  if(a==='delete'){
    if(!needOwner(s))return;
    if(!confirm('Delete "'+s.title+'" from this browser? Download it first if you want a copy.'))return;
    scripts=scripts.filter(function(x){return x.id!==openId});saveScripts();dlg.close();toast('Script deleted');refreshLists();
  }
});
dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.closest('[data-close]'))dlg.close()});
$('#dlgClose').addEventListener('click',function(){dlg.close()});
dlg.addEventListener('close',function(){document.body.classList.remove('lock');openId=null;stopMedia(dlg)});
function stopMedia(root){$$('video',root).forEach(function(v){v.pause()});$$('iframe',root).forEach(function(f){f.src='about:blank'})}

/* ---------- Video ---------- */
function parseVideo(u){
  u=(u||'').trim();if(!u)return null;
  var url;try{url=new URL(/^https?:\/\//i.test(u)?u:'https://'+u)}catch(e){return null}
  var h=url.hostname.replace(/^(www|m)\./,''),id=null,list=url.searchParams.get('list');
  if(h==='youtu.be')id=url.pathname.slice(1).split('/')[0];
  else if(h==='youtube.com'||h==='music.youtube.com'||h==='youtube-nocookie.com'){
    if(url.pathname==='/watch')id=url.searchParams.get('v');
    else{var m=url.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{6,})/);if(m)id=m[2]}
    if(!id&&list&&(url.pathname==='/playlist'||url.pathname==='/embed/videoseries'))
      return {type:'yt',embed:'https://www.youtube-nocookie.com/embed/videoseries?list='+encodeURIComponent(list),watch:'https://www.youtube.com/playlist?list='+encodeURIComponent(list),label:'YouTube playlist'};
  }
  if(id&&/^[\w-]{6,}$/.test(id)){
    var t=url.searchParams.get('t')||url.searchParams.get('start')||'',start=0,mm;
    if(/^\d+$/.test(t))start=+t;else if(t&&(mm=t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)))start=(+mm[1]||0)*3600+(+mm[2]||0)*60+(+mm[3]||0);
    return {type:'yt',id:id,thumb:'https://i.ytimg.com/vi/'+id+'/mqdefault.jpg',watch:'https://www.youtube.com/watch?v='+id+(start?'&t='+start+'s':''),
      embed:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0&modestbranding=1&playsinline=1'+(start?'&start='+start:'')+(list?'&list='+encodeURIComponent(list):''),label:'YouTube'};
  }
  if(h==='vimeo.com'||h==='player.vimeo.com'){
    var vm=url.pathname.match(/(\d{5,})/);
    if(vm)return {type:'vimeo',embed:'https://player.vimeo.com/video/'+vm[1],watch:'https://vimeo.com/'+vm[1],label:'Vimeo'};
  }
  if(/\.(mp4|webm|ogv|mov|m4v)$/i.test(url.pathname))return {type:'file',src:url.href,watch:url.href,label:'Video file'};
  return null;
}
function playerFrame(v){
  if(v.type==='file'||v.type==='local')return '<div class="vframe"><video controls playsinline preload="metadata" src="'+esc(v.src)+'"></video></div>';
  return '<div class="vframe"><iframe src="'+esc(v.embed)+'" title="Video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" loading="lazy"></iframe></div>';
}
function playerNote(v){return esc(v.label)+'. If the player shows an error, <a href="'+esc(v.watch)+'" target="_blank" rel="noopener noreferrer">open it at the source</a>.'}
function playerHTML(v){return playerFrame(v)+'<p class="vnote">'+playerNote(v)+'</p>'}
var localObjUrl=null;
function playInStage(v,note){
  if(localObjUrl&&v.type!=='local'){URL.revokeObjectURL(localObjUrl);localObjUrl=null}
  $('#stage').innerHTML=playerFrame(v);
  $('#stageNote').innerHTML=v.type==='local'?esc(note):playerNote(v);
}
function addVideo(save){
  var url=$('#vUrl').value.trim(),v=parseVideo(url);
  if(!v){toast('That does not look like a supported video link');return}
  playInStage(v);
  if(save){
    if(videos.some(function(x){return x.url===url})){toast('Already in your list');return}
    videos.unshift({id:uid(),url:url,title:$('#vTitle').value.trim()});
    if(saveVideos()){toast('Saved to your list');renderVList()}
  }
}
$('#vidForm').addEventListener('submit',function(e){e.preventDefault();addVideo(false)});
$('#vSave').addEventListener('click',function(){if(!$('#vidForm').reportValidity())return;addVideo(true)});
$('#vLocal').addEventListener('click',function(){$('#vFile').click()});
$('#vFile').addEventListener('change',function(){
  var f=this.files[0];this.value='';if(!f)return;
  if(localObjUrl)URL.revokeObjectURL(localObjUrl);
  localObjUrl=URL.createObjectURL(f);
  playInStage({type:'local',src:localObjUrl},'Playing '+f.name+' from your computer. Local files are not saved to the list.');
});
function renderVList(){
  var el=$('#vlist');
  if(!videos.length){el.innerHTML='<p class="note">Your saved videos will appear here.</p>';return}
  el.innerHTML=videos.map(function(x){
    var v=parseVideo(x.url),th=v&&v.thumb?'style="background-image:url('+esc(v.thumb)+')"':'';
    return '<div class="vitem"><button class="vplay" data-play="'+esc(x.id)+'" aria-label="Play '+esc(x.title||x.url)+'"><div class="th" '+th+'>'+(v&&v.thumb?'':esc(v?v.type:'link'))+'</div><div style="min-width:0"><b>'+esc(x.title||x.url)+'</b><small>'+esc(v?v.label:'Unsupported')+'</small></div></button><button class="x" data-del="'+esc(x.id)+'" aria-label="Remove from list">'+ICON.x+'</button></div>';
  }).join('');
}
$('#vlist').addEventListener('click',function(e){
  var p=e.target.closest('[data-play]'),d=e.target.closest('[data-del]');
  if(p){var x=videos.filter(function(i){return i.id===p.dataset.play})[0];var v=x&&parseVideo(x.url);if(v){playInStage(v);window.scrollTo({top:0,behavior:reduce?'auto':'smooth'})}}
  if(d){videos=videos.filter(function(i){return i.id!==d.dataset.del});saveVideos();renderVList()}
});

/* ---------- Publish ---------- */
$('#fLang').innerHTML=langOptions('javascript');
function savedAuthor(){try{return localStorage.getItem(K.author)||''}catch(e){return ''}}
function pubFileName(){return slug($('#fTitle').value.trim()||'untitled')+'.'+langExt($('#fLang').value)}
function updatePreview(){
  var lang=$('#fLang').value,code=$('#fCode').value;
  $('#pvName').textContent=pubFileName();
  $('#pvLang').textContent=langLabel(lang);
  $('#pvMeta').textContent=fmtSize(byteLen(code))+' · '+lineCount(code)+' lines';
  $('#pvBody').innerHTML=code?highlight(code.split('\n').slice(0,80).join('\n'),lang):'<span class="tc">Your code will appear here as you type.</span>';
}
['fTitle','fLang','fCode'].forEach(function(id){$('#'+id).addEventListener('input',updatePreview)});
$('#fCode').addEventListener('keydown',tabKey);
$('#pubDownload').addEventListener('click',function(){
  var code=$('#fCode').value;if(!code.trim()){toast('Add some code first');return}
  var n=pubFileName();download(n,code);toast('Downloaded '+n);
});
function loadFile(f){
  if(!f)return;
  if(f.size>2*1024*1024){toast('File is larger than 2 MB');return}
  var r=new FileReader();
  r.onload=function(){
    var ext=(f.name.split('.').pop()||'').toLowerCase();
    $('#fCode').value=String(r.result);
    if(EXT[ext])$('#fLang').value=EXT[ext];
    if(!$('#fTitle').value.trim())$('#fTitle').value=f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ');
    updatePreview();toast('Imported '+f.name);
  };
  r.readAsText(f);
}
var drop=$('#drop');
drop.addEventListener('click',function(){$('#pubFile').click()});
drop.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#pubFile').click()}});
$('#pubFile').addEventListener('change',function(){loadFile(this.files[0]);this.value=''});
['dragenter','dragover'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('over')})});
['dragleave','drop'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('over')})});
drop.addEventListener('drop',function(e){loadFile(e.dataTransfer.files[0])});
$('#pubClear').addEventListener('click',function(){$('#pubForm').reset();updatePreview()});
$('#pubForm').addEventListener('submit',function(e){
  e.preventDefault();
  var title=$('#fTitle').value.trim(),code=$('#fCode').value;
  if(!title||!code.trim()){toast('Add a title and some code');return}
  var vid=$('#fVideo').value.trim();
  if(vid&&!parseVideo(vid)){toast('The video link is not supported');return}
  var m=me();if(!m){toast('Sign in to publish');location.hash='#/auth';return}
  var author=m.name;
  try{localStorage.setItem(K.author,author)}catch(x){}
  var s={id:uid(),owner:m.id,cat:$('#fCat').value,vis:$('#fVis').value,title:title,lang:$('#fLang').value,author:author,desc:$('#fDesc').value.trim(),tags:splitTags($('#fTags').value),video:vid,code:code,created:Date.now(),updated:Date.now()};
  scripts.unshift(s);
  if(!saveScripts()){scripts.shift();return}
  $('#pubForm').reset();updatePreview();
  toast('Script published');
  location.hash='#/scripts';
  setTimeout(function(){openScript(s.id)},350);
});

window.AevyCore={all:function(){return scripts},vis:vis,mine:mine,cats:CATS,cardHTML:cardHTML,toast:toast,esc:esc,fmtDate:fmtDate,
  claim:function(){var m=me(),n=0;scripts.forEach(function(s){if(s.owner==='legacy'){s.owner=m.id;n++}});if(n)saveScripts();return n},
  legacy:function(){return scripts.filter(function(s){return s.owner==='legacy'}).length},
  dropOwner:function(id){scripts=scripts.filter(function(s){return s.owner!==id});saveScripts()},
  refresh:function(){current='';route()}};
/* ---------- Init ---------- */
route();
})();
