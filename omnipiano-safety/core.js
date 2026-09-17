// Pure cost logic shared by the UI and automated checks.
export const layouts = {2:['rh','lh'],3:['lh','rh_c','rh'],4:['lh_b','rh_b','lh_t','rh_t'],5:['lh_b','rh_b','rh_c','lh_t','rh_t']};
export const fingers = [['TH','拇指'],['FF','食指'],['MF','中指'],['RF','无名指'],['LF','小指']];
export const kinds = {
  joint_range:{label:'关节活动范围',threshold:50,unit:'%',min:1,max:100,step:1,aggregations:['mean_excess','binary','violation_fraction','max_excess'],help:'限定原始关节范围的中间一段；越出边界才产生 cost。'},
  joint_velocity:{label:'关节运动速度',threshold:2,unit:'rad/s',min:0.01,max:10000,step:0.1,aggregations:['mean_excess','binary','violation_fraction','max_excess'],help:'限制所选关节的绝对角速度，不限制动作指令本身。阈值是自定义候选值。'},
  hand_power:{label:'指定手总功率',threshold:4,unit:'W',min:0.01,max:100000,step:0.1,aggregations:['normalized_excess','binary'],help:'先对所选手的所有执行器功率求和，再与一个总阈值比较。不是单个关节功率，也不是累计能耗。'}
};
export const aggregationLabels={mean_excess:'平均越界程度 · mean excess',binary:'任一目标越界 · binary',violation_fraction:'越界目标占比 · fraction',max_excess:'最大越界程度 · max excess',normalized_excess:'归一化超限 · normalized excess'};
export function validateRule(rule,count){
  if(!kinds[rule.kind] || !layouts[count]) throw Error('不支持的规则或手数');
  if(!Number.isFinite(rule.threshold)||rule.threshold<=0||(rule.kind==='joint_range'&&rule.threshold>100)) throw Error('阈值必须为正数；活动范围不能超过 100%');
  if(!Number.isFinite(rule.weight)||rule.weight<0) throw Error('Cost 权重必须为有限非负数');
  if(!kinds[rule.kind].aggregations.includes(rule.aggregation)) throw Error('此 cost 不支持该聚合方式');
  if(!rule.targets.length||new Set(rule.targets).size!==rule.targets.length) throw Error('请至少选择一个不重复的目标');
  for(const target of rule.targets){
    const [hand,joint,...extra]=target.split('/');
    if(!layouts[count].includes(hand)||extra.length) throw Error('目标不在当前手布局中');
    if(rule.kind==='hand_power'?joint!==undefined:! /^(TH|FF|MF|RF|LF)J[123]$/.test(joint||'')) throw Error('无效的目标类型');
  }
  return rule;
}
export function evaluate(rule,telemetry){
  const values=rule.targets.map(key=>{const v=telemetry[rule.kind]?.[key];if(typeof v!=='number'||!Number.isFinite(v)) throw Error('缺少有限数值 telemetry: '+rule.kind+'/'+key);return v;});
  let excess;
  if(rule.kind==='hand_power'){
    if(values.some(v=>v<0)) throw Error('功率必须非负');
    excess=[Math.max(0,values.reduce((a,b)=>a+b,0)/rule.threshold-1)];
  }else if(rule.kind==='joint_range'){
    const lo=(1-rule.threshold/100)/2,hi=1-lo;
    excess=values.map(v=>Math.max(lo-v,v-hi,0));
  }else if(rule.kind==='joint_velocity') excess=values.map(v=>Math.max(0,Math.abs(v)/rule.threshold-1));
  else throw Error('未知 cost 类型');
  const agg=rule.aggregation;
  let value;
  if(agg==='binary') value=Number(excess.some(v=>v>0));
  else if(agg==='violation_fraction') value=excess.filter(v=>v>0).length/excess.length;
  else if(agg==='max_excess') value=Math.max(...excess);
  else if(agg==='mean_excess'||agg==='normalized_excess') value=excess.reduce((a,b)=>a+b,0)/excess.length;
  else throw Error('未知聚合方式');
  return value*rule.weight;
}
export function makeSpec({name,count,song,budget,rules}){
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(name)) throw Error('任务名请用字母开头，只含字母、数字、下划线或短横线');
  if(!Number.isFinite(budget)||budget<0) throw Error('Episode cost limit 必须为有限非负数');
  if(!rules.length) throw Error('请先添加至少一条约束');
  rules.forEach(r=>validateRule(r,count));
  return JSON.parse(JSON.stringify({schema_version:'omnipiano-safety-studio-draft/0.1',task_name:name,status:'draft_not_registered',hand_count:count,hand_names:layouts[count],song,hand_layout:'existing_default_hand_specs',reward:'OT_unmodified',dynamics:'unchanged',cost:{rule_aggregation:'sum',episode_aggregation:'undiscounted_sum',episode_cost_limit_candidate:budget,initialization_mask_steps:0,rules},integration:{ready:false,required:['Resolve exact named hands and physical joints on every reset','Read qpos/range, qvel or actuator power telemetry from MuJoCo','Wrap step_cost in BaseConstraint and register a new versioned environment','Check reset transient, missing targets, units, and episode accumulation in smoke tests'],telemetry_contract:{joint_range:'key=hand/joint; value=(qpos-native_low)/(native_high-native_low); no clipping',joint_velocity:'key=hand/joint; signed physical qvel in rad/s',hand_power:'key=hand; sum(abs(actuator_force * actuator_velocity)) in W; use actuator transmission sensors, not joint-to-actuator guesses'}},notes:['UI defaults are design placeholders, not calibrated benchmark parameters.','Selections describe soft safety costs, not anatomical injury simulation.','Changing aggregation, targets or masks changes task semantics.','No automatic scaling by number of hands, episode length or training performance.']}));
}
export function pythonCode(spec){
  return `"""Generated cost-function draft; NOT an environment registration.
No MuJoCo adapter is installed by this file. See SPEC['integration'].
Range telemetry must use native joint range normalization, without clipping.
Non-finite/missing telemetry fails closed. Call once per control step.
"""
import json
import math

SPEC = json.loads(${JSON.stringify(JSON.stringify(spec))})

def step_cost(telemetry):
    """Return (total, per_rule) for one step from explicit telemetry.

    Read physical state after env.step. Add total to an undiscounted
    episode accumulator; reset that accumulator on env.reset.
    This function does not implement masking, modify reward or train a policy.
    """
    breakdown = {}
    for index, rule in enumerate(SPEC["cost"]["rules"]):
        values = [float(telemetry[rule["kind"]][key]) for key in rule["targets"]]
        if not values or not all(math.isfinite(v) for v in values):
            raise ValueError("Empty or non-finite telemetry")
        threshold = rule["threshold"]
        kind = rule["kind"]
        if kind == "joint_range":
            lo = (1.0 - threshold / 100.0) / 2.0
            hi = 1.0 - lo
            excess = [max(lo - v, v - hi, 0.0) for v in values]
        elif kind == "joint_velocity":
            excess = [max(0.0, abs(v) / threshold - 1.0) for v in values]
        elif kind == "hand_power":
            if any(v < 0 for v in values):
                raise ValueError("Power must be nonnegative")
            excess = [max(0.0, sum(values) / threshold - 1.0)]
        else:
            raise ValueError("Unknown cost kind")
        aggregation = rule["aggregation"]
        if aggregation == "binary":
            cost = float(any(v > 0 for v in excess))
        elif aggregation == "violation_fraction":
            cost = sum(v > 0 for v in excess) / len(excess)
        elif aggregation == "max_excess":
            cost = max(excess)
        elif aggregation in ("mean_excess", "normalized_excess"):
            cost = sum(excess) / len(excess)
        else:
            raise ValueError("Unknown aggregation")
        breakdown[f"rule_{index + 1}"] = cost * rule["weight"]
    return sum(breakdown.values()), breakdown
`;
}
