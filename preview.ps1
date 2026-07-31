$ErrorActionPreference = "Stop"

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { $null }

if ($nodePath) {
  try {
    & $nodePath --version | Out-Null
  } catch {
    $nodePath = $null
  }
}

if (-not $nodePath) {
  $bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path -LiteralPath $bundledNode) {
    $nodePath = $bundledNode
  }
}

if (-not $nodePath) {
  throw "Node.js was not found. Install Node.js LTS or use VS Code Live Server."
}

& $nodePath (Join-Path $PSScriptRoot "tools\dev-server.mjs") 5500
