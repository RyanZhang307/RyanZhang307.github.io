import {layouts,fingers,kinds,validateRule,makeSpec,pythonCode} from './core.js';

const $=id=>document.getElementById(id);
const messages={
  zh:{subtitle:'选择需要保护的部位，生成一条 safety cost 草案。',basicConfig:'基础配置',handCount:'手数',hands2:'2 手',hands3:'3 手',hands4:'4 手',hands5:'5 手',costType:'伤害 / 约束类型',jointRange:'关节活动范围',jointVelocity:'关节运动速度',handPower:'指定手总功率',aggregation:'聚合方式',chooseHand:'选择一只手',chooseHandHelp:'多手布局沿用当前环境中的 HandSpec 名称。',chooseFinger:'选择手指',chooseFingerHelp:'一次生成一个目标关节，之后可以继续添加。',chooseJoint:'选择关节',chooseJointHelp:'J1–J3 是模型中的关节后缀，不是人体解剖编号。',setParams:'设置 cost 参数',costWeight:'Cost 权重',taskInfo:'任务信息（可选）',taskName:'任务名称',song:'配套曲目',currentTarget:'当前目标',generateDraft:'生成任务草案',draftReady:'草案已生成',draftReadyHelp:'这是 cost 定义，不会改变关节物理状态，也尚未注册环境。',target:'目标',threshold:'阈值',budget:'预算',download:'下载',addAnother:'＋ 再添加一个目标',viewGenerated:'查看生成内容',onlinePreview:'在线预览',previewBeforeDownload:'确认内容后再下载',outputFormat:'输出格式',scopeTitle:'这个页面现在做什么？',scopeBody:'定义目标和 cost 计算方式，并导出草案。真实接入仍需完成 MuJoCo 传感器绑定、BaseConstraint 适配、环境注册与 smoke test。',region:'区域',thumb:'拇指',index:'食指',middle:'中指',ring:'无名指',little:'小指',distal:'远端关节',middleJoint:'中间关节',proximal:'近端关节',savedTargets:'已保存 {n} 个目标',wholeHandExplain:'约束这只手的执行器总功率',jointExplain:'约束这个物理关节',rangeLabel:'保留原始活动范围',velocityLabel:'绝对角速度上限',powerLabel:'整手总功率上限',rangeHelp:'限定原始关节范围的中间一段；越出边界才产生 cost。',velocityHelp:'限制所选关节的绝对角速度，不限制动作指令本身。阈值是自定义候选值。',powerHelp:'先对所选手的所有执行器功率求和，再与一个总阈值比较。不是单个关节功率，也不是累计能耗。',aggMean:'平均越界程度 · mean excess',aggBinary:'任一目标越界 · binary',aggFraction:'越界目标占比 · fraction',aggMax:'最大越界程度 · max excess',aggPower:'归一化超限 · normalized excess',more:'另外 {n} 个',generatedToast:'草案已生成，但尚未注册环境。',savedToast:'已保存当前目标，请选择下一个。',invalid:'请检查目标、阈值、权重与预算。',closeResult:'收起结果',switchLanguage:'Switch to English'},
  en:{subtitle:'Select the body part to protect and generate a safety cost draft.',basicConfig:'Basic configuration',handCount:'Number of hands',hands2:'2 hands',hands3:'3 hands',hands4:'4 hands',hands5:'5 hands',costType:'Injury / constraint type',jointRange:'Joint range',jointVelocity:'Joint velocity',handPower:'Selected-hand total power',aggregation:'Aggregation',chooseHand:'Choose a hand',chooseHandHelp:'Hand names follow the current environment’s HandSpec layout.',chooseFinger:'Choose a finger',chooseFingerHelp:'Generate one target joint at a time, then add more if needed.',chooseJoint:'Choose a joint',chooseJointHelp:'J1–J3 are model joint suffixes, not human anatomical labels.',setParams:'Set cost parameters',costWeight:'Cost weight',taskInfo:'Task information (optional)',taskName:'Task name',song:'Song',currentTarget:'Current target',generateDraft:'Generate task draft',draftReady:'Draft generated',draftReadyHelp:'This defines a cost. It does not change joint physics or register an environment.',target:'Target',threshold:'Threshold',budget:'Budget',download:'Download',addAnother:'＋ Add another target',viewGenerated:'View generated content',onlinePreview:'Online preview',previewBeforeDownload:'Review the content before downloading',outputFormat:'Output format',scopeTitle:'What does this page do?',scopeBody:'It defines targets and cost computation, then exports a draft. Real integration still requires MuJoCo sensor binding, a BaseConstraint adapter, environment registration, and a smoke test.',region:'Region',thumb:'Thumb',index:'Index',middle:'Middle',ring:'Ring',little:'Little',distal:'Distal joint',middleJoint:'Middle joint',proximal:'Proximal joint',savedTargets:'{n} target(s) saved',wholeHandExplain:'Constrain the total actuator power of this hand',jointExplain:'Constrain this physical joint',rangeLabel:'Retained native joint range',velocityLabel:'Absolute angular-velocity limit',powerLabel:'Whole-hand total-power limit',rangeHelp:'Keep the central part of the native joint range; cost appears only outside it.',velocityHelp:'Limit absolute physical joint velocity, not the action command. The threshold is a design candidate.',powerHelp:'Sum actuator power over the selected hand, then compare it with one total limit. This is neither per-joint power nor accumulated energy.',aggMean:'Mean normalized excess',aggBinary:'Any target violates · binary',aggFraction:'Fraction of targets violating',aggMax:'Maximum normalized excess',aggPower:'Normalized excess',more:'{n} more',generatedToast:'Draft generated; the environment is not registered yet.',savedToast:'Current target saved. Choose the next target.',invalid:'Check the target, threshold, weight, and budget.',closeResult:'Collapse result',switchLanguage:'切换到中文'}
};
function preferredLanguage(){try{return localStorage.getItem('omnipiano-safety-language')==='en'?'en':'zh';}catch{return 'zh';}}
let language=preferredLanguage();
let count=4;
let hand=layouts[count][0];
let finger='TH';
let joint='J2';
let savedRules=[];
let snapshot=null;
let outputTab='json';
let toastTimer;
const t=(key,values={})=>Object.entries(values).reduce((text,[name,value])=>text.replace(`{${name}}`,String(value)),messages[language][key]??key);
const fingerKeys={TH:'thumb',FF:'index',MF:'middle',RF:'ring',LF:'little'};
const kindLabelKeys={joint_range:'jointRange',joint_velocity:'jointVelocity',hand_power:'handPower'};
const aggregationKeys={mean_excess:'aggMean',binary:'aggBinary',violation_fraction:'aggFraction',max_excess:'aggMax',normalized_excess:'aggPower'};

function renderAggregation(){
  const previous=$('aggregation').value;
  $('aggregation').replaceChildren(...kinds[kind()].aggregations.map(name=>new Option(t(aggregationKeys[name]),name)));
  if(kinds[kind()].aggregations.includes(previous))$('aggregation').value=previous;
}

function renderKindText(){
  $('threshold-label').textContent=t(kind()==='joint_range'?'rangeLabel':kind()==='joint_velocity'?'velocityLabel':'powerLabel');
  $('type-help').textContent=t(kind()==='joint_range'?'rangeHelp':kind()==='joint_velocity'?'velocityHelp':'powerHelp');
}

function applyLanguage(){
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  document.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=t(element.dataset.i18n);});
  document.querySelectorAll('[data-i18n-aria]').forEach(element=>{element.setAttribute('aria-label',t(element.dataset.i18nAria));});
  $('language-toggle').textContent=language==='zh'?'EN':'中文';
  $('language-toggle').setAttribute('aria-label',t('switchLanguage'));
  $('close-result').setAttribute('aria-label',t('closeResult'));
  renderAggregation();renderKindText();renderChoices();
  if(snapshot&&!$('result').hidden)renderResult(false);
}

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
  $('hand-options').replaceChildren(...layouts[count].map((name,index)=>choice(name,t('region')+' '+(index+1),name===hand,()=>{hand=name;renderChoices();hideResult();})));
  $('finger-options').replaceChildren(...fingers.map(([code])=>choice(t(fingerKeys[code]),code,code===finger,()=>{finger=code;renderChoices();hideResult();})));
  $('joint-options').replaceChildren(...['J1','J2','J3'].map(name=>choice(name,t(name==='J1'?'distal':name==='J2'?'middleJoint':'proximal'),name===joint,()=>{joint=name;renderChoices();hideResult();})));
  $('finger-step').hidden=isPower();
  $('joint-step').hidden=isPower();
  $('params-step').textContent=isPower()?'2':'4';
  renderSelection();
}

function renderSelection(){
  const target=isPower()?hand:`${hand} / ${finger}${joint}`;
  $('selection-summary').textContent=target;
  $('selection-explanation').textContent=(savedRules.length?t('savedTargets',{n:savedRules.length})+' · ':'')+t(isPower()?'wholeHandExplain':'jointExplain');
}

function configureKind(){
  const config=kinds[kind()];
  renderAggregation();
  Object.assign($('threshold'),{min:config.min,max:config.max,step:config.step,value:config.threshold});
  $('threshold-unit').textContent=config.unit;
  renderKindText();
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

function renderResult(scroll=true){
  const current=currentRule();
  $('result-target').textContent=current.targets[0]+(snapshot.cost.rules.length>1?' + '+t('more',{n:snapshot.cost.rules.length-1}):'');
  $('result-cost').textContent=t(kindLabelKeys[current.kind])+' / '+t(aggregationKeys[current.aggregation]);
  $('result-threshold').textContent=current.threshold+' '+current.threshold_unit;
  $('result-budget').textContent=String(snapshot.cost.episode_cost_limit_candidate);
  renderCode();$('result').hidden=false;
  if(scroll)$('result').scrollIntoView({behavior:'smooth',block:'nearest'});
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
$('generate').onclick=()=>{try{generate();showToast(t('generatedToast'));}catch{showToast(t('invalid'));}};
$('close-result').onclick=hideResult;
$('add-another').onclick=()=>{try{const rule=currentRule();if(!savedRules.some(item=>JSON.stringify(item)===JSON.stringify(rule)))savedRules.push(rule);snapshot=null;hideResult();renderSelection();$('hand-options').scrollIntoView({behavior:'smooth',block:'center'});showToast(t('savedToast'));}catch{showToast(t('invalid'));}};
$('download-json').onclick=()=>download('json');
$('download-python').onclick=()=>download('python');
$('json-tab').onclick=()=>{outputTab='json';renderCode();};
$('python-tab').onclick=()=>{outputTab='python';renderCode();};

$('language-toggle').onclick=()=>{language=language==='zh'?'en':'zh';try{localStorage.setItem('omnipiano-safety-language',language);}catch{/* storage can be disabled */}applyLanguage();};

configureKind();applyLanguage();

const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const tools=[
    {name:'read_safety_task_selection',title:'读取 Safety 任务选择',description:'读取页面中当前选择和已生成草案；不会修改或注册训练环境。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');return {hand_count:count,target:isPower()?hand:`${hand}/${finger}${joint}`,cost_type:kind(),saved_target_count:savedRules.length,snapshot};}},
    {name:'generate_safety_task_draft',title:'生成 Safety 任务草案',description:'按照页面当前选择生成草案；不会下载文件、注册环境或运行实验。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');return generate();}}
  ];
  for(const tool of tools)try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* optional browser API */}
}
