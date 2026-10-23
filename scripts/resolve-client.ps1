$ErrorActionPreference='Stop'
$family='OpenAI.Codex_2p2nqsd0c76g0'
$package=Get-AppxPackage -Name OpenAI.Codex | Where-Object {$_.PackageFamilyName -eq $family} | Sort-Object Version -Descending | Select-Object -First 1
if(-not $package -or $package.Status -ne 'Ok' -or $package.SignatureKind -ne 'Store'){throw 'The registered official desktop package is not ready.'}
$location=[IO.Path]::GetFullPath($package.InstallLocation)
$exe=Join-Path $location 'app\ChatGPT.exe'
if(-not(Test-Path -LiteralPath $exe -PathType Leaf)){throw 'The registered desktop executable is unavailable.'}
if((Get-AuthenticodeSignature -LiteralPath $exe).Status -ne 'Valid'){throw 'Official desktop signature verification failed.'}
[ordered]@{packageFullName=$package.PackageFullName;packageFamilyName=$package.PackageFamilyName;version=[string]$package.Version;installLocation=$location;executable=$exe;signatureValid=$true;signatureKind='Store';packageStatus='Ok'}|ConvertTo-Json -Compress
