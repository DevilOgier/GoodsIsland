param([Parameter(Mandatory=$true)][ValidatePattern('^v[0-9]+\.[0-9]+\.[0-9]+$')][string]$Version)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
function Invoke-Git([string[]]$GitArgs) {
 & git -c "safe.directory=$($PSScriptRoot.Replace('\','/'))" @GitArgs
 if ($LASTEXITCODE -ne 0) { throw 'Git command failed; release stopped.' }
}
if (& git -c "safe.directory=$($PSScriptRoot.Replace('\','/'))" status --porcelain) { throw 'Commit or stash changes before publishing.' }
& git -c "safe.directory=$($PSScriptRoot.Replace('\','/'))" rev-parse -q --verify "refs/tags/$Version" 2>$null
if ($LASTEXITCODE -eq 0) { throw 'Version tag already exists; choose a new version.' }
Invoke-Git -GitArgs @('push','origin','HEAD:main')
Invoke-Git -GitArgs @('tag','-a',$Version,'-m',"Release $Version")
Invoke-Git -GitArgs @('push','origin',"refs/tags/$Version")
Write-Host "Published $Version. Follow GitHub Actions for build and deployment."
