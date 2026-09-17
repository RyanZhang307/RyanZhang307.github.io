# OmniPiano Safety Studio — interaction prototype

Static, client-only extension to the existing GitHub Pages site. No training code, credentials, results or private data are included. Open the deployed `/omnipiano-safety/` route in a modern browser. The JavaScript modules require HTTP(S), not a file URL. No dependency installation or bundler is required.

## Scope

- Select 2–5 hands using the current default HandSpec names.
- Select physical joint suffixes J1–J3 for each finger (a subset, not a complete anatomical model).
- Create central-range, angular-velocity or selected-hand total-power rules. Use **再添加一个目标** to combine targets; rules are summed.
- Review a compact generated summary and export a frozen JSON specification or Python numeric evaluator.
- Thresholds and episode budgets are explicitly candidate values. There is no automatic initialization masking or performance-driven calibration.
- Choosing a song does not validate its suitability for a morphology.

## Not yet integrated

This is not a MuJoCo renderer, a physics injury simulator, an environment registry or an experiment runner. The exported Python is a standalone numeric evaluator, **not** a drop-in BaseConstraint. It needs an adapter that resolves exact hand/joint identities and collects telemetry after each control step. No nonexistent repository classes are imported.

Telemetry is namespaced by cost type, allowing range and velocity constraints on the same joint without unit collisions:

```python
telemetry = {
    'joint_range': {'rh_b/FFJ2': 0.85}, # (qpos-low)/(high-low), no clipping
    'joint_velocity': {'rh_b/FFJ2': 3.0}, # physical qvel, rad/s
    'hand_power': {'rh_b': 5.2}, # sum(abs(force*velocity)) over actuators, W
}
total, per_rule = step_cost(telemetry)
```

Use actuator transmission force/velocity sensors for power. Do not infer a one-to-one actuator from a physical finger joint: tendon coupling can break that mapping. Native-range normalization must use a finite positive range span. Accumulate total once per control step; reset episode accumulation on reset. No time factor is applied, so this is not energy integration. Any subsequent integration must check reset transients, exact target resolution, missing values, finite costs and consistent logs.

## Export semantics

The page follows one hierarchy: hand count and cost type, hand, finger, joint, then parameters. Whole-hand power intentionally skips finger and joint. **生成任务草案** snapshots the visible target plus optional previously saved targets. **再添加一个目标** saves the current rule before returning to target selection. Changing hand count or cost type clears saved targets because target identity or units change. Song and task name are optional advanced fields. Invalid parameters prevent generation.

## Validation

Run `node ../tests/check-safety.mjs` from this directory (set `SAFETY_TEST_PYTHON` to a Python executable for cross-language numeric tests). Checks cover every supported hand count and cost aggregation, invalid targets and parameters, missing telemetry and Python/JavaScript parity. They are not MuJoCo smoke tests or browser interaction tests.

The optional WebMCP read/generate tools are feature-detected; an unsupported browser retains all UI functionality. They have not been validated in a supported live WebMCP context.
