$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseRoot = Join-Path $projectRoot 'work/releases'
$stagingRoot = Join-Path $releaseRoot ('source-' + [Guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $releaseRoot 'limen-vercel.zip'
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

# Only deployment sources and public project instructions enter the archive.
$files = @(
    'package.json', 'package-lock.json', 'next.config.ts', 'next-env.d.ts',
    'tsconfig.json', 'postcss.config.mjs', 'eslint.config.mjs',
    'vercel.json', '.vercelignore', '.gitignore', '.env.example',
    'AGENTS.md', 'README_FIRST.md',
    'docs/DEPLOYMENT.md', 'docs/01_BUILD_PLAN.md',
    'docs/00_SCOPE_AND_ACCEPTANCE.md', 'docs/02_UI_SPEC.md',
    'docs/03_ONET_AND_DATA.md', 'docs/04_EXPERIENCE.md',
    'docs/05_REPORT_ENGINE.md', 'docs/06_TOKEN_STRATEGY.md',
    'docs/CURRENT_STATUS.md', 'docs/HANDOFF.md', 'docs/PROGRESS.md',
    'docs/SUPABASE_SETUP.md', 'docs/LOCAL_SETUP.md', 'docs/ISSUES.md',
    'docs/V4_PRODUCT_DESIGN.md', 'docs/DEMO.md', 'CLAUDE_COORDINATION.md'
)
foreach ($directory in @('src', 'data', 'scripts', 'tests', 'supabase/migrations', 'public/brand')) {
    $directoryPath = Join-Path $projectRoot $directory
    foreach ($file in Get-ChildItem -LiteralPath $directoryPath -Recurse -File) {
        $files += $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    }
}
# The migrated pages retain these independent illustrations at their existing URLs.
# Reference HTML and generation artifacts are not part of the running application.
foreach ($asset in @(
    'xeniso-opus-profile.webp', 'xeniso-opus-evaluation.webp',
    'xeniso-opus-experience.webp', 'xeniso-opus-planning.webp',
    'xeniso-direct-basics.webp', 'xeniso-direct-interests.webp',
    'xeniso-direct-work.webp', 'xeniso-direct-interview.webp'
)) {
    $files += "public/previews/assets/$asset"
}
if (Test-Path -LiteralPath (Join-Path $projectRoot 'docs/testing/VERCEL-package.latest.md')) {
    $files += 'docs/testing/VERCEL-package.latest.md'
}
foreach ($relativePath in $files) {
    $source = Join-Path $projectRoot $relativePath
    $destination = Join-Path $stagingRoot $relativePath
    New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

# Scan values in memory; never print environment files or secret values.
$secretValues = @()
$environmentPath = Join-Path $projectRoot '.env.local'
if (Test-Path -LiteralPath $environmentPath) {
    foreach ($line in Get-Content -LiteralPath $environmentPath) {
        if ($line -match '^\s*(?:export\s+)?(?:[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)|XINGYUN_(?:[A-Z]+_)?APP_ID)\s*=\s*(.*)\s*$') {
            $secret = $Matches[1].Trim().Trim('"').Trim("'")
            if ($secret.Length -ge 8 -and $secret -notmatch '^(REPLACE|YOUR_|<)') {
                $secretValues += $secret
            }
        }
    }
}
foreach ($file in Get-ChildItem -LiteralPath $stagingRoot -Recurse -File) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    foreach ($secret in $secretValues) {
        if ($content.Contains($secret)) { throw 'Credential found in deployment source; archive not created.' }
    }
}

$temporaryArchive = Join-Path $releaseRoot ('verified-' + [Guid]::NewGuid().ToString('N') + '.zip')
$outputArchive = [System.IO.Compression.ZipFile]::Open($temporaryArchive, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in Get-ChildItem -LiteralPath $stagingRoot -Recurse -File) {
        $entryName = $file.FullName.Substring($stagingRoot.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($outputArchive, $file.FullName, $entryName) | Out-Null
    }
} finally { $outputArchive.Dispose() }
$archive = [System.IO.Compression.ZipFile]::OpenRead($temporaryArchive)
try {
    foreach ($entry in $archive.Entries) {
        $name = $entry.FullName.Replace('\', '/')
        if ($name -match '(^|/)(node_modules|\.git|\.next|\.vercel)(/|$)' -or
            ($name -match '(^|/)\.env' -and $name -ne '.env.example')) {
            throw 'Unexpected private or generated file in archive.'
        }
    }
    $count = $archive.Entries.Count
} finally { $archive.Dispose() }
Move-Item -LiteralPath $temporaryArchive -Destination $archivePath -Force
$hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
Write-Output "PASS: $count entries; environment files excluded except .env.example; credential scan passed."
Write-Output "Archive: $archivePath"
Write-Output "SHA256: $hash"
