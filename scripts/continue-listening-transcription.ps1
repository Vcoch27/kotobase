param([Parameter(Mandatory = $true)][int]$PilotProcessId)

$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$work = Join-Path $workspace 'tmp\listening-transcription'
$draft = Join-Path $work 'drafts\25.json'
$status = Join-Path $work 'status.txt'

while (Get-Process -Id $PilotProcessId -ErrorAction SilentlyContinue) {
  Start-Sleep -Seconds 15
}

if (-not (Test-Path -LiteralPath $draft)) {
  Set-Content -LiteralPath $status -Value 'Pilot transcription failed; inspect pilot.err.log and pilot.out.log.'
  exit 1
}

Set-Content -LiteralPath $status -Value 'Transcribing remaining exams.'
Push-Location $workspace
try {
  $python = (Get-Command python).Source
  & $python 'scripts/listening-transcribe.py' *>> (Join-Path $work 'full.log')
  if ($LASTEXITCODE -ne 0) {
    Set-Content -LiteralPath $status -Value "Worker stopped with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
  }
  $count = @(Get-ChildItem -LiteralPath (Join-Path $work 'drafts') -Filter '*.json' -File).Count
  if ($count -eq 26) {
    Set-Content -LiteralPath $status -Value 'All 26 machine drafts are ready for review.'
  } else {
    Set-Content -LiteralPath $status -Value "$count of 26 machine drafts are ready; inspect full.log for failures."
  }
} finally {
  Pop-Location
}
