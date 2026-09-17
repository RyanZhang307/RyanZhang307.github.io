import {layouts,fingers,kinds,aggregationLabels,validateRule,makeSpec,pythonCode} from './core.js';

const $=id=>document.getElementById(id);
let count=4;
let hand=layouts[count][0];
let finger='TH';
let joint='J2';
let savedRules=[];
let snapshot=null;
let outputTab='json';
let toastTimer;

function showToast(message){
  $('toast').textContent=message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);
}

function choice(title,subtitle,pressed,onClick){
  const button=document.createElement('button');
  button.className='choice';
  button.setAttribute('aria-pressed',String(pressed));
  const strong=document.createElement('strong');strong.textContent=title;
  const small=document.createElement('small');small.textContent=subtitle;
  button.append(strong,small);button.onclick=onClick;
  return button;
}

function kind(){return $('cost-type').value;}
function isPower(){return kind()==='hand_power';}
function numberValue(id){return $(id).value.trim()===''?NaN:Number($(id).value);}

function renderChoices(){
  $('hand-options').replaceChildren(...layouts[count].map((name,index)=>choice(name,'区域 '+(index+1),name===hand,()=>{hand=name;renderChoices();hideResult();})));
  $('finger-options').replaceChildren(...fingers.map(([code,label])=>choice(label,code,code===finger,()=>{finger=code;renderChoices();hideResult();})));
  $('joint-options').replaceChildren(...['J1','J2','J3'].map(name=>choice(name,name==='J1'?'远端关节':name==='J2'?'中间关节':'近端关节',name===joint,()=>{joint=name;renderChoices();hideResult();})));
  $('finger-step').hidden=isPower();
  $('joint-step').hidden=isPower();
  $('params-step').textContent=isPower()?'2':'4';
  renderSelection();
}

function renderSelection(){
  const target=isPower()?hand:`${hand} / ${finger}${joint}`;
  $('selection-summary').textContent=target;
  $('selection-explanation').textContent=(savedRules.length?`已保存 ${savedRules.length} 个目标 · `:'')+(isPower()?'约束这只手的执行器总功率':'约束这个物理关节');
}

function configureKind(){
  const config=kinds[kind()];
  $('aggregation').replaceChildren(...config.aggregations.map(name=>new Option(aggregationLabels[name],name)));
  Object.assign($('threshold'),{min:config.min,max:config.max,step:config.step,value:config.threshold});
  $('threshold-unit').textContent=config.unit;
  $('threshold-label').textContent=kind()==='joint_range'?'保留原始活动范围':kind()==='joint_velocity'?'绝对角速度上限':'整手总功率上限';
  $('type-help').textContent=config.help;
  savedRules=[];
  renderChoices();hideResult();
}

function currentRule(){
  const rule={kind:kind(),targets:[isPower()?hand:`${hand}/${finger}${joint}`],threshold:numberValue('threshold'),threshold_unit:kinds[kind()].unit,aggregation:$('aggregation').value,weight:numberValue('weight')};
  return validateRule(rule,count);
}

function buildSnapshot(){
  const current=currentRule();
  const rules=[...savedRules];
  if(!rules.some(rule=>JSON.stringify(rule)===JSON.stringify(current)))rules.push(current);
  snapshot=makeSpec({name:$('task-name').value.trim(),count,song:$('song').value,budget:numberValue('budget'),rules});
  return snapshot;
}

function renderResult(){
  const current=currentRule();
  $('result-target').textContent=current.targets[0]+(snapshot.cost.rules.length>1?` + ${snapshot.cost.rules.length-1} more`:'');
  $('result-cost').textContent=kinds[current.kind].label+' / '+current.aggregation;
  $('result-threshold').textContent=current.threshold+' '+current.threshold_unit;
  $('result-budget').textContent=String(snapshot.cost.episode_cost_limit_candidate);
  renderCode();$('result').hidden=false;
  $('result').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function renderCode(){
  if(!snapshot)return;
  $('json-tab').setAttribute('aria-pressed',String(outputTab==='json'));
  $('python-tab').setAttribute('aria-pressed',String(outputTab==='python'));
  $('code').textContent=outputTab==='json'?JSON.stringify(snapshot,null,2):pythonCode(snapshot);
}

function hideResult(){$('result').hidden=true;}
function generate(){buildSnapshot();renderResult();return snapshot;}
function download(format){
  if(!snapshot)return;
  const text=format==='json'?JSON.stringify(snapshot,null,2):pythonCode(snapshot);
  const blob=new Blob([text],{type:format==='json'?'application/json;charset=utf-8':'text/x-python;charset=utf-8'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=snapshot.task_name+(format==='json'?'.json':'_cost.py');anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

$('hand-count').onchange=()=>{count=Number($('hand-count').value);hand=layouts[count][0];savedRules=[];renderChoices();hideResult();};
$('cost-type').onchange=configureKind;
$('aggregation').onchange=hideResult;
for(const id of ['threshold','weight','budget','task-name','song'])$(id).addEventListener('input',hideResult);
$('generate').onclick=()=>{try{generate();showToast('草案已生成，但尚未注册环境。');}catch(error){showToast(error.message);}};
$('close-result').onclick=hideResult;
$('add-another').onclick=()=>{try{const rule=currentRule();if(!savedRules.some(item=>JSON.stringify(item)===JSON.stringify(rule)))savedRules.push(rule);snapshot=null;hideResult();renderSelection();$('hand-options').scrollIntoView({behavior:'smooth',block:'center'});showToast('已保存当前目标，请选择下一个。');}catch(error){showToast(error.message);}};
$('download-json').onclick=()=>download('json');
$('download-python').onclick=()=>download('python');
$('json-tab').onclick=()=>{outputTab='json';renderCode();};
$('python-tab').onclick=()=>{outputTab='python';renderCode();};

configureKind();

const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const tools=[
    {name:'read_safety_task_selection',title:'读取 Safety 任务选择',description:'读取页面中当前选择和已生成草案；不会修改或注册训练环境。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');return {hand_count:count,target:isPower()?hand:`${hand}/${finger}${joint}`,cost_type:kind(),saved_target_count:savedRules.length,snapshot};}},
    {name:'generate_safety_task_draft',title:'生成 Safety 任务草案',description:'按照页面当前选择生成草案；不会下载文件、注册环境或运行实验。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');return generate();}}
  ];
  for(const tool of tools)try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* optional browser API */}
}
