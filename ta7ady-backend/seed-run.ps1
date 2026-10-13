$ErrorActionPreference = "Continue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataPath = Join-Path $here "seed-data.json"
$raw = [System.IO.File]::ReadAllText($dataPath, [System.Text.Encoding]::UTF8)
$data = $raw | ConvertFrom-Json
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "ta7ady-seed"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Post-Json($url, $obj) {
  $json = ($obj | ConvertTo-Json -Compress)
  $f = Join-Path $tmp ([System.IO.Path]::GetRandomFileName() + ".json")
  [System.IO.File]::WriteAllText($f, $json, $utf8)
  $out = curl.exe -s -w "`n%{http_code}" -X POST $url -H "Content-Type: application/json; charset=utf-8" --data-binary "@$f"
  Remove-Item $f -Force -ErrorAction SilentlyContinue
  return $out
}
$pOk = 0; $pSkip = 0
foreach ($n in $data.players) {
  $r = Post-Json "http://localhost:8080/api/players" @{playerName = [string]$n}
  $code = ($r | Select-Object -Last 1)
  if ($code -eq "200" -or $code -eq "201") { $pOk++ } else { $pSkip++; Write-Output ("PLAYER SKIP [" + $code + "]: " + $n) }
}
$iOk = 0; $iSkip = 0
foreach ($q in $data.ihbid) {
  $r = Post-Json "http://localhost:8080/api/ihbid" @{questionText = [string]$q[0]; answerText = [string]$q[1]}
  $code = ($r | Select-Object -Last 1)
  if ($code -eq "200" -or $code -eq "201") { $iOk++ } else { $iSkip++; Write-Output ("IHBID SKIP [" + $code + "]: " + $q[0]) }
}
$oOk = 0; $oSkip = 0
foreach ($t in $data.offside) {
  $r = Post-Json "http://localhost:8080/api/offside" @{ruleText = [string]$t}
  $code = ($r | Select-Object -Last 1)
  if ($code -eq "200" -or $code -eq "201") { $oOk++ } else { $oSkip++; Write-Output ("OFFSIDE SKIP [" + $code + "]: " + $t) }
}
Write-Output ("RESULT players_ok=" + $pOk + " players_skip=" + $pSkip + " ihbid_ok=" + $iOk + " ihbid_skip=" + $iSkip + " offside_ok=" + $oOk + " offside_skip=" + $oSkip)
