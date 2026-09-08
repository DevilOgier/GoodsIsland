$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $nodePath = $nodeCommand.Source } else {
  $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
  if (-not (Test-Path -LiteralPath $nodePath)) { throw '请先安装 Node.js 24 并将 node 加入 PATH。' }
}
[IO.Directory]::CreateDirectory((Join-Path $PSScriptRoot '.local')) | Out-Null
if (-not (Test-Path -LiteralPath 'node_modules')) { throw '请先按 README 安装依赖。' }
if (-not (Test-Path -LiteralPath '.env')) { & $nodePath scripts/setup.mjs; if ($LASTEXITCODE -ne 0) { throw '初始化配置失败' } }
if (-not (Test-Path -LiteralPath '.next/standalone/server.js')) { & $nodePath scripts/build.mjs; if ($LASTEXITCODE -ne 0) { throw '构建失败' } }
function Test-LocalPort([int]$port) {
 $client = [Net.Sockets.TcpClient]::new()
 try { $result=$client.ConnectAsync('127.0.0.1',$port); return ($result.Wait(500) -and $client.Connected) } catch { return $false } finally { $client.Dispose() }
}
function Start-LocalNode([string]$name,[string[]]$arguments) {
 $process = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot ".local/$name.log") -RedirectStandardError (Join-Path $PSScriptRoot ".local/$name-error.log") -PassThru
 [IO.File]::WriteAllText((Join-Path $PSScriptRoot ".local/$name.pid"),[string]$process.Id)
}
$runtimeConfig = & $nodePath --env-file=.env -e "console.log(JSON.stringify({local:process.env.LOCAL_SERVICES==='true',port:Number(new URL(process.env.DATABASE_URL).port||5432),webPort:Number(process.env.PORT||3000),appUrl:process.env.APP_URL}))" | ConvertFrom-Json
if ($runtimeConfig.local -and (-not (Test-LocalPort $runtimeConfig.port) -or -not (Test-LocalPort 9000))) {
 Start-LocalNode 'services' @('--env-file=.env','scripts/services.mjs')
 for ($attempt=0; $attempt -lt 30 -and -not (Test-LocalPort $runtimeConfig.port); $attempt++) { Start-Sleep -Milliseconds 500 }
 if (-not (Test-LocalPort $runtimeConfig.port)) { throw '本地数据库启动失败，请查看 .local/services-error.log' }
}
& $nodePath --env-file=.env scripts/wait-db.mjs
if ($LASTEXITCODE -ne 0) { throw '数据库未就绪' }
& $nodePath node_modules/prisma/build/index.js migrate deploy
if ($LASTEXITCODE -ne 0) { throw '数据库迁移失败' }
& $nodePath --env-file=.env --import tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { throw '图鉴初始化失败' }
$workerRunning=$false
if (Test-Path '.local/worker.pid') {
 $workerId=[int](Get-Content '.local/worker.pid')
 $workerProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$workerId" -ErrorAction SilentlyContinue
 $workerRunning=$workerProcess -and $workerProcess.CommandLine -like '*src/workers/image-worker.ts*'
}
if (-not $workerRunning) { Start-LocalNode 'worker' @('--env-file=.env','--import','tsx','src/workers/image-worker.ts') }
if (-not (Test-LocalPort $runtimeConfig.webPort)) { Start-LocalNode 'web' @('--env-file=.env','scripts/web.mjs') }
Write-Host "谷屿已启动：$($runtimeConfig.appUrl)"
Write-Host '首次打开创建管理员账号。关闭终端后服务仍会运行。'
