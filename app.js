// ===== CONFIG EMBUTIDA (chave publica + RLS) =====
const SUPABASE_URL = 'https://krridpfliuvfxfwsmipd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yesd0vKJ2z3lKDLlkYXOcg_MNxui2qJ';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth:{ persistSession:true, autoRefreshToken:true, storage:window.localStorage, storageKey:'pkx-auth', detectSessionInUrl:false }
});

const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => (n==null||isNaN(n)) ? '0' : Number(n).toLocaleString('pt-BR');
const el = (t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const PAL = ['#ff7a18','#38a8ff','#38d39f','#ffcf3f','#ff3860','#9b6dff','#43c6d8','#f08a3c','#d84fa0','#7ec24b'];
const hhmmss = s => s ? new Date(s*1000).toISOString().substr(11,8) : '—';
let charts = {};
let currentData=null, currentSummary=null, currentUser=null;
let allSessions=[];
function showMsg(sel,kind,txt){ const m=$(sel); m.className='msg '+kind; m.textContent=txt; }

// ===== AUTH =====
let authMode='login';
function renderAuthMode(){
  const s=authMode==='signup';
  $('#authSub').textContent = s?'Crie sua conta para participar.':'Entre com sua conta para continuar.';
  $('#nameField').classList.toggle('hidden', !s);
  $('#authBtn').textContent = s?'Criar conta':'Entrar';
  $('#switchTxt').textContent = s?'Já tem conta?':'Ainda não tem conta?';
  $('#switchBtn').textContent = s?'Fazer login':'Criar conta';
  $('#authMsg').style.display='none';
}
$('#switchBtn').onclick=()=>{ authMode=authMode==='login'?'signup':'login'; renderAuthMode(); };
$('#authBtn').onclick=async()=>{
  const email=$('#authEmail').value.trim(), pass=$('#authPass').value, name=$('#authName').value.trim();
  if(!email||!pass) return showMsg('#authMsg','err','Preencha email e senha.');
  if(authMode==='signup'&&!name) return showMsg('#authMsg','err','Escolha um apelido.');
  $('#authBtn').disabled=true;
  try{
    if(authMode==='signup'){
      const {data,error}=await sb.auth.signUp({email,password:pass,options:{data:{display_name:name}}});
      if(error) throw error;
      if(data.session){ onSession(data.session); }
      else{
        const {data:d2,error:e2}=await sb.auth.signInWithPassword({email,password:pass});
        if(e2){ showMsg('#authMsg','info','Conta criada! Confira seu email para confirmar o cadastro e depois faça login.'); authMode='login'; setTimeout(renderAuthMode,3000);}
        else onSession(d2.session);
      }
    }else{
      const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
      if(error) throw error;
      onSession(data.session);
    }
  }catch(e){ showMsg('#authMsg','err',traduzErro(e.message||JSON.stringify(e))); }
  finally{ $('#authBtn').disabled=false; }
};
function traduzErro(m){
  if(/invalid login/i.test(m)) return 'Email ou senha incorretos.';
  if(/already registered|already been registered|user_already_exists/i.test(m)) return 'Esse email já tem conta. Clique em "Fazer login".';
  if(/weak.?password|password.*(requirement|character)/i.test(m)) return 'Senha fraca. Use pelo menos 6 caracteres.';
  if(/at least 6|should be at least/i.test(m)) return 'A senha precisa ter no mínimo 6 caracteres.';
  if(/invalid.*email|email.*invalid/i.test(m)) return 'Email inválido. Confira se digitou certo.';
  if(/signups?.*(disabled|not allowed)/i.test(m)) return 'Cadastro desativado no momento.';
  if(/rate limit|too many/i.test(m)) return 'Muitas tentativas. Espere um pouco.';
  return m;
}
$('#logoutBtn').onclick=async()=>{ await sb.auth.signOut(); onSession(null); };
const nameOf = u => (u?.user_metadata?.display_name)||(u?.email||'').split('@')[0]||'treinador';
function onSession(session){
  currentUser = session?.user || null;
  if(currentUser){
    $('#authGate').classList.add('hidden'); $('#app').classList.remove('hidden');
    $('#whoName').textContent = nameOf(currentUser); updateSaveBtn();
  }else{
    $('#app').classList.add('hidden'); $('#authGate').classList.remove('hidden');
    $('#authEmail').value=''; $('#authPass').value=''; $('#authName').value='';
  }
}
sb.auth.onAuthStateChange((_e,s)=>onSession(s));
sb.auth.getSession().then(({data})=>onSession(data.session));

// ===== TABS =====
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  ['import','dashboard','evolution','ranking','mine','split'].forEach(n=>$('#tab-'+n).classList.add('hidden'));
  $('#tab-'+t.dataset.tab).classList.remove('hidden');
  if(t.dataset.tab==='ranking') loadRanking();
  if(t.dataset.tab==='evolution') loadEvolution();
  if(t.dataset.tab==='mine') loadMine();
  if(t.dataset.tab==='split') renderSplit();
});

// ===== LOOT SPLIT =====
let splitRows=[];
function renderSplit(){
  const tb=$('#splitTable tbody'); tb.innerHTML='';
  if(!splitRows.length){ tb.appendChild(el('tr',null,'<td colspan="4" class="muted">Nenhum player ainda. Adicione acima (do JSON ou manual).</td>')); return; }
  splitRows.forEach((r,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><input data-i="${i}" data-k="name" value="${esc(r.name)}" placeholder="Nome" style="margin-top:0"></td>`+
      `<td><input data-i="${i}" data-k="loot" type="number" value="${r.loot}" style="margin-top:0;text-align:right"></td>`+
      `<td><input data-i="${i}" data-k="supplies" type="number" value="${r.supplies}" style="margin-top:0;text-align:right"></td>`+
      `<td class="num"><button class="btn danger sm" data-del="${i}">✕</button></td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('input').forEach(inp=>inp.oninput=()=>{ const i=+inp.dataset.i,k=inp.dataset.k; splitRows[i][k]=k==='name'?inp.value:(Number(inp.value)||0); });
  tb.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ splitRows.splice(+b.dataset.del,1); renderSplit(); });
}
$('#splitAddManual').onclick=()=>{ splitRows.push({name:'',loot:0,supplies:0}); renderSplit(); $('#splitMsg').style.display='none'; };
$('#splitAddJson').onclick=()=>{
  const raw=$('#splitJson').value.trim();
  if(!raw) return showMsg('#splitMsg','err','Cole o JSON de um player primeiro.');
  let data; try{ data=JSON.parse(raw); }catch(e){ return showMsg('#splitMsg','err','JSON inválido: '+e.message); }
  const S=data.Session||{};
  splitRows.push({ name:S.Player||(data['Enemies Defeated']?.[0]?.Player)||'Player', loot:S['Raw gains']||0, supplies:S.Supplies||0 });
  $('#splitJson').value=''; renderSplit(); showMsg('#splitMsg','ok','Player adicionado do JSON.');
};
$('#splitCalc').onclick=()=>{
  const rows=splitRows.filter(r=>String(r.name).trim());
  if(rows.length<2) return showMsg('#splitMsg','err','Adicione pelo menos 2 players com nome.');
  const totalLoot=rows.reduce((a,r)=>a+(+r.loot||0),0);
  const totalSup=rows.reduce((a,r)=>a+(+r.supplies||0),0);
  const totalProfit=totalLoot-totalSup;
  const each=totalProfit/rows.length;
  const bal=rows.map(r=>({name:r.name,b:((+r.loot||0)-(+r.supplies||0))-each}));
  const payers=bal.filter(x=>x.b>0.5).map(x=>({...x})).sort((a,b)=>b.b-a.b);
  const recvs =bal.filter(x=>x.b<-0.5).map(x=>({name:x.name,b:-x.b})).sort((a,b)=>b.b-a.b);
  const transfers=[]; let pi=0,ri=0;
  while(pi<payers.length&&ri<recvs.length){
    const amt=Math.min(payers[pi].b,recvs[ri].b);
    transfers.push({from:payers[pi].name,to:recvs[ri].name,amt:Math.round(amt)});
    payers[pi].b-=amt; recvs[ri].b-=amt;
    if(payers[pi].b<0.5)pi++; if(recvs[ri].b<0.5)ri++;
  }
  $('#splitMsg').style.display='none';
  const perRows=rows.map(r=>{
    const prof=(+r.loot||0)-(+r.supplies||0);
    return `<tr><td><b>${esc(r.name)}</b></td><td class="num">${fmt(+r.loot||0)}</td><td class="num">${fmt(+r.supplies||0)}</td><td class="num ${prof>=0?'':''}">${fmt(prof)}</td></tr>`;
  }).join('');
  $('#splitResult').innerHTML=
    `<div class="grid" style="margin-top:16px">
       <div class="stat"><div class="k">Loot total</div><div class="v gold">${fmt(totalLoot)}</div></div>
       <div class="stat"><div class="k">Supplies total</div><div class="v red">${fmt(totalSup)}</div></div>
       <div class="stat"><div class="k">Lucro total</div><div class="v ${totalProfit>=0?'green':'red'}">${fmt(totalProfit)}</div></div>
       <div class="stat"><div class="k">Lucro por player</div><div class="v">${fmt(Math.round(each))}</div></div>
     </div>
     <h2 style="margin:20px 0 10px">📊 Por player</h2>
     <table><thead><tr><th>Nome</th><th class="num">Loot</th><th class="num">Supplies</th><th class="num">Lucro individual</th></tr></thead><tbody>${perRows}</tbody></table>
     <h2 style="margin:20px 0 10px">💸 Transferências pra equilibrar</h2>`+
     (transfers.length
        ? '<table><tbody>'+transfers.map(t=>`<tr><td><b>${esc(t.from)}</b> paga <b>${esc(t.to)}</b></td><td class="num" style="color:var(--gold)">${fmt(t.amt)}</td></tr>`).join('')+'</tbody></table>'
        : '<p class="muted">Todos já estão equilibrados — nenhuma transferência necessária. ✅</p>');
};

// ===== PARSE + DASHBOARD =====
function parseSession(data){
  const S=data.Session||{};
  return {
    game_session_id:S['Session ID']??null,
    player:S.Player||(data['Enemies Defeated']?.[0]?.Player)||'Desconhecido',
    session_type:S['Session type']??null,
    start_time:S.Start?S.Start.replace(' ','T'):null,
    duration_seconds:S['Duration seconds']??null, duration_label:S.Duration??null,
    profit:S.Profit??null, profit_per_hour:S['Profit per hour']??null,
    raw_gains:S['Raw gains']??null, supplies_cost:S.Supplies??null,
    kills:S.Kills??null, rare_kills:S['Rare kills']??null, kills_per_hour:S['Kills per hour']??null,
    damage_dealt:S['Damage dealt']??null, damage_taken:S['Damage taken']??null,
  };
}
function updateSaveBtn(){ $('#saveBtn').disabled=!(currentUser&&currentData); }
function renderDashboard(data,summary){
  $('#dashEmpty').classList.add('hidden'); $('#dashContent').classList.remove('hidden');
  $('#dashTitle').textContent=`Sessão de ${summary.player}`+(summary.game_session_id?` · #${summary.game_session_id}`:'');
  const stats=[
    ['Profit',fmt(summary.profit),summary.profit>=0?'green':'red'],
    ['Profit / hora',fmt(summary.profit_per_hour),summary.profit_per_hour>=0?'green':'red'],
    ['Ganhos brutos',fmt(summary.raw_gains),'gold'],
    ['Supplies',fmt(summary.supplies_cost),'red'],
    ['Kills',fmt(summary.kills),''],
    ['Kills raras',fmt(summary.rare_kills),'gold'],
    ['Kills / hora',fmt(summary.kills_per_hour),''],
    ['Duração',summary.duration_label||(summary.duration_seconds+'s'),''],
    ['Dano causado',fmt(summary.damage_dealt),'green'],
    ['Dano recebido',fmt(summary.damage_taken),'red'],
  ];
  const g=$('#statGrid'); g.innerHTML='';
  stats.forEach(([k,v,c])=>g.appendChild(el('div','stat',`<div class="k">${k}</div><div class="v ${c}">${v}</div>`)));
  // Drops (donut) — dados reais: item x valor total
  const drops=(data.Drops||[]).slice().sort((a,b)=>(b['Total price']||0)-(a['Total price']||0));
  const dPos=drops.filter(d=>d['Total price']>0).slice(0,8);
  const dL=dPos.map(d=>d.Item.trim()), dV=dPos.map(d=>d['Total price']);
  draw('chDrops',pieCfg(dL,dV));
  registerChart('chDrops','💰 Drops mais valiosos',()=>pieCfg(dL,dV),['Item','Valor'],dL.map((l,i)=>[l,fmt(dV[i])]));
  fillTable('#dropsTable',drops);
  fillTable('#suppliesTable',(data.Supplies||[]).slice().sort((a,b)=>(b['Total price']||0)-(a['Total price']||0)));
  // Dano por elemento
  const byEl={}; (data.Damage||[]).forEach(d=>byEl[d.Element]=(byEl[d.Element]||0)+(d['Damage dealt']||0));
  const ee=Object.entries(byEl).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  draw('chDmgEl',barCfg(ee.map(e=>e[0]),ee.map(e=>e[1]),'Dano'));
  registerChart('chDmgEl','🗡️ Dano causado por elemento',()=>barCfg(ee.map(e=>e[0]),ee.map(e=>e[1]),'Dano'),['Elemento','Dano'],ee.map(e=>[e[0],fmt(e[1])]));
  // Inimigos derrotados
  const en=(data['Enemies Defeated']||[]).slice().sort((a,b)=>(b.Count||0)-(a.Count||0)).slice(0,10);
  draw('chEnemies',barCfg(en.map(e=>e.Enemy),en.map(e=>e.Count),'Kills',true));
  registerChart('chEnemies','☠️ Inimigos mais derrotados',()=>barCfg(en.map(e=>e.Enemy),en.map(e=>e.Count),'Kills',true),['Inimigo','Kills'],en.map(e=>[e.Enemy+(e.Rare?' (raro)':''),fmt(e.Count)]));
  // Dano causado x recebido
  const foe={}; (data.Damage||[]).forEach(d=>{foe[d.Enemy]=foe[d.Enemy]||{dealt:0,taken:0};foe[d.Enemy].dealt+=(d['Damage dealt']||0);foe[d.Enemy].taken+=(d['Damage taken']||0);});
  const ft=Object.entries(foe).sort((a,b)=>b[1].dealt-a[1].dealt).slice(0,8);
  draw('chDmgFoe',groupedCfg(ft.map(f=>f[0]),ft.map(f=>f[1].dealt),ft.map(f=>f[1].taken)));
  registerChart('chDmgFoe','🛡️ Dano causado × recebido',()=>groupedCfg(ft.map(f=>f[0]),ft.map(f=>f[1].dealt),ft.map(f=>f[1].taken)),['Inimigo','Causado','Recebido'],ft.map(f=>[f[0],fmt(f[1].dealt),fmt(f[1].taken)]));
}
function fillTable(sel,arr){
  const tb=$(sel+' tbody'); tb.innerHTML='';
  if(!arr.length){ tb.appendChild(el('tr',null,'<td colspan="4" class="muted">Nenhum item</td>')); return; }
  arr.forEach(it=>{
    const rare=it.Rare?' <span class="badge rare">raro</span>':'';
    tb.appendChild(el('tr',null,`<td>${esc((it.Item||'').trim())}${rare}</td><td class="num">${fmt(it.Count)}</td><td class="num">${fmt(it['Unit price'])}</td><td class="num">${fmt(it['Total price'])}</td>`));
  });
}

// ===== CHARTS =====
function destroy(id){ if(charts[id]){charts[id].destroy();delete charts[id];} }
const gridColor='#232c4d', tickColor='#98a0c4';
// fabricas de config (retornam objeto novo a cada chamada)
function pieCfg(labels,values){
  return {type:'doughnut',
    data:{labels:labels,datasets:[{data:values,backgroundColor:PAL,borderColor:'#121a30',borderWidth:2}]},
    options:{plugins:{legend:{labels:{color:tickColor,font:{size:11}},position:'right'}}}
  };
}
function barCfg(labels,values,label,flame){
  return {type:'bar',
    data:{labels:labels,datasets:[{label:label,data:values,backgroundColor:flame?'#ff8a1f':'#3987e5',borderRadius:5}]},
    options:{indexAxis:'y',plugins:{legend:{display:false}},
      scales:{x:{ticks:{color:tickColor},grid:{color:gridColor}},y:{ticks:{color:tickColor},grid:{display:false}}}}
  };
}
function groupedCfg(labels,dealt,taken){
  return {type:'bar',
    data:{labels:labels,datasets:[{label:'Causado',data:dealt,backgroundColor:'#199e70',borderRadius:4},{label:'Recebido',data:taken,backgroundColor:'#d55181',borderRadius:4}]},
    options:{plugins:{legend:{labels:{color:tickColor}}},
      scales:{x:{ticks:{color:tickColor,font:{size:10}},grid:{display:false}},y:{ticks:{color:tickColor},grid:{color:gridColor}}}}
  };
}
function draw(id,cfg){ destroy(id); charts[id]=new Chart($('#'+id),cfg); }

// registro pra o clique-ampliar (cada grafico guarda: titulo, fabrica de config e a tabela)
const DASH={};
function registerChart(id,title,make,cols,rows){ DASH[id]={title,make,cols,rows}; }

let modalChart=null;
function openChart(id){
  const m=DASH[id]; if(!m) return;
  $('#modalTitle').textContent=m.title;
  const head='<thead><tr>'+m.cols.map((c,i)=>`<th class="${i?'num':''}">${c}</th>`).join('')+'</tr></thead>';
  const body='<tbody>'+m.rows.map(r=>'<tr>'+r.map((v,i)=>`<td class="${i?'num':''}">${esc(v)}</td>`).join('')+'</tr>').join('')+'</tbody>';
  $('#modalTable').innerHTML=head+body;
  if(modalChart){ modalChart.destroy(); modalChart=null; }
  const cfg=m.make(); cfg.options=cfg.options||{}; cfg.options.maintainAspectRatio=false; cfg.options.responsive=true;
  $('#chartModal').classList.add('open');
  modalChart=new Chart($('#modalCanvas'),cfg);
}
function closeChart(){ if(modalChart){modalChart.destroy();modalChart=null;} $('#chartModal').classList.remove('open'); }
document.addEventListener('click',e=>{ if(e.target.id==='chartModal'||e.target.id==='modalClose') closeChart(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeChart(); });
// clique nos cards de grafico do dashboard
document.querySelectorAll('#tab-dashboard .chart-box').forEach(box=>{
  box.style.cursor='pointer';
  box.addEventListener('click',()=>{ const cv=box.querySelector('canvas'); if(cv&&DASH[cv.id]) openChart(cv.id); });
});

// ===== IMPORT ACTIONS =====
$('#parseBtn').onclick=()=>{
  const raw=$('#jsonInput').value.trim();
  if(!raw) return showMsg('#importMsg','err','Cole o JSON primeiro.');
  let data; try{ data=JSON.parse(raw); }catch(e){ return showMsg('#importMsg','err','JSON inválido: '+e.message); }
  if(!data.Session) return showMsg('#importMsg','info','Aviso: não achei a chave "Session".');
  currentData=data; currentSummary=parseSession(data);
  renderDashboard(data,currentSummary); updateSaveBtn();
  showMsg('#importMsg','ok','Analisado! Veja o Dashboard e clique em Salvar no banco para entrar no ranking.');
  document.querySelector('.tab[data-tab="dashboard"]').click();
};
$('#saveBtn').onclick=async()=>{
  if(!currentUser||!currentSummary) return;
  $('#saveBtn').disabled=true;
  const row={...currentSummary}; delete row.duration_label;
  row.raw_json=currentData; row.user_id=currentUser.id; row.user_email=currentUser.email; row.uploaded_by=nameOf(currentUser);
  const {error}=await sb.from('sessions').insert(row);
  $('#saveBtn').disabled=false;
  if(error){
    if(error.code==='23505'||/duplicate/i.test(error.message)) showMsg('#importMsg','info','Essa sessão já estava salva.');
    else showMsg('#importMsg','err','Erro ao salvar: '+error.message);
  }else showMsg('#importMsg','ok','Salvo no banco! Veja no Ranking. 🏆');
};
$('#sampleBtn').onclick=()=>{ $('#jsonInput').value=JSON.stringify(SAMPLE,null,2); };
$('#fileInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('#jsonInput').value=r.result;};r.readAsText(f);};

// ===== DATA =====
// Ranking = view publica "ranking" (resumo de TODOS, sem dados privados)
async function refreshRanking(){
  const {data,error}=await sb.from('ranking')
    .select('id,player,uploaded_by,user_id,profit_per_hour,profit,kills,duration_seconds,created_at,start_time')
    .order('created_at',{ascending:false}).limit(500);
  if(error){ allSessions=[]; return error; }
  allSessions=data||[]; return null;
}
// Meus dados = tabela sessions (o RLS garante que so vem as MINHAS)
let myRows=[];
async function refreshMine(){
  const {data,error}=await sb.from('sessions')
    .select('id,player,profit_per_hour,profit,kills,duration_seconds,created_at,start_time')
    .order('created_at',{ascending:false}).limit(500);
  if(error){ myRows=[]; return error; }
  myRows=data||[]; return null;
}
function whenOf(r){ return r.start_time || r.created_at; }
function inPeriod(r,p){
  if(p==='all') return true;
  const t=new Date(whenOf(r)).getTime(); const now=Date.now();
  if(p==='today'){ const d=new Date(); d.setHours(0,0,0,0); return t>=d.getTime(); }
  const days=Number(p); return t >= now - days*86400000;
}

// ===== RANKING =====
let rankPeriod='all', rankMine=false, rankMetric='profit_per_hour';
$('#periodChips').onclick=e=>{ if(!e.target.dataset.p)return;
  document.querySelectorAll('#periodChips .chip').forEach(c=>c.classList.remove('on'));
  e.target.classList.add('on'); rankPeriod=e.target.dataset.p; renderRanking(); };
$('#mineChip').onclick=e=>{ rankMine=!rankMine; e.target.classList.toggle('on',rankMine); renderRanking(); };
$('#metricChip').onclick=e=>{ rankMetric=rankMetric==='profit_per_hour'?'profit':'profit_per_hour';
  e.target.textContent='Ordenar: '+(rankMetric==='profit_per_hour'?'Profit/h':'Profit total'); renderRanking(); };
$('#refreshRank').onclick=loadRanking;
async function loadRanking(){ showMsg('#rankMsg','info','Carregando...'); const err=await refreshRanking();
  if(err) return showMsg('#rankMsg','err','Erro: '+err.message); renderRanking(); }
function renderRanking(){
  let rows=allSessions.filter(r=>inPeriod(r,rankPeriod));
  if(rankMine&&currentUser) rows=rows.filter(r=>r.user_id===currentUser.id);
  rows=rows.slice().sort((a,b)=>(b[rankMetric]||0)-(a[rankMetric]||0));
  const tb=$('#rankTable tbody'); tb.innerHTML='';
  if(!rows.length){ $('#rankMsg').style.display='none'; tb.appendChild(el('tr',null,'<td colspan="8" class="muted">Nenhuma sessão neste filtro.</td>')); return; }
  $('#rankMsg').style.display='none';
  rows.forEach((r,i)=>{
    const rank=i<3?`<span class="rank-${i+1}">${i+1}º</span>`:(i+1);
    const mine=currentUser&&r.user_id===currentUser.id?' <span class="badge me">você</span>':'';
    const date=whenOf(r)?new Date(whenOf(r)).toLocaleDateString('pt-BR'):'—';
    tb.appendChild(el('tr',null,`<td>${rank}</td><td><b>${esc(r.player)}</b>${mine}</td><td class="muted">${esc(r.uploaded_by||'—')}</td><td class="num">${fmt(r.profit_per_hour)}</td><td class="num">${fmt(r.profit)}</td><td class="num">${fmt(r.kills)}</td><td class="num">${hhmmss(r.duration_seconds)}</td><td>${date}</td>`));
  });
}

// ===== EVOLUÇÃO =====
$('#refreshEvo').onclick=loadEvolution;
$('#evoPlayer').onchange=renderEvolution;
async function loadEvolution(){ showMsg('#evoMsg','info','Carregando...'); const err=await refreshMine();
  if(err) return showMsg('#evoMsg','err','Erro: '+err.message);
  const players=[...new Set(myRows.map(r=>r.player))].sort();
  const cur=$('#evoPlayer').value;
  $('#evoPlayer').innerHTML=players.map(p=>`<option${p===cur?' selected':''}>${p}</option>`).join('');
  $('#evoMsg').style.display='none'; renderEvolution(); }
function renderEvolution(){
  const player=$('#evoPlayer').value;
  const rows=myRows.filter(r=>r.player===player)
    .slice().sort((a,b)=>new Date(whenOf(a))-new Date(whenOf(b)));
  destroy('chEvo');
  if(!rows.length){ $('#evoStats').innerHTML=''; return showMsg('#evoMsg','info','Sem sessões salvas para este player. Salve algumas hunts na aba Importar.'); }
  if(rows.length===1){ showMsg('#evoMsg','info','Só há 1 sessão salva deste player — salve mais hunts (em horários diferentes) para a linha de evolução aparecer.'); }
  else{ $('#evoMsg').style.display='none'; }
  const labels=rows.map(r=>new Date(whenOf(r)).toLocaleDateString('pt-BR')+' '+new Date(whenOf(r)).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
  const gctx=$('#chEvo').getContext('2d');
  const grad=gctx.createLinearGradient(0,0,0,340); grad.addColorStop(0,'rgba(255,90,31,.35)'); grad.addColorStop(1,'rgba(255,90,31,0)');
  charts['chEvo']=new Chart($('#chEvo'),{type:'line',
    data:{labels,datasets:[{label:'Profit / hora',data:rows.map(r=>r.profit_per_hour||0),
      borderColor:'#ff5a1f',borderWidth:2.5,backgroundColor:grad,fill:true,tension:.35,
      pointBackgroundColor:'#ff8a1f',pointBorderColor:'#121a30',pointBorderWidth:2,pointRadius:5,pointHoverRadius:7}]},
    options:{maintainAspectRatio:false,responsive:true,
      plugins:{legend:{labels:{color:tickColor}}},
      scales:{x:{ticks:{color:'#6b7398',maxRotation:60,minRotation:30,font:{size:10}},grid:{color:gridColor}},
              y:{ticks:{color:tickColor,callback:v=>Number(v).toLocaleString('pt-BR')},grid:{color:gridColor}}}}});
  const phs=rows.map(r=>r.profit_per_hour||0);
  const best=Math.max(...phs), avg=Math.round(phs.reduce((a,b)=>a+b,0)/phs.length), totalProfit=rows.reduce((a,b)=>a+(b.profit||0),0);
  $('#evoStats').innerHTML=[
    ['Sessões',fmt(rows.length),''],
    ['Melhor profit/h',fmt(best),'gold'],
    ['Média profit/h',fmt(avg),''],
    ['Profit acumulado',fmt(totalProfit),'green'],
  ].map(([k,v,c])=>`<div class="stat"><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`).join('');
}

// ===== MINHAS SESSÕES =====
$('#refreshMine').onclick=loadMine;
async function loadMine(){ showMsg('#mineMsg','info','Carregando...'); const err=await refreshMine();
  if(err) return showMsg('#mineMsg','err','Erro: '+err.message); renderMine(); }
function renderMine(){
  const rows=myRows;
  const tb=$('#mineTable tbody'); tb.innerHTML='';
  if(!rows.length){ $('#mineMsg').style.display='none'; tb.appendChild(el('tr',null,'<td colspan="7" class="muted">Você ainda não salvou nenhuma sessão.</td>')); return; }
  $('#mineMsg').style.display='none';
  rows.forEach(r=>{
    const date=whenOf(r)?new Date(whenOf(r)).toLocaleDateString('pt-BR'):'—';
    const tr=el('tr',null,`<td><b>${esc(r.player)}</b></td><td class="num">${fmt(r.profit_per_hour)}</td><td class="num">${fmt(r.profit)}</td><td class="num">${fmt(r.kills)}</td><td class="num">${hhmmss(r.duration_seconds)}</td><td>${date}</td>`);
    const tdBtn=el('td','num'); const b=el('button','btn danger sm','Apagar'); b.onclick=()=>delSession(r.id,b); tdBtn.appendChild(b); tr.appendChild(tdBtn);
    tb.appendChild(tr);
  });
}
async function delSession(id,btn){
  if(!confirm('Apagar esta sessão? Isso não tem volta.')) return;
  btn.disabled=true; btn.textContent='Apagando...';
  const {error}=await sb.from('sessions').delete().eq('id',id);
  if(error){ btn.disabled=false; btn.textContent='Apagar'; return showMsg('#mineMsg','err','Erro ao apagar: '+error.message); }
  myRows=myRows.filter(r=>r.id!==id); renderMine();
  showMsg('#mineMsg','ok','Sessão apagada.');
}

// ===== EXEMPLO =====
const SAMPLE = {"Enemies Defeated":[{"Enemy":"Aerodactyl","Rare":true,"Count":2,"Player":"Killzone"},{"Enemy":"Machamp","Rare":false,"Count":9,"Player":"Killzone"},{"Enemy":"Bastiodon","Rare":false,"Count":6,"Player":"Killzone"},{"Enemy":"Pinsir","Rare":false,"Count":6,"Player":"Killzone"},{"Enemy":"Rhydon","Rare":false,"Count":6,"Player":"Killzone"},{"Enemy":"Kabutops","Rare":false,"Count":5,"Player":"Killzone"},{"Enemy":"Armaldo","Rare":false,"Count":4,"Player":"Killzone"},{"Enemy":"Hitmontop","Rare":false,"Count":4,"Player":"Killzone"},{"Enemy":"Omastar","Rare":false,"Count":3,"Player":"Killzone"}],
"Supplies":[{"Item":"Max Revive","Total price":9100,"Count":26,"Unit price":350},{"Item":"Empty Old Ball","Total price":8500,"Count":17,"Unit price":500},{"Item":"Medicine","Total price":100,"Count":50,"Unit price":2}],
"Damage":[{"Enemy":"Bastiodon","Damage taken":28081,"Element":"Rock","Damage dealt":0},{"Enemy":"Bastiodon","Damage taken":0,"Element":"Water","Damage dealt":538980},{"Enemy":"Armaldo","Damage taken":0,"Element":"Water","Damage dealt":394480},{"Enemy":"Kabutops","Damage taken":0,"Element":"Water","Damage dealt":306807},{"Enemy":"Omastar","Damage taken":0,"Element":"Water","Damage dealt":260088},{"Enemy":"Aerodactyl","Damage taken":0,"Element":"Water","Damage dealt":212400},{"Enemy":"Walrein","Damage taken":0,"Element":"Psychic","Damage dealt":121649},{"Enemy":"Machamp","Damage taken":0,"Element":"Fairy","Damage dealt":70016},{"Enemy":"Rhydon","Damage taken":0,"Element":"Rock","Damage dealt":87358}],
"Session":{"Raw gains":270000,"Start":"2026-09-19 13:42:20","Damage taken":364397,"Kills per hour":73,"Damage dealt":2718328,"Session type":"player","Rare kills":2,"Supplies":17700,"Duration seconds":3032,"Kills":62,"Duration":"00:50:32","Profit":252300,"Session ID":1366,"Profit per hour":299564,"Player":"Killzone"},
"Drops":[{"Item":"gold bar","Total price":242000,"Count":22,"Unit price":11000},{"Item":"Tyranitar ornament","Total price":15000,"Count":1,"Unit price":15000},{"Item":"gold coin","Total price":8000,"Count":80,"Unit price":100},{"Item":"precious ring","Total price":4000,"Count":1,"Unit price":4000},{"Item":"giant pearl","Total price":1000,"Count":1,"Unit price":1000},{"Item":"Meowth coin","Total price":0,"Count":1,"Unit price":0}]};

renderAuthMode();
