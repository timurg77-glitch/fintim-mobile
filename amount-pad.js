(function(root){
'use strict';
function edit(value,key){
 const raw=String(value).replace(/[\s\u00a0\u202f]/g,'').replace('.',',');
 if(key==='clear')return '';
 if(key==='backspace')return raw.slice(0,-1);
 if(key===','||key==='.')return raw.includes(',')?raw:(raw||'0')+',';
 if(!/^[0-9]$/.test(key))return raw;
 const next=raw==='0'?key:raw+key;
 const parts=next.split(',');
 if(parts[0].length>14||(parts[1]||'').length>2||Number(next.replace(',','.'))>1e13)return raw;
 return next;
}
function format(raw){const parts=raw.split(',');return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+(parts.length>1?','+parts[1]:'');}
const api={edit,format};if(typeof module!=='undefined')module.exports=api;else root.FinTimAmountPad=api;
})(typeof window==='undefined'?globalThis:window);
