param([string]$TaskName)
$ErrorActionPreference='Stop'
$env:PSModulePath="$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules;$env:ProgramFiles\WindowsPowerShell\Modules"
$root=Join-Path (Split-Path $PSScriptRoot -Parent) 'state'
$clock=[Diagnostics.Stopwatch]::StartNew()
$config=Get-Content -LiteralPath (Join-Path $root 'probe-config.json') -Raw|ConvertFrom-Json
$report=[ordered]@{startedAt=(Get-Date).ToUniversalTime().ToString('o');state='validating';restartAttempts=0;customProfileUsed=$false;installationChanged=$false;shortcutChanged=$false;themeInjected=$false;portOpen=$false;error=$null;timings=[ordered]@{}}
$exe=$config.executable
$debugPortPattern='--remote-debugging-port='+[regex]::Escape([string]$config.port)+'(?:\s|$)'
$activatedPid=0
function Save-Report {$report|ConvertTo-Json -Depth 7|Set-Content -LiteralPath (Join-Path $root 'probe-result.json') -Encoding utf8}
function Roots {@(Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'" | Where-Object {$_.ExecutablePath -eq $exe -and $_.CommandLine -notmatch '--type='})}
function Close-ExactRoot($item) {
 $same=Get-CimInstance Win32_Process -Filter "ProcessId=$($item.ProcessId)" -ErrorAction SilentlyContinue
 if(-not $same -or $same.ExecutablePath -ne $exe -or $same.CreationDate -ne $item.CreationDate){return}
 $p=Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue
 if($p -and $p.MainWindowHandle -ne 0){$null=$p.CloseMainWindow()}
 if($p){$null=$p.WaitForExit(350)}
 $same=Get-CimInstance Win32_Process -Filter "ProcessId=$($item.ProcessId)" -ErrorAction SilentlyContinue
 if($same -and $same.ExecutablePath -eq $exe -and $same.CreationDate -eq $item.CreationDate){Stop-Process -Id $same.ProcessId;if($p){$null=$p.WaitForExit(1500)}}
}
function Activate([string]$arguments,[string]$label) {
 $file=Join-Path $root ($label+'.json')
 Remove-Item -LiteralPath $file -ErrorAction SilentlyContinue
 $p=Start-Process -FilePath $config.activator -ArgumentList ('"'+$config.appId+'" "'+$arguments.Replace('"','\"')+'" "'+$file+'"') -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(15000) -or $p.ExitCode -ne 0){throw 'Original packaged application activation failed.'}
 return (Get-Content -LiteralPath $file -Raw|ConvertFrom-Json)
}
Save-Report
try {
 $package=Get-AppxPackage -Name OpenAI.Codex
 if($package.PackageFullName -ne $config.packageFullName -or $package.Status -ne 'Ok'){throw 'Application version or package status changed; probe cancelled.'}
 if((Get-AuthenticodeSignature -LiteralPath $exe).Status -ne 'Valid'){throw 'Official application signature did not validate.'}
 $info=(& (Join-Path $root '..\bin\ConnectionInfo.exe') $exe $config.port)|ConvertFrom-Json
 if($info.listeners.Count){throw 'Probe port is already in use.'}
 $before=@(Roots)
 if($before.Count -ne 1 -or $before[0].ProcessId -ne $config.expectedPid -or $before[0].CreationDate.ToUniversalTime().ToString('o') -ne $config.expectedCreated){throw 'The running application changed; no process was closed.'}
 if($before[0].CommandLine -match '--user-data-dir|--remote-debugging'){throw 'The running application is not the plain original instance.'}
 $report.timings.validationMs=$clock.ElapsedMilliseconds
 $report.state='restarting-original-once';$report.restartAttempts=1;Save-Report
 Close-ExactRoot $before[0]
 if(@(Roots).Count){throw 'Original root remained active; no second instance will be opened.'}
 $report.timings.previousInstanceClosedMs=$clock.ElapsedMilliseconds
 $args='--remote-debugging-address=127.0.0.1 --remote-debugging-port='+$config.port
 $activation=Activate $args 'debug-activation'
 $activatedPid=[int]$activation.processId
 $report.timings.activationReturnedMs=$clock.ElapsedMilliseconds
 $report.activatedPid=$activatedPid;$report.state='checking-default-profile';Save-Report
 for($attempt=0;$attempt -lt 48;$attempt++){
  Start-Sleep -Milliseconds 150
  $info=(& (Join-Path $root '..\bin\ConnectionInfo.exe') $exe $config.port)|ConvertFrom-Json
  if($info.listeners.Count){
   if($info.roots.Count -ne 1 -or $info.listeners[0].pid -ne $info.roots[0].pid -or $info.listeners[0].address -notin @('127.0.0.1','::1')){throw 'Debugger did not belong to the single official application root.'}
   $received=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$config.port+'/json/list') -TimeoutSec 2
   $targets=@($received|ForEach-Object {$_})
   $report.portOpen=$true
   $report.nativePageCount=@($targets|Where-Object {$_.type -eq 'page' -and $_.url -like 'app://-/index.html*'}).Count
   $report.state='connected-original-default-profile'
   $report.timings.connectionReadyMs=$clock.ElapsedMilliseconds
   break
  }
 }
 $after=@(Roots)
 $report.rootCount=$after.Count
 $report.debugFlagPresent=!!(@($after|Where-Object {$_.CommandLine -match $debugPortPattern}).Count)
 $report.customProfilePresent=!!(@($after|Where-Object {$_.CommandLine -match '--user-data-dir'}).Count)
 if(-not $report.portOpen){throw 'Original activation did not expose a debugging connection with its existing data directory.'}
 # Opening a debugger listener does not prove that Electron created or showed
 # its main window. Deliver the user's launch intent to the now-running root.
 $visibleActivation=Activate '' 'show-activation'
 $report.showActivationPid=$visibleActivation.processId
 $report.timings.windowActivationMs=$clock.ElapsedMilliseconds
 $info=(& (Join-Path $root '..\bin\ConnectionInfo.exe') $exe $config.port)|ConvertFrom-Json
 if($info.roots.Count -ne 1 -or $info.roots[0].pid -ne $activatedPid){throw 'Showing the original window did not preserve the single application root.'}
 Save-Report
}catch{
 $report.error=$_.Exception.Message
 $report.state='failed-restoring-normal-entry';Save-Report
 if($report.restartAttempts -gt 0){
  try {
   $left=@(Roots)
   foreach($item in $left){if($item.ProcessId -eq $activatedPid -and $item.CommandLine -match $debugPortPattern){Close-ExactRoot $item}}
   if(-not @(Roots).Count){$normal=Activate '' 'normal-activation';$report.restoredPid=$normal.processId}
   $report.state='normal-entry-restored-no-theme-installed'
  }catch{$report.restoreError=$_.Exception.Message;$report.state='restore-needs-review'}
 }
 Save-Report
}finally{
 $report.finishedAt=(Get-Date).ToUniversalTime().ToString('o');Save-Report
 if($TaskName){try{$s=New-Object -ComObject Schedule.Service;$s.Connect();$s.GetFolder('\').DeleteTask($TaskName,0)}catch{}}
}
