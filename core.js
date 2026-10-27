/* Shared protocol functions; no network or Telegram token. */
(function(root){
'use strict';
const guid=/^[a-f0-9]{32}$/i;
function amount(text){const s=String(text).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');if(!/^\d{1,14}(\.\d{1,2})?$/.test(s)||Number(s)<=0||Number(s)>1e13)throw Error('Укажите сумму больше нуля, не более двух знаков после запятой.');return s;}
function catalog(c){if(!c||c.Version!==1||!guid.test(c.LedgerId)||!Array.isArray(c.Categories)||!Array.isArray(c.Sources)||c.Categories.length>2000||c.Sources.length>1000)throw Error('Нужен справочник, экспортированный из FinTim.');const ids=new Set();for(const a of c.Categories){if(!guid.test(a.Id)||ids.has(a.Id)||typeof a.Name!=='string'||a.Name.length>500||!['Расход','Доход'].includes(a.Kind)||!Array.isArray(a.Subcategories)||a.Subcategories.length>2000||a.Subcategories.some(s=>typeof s!=='string'||!s||s.length>500))throw Error('Некорректные категории в файле.');ids.add(a.Id);}for(const a of c.Sources)if(!guid.test(a.Id)||typeof a.Name!=='string'||!a.Name||a.Name.length>500)throw Error('Некорректные источники.');if(!c.Sources.length)throw Error('Добавьте источник в FinTim и экспортируйте справочник снова.');return c;}
function dateLocal(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function operation(c,fields,id,today=dateLocal()){
 const a=c.Categories.find(x=>x.Id===fields.CategoryId&&x.Kind===fields.Kind);if(!a||!a.Subcategories.includes(fields.Subcategory))throw Error('Выберите категорию и подкатегорию.');
 if(!c.Sources.some(x=>x.Id===fields.SourceId))throw Error('Выберите источник.');
 const d=fields.Date;if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d<'1900-01-01'||d>today||new Date(d+'T12:00:00Z').toISOString().slice(0,10)!==d)throw Error('Проверьте дату. Будущие даты для факта не подходят.');
 if(!guid.test(id))throw Error('Не удалось создать номер записи.');if((fields.Note||'').length>500)throw Error('Заметка длиннее 500 символов.');
 const p={Version:1,Id:id,LedgerId:c.LedgerId,Date:d,Kind:fields.Kind,CategoryId:a.Id,Subcategory:fields.Subcategory,SourceId:fields.SourceId,Amount:amount(fields.Amount),Currency:'RUB',Note:fields.Note||''};
 if(new TextEncoder().encode(JSON.stringify(p)).length>4096)throw Error('Запись слишком длинная для Telegram. Сократите заметку.');return p;
}
const api={amount,catalog,operation,dateLocal};if(typeof module!=='undefined')module.exports=api;else root.FinTimCore=api;
})(typeof window==='undefined'?globalThis:window);
