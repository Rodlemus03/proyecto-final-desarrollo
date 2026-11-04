$workspace = Split-Path -Parent $PSScriptRoot
$nodeBin = Join-Path $workspace '.node20\node_modules\node\bin'

if (-not (Test-Path -LiteralPath (Join-Path $nodeBin 'node.exe'))) {
    throw "No se encuentra Node 20 en $nodeBin"
}

$env:Path = "$nodeBin;$env:Path"
$env:COREPACK_HOME = Join-Path $workspace '.corepack'
$env:npm_config_cache = Join-Path $workspace '.npm-cache'

Push-Location $PSScriptRoot
try {
    & corepack.cmd pnpm dev
}
finally {
    Pop-Location
}
