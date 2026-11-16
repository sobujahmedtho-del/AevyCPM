/* Aevy ecosystem views: auth, profile, publisher pages, categories. */
(function(){
'use strict';
var C=window.AevyCore,A=window.AevyAuth,esc=C.esc;
function $(s){return document.querySelector(s)}
function mk(id,html){var s=document.createElement('section');s.className='view';s.id='view-'+id;s.dataset.view=id;s.innerHTML=html;$('main').appendChild(s);return s}
function head(e,t,p){return '<div class="page-head"><div class="wrap"><p class="eyebrow">'+e+'</p><h1>'+t+'</h1>'+(p?'<p>'+p+'</p>':'')+'</div></div>'}
function avatar(u,sz){return '<span class="avatar" style="--c:'+u.color+';width:'+sz+'px;height:'+sz+'px;font-size:'+sz*.42+'px">'+esc((u.name||u.username).charAt(0).toUpperCase())+'</span>'}
function err(box,e){box.textContent=e.message||String(e)}
function changed(){window.dispatchEvent(new Event('aevy:auth'))}

mk('auth',head('Account','Sign in to publish.','Accounts are stored only in this browser. Nothing is sent anywhere.')+
 '<div class="wrap narrow"><div class="tabs"><button class="chip on" data-t="in">Sign in</button><button class="chip" data-t="up">Create account</button></div>'+
 '<form class="form" id="fIn"><div><label class="l" for="siU">Username</label><input class="field" id="siU" autocomplete="username" required></div><div><label class="l" for="siP">Password</label><input class="field" id="siP" type="password" autocomplete="current-password" required></div><p class="ferr" role="alert"></p><button class="btn btn-primary btn-lg">Sign in</button></form>'+
 '<form class="form" id="fUp" hidden><div><label class="l" for="suN">Display name</label><input class="field" id="suN" maxlength="40" autocomplete="name"></div><div><label class="l" for="suU">Username</label><input class="field" id="suU" maxlength="20" autocomplete="username" required placeholder="letters, numbers, _"></div><div><label class="l" for="suP">Password (8+ characters)</label><input class="field" id="suP" type="password" minlength="8" autocomplete="new-password" required></div><p class="ferr" role="alert"></p><button class="btn btn-primary btn-lg">Create account</button></form>'+
 '<p class="note">Passwords are salted and hashed on this device. There is no recovery: if you forget it, export your scripts first.</p></div>');
var au=$('#view-auth');
au.querySelectorAll('[data-t]').forEach(function(b){b.onclick=function(){au.querySelectorAll('[data-t]').forEach(function(x){x.classList.toggle('on',x===b)});$('#fIn').hidden=b.dataset.t!=='in';$('#fUp').hidden=b.dataset.t!=='up'}});
$('#fIn').onsubmit=function(e){e.preventDefault();var b=this.querySelector('.ferr');A.signIn($('#siU').value,$('#siP').value).then(function(){this.reset();changed();location.hash='#/profile'}.bind(this),function(x){err(b,x)})};
$('#fUp').onsubmit=function(e){e.preventDefault();var b=this.querySelector('.ferr');A.signUp({name:$('#suN').value,username:$('#suU').value,password:$('#suP').value}).then(function(){this.reset();changed();location.hash='#/profile'}.bind(this),function(x){err(b,x)})};

mk('profile','<div id="profBody"></div>');
mk('u','<div id="pubBody"></div>');
mk('publishers','<div id="pubsBody"></div>');

function stats(list){var b=0;list.forEach(function(s){b+=s.code.length});return list.length+' script'+(list.length===1?'':'s')+' · '+(b/1024).toFixed(1)+' KB'}
function renderProfile(){
  var m=A.current();if(!m)return;var mine=C.mine(),lg=C.legacy();
  $('#profBody').innerHTML=head('Your profile',esc(m.name),'@'+esc(m.username)+' · member since '+C.fmtDate(m.created))+
  '<div class="wrap prof-grid"><form class="form" id="pf"><h2>Edit profile</h2><div><label class="l" for="pName">Display name</label><input class="field" id="pName" maxlength="40" value="'+esc(m.name)+'"></div><div><label class="l" for="pBio">Bio</label><textarea class="field" id="pBio" maxlength="280" rows="3">'+esc(m.bio)+'</textarea></div><button class="btn btn-primary">Save profile</button></form>'+
  '<form class="form" id="pw"><h2>Password</h2><input class="field" id="pOld" type="password" placeholder="Current password" autocomplete="current-password" required><input class="field" id="pNew" type="password" placeholder="New password (8+)" autocomplete="new-password" required><p class="ferr" role="alert"></p><button class="btn">Change password</button></form></div>'+
  '<div class="wrap"><div class="sec-head"><div><p class="eyebrow">Upload management</p><h2>Your scripts ('+mine.length+')</h2></div><div class="row-btns"><a class="btn btn-primary" href="#/publish">Publish script</a><a class="btn" href="#/u/'+esc(m.username)+'">View public page</a></div></div>'+
  (lg?'<div class="notice">'+lg+' older script'+(lg===1?'':'s')+' from before accounts existed '+(lg===1?'has':'have')+' no owner. <button class="btn" id="claim">Claim '+(lg===1?'it':'them')+'</button></div>':'')+
  '<div class="cards" id="myCards">'+(mine.length?mine.map(C.cardHTML).join(''):'<div class="empty"><h3>Nothing published yet</h3><p>Your scripts appear here, and only you can edit or delete them.</p></div>')+'</div>'+
  '<div class="danger-zone"><h3>Delete account</h3><p>Removes your profile and every script you published, from this browser.</p><form id="del"><input class="field" id="dPw" type="password" placeholder="Confirm password" required><button class="btn btn-danger">Delete account</button></form><p class="ferr" id="dErr" role="alert"></p></div></div>';
  $('#pf').onsubmit=function(e){e.preventDefault();A.update({name:$('#pName').value,bio:$('#pBio').value});C.toast('Profile saved');changed()};
  $('#pw').onsubmit=function(e){e.preventDefault();var b=this.querySelector('.ferr'),f=this;A.changePassword($('#pOld').value,$('#pNew').value).then(function(){f.reset();b.textContent='';C.toast('Password changed')},function(x){err(b,x)})};
  if($('#claim'))$('#claim').onclick=function(){C.toast('Claimed '+C.claim()+' script(s)');renderProfile()};
  $('#del').onsubmit=function(e){e.preventDefault();if(!confirm('Delete your account and all your scripts? This cannot be undone.'))return;A.remove($('#dPw').value).then(function(){C.dropOwner(m.id);changed();location.hash='#/'},function(x){err($('#dErr'),x)})};
}
function renderPublisher(raw){
  var name=decodeURIComponent((raw.split('/')[1]||'')),u=A.byName(name),box=$('#pubBody');
  if(!u){box.innerHTML=head('Publisher','Not found','No publisher uses that name.');return}
  var list=C.vis().filter(function(s){return s.owner===u.id}),own=A.current()&&A.current().id===u.id;
  box.innerHTML='<div class="page-head"><div class="wrap pub-head">'+avatar(u,72)+'<div><p class="eyebrow">Publisher</p><h1>'+esc(u.name)+'</h1><p>@'+esc(u.username)+' · joined '+C.fmtDate(u.created)+' · '+stats(list)+'</p>'+(u.bio?'<p class="bio">'+esc(u.bio)+'</p>':'')+'</div></div></div><div class="wrap"><div class="cards" style="padding-top:28px">'+(list.length?list.map(C.cardHTML).join(''):'<div class="empty"><h3>No public scripts</h3></div>')+'</div></div>';
}
function renderPublishers(){
  var us=A.all(),pubs=us.map(function(u){return {u:u,n:C.vis().filter(function(s){return s.owner===u.id}).length}}).sort(function(a,b){return b.n-a.n});
  $('#pubsBody').innerHTML=head('Community','Publishers','Everyone who has an account on this device.')+'<div class="wrap"><div class="cards" style="padding-top:28px">'+(pubs.length?pubs.map(function(p){return '<a class="card pcard" href="#/u/'+esc(p.u.username)+'" style="opacity:1;animation:none">'+avatar(p.u,48)+'<h3>'+esc(p.u.name)+'</h3><p class="d">@'+esc(p.u.username)+' · '+p.n+' public script'+(p.n===1?'':'s')+'</p></a>'}).join(''):'<div class="empty"><h3>No publishers yet</h3><p><a href="#/auth"><u>Create the first account</u></a></p></div>')+'</div></div>';
}
function userSlot(){
  var m=A.current(),s=$('#userSlot');
  s.innerHTML=m?'<a class="userchip" href="#/profile" aria-label="Your profile">'+avatar(m,28)+'<span class="hide-sm">'+esc(m.username)+'</span></a><button class="btn btn-sm" id="so">Sign out</button>':'<a class="btn btn-sm" href="#/auth">Sign in</a>';
  var so=$('#so');if(so)so.onclick=function(){A.signOut();changed();location.hash='#/'};
  var pb=document.querySelector('.bar-actions .btn-primary');if(pb)pb.hidden=false;
}
function catChips(){
  if($('#catChips'))return;var chips=$('#chips');if(!chips)return;
  var d=document.createElement('div');d.className='chips';d.id='catChips';chips.parentNode.insertBefore(d,chips);
  d.onclick=function(e){var b=e.target.closest('[data-c]');if(!b)return;window.catFilter=b.dataset.c;draw();C.refresh()};draw();
  function draw(){var f=window.catFilter||'all';d.innerHTML=['all'].concat(C.cats).map(function(c){return '<button class="chip'+(c===f?' on':'')+'" data-c="'+esc(c)+'">'+(c==='all'?'All categories':esc(c))+'</button>'}).join('')}
}
function publishForm(){
  var a=$('#fAuthor');if(!a)return;var row=a.parentNode;
  row.innerHTML='<label class="l" for="fCat">Category</label><select class="field sel" id="fCat" style="width:100%">'+C.cats.map(function(c){return '<option>'+esc(c)+'</option>'}).join('')+'</select>';
  var v=document.createElement('div');v.innerHTML='<label class="l" for="fVis">Visibility</label><select class="field sel" id="fVis" style="width:100%"><option value="public">Public (anyone can view and download)</option><option value="private">Private (only you)</option></select>';
  row.parentNode.insertBefore(v,row.nextSibling);
}
window.AevyEco={render:function(h,raw){
  userSlot();
  if(h==='profile')renderProfile();
  if(h==='u')renderPublisher(raw);
  if(h==='publishers')renderPublishers();
  if(h==='scripts')catChips();
}};
publishForm();userSlot();
document.addEventListener('click',function(e){var c=e.target.closest('.pcard');if(c)e.stopPropagation()},true);
})();
