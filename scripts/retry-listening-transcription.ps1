$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$work = Join-Path $workspace 'tmp\listening-transcription'
$python = (Get-Command python).Source
Push-Location $workspace
try {
  foreach ($index in @(10, 11, 12, 13)) {
    & $python 'scripts/listening-transcribe.py' '--index' $index *>> (Join-Path $work 'retry.log')
  }
  $count = @(Get-ChildItem -LiteralPath (Join-Path $work 'drafts') -Filter '*.json' -File).Count
  if ($count -eq 26) {
    Set-Content -LiteralPath (Join-Path $work 'status.txt') -Value 'All 26 machine drafts are ready for review.'
  } else {
    Set-Content -LiteralPath (Join-Path $work 'status.txt') -Value "$count of 26 drafts are ready after retry; inspect retry.log."
  }
} finally {
  Pop-Location
}
