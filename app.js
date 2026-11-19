(function(){
const root=document.getElementById('root');
const LOGO='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="38" height="38" aria-hidden="true"> <defs> <linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#37795a"/><stop offset="1" stop-color="#265a42"/> </linearGradient> <clipPath id="nclip"><path d="M236 600 H788 C788 742 668 812 512 812 C356 812 236 742 236 600 Z"/></clipPath> </defs> <rect width="1024" height="1024" fill="url(#nbg)"/> <path d="M232 468 L512 238 L792 468" fill="none" stroke="#f5f0e6" stroke-width="86" stroke-linecap="round" stroke-linejoin="round"/> <ellipse cx="404" cy="566" rx="76" ry="98" fill="#f5f0e6" transform="rotate(-10 404 566)"/> <ellipse cx="620" cy="566" rx="76" ry="98" fill="#f5f0e6" transform="rotate(10 620 566)"/> <ellipse cx="512" cy="536" rx="84" ry="110" fill="#fffaf0"/> <path d="M236 600 H788 C788 742 668 812 512 812 C356 812 236 742 236 600 Z" fill="#cf5a3f"/> <g clip-path="url(#nclip)" stroke="#a9432c" stroke-width="20" stroke-linecap="round" fill="none"> <path d="M250 648 C400 690 620 690 774 648"/> <path d="M280 706 C420 742 604 742 744 706"/> <path d="M330 760 C450 784 574 784 694 760"/> </g> <path d="M220 600 H804" stroke="#e8795d" stroke-width="30" stroke-linecap="round"/> </svg>';
const DEFAULT={v:2,name:'Our home',currency:'€',members:[],expenses:[],items:[],freq:{},pantry:[],meals:{},recipes:{},chores:[],events:[],notes:[],bills:[]};
const clone=o=>JSON.parse(JSON.stringify(o));
function load(txt){let s;try{s=JSON.parse(txt)}catch(e){s={}}const o={};for(const k in DEFAULT)o[k]=(s&&s[k]!=null)?s[k]:clone(DEFAULT[k]);o.v=2;return o}
let state=load('{}');

const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const SS={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},del(k){try{sessionStorage.removeItem(k)}catch(e){}}};
let me=null,status='';
let sheet=null,armed=null,armTimer=null,sumMonth=null,mealWeek=null;

const COLORS=['#2f6b4f','#b8513a','#3d5a80','#8a5a9e','#b07812','#4a7c7e','#a0522d','#5b6b2f'];
const CATS=[['groceries','🛒','Groceries'],['rent','🏠','Rent'],['bills','💡','Bills'],['internet','📶','Internet'],['household','🧽','Household'],['food','🍕','Eating out'],['transport','🚗','Transport'],['other','📦','Other']];
const ETYPES=[['guest','🛏️','Guest'],['away','✈️','Away'],['cleaner','🧹','Cleaner'],['repair','🔧','Repair'],['party','🎉','Party'],['other','📌','Other']];
const ICONS=['🗑️','🛁','🍳','🧹','♻️','🧺','🪴','🐾','🧽','🪟'];
const AISLES=[
 ['Fruit & veg',/(apple|banana|tomato|onion|potato|lettuce|carrot|lemon|lime|garlic|fruit|veg|pepper|avocado|orange|spinach|cucumber|berr|grape|melon|mushroom|zucchini|courgette|broccoli|herb|parsley|basil|ginger|manzana|pl[aá]tano|tomate|cebolla|patata|lechuga|zanahoria|lim[oó]n|ajo|naranja|fresa|pimiento|pepino|aguacate|calabac)/i],
 ['Dairy & eggs',/(milk|cheese|yog|butter|egg|cream|kefir|leche|queso|yogur|mantequilla|huevo|nata)/i],
 ['Meat & fish',/(chicken|beef|pork|fish|salmon|tuna|ham|bacon|sausage|turkey|mince|shrimp|prawn|pollo|ternera|cerdo|pescado|salm[oó]n|at[uú]n|jam[oó]n|chorizo|gamba|pavo|carne)/i],
 ['Bakery',/(bread|baguette|croissant|bun|bagel|tortilla|\bpan\b|barra|bollo)/i],
 ['Frozen',/(frozen|ice cream|helado|congelad|pizza)/i],
 ['Drinks',/(water|beer|wine|juice|soda|cola|coke|tonic|agua|cerveza|vino|zumo|refresco)/i],
 ['Household',/(soap|detergent|toilet|paper|bin bag|sponge|shampoo|toothpaste|cleaner|bleach|towel|foil|battery|bulb|jab[oó]n|detergente|papel|bolsa|esponja|champ[uú]|lej[ií]a|suavizante|lavavajillas)/i],
 ['Pantry',/(rice|pasta|spaghetti|flour|sugar|oil|salt|coffee|tea\b|cereal|bean|sauce|spice|vinegar|honey|jam|oat|chickpea|lentil|soup|tinned|chocolate|biscuit|cookie|crisps|nuts|stock|arroz|harina|az[uú]car|aceite|\bsal\b|caf[eé]|garbanzo|lenteja|salsa|vinagre|miel|galleta)/i]
];
const AISLE_ORDER=['Fruit & veg','Bakery','Dairy & eggs','Meat & fish','Pantry','Frozen','Drinks','Household','Other'];
const GROUPS=[
 {k:'home',i:'🏡',l:'Home',subs:[['home','Home']]},
 {k:'food',i:'🧺',l:'Food',subs:[['list','List'],['pantry','Pantry'],['meals','Meals']]},
 {k:'money',i:'💶',l:'Money',subs:[['expenses','Expenses'],['bills','Bills'],['summary','Summary']]},
 {k:'house',i:'🧹',l:'House',subs:[['chores','Chores'],['calendar','Calendar'],['board','Board']]},
 {k:'people',i:'👥',l:'People',subs:[['people','People']]}];
const ROUTES=['home','list','pantry','meals','expenses','bills','summary','chores','calendar','board','people','shop'];

/* ---------- helpers ---------- */
const aisleOf=n=>{for(const a of AISLES)if(a[1].test(n))return a[0];return 'Other'};
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function money(c){const v=(Math.abs(c)/100).toFixed(2),cur=state.currency;return (c<0?'−':'')+(cur==='€'?v.replace('.',',')+' €':cur+v)}
const signed=c=>(c>0?'+':'')+money(c);
function shortMoney(c){const v=Math.round(c/100);return state.currency==='€'?v+'€':state.currency+v}
function parseAmt(s){s=String(s||'').replace(/[^\d,.]/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');const n=parseFloat(s);return isFinite(n)?Math.round(n*100):NaN}
const parseNum=s=>{const n=parseFloat(String(s||'').replace(',','.'));return isFinite(n)?n:NaN};
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>iso(new Date());
const parseD=s=>new Date(s+'T12:00:00');
const addDays=(s,n)=>{const d=parseD(s);d.setDate(d.getDate()+n);return iso(d)};
const daysBetween=(a,b)=>Math.round((parseD(b)-parseD(a))/864e5);
const monday=s=>{const d=parseD(s);d.setDate(d.getDate()-(d.getDay()+6)%7);return iso(d)};
const weekIdx=s=>Math.round(daysBetween('2024-01-01',monday(s))/7);
const addMonths=(m,n)=>{const d=parseD(m+'-01');d.setMonth(d.getMonth()+n);return iso(d).slice(0,7)};
const fmtDate=s=>parseD(s).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const monthLabel=m=>parseD(m+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
function dayLabel(s){const n=daysBetween(today(),s);if(n===0)return 'Today';if(n===1)return 'Tomorrow';return parseD(s).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
const mem=id=>state.members.find(m=>m.id===id)||null;
const nm=id=>{const m=mem(id);return m?m.name:'Someone'};
const active=()=>state.members.filter(m=>!m.gone);
const color=id=>{const i=state.members.findIndex(m=>m.id===id);return COLORS[(i<0?0:i)%COLORS.length]};
const catOf=k=>CATS.find(c=>c[0]===k)||CATS[CATS.length-1];
const etype=k=>ETYPES.find(c=>c[0]===k)||ETYPES[ETYPES.length-1];
const empty=(t,s)=>`<div class="empty"><b>${t}</b>${s}</div>`;
const onList=name=>state.items.some(i=>!i.done&&i.name.toLowerCase()===name.toLowerCase());
function view(){const h=location.hash.slice(1);if(h==='groceries')return 'list';return ROUTES.includes(h)?h:'home'}
const groupOf=v=>GROUPS.find(g=>g.subs.some(s=>s[0]===v))||GROUPS[0];
function delBtn(key){return armed===key?`<button class="x armed" data-act="del" data-k="${key}">Delete?</button>`:`<button class="x" data-act="arm" data-k="${key}" aria-label="Delete">×</button>`}
function toast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.style.opacity=1;clearTimeout(toast._t);toast._t=setTimeout(()=>{t.style.opacity=0},2200)}
if(me&&!mem(me))me=null;

/* ---------- money maths ---------- */
function balances(){const b={};state.members.forEach(m=>b[m.id]=0);state.expenses.forEach(e=>{if(b[e.paidBy]!==undefined)b[e.paidBy]+=e.amount;Object.keys(e.shares).forEach(id=>{if(b[id]!==undefined)b[id]-=e.shares[id]})});return b}
function settleUp(b){const d=[],c=[];Object.keys(b).forEach(id=>{if(b[id]<0)d.push([id,-b[id]]);else if(b[id]>0)c.push([id,b[id]])});d.sort((a,b)=>b[1]-a[1]);c.sort((a,b)=>b[1]-a[1]);const out=[];let i=0,j=0;while(i<d.length&&j<c.length){const x=Math.min(d[i][1],c[j][1]);if(x>0)out.push({from:d[i][0],to:c[j][0],amount:x});d[i][1]-=x;c[j][1]-=x;if(d[i][1]===0)i++;if(c[j][1]===0)j++}return out}
function equalShares(total,ids){const n=ids.length,base=Math.floor(total/n);let rem=total-base*n;const s={};ids.forEach(id=>{s[id]=base+(rem>0?1:0);if(rem>0)rem--});return s}
function proportional(total,w){const ids=Object.keys(w).filter(id=>w[id]>0);const W=ids.reduce((a,id)=>a+w[id],0);if(!ids.length||!(W>0))return null;const raw=ids.map(id=>({id,v:total*w[id]/W}));const s={};let used=0;raw.forEach(r=>{s[r.id]=Math.floor(r.v);used+=s[r.id]});let rem=total-used;raw.sort((a,b)=>(b.v-Math.floor(b.v))-(a.v-Math.floor(a.v)));for(let i=0;rem>0;i=(i+1)%raw.length){s[raw[i].id]++;rem--}return s}
function computeSplit(total,spec){const act=new Set(active().map(m=>m.id));
 if(spec.mode==='equal'){const ids=(spec.inc||[]).filter(id=>act.has(id));if(!ids.length)return{err:'Pick at least one person'};return{shares:equalShares(total,ids)}}
 const v={};Object.keys(spec.vals||{}).forEach(id=>{if(!act.has(id))return;const x=spec.mode==='exact'?parseAmt(spec.vals[id]):parseNum(spec.vals[id]);if(x>0)v[id]=x});
 if(!Object.keys(v).length)return{err:'Enter a value for at least one person'};
 const sum=Object.values(v).reduce((a,b)=>a+b,0);
 if(spec.mode==='exact'){if(sum!==total)return{err:sum<total?money(total-sum)+' still to assign':'Over by '+money(sum-total)};return{shares:v}}
 if(spec.mode==='percent'&&Math.abs(sum-100)>0.01)return{err:'Adds up to '+(Math.round(sum*100)/100)+'%, needs to be 100%'};
 return{shares:proportional(total,v)}}
const splitLabel=s=>!s||s.mode==='equal'?'split equally':s.mode==='exact'?'split by amounts':s.mode==='percent'?'split by %':'split by shares';

/* ---------- bills, chores, events ---------- */
const billDue=(b,m)=>m+'-'+pad(Math.min(Math.max(b.day||1,1),28));
function billInfo(b){const m=today().slice(0,7);const logged=!!(b.lastLogged&&b.lastLogged>=m);const due=logged?billDue(b,addMonths(m,1)):billDue(b,m);return{logged,due,days:daysBetween(today(),due)}}
const dueBills=()=>state.bills.map(b=>Object.assign({b},billInfo(b))).filter(x=>!x.logged&&x.days<=7).sort((a,b)=>a.days-b.days);
const dueText=d=>d<0?'Overdue by '+(-d)+' day'+(d===-1?'':'s'):d===0?'Due today':d===1?'Due tomorrow':'Due in '+d+' days';
function choreWho(c,wk){const rota=(c.rota||[]).filter(id=>{const m=mem(id);return m&&!m.gone});if(!rota.length)return null;const n=rota.length;return rota[(((weekIdx(wk)+(c.offset||0))%n)+n)%n]}
function occurrences(from,to){const out=[];state.events.forEach(e=>{if(e.repeat==='weekly'){let d=e.date;if(d<from)d=addDays(d,Math.ceil(daysBetween(d,from)/7)*7);for(;d<=to;d=addDays(d,7))out.push({e,date:d})}else{const end=e.end&&e.end>e.date?e.end:e.date;if(end>=from&&e.date<=to)out.push({e,date:e.date<from?from:e.date,ongoing:e.date<from})}});return out.sort((a,b)=>a.date.localeCompare(b.date)||(a.e.time||'').localeCompare(b.e.time||''))}

/* ---------- sync engine (Supabase) ---------- */
const CFG=window.NIDO_CONFIG||{};
let sb=null,hh=null,ver=0,base=null,dirty=false,saving=false,myEmail='',memberships=[],pendingRender=false,phase='boot',authStep={},channel=null,saveTimer=null;
const ARR_KEYS=['members','expenses','items','pantry','chores','events','notes','bills'],OBJ_KEYS=['meals','recipes','freq'],J=JSON.stringify;
function mergeArr(b,l,r){b=b||[];l=l||[];r=r||[];const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),out=[],seen=new Set();
 r.forEach(x=>{seen.add(x.id);const inB=bm.has(x.id),inL=lm.has(x.id);if(inB&&!inL)return;if(inL&&(!inB||J(lm.get(x.id))!==J(bm.get(x.id))))out.push(lm.get(x.id));else out.push(x)});
 l.forEach(x=>{if(seen.has(x.id))return;if(!bm.has(x.id)||J(x)!==J(bm.get(x.id)))out.push(x)});return out}
function mergeObj(b,l,r){b=b||{};l=l||{};r=r||{};const out=Object.assign({},r);new Set(Object.keys(b).concat(Object.keys(l))).forEach(k=>{const inB=k in b,inL=k in l;if(inB&&!inL){delete out[k];return}if(inL&&(!inB||J(l[k])!==J(b[k])))out[k]=l[k]});return out}
function merge3(b,l,r){const o={};for(const k in DEFAULT){if(ARR_KEYS.includes(k))o[k]=mergeArr(b[k],l[k],r[k]);else if(OBJ_KEYS.includes(k))o[k]=mergeObj(b[k],l[k],r[k]);else o[k]=J(l[k])!==J(b[k])?l[k]:r[k]}o.v=2;return o}
const cacheKey=()=>'nido_cache_'+hh;
function cacheLocal(){if(hh)LS.set(cacheKey(),J({state,base,ver,dirty,memberships}))}
function commit(){render();dirty=true;cacheLocal();setStatus('pending');clearTimeout(saveTimer);saveTimer=setTimeout(save,600)}
async function save(){if(saving||!dirty||!hh||!sb)return;saving=true;dirty=false;setStatus('saving');
 try{for(let i=0;i<6;i++){const snap=clone(state);
   const {data,error}=await sb.from('households').update({data:snap,version:ver+1,updated_at:new Date().toISOString()}).eq('id',hh).eq('version',ver).select('version');
   if(error)throw error;
   if(data&&data.length){ver=data[0].version;base=snap;if(J(state)!==J(snap))dirty=true;break}
   const r=await sb.from('households').select('data,version').eq('id',hh).single();if(r.error)throw r.error;
   const remote=load(J(r.data.data));state=merge3(base,state,remote);base=clone(remote);ver=r.data.version;softRender()}
  setStatus(dirty?'pending':'saved');cacheLocal()}
 catch(e){console.warn('save failed',e);dirty=true;setStatus(navigator.onLine===false?'offline':'error');cacheLocal();clearTimeout(saveTimer);saveTimer=setTimeout(save,5000)}
 saving=false;if(dirty&&navigator.onLine!==false){clearTimeout(saveTimer);saveTimer=setTimeout(save,300)}}
function onRemote(row){if(!row||row.version<=ver)return;const remote=load(J(row.data));if(!dirty&&!saving)state=clone(remote);else state=merge3(base,state,remote);base=remote;ver=row.version;cacheLocal();softRender()}
async function pull(){if(!sb||!hh)return;try{const r=await sb.from('households').select('data,version').eq('id',hh).single();if(!r.error)onRemote(r.data);await loadMemberships();softRender();if(dirty)save()}catch(e){}}
async function loadMemberships(){if(!sb||!hh)return;const r=await sb.from('household_members').select('email,member_id').eq('household_id',hh);if(!r.error){memberships=r.data||[];const mine=memberships.find(m=>m.email===myEmail);me=mine&&mine.member_id&&mem(mine.member_id)?mine.member_id:null}}
function softRender(){if(phase!=='ready'){return}if(sheet){pendingRender=true;return}const keep={};['gname','gqty','pname','ntext','mname'].forEach(id=>{const e=document.getElementById(id);if(e&&e.value)keep[id]=e.value});const a=document.activeElement,fid=a&&a.id,y=window.scrollY;render();Object.keys(keep).forEach(id=>{const e=document.getElementById(id);if(e)e.value=keep[id]});if(fid){const e=document.getElementById(fid);if(e)e.focus({preventScroll:true})}window.scrollTo(0,y)}
function setStatus(s){status=s;const el=document.getElementById('status');if(!el)return;const map={pending:['Saving…','saving'],saving:['Saving…','saving'],saved:['Saved ✓','ok'],error:['Retrying…','bad'],offline:['Offline','bad']};const m=map[s]||['',''];el.textContent=m[0];el.className='status '+m[1]}
const myMembership=()=>memberships.find(m=>m.email===myEmail)||null;
const linkedMember=()=>{const m=myMembership();return m&&m.member_id?mem(m.member_id):null};
const emailOf=id=>{const m=memberships.find(x=>x.member_id===id);return m?m.email:''};
function claimBanner(){if(!hh||linkedMember())return '';const taken=new Set(memberships.map(m=>m.member_id).filter(Boolean));const free=active().filter(m=>!taken.has(m.id));if(!free.length)return '';
 return `<div class="card" style="border-color:var(--green)"><h2>Which housemate are you?</h2><p class="meta" style="margin-top:0">Tap your name once to link it to ${esc(myEmail)}.</p><div class="chips" style="margin-top:0">${free.map(m=>`<button class="chip" data-act="claim" data-k="${m.id}">${esc(m.name)}</button>`).join('')}</div></div>`}
const fsize=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const docCount=(b,m)=>(b&&b.docs||[]).filter(x=>!m||x.month===m).length;
const safeName=n=>String(n||'file').normalize('NFKD').replace(/[^\w.\-]+/g,'_').slice(-80);
async function uploadDocs(files){const b=state.bills.find(x=>x.id===sheet.id);if(!b||!sb||!files.length)return;
 const month=(document.getElementById('dmonth')||{}).value||today().slice(0,7);sheet.month=month;sheet.err='';sheet.uploading=true;render();let ok=0;
 for(const f of files){if(f.size>20*1024*1024){sheet.err=f.name+' is over the 20 MB limit';continue}
  const path=hh+'/'+uid()+'-'+safeName(f.name);
  try{const {error}=await sb.storage.from('nido-files').upload(path,f,{contentType:f.type||'application/octet-stream',upsert:false});if(error)throw error;b.docs=b.docs||[];b.docs.push({id:path,name:f.name,type:f.type,size:f.size,month,at:Date.now(),by:me});ok++}catch(e){console.warn(e);sheet.err='Couldn’t upload '+f.name}}
 sheet.uploading=false;render();if(ok){toast(ok+' document'+(ok>1?'s':'')+' saved to '+b.name);dirty=true;cacheLocal();save()}}
async function openDoc(path){const w=window.open('','_blank');try{const {data,error}=await sb.storage.from('nido-files').createSignedUrl(path,3600);if(error)throw error;if(w)w.location.href=data.signedUrl;else location.href=data.signedUrl}catch(e){if(w)w.close();toast('Couldn’t open the document')}}

/* ---------- render ---------- */
function render(){
 if(phase!=='ready'){root.innerHTML=vGate();return}
 const v=view(),act=active();
 let h='<div class="wrap">';
 if(v==='shop'){h+=vShop()}else{
  const g=groupOf(v);LS.set('hh_sub_'+g.k,v);
  h+='<header><a href="#home" class="logo" aria-label="Nido home">'+LOGO+'</a><div class="grow"><div class="appname">Nido</div><h1>'+esc(state.name)+'</h1></div><span id="status" class="status"></span>';
  const lm=linkedMember();
  if(lm)h+='<a class="mepill" href="#people" title="'+esc(myEmail)+'">👤 '+esc(lm.name)+'</a>';
  h+='</header>';
  if(v!=='people')h+=claimBanner();
  if(g.subs.length>1)h+='<div class="seg">'+g.subs.map(s=>`<a href="#${s[0]}" class="${s[0]===v?'on':''}">${s[1]}</a>`).join('')+'</div>';
  h+=({home:vHome,list:vList,pantry:vPantry,meals:vMeals,expenses:vExpenses,bills:vBills,summary:vSummary,chores:vChores,calendar:vCalendar,board:vBoard,people:vPeople})[v]();
 }
 h+='</div>';
 if(v!=='shop'){const g=groupOf(v);h+='<nav><div class="in">'+GROUPS.map(x=>`<a href="#${LS.get('hh_sub_'+x.k)||x.subs[0][0]}" class="${x.k===g.k?'on':''}"><span>${x.i}</span>${x.l}</a>`).join('')+'</div></nav>'}
 if(sheet)h+=vSheet();
 root.innerHTML=h;setStatus(status);
}
const needPeople=n=>empty(n>1?'Add your housemates first':'Add people first',n>1?'Splitting needs at least two people.':'Add who lives here to get started.')+'<div style="text-align:center"><a class="btn" href="#people">Add people</a></div>';

function vHome(){
 const act=active();
 if(!act.length)return '<div class="card"><h2>Welcome to Nido 👋</h2><p style="margin-top:0">This is your house’s shared space: shopping list, pantry, meals, money, chores, calendar and notes. Start by adding who lives here.</p><a class="btn" href="#people">Add people</a></div>';
 const b=balances(),meM=me&&mem(me),mine=meM?b[me]:null,listN=state.items.filter(i=>!i.done).length;
 let h=`<div class="hello">${meM?'Hi '+esc(meM.name)+' 👋':'Hello 👋'}<div class="meta" style="font-family:Inter">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div></div>`;
 h+='<div class="tiles">'+
  `<a class="tile" href="#list"><div class="meta">Shopping list</div><div class="tv">${listN}</div><div class="meta">${listN===1?'item':'items'} to buy</div></a>`+
  `<a class="tile" href="#expenses"><div class="meta">${mine===null?'Balances':mine>0?'You are owed':mine<0?'You owe':'Your balance'}</div><div class="tv ${mine>0?'pos':mine<0?'neg':''}">${mine===null?'—':mine===0?'Square':money(Math.abs(mine))}</div><div class="meta">${mine===null?'link yourself in People':'see details'}</div></a></div>`;
 if(listN)h+='<a class="btn wide" href="#shop">🛒 Start shopping</a>';
 const att=[];
 if(act.length>1)dueBills().forEach(x=>att.push(`<div class="att"><div class="ico">${catOf(x.b.cat)[1]}</div><div class="grow"><div class="name">${esc(x.b.name)} · ${money(x.b.amount)}</div><div class="meta ${x.days<0?'neg':''}">${dueText(x.days)}</div></div><button class="btn small" data-act="logBill" data-k="${x.b.id}">Add</button></div>`));
 const wk=monday(today());
 state.chores.forEach(c=>{const who=choreWho(c,wk);if(!who||(c.done&&c.done[wk]))return;if(me&&who!==me)return;att.push(`<div class="att"><div class="ico">${c.icon||'🧹'}</div><div class="grow"><div class="name">${esc(c.name)}</div><div class="meta">${me?'Your turn this week':esc(nm(who))+'’s turn this week'}</div></div><button class="btn small ghost" data-act="choreDone" data-k="${c.id}">Done</button></div>`)});
 const low=state.pantry.filter(p=>p.status==='out'&&!onList(p.name));
 if(low.length)att.push(`<div class="att"><div class="ico">🫙</div><div class="grow"><div class="name">${low.length} pantry item${low.length>1?'s':''} out</div><div class="meta">${esc(low.slice(0,3).map(p=>p.name).join(', '))}</div></div><a class="btn small ghost" href="#pantry">View</a></div>`);
 if(att.length)h+='<h3>Needs attention</h3><div class="card tight">'+att.join('')+'</div>';
 const ml=state.meals[today()];
 h+='<h3>Tonight’s dinner</h3><a class="card row" href="#meals" style="text-decoration:none;color:inherit"><div class="ico">🍽️</div><div class="grow">'+(ml&&ml.name?'<div class="name">'+esc(ml.name)+'</div>'+(ml.cook?'<div class="meta">'+esc(nm(ml.cook))+' is cooking</div>':''):'<div class="meta">Nothing planned yet. Tap to plan the week.</div>')+'</div></a>';
 const ev=occurrences(today(),addDays(today(),14)).slice(0,5);
 h+='<h3>Coming up</h3>'+(ev.length?'<div class="card tight">'+ev.map(o=>evRow(o,false)).join('')+'</div>':'<a class="card row" href="#calendar" style="text-decoration:none;color:inherit"><div class="ico">📅</div><div class="meta grow">Nothing in the next two weeks</div></a>');
 const pins=state.notes.filter(n=>n.pinned);
 if(pins.length)h+='<h3>Pinned notes</h3>'+pins.map(noteCard).join('');
 return h;
}

function vList(){
 const todo=state.items.filter(i=>!i.done),done=state.items.filter(i=>i.done);
 const on={};state.items.forEach(i=>on[i.name.toLowerCase()]=1);
 const quick=Object.keys(state.freq).filter(k=>!on[k]).sort((a,b)=>state.freq[b].n-state.freq[a].n).slice(0,10);
 let h='<div class="card"><form id="addItem" class="row"><input id="gname" data-draft="1" class="grow" placeholder="Add an item, e.g. milk" autocomplete="off" enterkeyhint="done"><input id="gqty" data-draft="1" style="width:70px" placeholder="Qty" autocomplete="off"><button class="btn">Add</button></form>';
 if(quick.length)h+='<div class="chips">'+quick.map(k=>`<button class="chip" data-act="quick" data-k="${esc(k)}">+ ${esc(state.freq[k].name)}</button>`).join('')+'</div>';
 h+='</div>';
 if(!state.items.length)return h+empty('The list is empty','Add what the house needs. Items sort by aisle automatically, and tapping an item lets you add a note.');
 if(todo.length)h+='<a class="btn wide" href="#shop">🛒 Shop mode</a>';
 const g={};todo.forEach(i=>(g[i.aisle]=g[i.aisle]||[]).push(i));
 AISLE_ORDER.forEach(a=>{if(g[a])h+='<h3>'+a+'</h3><div class="card tight"><ul class="list">'+g[a].map(itemRow).join('')+'</ul></div>'});
 if(!todo.length)h+=empty('All done 🎉','Everything on the list is in the basket.');
 if(done.length)h+=`<h3>In the basket · ${done.length}</h3><div class="card tight"><ul class="list">${done.map(itemRow).join('')}</ul><div class="row" style="padding:10px 0"><button class="btn small" data-act="logGroceries">💶 Log as expense</button><button class="btn small ghost" data-act="clearDone">Clear basket</button></div></div>`;
 return h;
}
function itemRow(i){const by=i.done&&i.doneBy?'got it: '+esc(nm(i.doneBy)):(i.addedBy?'added by '+esc(nm(i.addedBy)):'');
 return `<li class="item${i.done?' done':''}"><button class="check${i.done?' on':''}" data-act="toggle" data-k="${i.id}" aria-label="Tick off"></button><div class="grow" data-act="editItem" data-k="${i.id}" style="cursor:pointer"><span class="name">${esc(i.name)}</span>${i.qty?'<span class="qty">'+esc(i.qty)+'</span>':''}${i.note?'<div class="meta" style="color:var(--ink)">📝 '+esc(i.note)+'</div>':''}${by?'<div class="meta">'+by+'</div>':''}</div>${delBtn('i:'+i.id)}</li>`}

function vShop(){
 const todo=state.items.filter(i=>!i.done),done=state.items.filter(i=>i.done),tot=state.items.length;
 let h=`<div class="shophead"><a href="#list" class="btn small ghost">✕ Exit</a><div class="grow" style="text-align:center"><b>${done.length} of ${tot}</b> in the basket</div><span id="status" class="status"></span></div><div class="prog"><div style="width:${tot?done.length/tot*100:0}%"></div></div>`;
 if(!tot)return h+empty('Nothing to buy','The list is empty.');
 const g={};todo.forEach(i=>(g[i.aisle]=g[i.aisle]||[]).push(i));
 AISLE_ORDER.forEach(a=>{if(g[a])h+='<h3>'+a+'</h3>'+g[a].map(shopRow).join('')});
 if(!todo.length)h+=empty('All done 🎉','Everything is in the basket.');
 if(done.length)h+='<h3>In the basket</h3>'+done.map(shopRow).join('')+'<button class="btn wide" data-act="logGroceries" style="margin-top:12px">Finish & log the expense</button>';
 return h;
}
const shopRow=i=>`<button class="srowbig ${i.done?'done':''}" data-act="toggle" data-k="${i.id}"><span class="check ${i.done?'on':''}"></span><span class="grow"><span class="name" style="${i.done?'text-decoration:line-through':''}">${esc(i.name)}</span>${i.qty?' <span class="qty">'+esc(i.qty)+'</span>':''}${i.note?'<span class="meta" style="display:block">📝 '+esc(i.note)+'</span>':''}</span></button>`;

function vPantry(){
 let h='<div class="card"><form id="addPantry" class="row"><input id="pname" data-draft="1" class="grow" placeholder="A staple, e.g. olive oil" autocomplete="off"><button class="btn">Add</button></form><p class="meta" style="margin:8px 0 0">Mark something <b>Low</b> or <b>Out</b> and it goes onto the shopping list. Ticking it off the list marks it stocked again.</p></div>';
 if(!state.pantry.length)return h+empty('Pantry is empty','Track the things you always keep at home.')+'<div style="text-align:center"><button class="btn ghost" data-act="seedPantry">Add common staples</button></div>';
 const g={};state.pantry.forEach(p=>(g[p.aisle]=g[p.aisle]||[]).push(p));
 AISLE_ORDER.forEach(a=>{if(!g[a])return;h+='<h3>'+a+'</h3><div class="card tight">'+g[a].sort((x,y)=>x.name.localeCompare(y.name)).map(p=>`<div class="item"><div class="grow"><span class="name">${esc(p.name)}</span>${p.status!=='ok'&&onList(p.name)?'<div class="meta">on the list</div>':''}</div><div class="seg mini">${[['ok','Stocked'],['low','Low'],['out','Out']].map(s=>`<button data-act="pstat" data-k="${p.id}" data-v="${s[0]}" class="${p.status===s[0]?'on '+s[0]:''}">${s[1]}</button>`).join('')}</div>${delBtn('p:'+p.id)}</div>`).join('')+'</div>'});
 return h;
}

function vMeals(){
 const wk=mealWeek||monday(today());
 let h=`<div class="card row"><button class="btn small ghost" data-act="mealWeek" data-k="-7" aria-label="Previous week">‹</button><div class="grow" style="text-align:center"><div class="name">Week of ${fmtDate(wk)}</div><div class="meta">Dinner plan</div></div><button class="btn small ghost" data-act="mealWeek" data-k="7" aria-label="Next week">›</button></div><div class="card tight">`;
 let ingN=0;
 for(let i=0;i<7;i++){const d=addDays(wk,i),m=state.meals[d];if(m&&m.ing&&d>=today())ingN+=m.ing.length;
  h+=`<div class="exp ${d<today()?'past':''}" data-act="editMeal" data-k="${d}" style="cursor:pointer"><div class="day ${d===today()?'today':''}"><b>${parseD(d).toLocaleDateString('en-GB',{weekday:'short'})}</b><span>${parseD(d).getDate()}</span></div><div class="grow">${m&&m.name?`<div class="name">${esc(m.name)}</div><div class="meta">${[m.cook?esc(nm(m.cook))+' cooking':'',m.ing&&m.ing.length?m.ing.length+' ingredients':''].filter(Boolean).join(' · ')}</div>`:'<div class="meta">+ Plan dinner</div>'}</div></div>`}
 h+='</div>';
 if(ingN)h+='<button class="btn wide" data-act="weekIng">🧺 Add ingredients for the rest of the week to the list</button>';
 return h;
}

function vExpenses(){
 if(active().length<2)return needPeople(2);
 const b=balances(),s=settleUp(b),mine=me&&b[me]!==undefined?b[me]:null,month=today().slice(0,7);
 let spent=0;state.expenses.forEach(e=>{if(e.type!=='payment'&&(e.date||'').slice(0,7)===month)spent+=e.amount});
 let h='<div class="card row" style="align-items:flex-end"><div class="grow">';
 if(mine===null)h+=`<div class="meta">Link yourself in People to see your balance</div><div class="big">${money(spent)}</div><div class="meta">house spending this month</div>`;
 else h+=`<div class="meta">${mine>0?'You are owed':mine<0?'You owe':'Your balance'}</div><div class="big ${mine>0?'pos':mine<0?'neg':''}">${mine===0?'All settled':money(Math.abs(mine))}</div><div class="meta">${money(spent)} spent by the house this month</div>`;
 h+='</div><button class="btn" data-act="newExpense">+ Expense</button></div>';
 if(s.length)h+='<div class="card"><h2>Settle up</h2>'+s.map((t,ix)=>`<div class="settle"><div class="grow"><b>${esc(nm(t.from))}</b> pays <b>${esc(nm(t.to))}</b><div class="meta">${money(t.amount)}</div></div><button class="btn small ghost" data-act="settle" data-k="${ix}">Mark paid</button></div>`).join('')+'</div>';
 else if(state.expenses.length)h+='<div class="card" style="text-align:center;color:var(--green)">✓ Everyone is square</div>';
 if(!state.expenses.length)return h+empty('No expenses yet','Add rent, bills or a shop and it splits automatically.');
 const list=state.expenses.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.at-a.at);
 return h+'<h3>History</h3><div class="card tight">'+list.map(expRow).join('')+'</div>';
}
function expRow(e){
 if(e.type==='payment'){const to=Object.keys(e.shares)[0];return `<div class="exp pay"><div class="ico">🤝</div><div class="grow"><div class="name">${esc(nm(e.paidBy))} paid ${esc(nm(to))}</div><div class="meta">${fmtDate(e.date)}</div></div><div class="amt">${money(e.amount)}</div>${delBtn('e:'+e.id)}</div>`}
 let line='';
 if(me){const sh=e.shares[me]||0;if(e.paidBy===me){const lent=e.amount-sh;line=lent>0?`<span class="meta pos">you lent ${money(lent)}</span>`:'<span class="meta">just you</span>'}else line=sh>0?`<span class="meta neg">you owe ${money(sh)}</span>`:'<span class="meta">not involved</span>'}
 const n=Object.keys(e.shares).length,bm=(e.date||'').slice(0,7),bc=e.billId?docCount(state.bills.find(b=>b.id===e.billId),bm):0;
 return `<div class="exp"><div class="ico">${catOf(e.cat)[1]}</div><div class="grow"><div class="name">${esc(e.desc)}</div><div class="meta">${esc(nm(e.paidBy))} paid · ${fmtDate(e.date)} · ${e.mode&&e.mode!=='equal'?splitLabel({mode:e.mode}):'split '+n+' way'+(n>1?'s':'')}</div>${bc?`<button class="linkbtn" style="padding-left:0" data-act="billDocs" data-k="${e.billId}" data-m="${bm}">📎 ${bc} document${bc>1?'s':''}</button>`:''}</div><div class="amt">${money(e.amount)}${line}</div>${delBtn('e:'+e.id)}</div>`;
}

function vBills(){
 if(active().length<2)return needPeople(2);
 let h='<div class="card row"><div class="grow"><h2 style="margin:0">Recurring bills</h2><div class="meta">Set up once, then add each month with one tap. They show on Home when due.</div></div><button class="btn" data-act="newBill">+ Bill</button></div>';
 if(!state.bills.length)return h+empty('No recurring bills yet','Add rent, internet or electricity, with the usual amount and the day it’s due.');
 h+='<div class="card tight">'+state.bills.slice().sort((a,b)=>(a.day||1)-(b.day||1)).map(b=>{const x=billInfo(b);const st=x.logged?`<div class="meta pos">✓ Added this month · next ${fmtDate(x.due)}</div>`:`<div class="meta ${x.days<0?'neg':''}">${dueText(x.days)}</div>`;
  return `<div class="exp"><div class="ico">${catOf(b.cat)[1]}</div><div class="grow" data-act="editBill" data-k="${b.id}" style="cursor:pointer"><div class="name">${esc(b.name)}</div><div class="meta">${money(b.amount)} · day ${b.day} · ${esc(nm(b.paidBy))} pays · ${splitLabel(b.split)}</div>${st}<button class="linkbtn" style="padding-left:0" data-act="billDocs" data-k="${b.id}">📎 ${docCount(b)?docCount(b)+' document'+(docCount(b)>1?'s':''):'Attach bill PDF'}</button></div>${x.logged?'':`<div class="col"><button class="btn small" data-act="logBill" data-k="${b.id}">Add</button><button class="linkbtn" data-act="skipBill" data-k="${b.id}">Skip</button></div>`}${delBtn('b:'+b.id)}</div>`}).join('')+'</div>';
 return h+`<p class="meta" style="text-align:center">${money(state.bills.reduce((a,b)=>a+b.amount,0))} in fixed bills per month. Tap a bill to edit it; change the amount before adding if this month’s is different.</p>`;
}

function vSummary(){
 const cur=today().slice(0,7),m=sumMonth||cur;
 const inM=mm=>state.expenses.filter(e=>e.type!=='payment'&&(e.date||'').slice(0,7)===mm);
 const ex=inM(m),total=ex.reduce((a,e)=>a+e.amount,0);
 let h=`<div class="card row"><button class="btn small ghost" data-act="sumGo" data-k="${addMonths(m,-1)}" aria-label="Previous month">‹</button><div class="grow" style="text-align:center"><div class="meta">${monthLabel(m)}</div><div class="big">${money(total)}</div><div class="meta">${ex.length} expense${ex.length===1?'':'s'}</div></div><button class="btn small ghost" data-act="sumGo" data-k="${addMonths(m,1)}" ${m>=cur?'disabled':''} aria-label="Next month">›</button></div>`;
 const months=[];for(let i=5;i>=0;i--)months.push(addMonths(cur,-i));
 const mt=months.map(mm=>inM(mm).reduce((a,e)=>a+e.amount,0)),mx=Math.max(1,...mt);
 h+='<h3>Last 6 months</h3><div class="card"><div class="trend">'+months.map((mm,i)=>`<button class="tcol ${mm===m?'on':''}" data-act="sumGo" data-k="${mm}"><span class="tval">${mt[i]?shortMoney(mt[i]):''}</span><span class="tbar" style="height:${Math.max(2,Math.round(mt[i]/mx*90))}px"></span><span class="tlab">${parseD(mm+'-01').toLocaleDateString('en-GB',{month:'short'})}</span></button>`).join('')+'</div></div>';
 if(!ex.length)return h+empty('Nothing this month','Expenses you add will be summarised here.');
 const byCat={};ex.forEach(e=>{const c=e.cat||'other';byCat[c]=(byCat[c]||0)+e.amount});
 const cats=Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a]),cmax=byCat[cats[0]];
 h+='<h3>By category</h3><div class="card">'+cats.map(c=>`<div class="brow"><div>${catOf(c)[1]} ${catOf(c)[2]}</div><div class="btrack"><div class="bfill" style="width:${byCat[c]/cmax*100}%"></div></div><div class="bval">${money(byCat[c])}</div></div>`).join('')+'</div>';
 const paid={},used={};ex.forEach(e=>{paid[e.paidBy]=(paid[e.paidBy]||0)+e.amount;Object.keys(e.shares).forEach(id=>used[id]=(used[id]||0)+e.shares[id])});
 const ppl=state.members.filter(x=>paid[x.id]||used[x.id]);
 h+='<h3>By person</h3><div class="card tight">'+ppl.map(p=>{const d=(paid[p.id]||0)-(used[p.id]||0);return `<div class="prow"><div class="avatar" style="background:${color(p.id)}">${esc(p.name.charAt(0).toUpperCase())}</div><div class="grow"><div class="name">${esc(p.name)}</div><div class="meta">paid ${money(paid[p.id]||0)} · their share ${money(used[p.id]||0)}</div></div><div class="${d>=0?'pos':'neg'}" style="font-weight:600;font-size:13px">${signed(d)}</div></div>`}).join('')+'</div>';
 return h;
}

function vChores(){
 if(!active().length)return needPeople(1);
 const wk=monday(today()),nx=addDays(wk,7);
 let h=`<div class="card row"><div class="grow"><h2 style="margin:0">This week</h2><div class="meta">Week of ${fmtDate(wk)} · turns rotate every Monday</div></div><button class="btn" data-act="newChore">+ Chore</button></div>`;
 if(!state.chores.length)return h+empty('No chores yet','Add jobs like bins, bathroom or hoovering and choose who takes turns.')+'<div style="text-align:center"><button class="btn ghost" data-act="seedChores">Add common chores</button></div>';
 h+='<div class="card tight">'+state.chores.map(c=>{const who=choreWho(c,wk),next=choreWho(c,nx),d=c.done&&c.done[wk];
  const whoTxt=who?(d?'Done by '+esc(nm(d.by||who)):`<b class="${who===me?'pos':''}">${who===me?'Your turn':esc(nm(who))}</b>`):'No one assigned';
  return `<div class="exp ${d?'done':''}"><button class="check ${d?'on':''}" data-act="choreDone" data-k="${c.id}" aria-label="Mark done"></button><div class="ico">${c.icon||'🧹'}</div><div class="grow" data-act="editChore" data-k="${c.id}" style="cursor:pointer"><div class="name">${esc(c.name)}</div><div class="meta">${whoTxt}${next&&next!==who?' · next week: '+esc(nm(next)):''}</div></div>${!d&&who&&(c.rota||[]).length>1?`<button class="linkbtn" data-act="choreSkip" data-k="${c.id}">Pass</button>`:''}${delBtn('c:'+c.id)}</div>`}).join('')+'</div>';
 return h+'<p class="meta" style="text-align:center">“Pass” hands this week’s turn to the next person, and the rota shifts on from there.</p>';
}

function evRow(o,del){const e=o.e,t=etype(e.type),span=e.end&&e.end>e.date&&e.repeat!=='weekly'?' → '+fmtDate(e.end):'';
 return `<div class="exp"><div class="ico">${t[1]}</div><div class="grow"><div class="name">${esc(e.title)}</div><div class="meta">${dayLabel(o.date)}${o.ongoing?' (ongoing)':''}${e.time?' · '+esc(e.time):''}${span}${e.who?' · '+esc(nm(e.who)):''}${e.repeat==='weekly'?' · every week':''}</div></div>${del?delBtn('v:'+e.id):''}</div>`}
function vCalendar(){
 let h='<div class="card row"><div class="grow"><h2 style="margin:0">Coming up</h2><div class="meta">Guests, trips, cleaner days, repairs. Next 60 days.</div></div><button class="btn" data-act="newEvent">+ Event</button></div>';
 const occ=occurrences(today(),addDays(today(),60));
 if(!occ.length)return h+empty('Nothing planned','Add guests staying over, who’s away, or when the cleaner comes.');
 return h+'<div class="card tight">'+occ.map(o=>evRow(o,true)).join('')+'</div>';
}

function noteCard(n){return `<div class="note ${n.pinned?'pinned':''}"><div class="ntext">${esc(n.text).replace(/\n/g,'<br>')}</div><div class="row meta"><span class="grow">${n.by?esc(nm(n.by))+' · ':''}${fmtDate(iso(new Date(n.at)))}</span><button class="linkbtn" data-act="pin" data-k="${n.id}">${n.pinned?'Unpin':'📌 Pin to Home'}</button>${delBtn('n:'+n.id)}</div></div>`}
function vBoard(){
 let h='<div class="card"><form id="addNote"><textarea id="ntext" data-draft="1" rows="2" placeholder="Leave a note: wifi password, plumber Tuesday 10:00…"></textarea><div class="row" style="margin-top:8px"><label class="cb grow" style="margin:0"><input type="checkbox" id="npin"> Pin to Home</label><button class="btn">Post</button></div></form></div>';
 if(!state.notes.length)return h+empty('No notes yet','Things everyone in the house should know go here.');
 return h+state.notes.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||b.at-a.at).map(noteCard).join('');
}

function vPeople(){
 const b=balances(),act=active(),mine=myMembership();
 let h=claimBanner()+'<div class="card"><h2>Your home</h2><div class="field"><label for="hname">Name</label><input id="hname" value="'+esc(state.name)+'"></div><div class="field" style="margin:0"><label for="cur">Currency</label><select id="cur">'+['€','$','£','CHF ','kr '].map(c=>'<option'+(c===state.currency?' selected':'')+'>'+c+'</option>').join('')+'</select></div></div>';
 h+='<div class="card"><h2>Housemates</h2><p class="meta" style="margin-top:0">Add each person’s email so they can sign in. They get a 6-digit code by email, no password needed.</p>';
 h+=act.map(m=>{const bal=b[m.id]||0,em=emailOf(m.id),isMe=em&&em===myEmail;
  const acc=em?`<div class="meta" style="margin-top:3px;overflow-wrap:anywhere"><span class="badge">✉️ ${esc(em)}${isMe?' · you':''}</span> ${isMe?'<button class="linkbtn" data-act="unclaim">Not me</button>':`<button class="linkbtn" data-act="revoke" data-k="${esc(em)}">Remove access</button>`}</div>`:`<input type="email" data-invite="${m.id}" placeholder="Email to invite" autocomplete="off" style="margin-top:6px;padding:8px 10px;font-size:14px">`;
  return `<div class="mem" style="align-items:flex-start"><div class="avatar" style="background:${color(m.id)}">${esc(m.name.charAt(0).toUpperCase())}</div><div class="grow"><input data-rename="${m.id}" value="${esc(m.name)}" aria-label="Name">${acc}</div><div class="amt" style="min-width:66px;padding-top:10px"><span class="${bal>0?'pos':bal<0?'neg':'meta'}" style="font-size:13px;font-weight:600">${bal===0?'square':signed(bal)}</span></div>${bal===0?delBtn('m:'+m.id):'<span class="x" title="Settle up before removing" style="opacity:.3;padding-top:10px">×</span>'}</div>`}).join('');
 if(!act.length)h+='<p class="meta">Add everyone who lives here, starting with yourself.</p>';
 h+='<form id="addMem" class="row" style="margin-top:10px"><input id="mname" class="grow" placeholder="Name" autocomplete="off"><button class="btn">Add</button></form></div>';
 const extra=memberships.filter(x=>!x.member_id||!mem(x.member_id)||mem(x.member_id).gone);
 if(extra.length)h+='<div class="card"><h2>Also has access</h2>'+extra.map(x=>`<div class="mem"><div class="grow" style="overflow-wrap:anywhere">${esc(x.email)}${x.email===myEmail?' <span class="badge">you</span>':''}</div>${x.email===myEmail?'':`<button class="linkbtn" data-act="revoke" data-k="${esc(x.email)}">Remove</button>`}</div>`).join('')+'</div>';
 h+=`<div class="card"><h2>Account</h2><div class="row"><div class="grow meta" style="overflow-wrap:anywhere">Signed in as <b>${esc(myEmail)}</b></div><button class="btn small ghost" data-act="signout">Sign out</button></div></div>`;
 if(!isStandalone())h+='<div class="card"><h2>📲 Install Nido</h2><p class="meta" style="margin:0">On iPhone: open this page in Safari, tap <b>Share</b> → <b>Add to Home Screen</b>. On Android: browser menu → <b>Install app</b>.</p></div>';
 return h+'<p class="meta" style="text-align:center">Nido · <a href="'+esc(location.origin+location.pathname)+'" style="color:var(--green)">'+esc((location.host+location.pathname).replace(/\/$/,''))+'</a></p>';
}
const isStandalone=()=>(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;

/* ---------- gate: sign-in & setup ---------- */
function vGate(){
 let h='<div class="gate"><div class="glogo">'+LOGO+'</div><div class="gname">Nido</div>';
 const err=authStep.err?`<div class="err" style="margin-top:8px">${esc(authStep.err)}</div>`:'';
 if(phase==='noconfig')h+='<div class="card"><h2>Almost there</h2><p class="meta" style="margin:0">Nido isn’t connected to its database yet. Follow the setup steps in the README, then add your Supabase URL and key to <code>config.js</code>.</p></div>';
 else if(phase==='boot')h+='<p class="meta">Loading your home…</p>';
 else if(phase==='login')h+=`<div class="card"><h2>Sign in</h2><p class="meta" style="margin-top:0">Enter your email and we’ll send you a 6-digit code.</p><form id="loginForm"><input type="email" id="lemail" placeholder="you@example.com" autocomplete="email" value="${esc(authStep.email||'')}" required><button class="btn wide" style="margin:10px 0 0" ${authStep.sending?'disabled':''}>${authStep.sending?'Sending…':'Send me a code'}</button></form>${err}</div>`;
 else if(phase==='code')h+=`<div class="card"><h2>Check your email</h2><p class="meta" style="margin-top:0">We sent a code to <b>${esc(authStep.email)}</b>. It can take a minute; check spam too.</p><form id="codeForm"><input id="lcode" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" maxlength="10" style="font-size:24px;letter-spacing:.3em;text-align:center"><button class="btn wide" style="margin:10px 0 0" ${authStep.verifying?'disabled':''}>${authStep.verifying?'Checking…':'Sign in'}</button></form>${err}<div class="row" style="justify-content:space-between;margin-top:8px"><button class="linkbtn" data-act="backLogin">Use a different email</button><button class="linkbtn" data-act="resend">Send a new code</button></div></div>`;
 else if(phase==='nohousehold')h+=`<div class="card"><h2>Welcome!</h2><p class="meta" style="margin-top:0">You’re signed in as <b>${esc(myEmail)}</b>, but you’re not part of a home yet.</p><p style="margin:0 0 6px"><b>Joining your housemates?</b></p><p class="meta" style="margin-top:0">Ask whoever set up Nido to add <b>${esc(myEmail)}</b> in People, then <button class="linkbtn" style="padding:0" data-act="retry">tap here to check again</button>.</p></div><div class="card"><h2>Start a new home</h2><form id="hhForm">${fld('Name','<input id="hhname" placeholder="e.g. Casita" autocomplete="off">','hhname')}${fld('Import data (optional)','<input type="file" id="hhimport" accept=".json,application/json" style="font-size:14px"><div class="meta" style="margin-top:4px">The nido-data.json export from the Claude version.</div>','hhimport')}<button class="btn wide" style="margin:0" ${authStep.creating?'disabled':''}>${authStep.creating?'Creating…':'Create home'}</button></form>${err}</div><p style="text-align:center"><button class="linkbtn" data-act="signout">Sign out</button></p>`;
 else h+=`<div class="card"><h2>Couldn’t load</h2><p class="meta">${esc(authStep.err||'Something went wrong.')}</p><button class="btn" data-act="retry">Try again</button></div>`;
 return h+'</div>';
}
async function boot(){
 if(!CFG.supabaseUrl||!CFG.supabaseKey||!window.supabase){phase='noconfig';render();return}
 sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
 sb.auth.onAuthStateChange((ev,session)=>{if(ev==='SIGNED_IN'&&session&&(phase==='login'||phase==='code'))enter(session)});
 let session=null;try{session=(await sb.auth.getSession()).data.session}catch(e){}
 if(!session){phase='login';render();return}
 await enter(session)}
async function enter(session){myEmail=(session.user.email||'').toLowerCase();phase='boot';authStep={};render();
 const lastHH=LS.get('nido_hh');
 try{const r=await sb.from('household_members').select('household_id').eq('email',myEmail);if(r.error)throw r.error;
  if(!r.data.length){phase='nohousehold';render();return}
  hh=(r.data.find(x=>x.household_id===lastHH)||r.data[0]).household_id;LS.set('nido_hh',hh);
  const row=await sb.from('households').select('data,version').eq('id',hh).single();if(row.error)throw row.error;
  const remote=load(J(row.data.data));let c=null;try{c=JSON.parse(LS.get(cacheKey())||'null')}catch(e){}
  if(c&&c.dirty&&c.base){state=merge3(load(J(c.base)),load(J(c.state)),remote);dirty=true}else{state=clone(remote);dirty=false}
  base=remote;ver=row.data.version;await loadMemberships();subscribe();phase='ready';render();if(dirty)save();else setStatus('saved');
 }catch(e){console.warn(e);let c=null;try{c=lastHH&&JSON.parse(LS.get('nido_cache_'+lastHH)||'null')}catch(x){}
  if(c){hh=lastHH;state=load(J(c.state));base=c.base?load(J(c.base)):clone(state);ver=c.ver||0;dirty=!!c.dirty;memberships=c.memberships||[];const mm=myMembership();me=mm&&mm.member_id||null;phase='ready';render();setStatus('offline')}
  else{phase='error';authStep.err=String(e.message||e);render()}}}
function subscribe(){if(channel)sb.removeChannel(channel);channel=sb.channel('hh-'+hh).on('postgres_changes',{event:'UPDATE',schema:'public',table:'households',filter:'id=eq.'+hh},p=>onRemote(p.new)).subscribe()}
async function sendCode(email){authStep={email,sending:true};render();const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});authStep.sending=false;if(error){authStep.err=error.message;phase='login'}else phase='code';render();if(phase==='code'){const c=document.getElementById('lcode');if(c)c.focus()}}
async function verifyCode(code){authStep.verifying=true;authStep.err='';render();const {data,error}=await sb.auth.verifyOtp({email:authStep.email,token:code,type:'email'});authStep.verifying=false;if(error){authStep.err=error.message.includes('expired')||error.message.includes('invalid')?'That code didn’t work. Check it, or send a new one.':error.message;render();return}await enter(data.session)}
async function createHousehold(){const nameIn=(document.getElementById('hhname').value||'').trim(),f=document.getElementById('hhimport');let initial=load('{}');
 if(f&&f.files&&f.files[0]){try{initial=load(await f.files[0].text());if(!initial.members.length&&!initial.expenses.length)throw 0;initial.members.forEach(m=>delete m.uid)}catch(e){authStep.err='That file isn’t a Nido export.';render();return}}
 if(nameIn)initial.name=nameIn;authStep.creating=true;authStep.err='';render();
 const {data,error}=await sb.rpc('create_household',{initial});authStep.creating=false;if(error){authStep.err=error.message;render();return}
 LS.set('nido_hh',data);const s2=(await sb.auth.getSession()).data.session;await enter(s2)}
async function claim(id){if(!hh)return;const r=await sb.from('household_members').update({member_id:id}).eq('household_id',hh).eq('email',myEmail);if(r.error){toast('Couldn’t link: '+r.error.message);return}await loadMemberships();render();const m=mem(id);if(m)toast('Linked: you’re '+m.name)}

/* ---------- sheets ---------- */
const catChips=sel=>'<div class="chips" style="margin-top:0">'+CATS.map(c=>`<button type="button" class="chip${c[0]===sel?' on':''}" data-pick="cat" data-val="${c[0]}">${c[1]} ${c[2]}</button>`).join('')+'</div>';
const paidSel=sel=>'<select id="fpaid">'+active().map(m=>`<option value="${m.id}"${m.id===sel?' selected':''}>${esc(m.name)}</option>`).join('')+'</select>';
function splitEditor(spec){
 return '<div class="field"><label>Split</label><div class="seg" id="smodes" style="margin-bottom:6px">'+[['equal','Equally'],['exact','Amounts'],['percent','%'],['shares','Shares']].map(m=>`<button type="button" data-smode="${m[0]}" class="${spec.mode===m[0]?'on':''}">${m[1]}</button>`).join('')+
 `</div><div id="splitbox" data-mode="${spec.mode}">`+active().map(m=>{const on=(spec.inc||[]).includes(m.id),val=spec.vals&&spec.vals[m.id]!=null?spec.vals[m.id]:'';return `<div class="srow" data-sid="${m.id}"><button type="button" class="check ${on?'on':''}" data-inc="1" aria-label="Include ${esc(m.name)}"></button><span class="grow">${esc(m.name)}</span><input class="sval" inputmode="decimal" value="${esc(val)}" placeholder="${spec.mode==='exact'?'0,00':spec.mode==='percent'?'%':'0'}" autocomplete="off"></div>`}).join('')+'</div><div class="preview" id="sprev"></div></div>';
}
function readSpec(){const box=document.getElementById('splitbox'),inc=[],vals={};box.querySelectorAll('.srow').forEach(r=>{const id=r.dataset.sid;if(r.querySelector('.check').classList.contains('on'))inc.push(id);const v=r.querySelector('.sval').value.trim();if(v)vals[id]=v});return{mode:box.dataset.mode,inc,vals}}
function switchMode(md){const box=document.getElementById('splitbox');box.dataset.mode=md;document.querySelectorAll('#smodes button').forEach(b=>b.classList.toggle('on',b.dataset.smode===md));
 const rows=[...box.querySelectorAll('.srow')],inc=rows.filter(r=>r.querySelector('.check').classList.contains('on')),use=inc.length?inc:rows,n=use.length,amt=parseAmt(document.getElementById('famt').value);
 const eq=amt>0?equalShares(amt,use.map(r=>r.dataset.sid)):null,pb=Math.floor(10000/n)/100;
 rows.forEach(r=>{const i=r.querySelector('.sval'),ix=use.indexOf(r);i.placeholder=md==='exact'?'0,00':md==='percent'?'%':'0';
  if(ix<0){i.value='';return}
  if(md==='shares')i.value='1';else if(md==='percent')i.value=String(ix===n-1?Math.round((100-pb*(n-1))*100)/100:pb);else if(md==='exact')i.value=eq?(eq[r.dataset.sid]/100).toFixed(2).replace('.',','):''});
 updatePreview()}
function updatePreview(){const p=document.getElementById('sprev');if(!p)return;const amt=parseAmt(document.getElementById('famt').value);if(!(amt>0)){p.textContent='Enter the amount to see each share';p.className='preview';return}const r=computeSplit(amt,readSpec());if(r.err){p.textContent=r.err;p.className='preview neg';return}p.className='preview';p.textContent=Object.keys(r.shares).map(id=>nm(id)+' '+money(r.shares[id])).join(' · ')}
const sheetHead=t=>`<div class="row" style="margin-bottom:12px"><h2 class="grow" style="margin:0">${t}</h2><button type="button" class="x" data-act="closeSheet" aria-label="Close">×</button></div>`;
const fld=(label,inner,id)=>`<div class="field"><label${id?' for="'+id+'"':''}>${label}</label>${inner}</div>`;

function vSheet(){
 const d=sheet,act=active();let h='<div class="overlay" data-act="closeSheet"><div class="sheet">';
 if(d.kind==='expense'){
  h+=sheetHead('Add expense')+'<form id="expForm">'+fld('What for',`<input id="fdesc" value="${esc(d.desc)}" placeholder="e.g. Electricity bill" autocomplete="off">`,'fdesc')+
  `<div class="row"><div class="grow">${fld('Amount',`<input id="famt" inputmode="decimal" value="${esc(d.amt)}" placeholder="0,00" autocomplete="off">`,'famt')}</div><div class="grow">${fld('Date',`<input type="date" id="fdate" value="${esc(d.date)}">`,'fdate')}</div></div>`+
  fld('Category',catChips(d.cat))+fld('Paid by',paidSel(d.paidBy),'fpaid')+splitEditor(d.split)+
  (d.clearBasket!==undefined?'<label class="cb"><input type="checkbox" id="fclear" checked> Clear the basket from the shopping list</label>':'')+
  '<div class="err" id="ferr"></div><button class="btn wide">Save expense</button></form>';
 }else if(d.kind==='bill'){
  h+=sheetHead(d.id?'Edit bill':'New recurring bill')+'<form id="billForm">'+fld('Bill',`<input id="fdesc" value="${esc(d.desc)}" placeholder="e.g. Rent, Internet" autocomplete="off">`,'fdesc')+
  `<div class="row"><div class="grow">${fld('Usual amount',`<input id="famt" inputmode="decimal" value="${esc(d.amt)}" placeholder="0,00" autocomplete="off">`,'famt')}</div><div class="grow">${fld('Due day (1–28)',`<input type="number" id="fday" min="1" max="28" inputmode="numeric" value="${esc(d.day)}">`,'fday')}</div></div>`+
  fld('Category',catChips(d.cat))+fld('Usually paid by',paidSel(d.paidBy),'fpaid')+splitEditor(d.split)+'<div class="err" id="ferr"></div><button class="btn wide">Save bill</button></form>';
 }else if(d.kind==='item'){
  const it=state.items.find(i=>i.id===d.id)||{};
  h+=sheetHead('Edit item')+'<form id="itemForm">'+fld('Item',`<input id="iname" value="${esc(it.name)}" autocomplete="off">`,'iname')+
  `<div class="row"><div style="width:100px">${fld('Qty',`<input id="iqty" value="${esc(it.qty)}" autocomplete="off">`,'iqty')}</div><div class="grow">${fld('Aisle','<select id="iaisle">'+AISLE_ORDER.map(a=>`<option${a===it.aisle?' selected':''}>${a}</option>`).join('')+'</select>','iaisle')}</div></div>`+
  fld('Note',`<input id="inote" value="${esc(it.note)}" placeholder="e.g. the Hacendado one, 2-for-1 at Mercadona" autocomplete="off">`,'inote')+'<button class="btn wide">Save</button></form>';
 }else if(d.kind==='meal'){
  const m=state.meals[d.date]||{},recs=Object.keys(state.recipes).sort((a,b)=>(state.recipes[b].n||0)-(state.recipes[a].n||0)).slice(0,12);
  h+=sheetHead(dayLabel(d.date))+'<form id="mealForm">'+fld('Dinner',`<input id="mealname" value="${esc(m.name)}" placeholder="e.g. Tortilla de patatas" autocomplete="off">`,'mealname')+
  (recs.length?'<div class="chips" style="margin:-4px 0 12px">'+recs.map(k=>`<button type="button" class="chip" data-act="useRecipe" data-k="${esc(k)}">${esc(state.recipes[k].name)}</button>`).join('')+'</div>':'')+
  fld('Ingredients (one per line)',`<textarea id="mealing" rows="4" placeholder="eggs\npotatoes\nonion">${esc((m.ing||[]).join('\n'))}</textarea>`,'mealing')+
  fld('Who’s cooking','<select id="mealcook"><option value="">—</option>'+act.map(x=>`<option value="${x.id}"${x.id===m.cook?' selected':''}>${esc(x.name)}</option>`).join('')+'</select>','mealcook')+
  '<button class="btn wide">Save</button><div class="row"><button type="button" class="btn ghost grow" data-act="mealSaveAdd">Save & add ingredients to list</button>'+(m.name?'<button type="button" class="btn ghost" data-act="clearMeal">Clear</button>':'')+'</div></form>';
 }else if(d.kind==='chore'){
  h+=sheetHead(d.id?'Edit chore':'New chore')+'<form id="choreForm">'+fld('Chore',`<input id="cname" value="${esc(d.name)}" placeholder="e.g. Take out the bins" autocomplete="off">`,'cname')+
  fld('Icon','<div class="chips" style="margin-top:0">'+ICONS.map(i=>`<button type="button" class="chip${i===d.icon?' on':''}" data-pick="icon" data-val="${i}">${i}</button>`).join('')+'</div>')+
  fld('Takes turns (in this order)','<div class="chips" id="rota" style="margin-top:0">'+act.map(x=>`<button type="button" class="chip${d.rota.includes(x.id)?' on':''}" data-togg="1" data-val="${x.id}">${esc(x.name)}</button>`).join('')+'</div>')+
  '<div class="err" id="ferr"></div><button class="btn wide">Save chore</button></form>';
 }else if(d.kind==='event'){
  h+=sheetHead('New event')+'<form id="eventForm">'+fld('What',`<input id="etitle" placeholder="e.g. Marta’s parents staying" autocomplete="off">`,'etitle')+
  fld('Type','<div class="chips" style="margin-top:0">'+ETYPES.map(t=>`<button type="button" class="chip${t[0]===d.type?' on':''}" data-pick="type" data-val="${t[0]}">${t[1]} ${t[2]}</button>`).join('')+'</div>')+
  `<div class="row"><div class="grow">${fld('Date',`<input type="date" id="edate" value="${today()}">`,'edate')}</div><div class="grow">${fld('Until (optional)','<input type="date" id="eend">','eend')}</div></div>`+
  `<div class="row"><div class="grow">${fld('Time (optional)','<input type="time" id="etime">','etime')}</div><div class="grow">${fld('Who','<select id="ewho"><option value="">—</option>'+act.map(x=>`<option value="${x.id}"${x.id===me?' selected':''}>${esc(x.name)}</option>`).join('')+'</select>','ewho')}</div></div>`+
  '<label class="cb"><input type="checkbox" id="erep"> Repeats every week (e.g. cleaner)</label><div class="err" id="ferr"></div><button class="btn wide">Save event</button></form>';
 }
 else if(d.kind==='billDocs'){
  const b=state.bills.find(x=>x.id===d.id);
  if(!b)h+=sheetHead('Documents')+empty('Bill not found','It may have been deleted.');
  else{
   h+=sheetHead('📎 '+esc(b.name));
   if(sb&&hh)h+=`<div class="card" style="background:var(--paper)">${fld('For month',`<input type="month" id="dmonth" value="${esc(d.month||today().slice(0,7))}">`,'dmonth')}<label class="btn wide" style="margin:0;cursor:pointer">${d.uploading?'Uploading…':'Upload PDF or photo'}<input type="file" id="dfile" accept="application/pdf,image/*" multiple hidden ${d.uploading?'disabled':''}></label><div class="err" id="ferr" style="margin-top:6px">${esc(d.err||'')}</div></div>`;
   else h+='<p class="meta">Uploading needs a connection.</p>';
   const docs=(b.docs||[]).slice().sort((x,y)=>y.month.localeCompare(x.month)||y.at-x.at);
   if(!docs.length)h+=empty('No documents yet','Upload each month’s bill or receipt to keep a record.');
   else{let cur='';docs.forEach(x=>{if(x.month!==cur){if(cur)h+='</div>';cur=x.month;h+=`<h3>${monthLabel(x.month)}</h3><div class="card tight">`}
    h+=`<div class="exp"><div class="ico">${/pdf/i.test(x.type)?'📄':'🖼️'}</div><div class="grow"><button class="linkbtn name" style="padding:0;font-size:15px;text-align:left;white-space:normal;overflow-wrap:anywhere" data-act="openDoc" data-k="${esc(x.id)}">${esc(x.name)}</button><div class="meta">${fsize(x.size||0)} · ${x.by?esc(nm(x.by))+' · ':''}${fmtDate(iso(new Date(x.at)))}</div></div>${delBtn('d:'+b.id+':'+x.id)}</div>`});h+='</div>'}
  }
 }
 return h+'</div></div>';
}
function openSheet(s,focus){sheet=s;render();setTimeout(()=>{updatePreview();const f=document.getElementById(focus);if(f&&!f.value)f.focus()},40)}
const defSpec=()=>({mode:'equal',inc:active().map(m=>m.id),vals:{}});
const defPayer=()=>me&&mem(me)&&!mem(me).gone?me:active()[0].id;
function openExpense(pre){openSheet(Object.assign({kind:'expense',desc:'',amt:'',date:today(),cat:'other',paidBy:defPayer(),split:defSpec()},pre||{}),pre&&pre.desc?'famt':'fdesc')}

/* ---------- mutations ---------- */
function addItemRaw(name,qty){const key=name.toLowerCase();const ex=state.items.find(i=>i.name.toLowerCase()===key&&!i.done);if(ex){if(qty)ex.qty=qty;return false}
 const aisle=(state.freq[key]&&state.freq[key].aisle)||aisleOf(name);state.items.push({id:uid(),name,qty:qty||'',note:'',aisle,done:false,addedBy:me,at:Date.now()});const f=state.freq[key]||{name,aisle,n:0};f.n++;state.freq[key]=f;return true}
function addItem(name,qty){addItemRaw(name,qty);commit();const g=document.getElementById('gname');if(g)g.focus()}
function addIngredients(dates){let n=0;dates.forEach(d=>{const m=state.meals[d];if(m&&m.ing)m.ing.forEach(x=>{if(addItemRaw(x,''))n++})});commit();toast(n?n+' ingredient'+(n>1?'s':'')+' added to the list':'Everything is already on the list')}
function logBill(id){const b=state.bills.find(x=>x.id===id);if(!b)return;const m=today().slice(0,7);let r=computeSplit(b.amount,b.split||defSpec());if(r.err||!r.shares)r={shares:equalShares(b.amount,active().map(x=>x.id))};
 const payer=mem(b.paidBy)&&!mem(b.paidBy).gone?b.paidBy:active()[0].id;
 state.expenses.push({id:uid(),desc:b.name+' · '+parseD(m+'-01').toLocaleDateString('en-GB',{month:'short'}),amount:b.amount,cat:b.cat,paidBy:payer,shares:r.shares,mode:(b.split||{}).mode,date:billDue(b,m),at:Date.now(),by:me,billId:b.id});b.lastLogged=m;commit();toast(b.name+' added to expenses')}
function saveMeal(){const d=sheet.date,name=document.getElementById('mealname').value.trim(),ing=document.getElementById('mealing').value.split(/\n|,/).map(s=>s.trim()).filter(Boolean),cook=document.getElementById('mealcook').value;
 if(!name&&!ing.length){delete state.meals[d]}else{state.meals[d]={name,ing,cook};if(name){const k=name.toLowerCase();const r=state.recipes[k]||{name,n:0};r.name=name;r.ing=ing;r.n=(r.n||0)+1;state.recipes[k]=r}}sheet=null;return d}

/* ---------- events ---------- */
root.addEventListener('click',ev=>{
 const t=ev.target;
 const pick=t.closest('[data-pick]');if(pick){sheet[pick.dataset.pick]=pick.dataset.val;pick.parentNode.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===pick));return}
 const tg=t.closest('[data-togg]');if(tg){tg.classList.toggle('on');return}
 const sm=t.closest('[data-smode]');if(sm){switchMode(sm.dataset.smode);return}
 const inc=t.closest('[data-inc]');if(inc){inc.classList.toggle('on');updatePreview();return}
 const el=t.closest('[data-act]');if(!el)return;
 const a=el.dataset.act,k=el.dataset.k;
 if(a==='closeSheet'){if(el.classList.contains('overlay')&&t!==el)return;sheet=null;pendingRender=false;render();return}
 if(a==='arm'){armed=k;clearTimeout(armTimer);armTimer=setTimeout(()=>{armed=null;if(!sheet)render()},3000);render();return}
 if(a==='billDocs'){openSheet({kind:'billDocs',id:k,month:el.dataset.m||today().slice(0,7)});return}
 if(a==='del'&&k.startsWith('d:')){armed=null;const [,bid,did]=k.split(':');const b=state.bills.find(x=>x.id===bid);if(b){b.docs=(b.docs||[]).filter(x=>x.id!==did);if(sb)sb.storage.from('nido-files').remove([did]).catch(()=>{})}commit();return}
 if(a==='del'){armed=null;const [p,id]=k.split(':');
  const drop=(arr)=>state[arr]=state[arr].filter(x=>x.id!==id);
  if(p==='i')drop('items');if(p==='e')drop('expenses');if(p==='b')drop('bills');if(p==='c')drop('chores');if(p==='v')drop('events');if(p==='n')drop('notes');if(p==='p')drop('pantry');
  if(p==='m'){const m=mem(id);const used=state.expenses.some(e=>e.paidBy===id||e.shares[id]!==undefined);if(used)m.gone=true;else state.members=state.members.filter(x=>x.id!==id);}
  commit();return}
 if(a==='toggle'){const it=state.items.find(i=>i.id===k);if(it){it.done=!it.done;it.doneBy=it.done?me:null;if(it.done)state.pantry.forEach(p=>{if(p.name.toLowerCase()===it.name.toLowerCase())p.status='ok'})}commit();return}
 if(a==='quick'){const f=state.freq[k];if(f)addItem(f.name,'');return}
 if(a==='clearDone'){state.items=state.items.filter(i=>!i.done);commit();return}
 if(a==='editItem'){openSheet({kind:'item',id:k});return}
 if(a==='logGroceries'){if(active().length<2){location.hash='people';return}const names=state.items.filter(i=>i.done).map(i=>i.name);openExpense({desc:'Groceries: '+names.slice(0,4).join(', ')+(names.length>4?' +'+(names.length-4):''),cat:'groceries',clearBasket:true});return}
 if(a==='newExpense'){openExpense();return}
 if(a==='settle'){const s=settleUp(balances())[+k];if(s){const sh={};sh[s.to]=s.amount;state.expenses.push({id:uid(),type:'payment',desc:'Payment',amount:s.amount,paidBy:s.from,shares:sh,date:today(),at:Date.now(),by:me})}commit();return}
 if(a==='claim'){claim(k);return}
 if(a==='unclaim'){sb.from('household_members').update({member_id:null}).eq('household_id',hh).eq('email',myEmail).then(()=>loadMemberships()).then(render);return}
 if(a==='revoke'){if(k===myEmail)return;sb.from('household_members').delete().eq('household_id',hh).eq('email',k).then(r=>{if(r.error)toast(r.error.message);return loadMemberships()}).then(render);return}
 if(a==='openDoc'){openDoc(k);return}
 if(a==='signout'){(async()=>{try{if(channel)sb.removeChannel(channel);await sb.auth.signOut()}catch(e){}LS.set('nido_hh','');location.hash='';location.reload()})();return}
 if(a==='backLogin'){phase='login';authStep={email:authStep.email};render();return}
 if(a==='resend'){sendCode(authStep.email);return}
 if(a==='retry'){(async()=>{const s2=(await sb.auth.getSession()).data.session;if(s2)enter(s2);else{phase='login';render()}})();return}
 if(a==='newBill'){openSheet({kind:'bill',desc:'',amt:'',day:1,cat:'rent',paidBy:defPayer(),split:defSpec()},'fdesc');return}
 if(a==='editBill'){const b=state.bills.find(x=>x.id===k);if(b)openSheet({kind:'bill',id:b.id,desc:b.name,amt:(b.amount/100).toFixed(2).replace('.',','),day:b.day,cat:b.cat,paidBy:b.paidBy,split:clone(b.split||defSpec())});return}
 if(a==='logBill'){logBill(k);return}
 if(a==='skipBill'){const b=state.bills.find(x=>x.id===k);if(b){b.lastLogged=today().slice(0,7);commit()}return}
 if(a==='sumGo'){sumMonth=k>today().slice(0,7)?null:k;render();return}
 if(a==='newChore'){openSheet({kind:'chore',name:'',icon:'🧹',rota:active().map(m=>m.id)},'cname');return}
 if(a==='editChore'){const c=state.chores.find(x=>x.id===k);if(c)openSheet({kind:'chore',id:c.id,name:c.name,icon:c.icon,rota:c.rota.slice()});return}
 if(a==='choreDone'){const c=state.chores.find(x=>x.id===k),wk=monday(today());if(c){c.done=c.done||{};if(c.done[wk])delete c.done[wk];else c.done[wk]={by:me||choreWho(c,wk),at:Date.now()};Object.keys(c.done).forEach(w=>{if(w<addDays(wk,-56))delete c.done[w]})}commit();return}
 if(a==='choreSkip'){const c=state.chores.find(x=>x.id===k);if(c){c.offset=(c.offset||0)+1;commit();toast('Passed to '+nm(choreWho(c,monday(today()))))}return}
 if(a==='seedChores'){const r=active().map(m=>m.id);[['Take out the bins','🗑️'],['Clean the bathroom','🛁'],['Clean the kitchen','🍳'],['Hoover & mop','🧹'],['Recycling','♻️']].forEach(([n,i],ix)=>state.chores.push({id:uid(),name:n,icon:i,rota:r,offset:ix,done:{}}));commit();return}
 if(a==='newEvent'){openSheet({kind:'event',type:'guest'},'etitle');return}
 if(a==='pin'){const n=state.notes.find(x=>x.id===k);if(n){n.pinned=!n.pinned;commit()}return}
 if(a==='pstat'){const p=state.pantry.find(x=>x.id===k);if(p){p.status=el.dataset.v;if(p.status!=='ok'&&addItemRaw(p.name,''))toast(p.name+' added to the shopping list')}commit();return}
 if(a==='seedPantry'){['Olive oil','Salt','Rice','Pasta','Coffee','Milk','Eggs','Toilet paper','Washing-up liquid','Laundry detergent','Bin bags','Bread'].forEach(n=>{if(!state.pantry.some(p=>p.name.toLowerCase()===n.toLowerCase()))state.pantry.push({id:uid(),name:n,aisle:aisleOf(n),status:'ok'})});commit();return}
 if(a==='mealWeek'){mealWeek=addDays(mealWeek||monday(today()),+k);render();return}
 if(a==='editMeal'){openSheet({kind:'meal',date:k},'mealname');return}
 if(a==='weekIng'){const wk=mealWeek||monday(today()),ds=[];for(let i=0;i<7;i++){const d=addDays(wk,i);if(d>=today())ds.push(d)}addIngredients(ds);return}
 if(a==='useRecipe'){const r=state.recipes[k];if(r){document.getElementById('mealname').value=r.name;document.getElementById('mealing').value=(r.ing||[]).join('\n')}return}
 if(a==='mealSaveAdd'){const d=saveMeal();addIngredients([d]);return}
 if(a==='clearMeal'){delete state.meals[sheet.date];sheet=null;commit();return}
});
root.addEventListener('change',ev=>{const t=ev.target;
 if(t.id==='dfile'){uploadDocs([...t.files]);return}
 if(t.id==='dmonth'&&sheet){sheet.month=t.value;return}
 if(t.dataset&&t.dataset.invite){const em=t.value.trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){toast('That email doesn’t look right');return}
  sb.from('household_members').upsert({household_id:hh,email:em,member_id:t.dataset.invite},{onConflict:'household_id,email'}).then(r=>{if(r.error){toast(r.error.message);return}toast('Added. '+nm(t.dataset.invite)+' can now sign in with '+em);return loadMemberships().then(render)});return}
 if(t.id==='hname'){const v=t.value.trim();if(v&&v!==state.name){state.name=v;commit()}return}
 if(t.id==='cur'){state.currency=t.value;commit();return}
 if(t.dataset.rename){const m=mem(t.dataset.rename),v=t.value.trim();if(m&&v&&v!==m.name){m.name=v;commit()}}
});
root.addEventListener('input',ev=>{const t=ev.target;if(t.id==='famt'||t.classList.contains('sval'))updatePreview();});
root.addEventListener('submit',ev=>{ev.preventDefault();const f=ev.target,val=id=>{const e=document.getElementById(id);return e?e.value.trim():''},err=m=>{const e=document.getElementById('ferr');if(e)e.textContent=m};
 if(f.id==='loginForm'){const em=val('lemail').toLowerCase();if(em)sendCode(em);return}
 if(f.id==='codeForm'){const c=val('lcode').replace(/\s/g,'');if(c)verifyCode(c);return}
 if(f.id==='hhForm'){createHousehold();return}
 if(f.id==='addItem'){const n=val('gname'),q=val('gqty');if(!n)return;document.getElementById('gname').value='';document.getElementById('gqty').value='';addItem(n,q);return}
 if(f.id==='addMem'){const n=val('mname');if(!n)return;const m={id:uid(),name:n};state.members.push(m);document.getElementById('mname').value='';commit();if(!linkedMember()&&active().length===1)claim(m.id);const i=document.getElementById('mname');if(i)i.focus();return}
 if(f.id==='addPantry'){const n=val('pname');if(!n)return;document.getElementById('pname').value='';if(!state.pantry.some(p=>p.name.toLowerCase()===n.toLowerCase()))state.pantry.push({id:uid(),name:n,aisle:aisleOf(n),status:'ok'});commit();const i=document.getElementById('pname');if(i)i.focus();return}
 if(f.id==='addNote'){const n=val('ntext');if(!n)return;document.getElementById('ntext').value='';state.notes.push({id:uid(),text:n,by:me,at:Date.now(),pinned:document.getElementById('npin').checked});commit();return}
 if(f.id==='expForm'||f.id==='billForm'){const desc=val('fdesc'),amt=parseAmt(val('famt')),spec=readSpec();
  if(!desc)return err('Add a short description');if(!(amt>0))return err('Enter an amount above zero');const r=computeSplit(amt,spec);if(r.err)return err(r.err);
  if(f.id==='expForm'){state.expenses.push({id:uid(),desc,amount:amt,cat:sheet.cat,paidBy:val('fpaid'),shares:r.shares,mode:spec.mode,date:val('fdate')||today(),at:Date.now(),by:me});const cl=document.getElementById('fclear');if(cl&&cl.checked)state.items=state.items.filter(i=>!i.done);sheet=null;if(view()!=='expenses')location.hash='expenses';commit();return}
  const day=Math.min(28,Math.max(1,parseInt(val('fday'),10)||1));const data={name:desc,amount:amt,day,cat:sheet.cat,paidBy:val('fpaid'),split:spec};
  if(sheet.id)Object.assign(state.bills.find(b=>b.id===sheet.id)||{},data);else state.bills.push(Object.assign({id:uid(),lastLogged:null},data));sheet=null;commit();return}
 if(f.id==='itemForm'){const it=state.items.find(i=>i.id===sheet.id);if(it){const n=val('iname');if(n)it.name=n;it.qty=val('iqty');it.note=val('inote');it.aisle=document.getElementById('iaisle').value;const fq=state.freq[it.name.toLowerCase()];if(fq)fq.aisle=it.aisle}sheet=null;commit();return}
 if(f.id==='mealForm'){saveMeal();commit();return}
 if(f.id==='choreForm'){const n=val('cname');const rota=[...document.querySelectorAll('#rota .chip.on')].map(b=>b.dataset.val);if(!n)return err('Name the chore');if(!rota.length)return err('Pick at least one person');
  if(sheet.id){const c=state.chores.find(x=>x.id===sheet.id);if(c){c.name=n;c.icon=sheet.icon;c.rota=rota}}else state.chores.push({id:uid(),name:n,icon:sheet.icon,rota,offset:0,done:{}});sheet=null;commit();return}
 if(f.id==='eventForm'){const tt=val('etitle'),d=val('edate');if(!tt)return err('Give it a title');if(!d)return err('Pick a date');
  state.events.push({id:uid(),title:tt,type:sheet.type,date:d,end:val('eend'),time:val('etime'),who:val('ewho'),repeat:document.getElementById('erep').checked?'weekly':'none',by:me});
  const cut=addDays(today(),-30);state.events=state.events.filter(e=>e.repeat==='weekly'||(e.end&&e.end>e.date?e.end:e.date)>=cut);sheet=null;commit();return}
});
window.addEventListener('hashchange',()=>{sheet=null;armed=null;render();window.scrollTo(0,0)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet){sheet=null;pendingRender=false;render()}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&phase==='ready')pull()});
window.addEventListener('online',()=>{if(phase==='ready'){pull();save()}});
window.addEventListener('offline',()=>setStatus('offline'));

if(window.__NIDO_DEBUG)window.__nido=()=>({state,base,ver,dirty,saving,me,memberships});
render();
boot();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
