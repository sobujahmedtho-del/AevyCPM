/* Aevy local accounts. Everything lives in this browser's localStorage. */
(function(){
'use strict';
var UK='aevy.users.v1',SK='aevy.session';
function load(){try{return JSON.parse(localStorage.getItem(UK))||[]}catch(e){return[]}}
function save(u){localStorage.setItem(UK,JSON.stringify(u))}
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return ('0'+x.toString(16)).slice(-2)}).join('')}
function rnd(){var a=new Uint8Array(16);(window.crypto||{}).getRandomValues?crypto.getRandomValues(a):a.forEach(function(_,i){a[i]=Math.random()*256});return hex(a)}
function hash(pw,salt){
  if(window.crypto&&crypto.subtle){
    var enc=new TextEncoder();
    return crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveBits']).then(function(k){
      return crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:150000,hash:'SHA-256'},k,256)}).then(hex);
  }
  var h=5381,s=salt+pw;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;
  return Promise.resolve('x'+h);
}
var COLORS=['#c8f53c','#5ec8ff','#ff9f5a','#c792ff','#ff6b8b','#4de0b0'];
function pub(u){return u&&{id:u.id,username:u.username,name:u.name,bio:u.bio,color:u.color,created:u.created}}
var A=window.AevyAuth={
  current:function(){var id=localStorage.getItem(SK);return id?pub(load().filter(function(u){return u.id===id})[0]):null},
  byName:function(n){return pub(load().filter(function(u){return u.username===String(n).toLowerCase()})[0])},
  byId:function(id){return pub(load().filter(function(u){return u.id===id})[0])},
  all:function(){return load().map(pub)},
  signUp:function(o){
    var un=String(o.username||'').trim().toLowerCase();
    if(!/^[a-z0-9_]{3,20}$/.test(un))return Promise.reject(new Error('Username: 3 to 20 letters, numbers or underscores'));
    if((o.password||'').length<8)return Promise.reject(new Error('Password must be at least 8 characters'));
    var users=load();if(users.some(function(u){return u.username===un}))return Promise.reject(new Error('That username is taken'));
    var salt=rnd();
    return hash(o.password,salt).then(function(h){
      var u={id:'u'+rnd().slice(0,12),username:un,name:(o.name||un).trim().slice(0,40),bio:'',color:COLORS[users.length%COLORS.length],salt:salt,hash:h,created:Date.now()};
      users.push(u);save(users);localStorage.setItem(SK,u.id);return pub(u)});
  },
  signIn:function(un,pw){
    var u=load().filter(function(x){return x.username===String(un).trim().toLowerCase()})[0];
    if(!u)return Promise.reject(new Error('Wrong username or password'));
    return hash(pw,u.salt).then(function(h){
      if(h!==u.hash)throw new Error('Wrong username or password');
      localStorage.setItem(SK,u.id);return pub(u)});
  },
  signOut:function(){localStorage.removeItem(SK)},
  update:function(p){var me=A.current();if(!me)return;var us=load();us.forEach(function(u){if(u.id===me.id){if(p.name!=null)u.name=String(p.name).trim().slice(0,40)||u.name;if(p.bio!=null)u.bio=String(p.bio).slice(0,280);if(p.color)u.color=p.color}});save(us)},
  changePassword:function(oldPw,newPw){
    var me=A.current();if(!me)return Promise.reject(new Error('Sign in first'));
    if((newPw||'').length<8)return Promise.reject(new Error('New password must be at least 8 characters'));
    var us=load(),u=us.filter(function(x){return x.id===me.id})[0];
    return hash(oldPw,u.salt).then(function(h){if(h!==u.hash)throw new Error('Current password is wrong');var s=rnd();return hash(newPw,s).then(function(n){u.salt=s;u.hash=n;save(us)})});
  },
  remove:function(pw){
    var me=A.current();if(!me)return Promise.reject(new Error('Sign in first'));
    var us=load(),u=us.filter(function(x){return x.id===me.id})[0];
    return hash(pw,u.salt).then(function(h){if(h!==u.hash)throw new Error('Password is wrong');save(us.filter(function(x){return x.id!==me.id}));localStorage.removeItem(SK)});
  }
};
})();
