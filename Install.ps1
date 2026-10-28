[CmdletBinding()]
param([switch]$CheckOnly,[ValidateRange(1024,65535)][int]$Port=49339)
$ErrorActionPreference='Stop'
$source=$PSScriptRoot
$target=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'YanamiDesktopTheme'
$package=Get-AppxPackage -Name OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1
if(-not $package -or $package.SignatureKind -ne 'Store' -or $package.Status -ne 'Ok'){throw 'Install the official Microsoft Store ChatGPT/Codex app for this Windows account first.'}
$exe=Join-Path $package.InstallLocation 'app\ChatGPT.exe'
if((Get-AuthenticodeSignature -LiteralPath $exe).Status -ne 'Valid'){throw 'Official application signature verification failed.'}
$nodeCommand=Get-Command node.exe -ErrorAction SilentlyContinue
$nodeCandidates=@($(if($nodeCommand){$nodeCommand.Source}),$(Join-Path $package.InstallLocation 'app\resources\cua_node\bin\node.exe'))
$node=$null
foreach($candidate in $nodeCandidates){if($candidate -and (Test-Path -LiteralPath $candidate)){try{$major=[int](& $candidate -p 'process.versions.node.split(/[.]/)[0]');if($major -ge 22){$node=$candidate;break}}catch{}}}
if(-not $node){throw 'Node.js 22 or newer is required. Install it from https://nodejs.org/ and try again.'}
$compiler=Join-Path $env:SystemRoot 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not(Test-Path -LiteralPath $compiler)){$compiler=Join-Path $env:SystemRoot 'Microsoft.NET\Framework\v4.0.30319\csc.exe'}
if(-not(Test-Path -LiteralPath $compiler)){throw 'The Windows .NET Framework C# compiler is unavailable.'}
$taskName='YanamiTheme-Recovery'
$existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$foreignTask=$existing -and -not (@($existing.Actions|Where-Object {$_.Arguments -like ('*'+$target+'*')}).Count)
if($CheckOnly){[ordered]@{mode='check-only';writes=$false;applicationVersion=[string]$package.Version;nodeVersion=(& $node --version);installDirectory=$target;existingUnmanagedThemeTask=[bool]$foreignTask;port=$Port}|ConvertTo-Json;return}
if($foreignTask){throw 'Another development/theme installation owns YanamiTheme-Recovery. Disable that installation before installing this package.'}
$running=@(Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'"|Where-Object {$_.ExecutablePath -eq $exe -and $_.CommandLine -notmatch '--type='})
if($running.Count){throw 'Save your work and fully quit ChatGPT/Codex before installation. The installer will not close it for you.'}
if($existing){Stop-ScheduledTask -TaskName $taskName;Start-Sleep -Milliseconds 600}
$workerPath=Join-Path $target 'src\worker.cjs'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.CommandLine -like ('*"'+$workerPath+'"*')} | ForEach-Object {Stop-Process -Id $_.ProcessId}
New-Item -ItemType Directory -Path $target -Force|Out-Null
foreach($folder in @('src','assets','native','scripts','vendor','docs')){Copy-Item -LiteralPath (Join-Path $source $folder) -Destination $target -Recurse -Force}
foreach($file in @('Install.ps1','Uninstall.ps1','README.md','LICENSE','THIRD_PARTY_NOTICES.md','package.json')){Copy-Item -LiteralPath (Join-Path $source $file) -Destination $target -Force}
$state=Join-Path $target 'state';$bin=Join-Path $target 'bin'
New-Item -ItemType Directory -Path $state,$bin -Force|Out-Null
Remove-Item -LiteralPath (Join-Path $state 'stop') -ErrorAction SilentlyContinue
foreach($name in @('ConnectionInfo','PackageActivator')){
 & $compiler /nologo /target:exe /reference:System.Management.dll ('/out:'+(Join-Path $bin ($name+'.exe'))) (Join-Path $target ('native\'+$name+'.cs'))
 if($LASTEXITCODE -ne 0){throw ('Could not compile '+$name+'. No client installation files were changed.')}
}
& $compiler /nologo /target:winexe /reference:System.Management.dll /reference:System.Web.Extensions.dll /reference:Microsoft.CSharp.dll ('/out:'+(Join-Path $bin 'ThemeEntry.exe')) (Join-Path $target 'native\ThemeEntry.cs')
if($LASTEXITCODE -ne 0){throw 'Could not compile ThemeEntry.'}
$config=[ordered]@{packageFullName=$package.PackageFullName;executable=$exe;appId=$package.PackageFamilyName+'!App';port=$Port;powershell=(Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe');node=$node;taskName=$taskName;allowOneRecovery=$false}
$config|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $state 'worker-config.json') -Encoding utf8
$link=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $target 'ChatGPT.lnk'))
$link.TargetPath=Join-Path $bin 'ThemeEntry.exe';$link.WorkingDirectory=$target;$link.Description='ChatGPT'
$iconPng=Join-Path $package.InstallLocation 'assets\Square44x44Logo.targetsize-256_altform-unplated.png'
$iconBytes=[IO.File]::ReadAllBytes($iconPng)
$writer=[IO.BinaryWriter]::new([IO.File]::Create((Join-Path $bin 'ChatGPT.ico')))
try {
 $writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]1)
 $writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0)
 $writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$iconBytes.Length);$writer.Write([uint32]22);$writer.Write($iconBytes)
} finally {$writer.Dispose()}
$link.IconLocation=(Join-Path $bin 'ChatGPT.ico')+',0';$link.Save()
$service=New-Object -ComObject Schedule.Service;$service.Connect();$definition=$service.NewTask(0)
$definition.RegistrationInfo.Description='Yanami appearance adapter. Never closes or restarts the official client.'
$definition.Principal.UserId=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;$definition.Principal.LogonType=3;$definition.Principal.RunLevel=0
$definition.Settings.Hidden=$true;$definition.Settings.DisallowStartIfOnBatteries=$false;$definition.Settings.StopIfGoingOnBatteries=$false;$definition.Settings.ExecutionTimeLimit='PT0S';$definition.Settings.MultipleInstances=2;$definition.Settings.RestartCount=2;$definition.Settings.RestartInterval='PT1M'
$trigger=$definition.Triggers.Create(9);$trigger.UserId=$definition.Principal.UserId;$trigger.Enabled=$true
$action=$definition.Actions.Create(0);$action.Path=Join-Path $env:SystemRoot 'System32\wscript.exe';$action.Arguments='//B //Nologo "'+(Join-Path $target 'scripts\run-hidden.vbs')+'" "'+$node+'" "'+(Join-Path $target 'src\worker.cjs')+'"';$action.WorkingDirectory=$target
$task=$service.GetFolder('\').RegisterTaskDefinition($taskName,$definition,6,$null,$null,3,$null);$null=$task.Run($null)
Write-Output 'Installed. Replace your existing pinned/dock entry with ChatGPT.lnk in the installation directory.'
Write-Output ('Installation directory: '+$target)
Write-Output 'The worker never restarts the client. Unmodified Store/search entries cannot enable the theme on a cold start. See docs/OPERATIONS.md.'
