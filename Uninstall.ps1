$ErrorActionPreference='Stop'
$target=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'YanamiDesktopTheme'
$state=Join-Path $target 'state';$configPath=Join-Path $state 'worker-config.json'
if(-not(Test-Path -LiteralPath $configPath)){Write-Output 'No managed installation was found.';return}
$config=Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json
Set-Content -LiteralPath (Join-Path $state 'stop') -Value '1' -Encoding ascii
try{& $config.node (Join-Path $target 'src\remove.cjs')}catch{}
$task=Get-ScheduledTask -TaskName 'YanamiTheme-Recovery' -ErrorAction SilentlyContinue
if($task){if(-not(@($task.Actions|Where-Object {$_.Arguments -like ('*'+$target+'*')}).Count)){throw 'The task belongs to another theme installation; it was left unchanged.'};Stop-ScheduledTask -TaskName $task.TaskName;Unregister-ScheduledTask -TaskName $task.TaskName -Confirm:$false}
$worker=Join-Path $target 'src\worker.cjs'
foreach($item in @(Get-CimInstance Win32_Process -Filter "Name='node.exe'"|Where-Object {$_.CommandLine -like ('*"'+$worker+'"*')})){
 $same=Get-CimInstance Win32_Process -Filter "ProcessId=$($item.ProcessId)" -ErrorAction SilentlyContinue
 if($same -and $same.CreationDate -eq $item.CreationDate -and $same.CommandLine -eq $item.CommandLine){Stop-Process -Id $item.ProcessId}
}
Write-Output 'Theme background task removed. Original application and shortcuts were not changed.'
Write-Output 'A full normal exit clears any remaining in-memory appearance. Installed files and local diagnostic state are retained for backup; you can remove the installation folder manually.'
