import {layouts,fingers,kinds,aggregationLabels,validateRule,evaluate,makeSpec,pythonCode} from './core.js';
const $=id=>document.getElementById(id);
let count=4,active='rh_b',selected=new Set(['rh_b/FFJ2']),powerHands=new Set(['rh_b']),rules=[],snapshot=null,tab='json',dirty=true,toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3600);}
function markDirty(){dirty=true;$('snapshot-status').textContent=snapshot?'配置已修改 · 请重新生成后导出':'尚未生成';$('copy').disabled=true;$('download').disabled=true;}
function button(text,attrs={}){const b=document.createElement('button');b.textContent=text;for(const [key,val] of Object.entries(attrs))b.setAttribute(key,val);return b;}
function selectLayout(n){
  if(n===count)return;
  if(rules.length&&!confirm('切换手数将清空现有规则和目标选择。是否继续？'))return;
  count=n;active=layouts[n][0];selected=new Set();powerHands=new Set();rules=[];renderHands();renderRules();markDirty();renderSample();
}
function renderHands(){
  $('hand-count').replaceChildren(...[2,3,4,5].map(n=>{const b=button(n+' 手',{'aria-pressed':n===count});b.onclick=()=>selectLayout(n);return b;}));
  const isPower=$('cost-type').value==='hand_power';
  $('hand-tabs').replaceChildren(...layouts[count].map(hand=>{const total=isPower?Number(powerHands.has(hand)):[...selected].filter(x=>x.startsWith(hand+'/')).length;const b=button(hand+(total?' · '+total:''),{'aria-pressed':hand===active});b.onclick=()=>{active=hand;renderHands();};return b;}));
  $('active-hand-label').textContent=active+' / '+(active.startsWith('lh')?'LEFT HAND':'RIGHT HAND');
  $('joint-map').replaceChildren();
  if(isPower){
    for(const hand of layouts[count]){const b=button(hand+' · 整手功率',{'aria-pressed':powerHands.has(hand),'class':'power-hand'});b.onclick=()=>{powerHands.has(hand)?powerHands.delete(hand):powerHands.add(hand);renderHands();renderSample();};$('joint-map').append(b);}
  }else for(const [prefix,label] of fingers){
    const col=document.createElement('div');col.className='finger';const title=document.createElement('h3');title.textContent=label;const path=document.createElement('div');path.className='finger-path';
    for(const j of [1,2,3]){const key=active+'/'+prefix+'J'+j;const b=button('J'+j,{class:'joint','aria-pressed':selected.has(key),'aria-label':key+' '+label+'，点选或取消',title:key});b.onclick=()=>{selected.has(key)?selected.delete(key):selected.add(key);renderHands();renderSample();};path.append(b);}
    const foot=document.createElement('span');foot.className='finger-code';foot.textContent=prefix;col.append(title,path,foot);$('joint-map').append(col);
  }
  $('select-middle').disabled=isPower;
  const targets=isPower?[...powerHands]:[...selected];$('selection-count').textContent=targets.length+(isPower?' 只手':' 个关节');
  $('target-strip').replaceChildren(...targets.map(key=>{const b=button(key+' ×',{class:'target-tag','aria-label':'取消 '+key});b.onclick=()=>{(isPower?powerHands:selected).delete(key);renderHands();renderSample();};return b;}));
  if(!targets.length)$('target-strip').textContent='尚未选择目标';
}
function setupType(){
  const kind=$('cost-type').value,cfg=kinds[kind];$('type-help').textContent=cfg.help;
  $('threshold-label').textContent=kind==='joint_range'?'保留原始活动范围':kind==='joint_velocity'?'绝对角速度上限':'所选手的合计功率上限';
  for(const key of ['min','max','step'])$('threshold')[key]=cfg[key];$('threshold').value=cfg.threshold;$('threshold-unit').textContent=cfg.unit;
  $('aggregation').replaceChildren(...cfg.aggregations.map(key=>new Option(aggregationLabels[key],key)));
  $('sample').value=kind==='joint_range'?85:65;$('sample-label').textContent=kind==='joint_range'?'关节在原始范围中的位置':kind==='joint_velocity'?'各目标的绝对角速度 / 阈值':'所选手合计功率 / 阈值';
  $('sample-left').textContent='0%';$('sample-right').textContent=kind==='joint_range'?'100%':'200%';renderHands();renderSample();
}
function numberValue(id){return $(id).value.trim()===''?NaN:Number($(id).value);}
function draftRule(){const kind=$('cost-type').value;return validateRule({kind,targets:[...(kind==='hand_power'?powerHands:selected)].sort(),threshold:numberValue('threshold'),threshold_unit:kinds[kind].unit,aggregation:$('aggregation').value,weight:numberValue('weight')},count);}
function renderSample(){
  try{
    const rule=draftRule(),raw=Number($('sample').value)/100;
    const value=rule.kind==='joint_range'?raw:raw*2*rule.threshold;
    const telemetry={[rule.kind]:Object.fromEntries(rule.targets.map(key=>[key,rule.kind==='hand_power'?value/rule.targets.length:value]))};
    const c=evaluate(rule,telemetry);$('sample-cost').textContent=c.toFixed(3);$('sample-state').textContent=c>0?'产生 cost':'cost = 0';$('sample-state').className='status-chip'+(c===0?' safe':'');
    $('sample-value').textContent=(raw*(rule.kind==='joint_range'?100:200)).toFixed(0)+'%';
    $('formula').textContent=rule.kind==='joint_range'?`安全区间 [${((100-rule.threshold)/2).toFixed(1)}%, ${((100+rule.threshold)/2).toFixed(1)}%]；excess = max(lo − x, x − hi, 0)` : rule.kind==='joint_velocity'?`|qvel| = ${value.toFixed(2)} rad/s；excess = max(|qvel| / limit − 1, 0)`:`Σ power = ${value.toFixed(2)} W；excess = max(Σ power / limit − 1, 0)`;
  }catch(e){$('sample-cost').textContent='—';$('sample-state').textContent='待配置';$('sample-state').className='status-chip';$('formula').textContent=e.message;}
}
function renderRules(){
  $('rule-count').textContent=rules.length+' RULES';$('rules').replaceChildren();
  rules.forEach((rule,index)=>{const el=document.createElement('div');el.className='rule';const top=document.createElement('div');top.className='rule-top';const label=document.createElement('span');label.textContent=String(index+1).padStart(2,'0')+' / '+kinds[rule.kind].label;const remove=button('移除',{class:'quiet remove-rule','aria-label':'移除规则 '+(index+1)});remove.onclick=()=>{rules.splice(index,1);renderRules();markDirty();};top.append(label,remove);const summary=document.createElement('div');summary.className='rule-summary';summary.textContent=rule.targets.join(', ')+' · '+rule.threshold+' '+rule.threshold_unit+' · '+rule.aggregation+' · w='+rule.weight;el.append(top,summary);$('rules').append(el);});
  if(!rules.length){const p=document.createElement('p');p.className='empty';p.textContent='还没有规则。选择关节后点击「添加到任务」。';$('rules').append(p);}
}
function exportText(){return !snapshot?'尚未生成任务。':tab==='json'?JSON.stringify(snapshot,null,2):pythonCode(snapshot);}
function renderCode(){$('code').textContent=exportText();$('json-tab').setAttribute('aria-pressed',tab==='json');$('python-tab').setAttribute('aria-pressed',tab==='python');}
function generate(){
  snapshot=makeSpec({name:$('task-name').value.trim(),count,song:$('song').value,budget:numberValue('budget'),rules});dirty=false;renderCode();$('snapshot-status').textContent='已生成当前配置 · 待仿真接入';$('copy').disabled=false;$('download').disabled=false;return snapshot;
}
$('select-middle').onclick=()=>{for(const [prefix] of fingers)selected.add(active+'/'+prefix+'J2');renderHands();renderSample();};
$('clear-selection').onclick=()=>{selected.clear();powerHands.clear();renderHands();renderSample();};
$('cost-type').onchange=setupType;
for(const id of ['threshold','aggregation','weight','sample'])$(id).addEventListener('input',renderSample);
for(const id of ['task-name','song','budget'])$(id).addEventListener('input',markDirty);
$('add-rule').onclick=()=>{try{const rule=draftRule();if(rules.some(r=>JSON.stringify(r)===JSON.stringify(rule)))throw Error('相同规则已存在，不重复叠加 cost');rules.push(rule);renderRules();markDirty();toast('已添加规则。编辑器中的后续修改不会改变已添加规则。');}catch(e){toast(e.message);}};
$('generate').onclick=()=>{try{generate();toast('已生成 JSON 与 Python 草案；未修改或注册训练环境。');}catch(e){toast(e.message);}};
$('json-tab').onclick=()=>{tab='json';renderCode();};$('python-tab').onclick=()=>{tab='python';renderCode();};
$('copy').onclick=async()=>{if(dirty||!snapshot)return;try{await navigator.clipboard.writeText(exportText());toast('已复制 '+(tab==='json'?'JSON':'Python'));}catch{toast('浏览器未允许复制，请使用下载文件。');}};
$('download').onclick=()=>{if(dirty||!snapshot)return;const blob=new Blob([exportText()],{type:tab==='json'?'application/json;charset=utf-8':'text/x-python;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=snapshot.task_name+(tab==='json'?'.json':'_cost.py');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出 '+a.download);};
setupType();rules=[draftRule()];renderRules();generate();
const context=document.modelContext;
if(context?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  for(const tool of [
    {name:'read_safety_task_draft',description:'Read saved rules and latest draft without modifying a training environment.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');return {hand_count:count,rules:JSON.parse(JSON.stringify(rules)),snapshot,dirty};}},
    {name:'generate_safety_task_draft',description:'Generate JSON and Python draft from visible saved rules. Does not register an environment, download files, or run experiments.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');return generate();}}
  ]){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* optional API unavailable */}}
}
