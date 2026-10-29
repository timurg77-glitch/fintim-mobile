'use strict';
const $=id=>document.getElementById(id), core=FinTimCore, tg=window.Telegram?.WebApp;
let cat=null,records=[],kind='Расход',category=null,sub='',locked=false,damagedStorage=false,amountConfirmed=false;
const key='fintim.mobile.v1';
function notice(text){$('notice').textContent=text;}
function save(){if(damagedStorage)throw Error('Сохранённые данные повреждены. Не очищайте браузер; сначала восстановите локальную историю.');try{localStorage.setItem(key,JSON.stringify({catalog:cat,records}));}catch{throw Error('Не удалось сохранить копию на телефоне. Освободите место или разрешите хранение данных сайта. Запись не отправлена.');}}
function uuid(){if(!window.crypto?.getRandomValues)throw Error('Откройте форму по защищённому HTTPS-адресу.');const bytes=crypto.getRandomValues(new Uint8Array(16));return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
function onlineTelegram(){return tg&&tg.platform&&tg.platform!=='unknown'&&!tg.initDataUnsafe?.query_id;}
function button(text,action,selected=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-pressed',String(selected));b.onclick=action;return b;}
function renderChoices(){
 updateAmountStep();
 $('categories').replaceChildren();$('subcategories').replaceChildren();$('search').hidden=!!category;$('changeCategory').hidden=!category;$('selectedCategory').hidden=!category;
 if(category){$('selectedCategory').textContent=category.Name;const localUses=s=>records.filter(r=>r.payload.CategoryId===category.Id&&r.payload.Subcategory===s).length;const list=category.Subcategories.slice().sort((a,b)=>localUses(b)-localUses(a));for(const s of (sub?[sub]:list))$('subcategories').append(button(s,()=>{sub=s;renderChoices();offerSubmit();},s===sub));if(sub)$('subcategories').append(button('Другие',()=>{sub='';renderChoices();}));return;}
 const q=$('search').value.toLocaleLowerCase('ru');const uses=c=>records.filter(r=>r.payload.CategoryId===c.Id).length;
 const list=cat.Categories.filter(c=>c.Kind===kind&&(!q||[c.Name,...c.Subcategories].join(' ').toLocaleLowerCase('ru').includes(q))).sort((a,b)=>uses(b)-uses(a));
 for(const c of list)$('categories').append(button(c.Name,()=>{category=c;sub=c.Subcategories.length===1?c.Subcategories[0]:'';renderChoices();if(sub)offerSubmit();}));
 if(!list.length)$('categories').textContent='Категории не найдены. Обновите справочник или измените поиск.';
}
function render(){
 $('count').textContent=records.length;$('setup').hidden=!!cat;$('entry').hidden=!cat;$('history').hidden=true;
 if(!cat)return;const previous=$('source').value;$('source').replaceChildren();const uses=s=>records.filter(r=>r.payload.SourceId===s.Id).length;
 const sources=cat.Sources.slice().sort((a,b)=>uses(b)-uses(a));for(const s of sources){const o=document.createElement('option');o.value=s.Id;o.textContent=s.Name;$('source').append(o);}if(sources.some(s=>s.Id===previous))$('source').value=previous;
 $('catalogInfo').textContent='Справочник: '+(cat.Exported||'загружен');renderChoices();
}
async function loadCatalog(input){try{const f=input.files[0];if(!f)return;if(f.size>2*1024*1024)throw Error('Файл слишком большой. Выберите справочник FinTim.');const next=core.catalog(JSON.parse(await f.text()));if(cat&&cat.LedgerId!==next.LedgerId&&records.length&&!confirm('Это справочник другой базы. Старые записи останутся в истории и относятся к прежней базе. Заменить справочник?'))return;const old=cat;cat=next;try{save();}catch(e){cat=old;throw e;}category=null;sub='';render();notice('Справочник загружен. Введите сумму, затем выберите категорию.');focusAmount();}catch(e){notice(e.message);}finally{input.value='';}}
function transfer(record){
 if(!onlineTelegram()){notice('Копия сохранена на телефоне. Для отправки откройте эту форму кнопкой «Добавить операцию» в чате с вашим ботом. В браузере можно сохранить файл и импортировать его в FinTim.');locked=false;$('send').disabled=false;return;}
 if(!navigator.onLine){notice('Нет интернета. Копия сохранена. Отправьте её из Истории, когда связь появится.');locked=false;$('send').disabled=false;return;}
 try{tg.sendData(JSON.stringify(record.payload));notice('Передано Telegram. Получение проверьте в FinTim. Копия осталась в Истории.');}
 catch{notice('Telegram не принял отправку. Копия сохранена: повторите из Истории через кнопку бота.');}
 // Telegram normally closes this keyboard Mini App. Unlock if it stays open.
 setTimeout(()=>{locked=false;$('send').disabled=false;},1500);
}
$('send').onclick=()=>{
 if(locked)return;locked=true;$('send').disabled=true;
 try{if(!cat)throw Error('Сначала загрузите справочник.');if(records.length>=2000)throw Error('В истории 2000 записей. Сохраните копию и удалите уже полученные записи.');
 const payload=core.operation(cat,{Kind:kind,CategoryId:category?.Id,Subcategory:sub,SourceId:$('source').value,Date:$('date').value,Amount:$('amount').value,Note:$('note').value.trim()},uuid());
 const record={payload,category:category.Name,source:$('source').selectedOptions[0].textContent,saved:new Date().toISOString()};records.push(record);try{save();}catch(e){records.pop();throw e;}
 $('count').textContent=records.length;$('amount').value='';$('note').value='';amountConfirmed=false;updateAmountStep();transfer(record);
 }catch(e){notice(e.message);locked=false;$('send').disabled=false;}
};
function history(){
 $('setup').hidden=true;$('entry').hidden=true;$('history').hidden=false;$('records').replaceChildren();
 if(!records.length)$('records').textContent='Записей пока нет.';
 for(const r of records.slice().reverse()){
 const card=document.createElement('article');card.className='record';const amount=document.createElement('strong');amount.textContent=Number(r.payload.Amount).toLocaleString('ru-RU',{maximumFractionDigits:0})+' ₽';
 const line=document.createElement('p');line.textContent=[r.payload.Date,r.payload.Kind,r.category,r.payload.Subcategory].join(' · ');const note=document.createElement('p');note.textContent=r.payload.Note;
 const id=document.createElement('p');id.className='muted';id.textContent='Запись '+r.payload.Id.slice(0,8)+' · '+r.source;
 const actions=document.createElement('div');actions.className='actions';actions.append(button('Отправить повторно',()=>{if(locked)return;locked=true;transfer(r);}));actions.append(button('Убрать копию',()=>{if(!confirm('Удалить копию с телефона? Сначала убедитесь, что запись появилась в FinTim.'))return;const old=records;records=records.filter(x=>x.payload.Id!==r.payload.Id);try{save();$('count').textContent=records.length;history();}catch(e){records=old;notice(e.message);}}));card.append(amount,line,note,id,actions);$('records').append(card);
 }
}
async function exportRecords(shareMode=false){try{
 if(!records.length)throw Error('Нет записей для сохранения.');const content=JSON.stringify({Version:1,Operations:records.map(r=>r.payload)},null,2);const file=new File([content],'FinTim-operations-'+core.dateLocal()+'.json',{type:'application/json'});
 if(shareMode&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Копия операций FinTim'});return;}
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch(e){if(e.name!=='AbortError')notice(e.message);}}
$('export').onclick=()=>exportRecords(false);$('share').onclick=()=>exportRecords(true);$('share').hidden=!navigator.share;
$('historyButton').onclick=history;$('back').onclick=render;$('catalogFile').onchange=()=>loadCatalog($('catalogFile'));$('catalogAgain').onchange=()=>loadCatalog($('catalogAgain'));$('search').oninput=renderChoices;
$('changeCategory').onclick=()=>{category=null;sub='';$('search').value='';renderChoices();};
for(const [id,value] of [['expense','Расход'],['income','Доход']])$(id).onclick=()=>{kind=value;category=null;sub='';$('search').value='';$('expense').setAttribute('aria-pressed',String(kind==='Расход'));$('income').setAttribute('aria-pressed',String(kind==='Доход'));renderChoices();};
$('amount').onblur=()=>{try{$('amount').value=Number(core.amount($('amount').value)).toLocaleString('ru-RU',{maximumFractionDigits:2});}catch{}};
$('date').value=core.dateLocal();$('date').max=core.dateLocal();
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){if(saved.catalog)cat=core.catalog(saved.catalog);if(!Array.isArray(saved.records))throw Error('Повреждена история');records=saved.records;}}catch{damagedStorage=true;notice('Не удалось прочитать сохранённые данные. Не очищайте браузер; восстановите справочник и копию операций.');$('send').disabled=true;locked=true;}
render();if(tg){tg.ready();tg.expand();}if(cat&&!damagedStorage)focusAmount();if(!onlineTelegram()&&!$('notice').textContent)notice('Форма открыта в браузере. Можно подготовить запись и сохранить файл. Отправка боту доступна через его кнопку «Добавить операцию».');

function focusAmount(){
 if(!cat||damagedStorage||$('entry').hidden)return;
 $('amount').focus({preventScroll:true});
 // iOS may require a direct tap before showing its keyboard; never steal focus later.
}
function updateAmountStep(){
 $('amountDone').setAttribute('aria-pressed',String(amountConfirmed));
 $('amountDone').classList.toggle('confirmed',amountConfirmed);
 $('nextStep').textContent=category&&sub?(amountConfirmed?'Проверьте запись и нажмите «Добавить операцию».':'Проверьте сумму и нажмите ✓, затем добавьте операцию.'):(amountConfirmed?'Выберите категорию и подкатегорию.':'Сначала введите сумму и нажмите ✓.');
}
function offerSubmit(){
 updateAmountStep();
 if(amountConfirmed&&category&&sub){document.activeElement?.blur();$('send').scrollIntoView({behavior:'smooth',block:'nearest'});}
}
function finishAmount(){
 try{
  $('amount').value=Number(core.amount($('amount').value)).toLocaleString('ru-RU',{maximumFractionDigits:2});
  amountConfirmed=true;$('amount').blur();document.activeElement?.blur();
  if(tg?.isVersionAtLeast?.('9.1'))tg.hideKeyboard?.();
  updateAmountStep();
  const target=category&&sub?$('send'):$('categoryStep');
  target.focus({preventScroll:true});target.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){notice(e.message);amountConfirmed=false;updateAmountStep();$('amount').focus();}
}
$('amountDone').onclick=finishAmount;
$('amount').addEventListener('input',()=>{amountConfirmed=false;updateAmountStep();});
$('amount').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();finishAmount();}});
