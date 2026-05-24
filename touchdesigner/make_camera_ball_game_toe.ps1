$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspace = Split-Path -Parent $root
$tdBin = 'C:\Program Files\Derivative\TouchDesigner\bin'
$sourceToe = 'C:\Program Files\Derivative\TouchDesigner\Samples\Setup\Base\NewProject.toe'
$toe = Join-Path $root 'CameraBallGame.toe'
$toeDir = "$toe.dir"
$toc = "$toe.toc"
$bootstrapScript = Join-Path $root 'td_camera_ball_game.py'

if (-not (Test-Path $sourceToe)) {
  throw "NewProject.toe was not found at $sourceToe"
}
if (-not (Test-Path $bootstrapScript)) {
  throw "Bootstrap script was not found at $bootstrapScript"
}

if (Test-Path $toeDir) {
  Remove-Item -LiteralPath $toeDir -Recurse -Force
}
if (Test-Path $toc) {
  Remove-Item -LiteralPath $toc -Force
}
Copy-Item -LiteralPath $sourceToe -Destination $toe -Force

& (Join-Path $tdBin 'toeexpand.exe') $toe | Out-Host

$projectDir = Join-Path $toeDir 'project1'
New-Item -ItemType Directory -Path $projectDir -Force | Out-Null

@'
DAT:execute
tile -180 -90 160 105
flags =  current on viewer 1 parlanguage 0
color 0.55 0.55 0.55 
view -1 8 0 1 1 1 0 -0.838041 0 0 1 1 0
end
'@ | Set-Content -LiteralPath (Join-Path $projectDir 'bootstrap.n') -Encoding ASCII -NoNewline

@'
?
fromop 17 "" me.parent()
start 0 on
create 0 on
defaultreadencoding 0 cp1252
language 0 python
?
'@ | Set-Content -LiteralPath (Join-Path $projectDir 'bootstrap.parm') -Encoding ASCII -NoNewline

$bootstrapCode = @"
# me is this Execute DAT.
# It loads the TouchDesigner-native camera ball game builder.

def _run_builder():
    import os
    path = os.path.join(project.folder, 'td_camera_ball_game.py')
    if not os.path.exists(path):
        path = r'$bootstrapScript'
    namespace = {
        'me': me,
        'parent': parent,
        'op': op,
        'ui': ui,
        'project': project,
        'absTime': absTime,
        'textDAT': textDAT,
        'executeDAT': executeDAT,
        'scriptTOP': scriptTOP,
        'videodeviceinTOP': videodeviceinTOP,
        'outTOP': outTOP,
    }
    with open(path, 'r', encoding='utf-8') as handle:
        exec(compile(handle.read(), path, 'exec'), namespace, namespace)
    namespace['build']()
    return


def start():
    _run_builder()
    return


def create():
    _run_builder()
    return


def frameStart(frame):
    return


def frameEnd(frame):
    return
"@

function Write-TouchDesignerTextFile {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Text
  )

  $body = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $length = $body.Length
  $header = New-Object byte[] 27
  $header[0] = 0x32
  $header[1] = 0x0A
  $header[2] = 0x2A
  $header[6] = 0x01
  $header[10] = 0x01
  $header[14] = 0x01
  $header[18] = 0x01
  $header[22] = 0x02
  $header[23] = [byte](($length -shr 24) -band 0xFF)
  $header[24] = [byte](($length -shr 16) -band 0xFF)
  $header[25] = [byte](($length -shr 8) -band 0xFF)
  $header[26] = [byte]($length -band 0xFF)

  $output = New-Object byte[] ($header.Length + $body.Length)
  [Array]::Copy($header, 0, $output, 0, $header.Length)
  [Array]::Copy($body, 0, $output, $header.Length, $body.Length)
  [System.IO.File]::WriteAllBytes($Path, $output)
}

Write-TouchDesignerTextFile -Path (Join-Path $projectDir 'bootstrap.text') -Text $bootstrapCode

$tocLines = Get-Content -LiteralPath $toc
$requiredTocLines = @('project1/bootstrap.n', 'project1/bootstrap.parm', 'project1/bootstrap.text')
foreach ($line in $requiredTocLines) {
  if ($tocLines -notcontains $line) {
    $tocLines += $line
  }
}
[System.IO.File]::WriteAllText($toc, (($tocLines -join "`n") + "`n"), [System.Text.Encoding]::ASCII)

& (Join-Path $tdBin 'toecollapse.exe') $toe | Out-Host
Write-Host "Built $toe"
