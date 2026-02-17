param(
    [int]$TopFiles = 20,
    [int]$TopMethods = 20
)

$ErrorActionPreference = "Stop"

function Get-LineCount {
    param([string]$Path)
    try {
        return (Get-Content -Path $Path -ErrorAction Stop).Length
    } catch {
        return 0
    }
}

function Get-TopClassMethods {
    param(
        [string]$Path,
        [int]$Limit = 20
    )

    if (!(Test-Path $Path)) { return @() }

    $lines = Get-Content -Path $Path
    $methods = @()
    $keywordBlock = @(
        "if", "for", "while", "switch", "catch", "return", "try", "else", "do"
    )

    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        if ($line -match '^\s{4}(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\([^;]*\)\s*\{\s*$') {
            $name = $matches[1]
            if ($keywordBlock -contains $name.ToLower()) { continue }
            $methods += [PSCustomObject]@{
                Name = $name
                Start = $i + 1
            }
        }
    }

    for ($j = 0; $j -lt $methods.Count; $j++) {
        if ($j -lt ($methods.Count - 1)) {
            $end = $methods[$j + 1].Start - 1
        } else {
            $end = $lines.Length
        }
        $length = [Math]::Max(1, ($end - $methods[$j].Start + 1))
        $methods[$j] | Add-Member -NotePropertyName End -NotePropertyValue $end
        $methods[$j] | Add-Member -NotePropertyName Length -NotePropertyValue $length
    }

    return $methods |
        Sort-Object Length -Descending |
        Select-Object -First $Limit Name, Start, End, Length
}

Write-Output ""
Write-Output "=== Reelgram Revision Audit ==="
Write-Output ("Timestamp: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))
Write-Output ("Root: {0}" -f (Get-Location))
Write-Output ""

$allFiles = Get-ChildItem -Recurse -File

Write-Output ("Top {0} biggest files:" -f $TopFiles)
$allFiles |
    Sort-Object Length -Descending |
    Select-Object -First $TopFiles FullName, Length |
    Format-Table -AutoSize

Write-Output ""
Write-Output "JS file line counts:"
$jsFiles = Get-ChildItem -Path "js" -Filter "*.js" -File -ErrorAction SilentlyContinue
$jsRows = @()
foreach ($f in $jsFiles) {
    $jsRows += [PSCustomObject]@{
        File = $f.FullName
        Lines = Get-LineCount -Path $f.FullName
        SizeKB = [Math]::Round(($f.Length / 1KB), 2)
    }
}
$jsRows | Sort-Object Lines -Descending | Format-Table -AutoSize

Write-Output ""
Write-Output "Large files warning (Lines >= 1500):"
$hotFiles = $jsRows | Where-Object { $_.Lines -ge 1500 } | Sort-Object Lines -Descending
if ($hotFiles.Count -eq 0) {
    Write-Output "No large JS files by this threshold."
} else {
    $hotFiles | Format-Table -AutoSize
}

Write-Output ""
Write-Output ("Top {0} longest methods in js/app.js:" -f $TopMethods)
$longMethodRows = Get-TopClassMethods -Path "js/app.js" -Limit $TopMethods
if ($longMethodRows.Count -eq 0) {
    Write-Output "No methods detected."
} else {
    $longMethodRows | Format-Table -AutoSize
}

Write-Output ""
Write-Output "Audit complete."
