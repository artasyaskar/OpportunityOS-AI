$status = git status --porcelain
$files = @()
foreach ($line in $status) {
    if ($line.Length -gt 3) {
        $file = $line.Substring(3).Trim()
        # Handle quotes if file has spaces
        if ($file.StartsWith('"') -and $file.EndsWith('"')) {
            $file = $file.Substring(1, $file.Length - 2)
        }
        $files += $file
    }
}

$commitMessages = @(
    "Refactor {0} for better performance",
    "Update logic in {0}",
    "Enhance {0} functionality",
    "Fix edge cases in {0}",
    "Clean up code in {0}",
    "Optimize data flow in {0}",
    "Implement core updates to {0}",
    "Update dependencies and imports in {0}",
    "Improve readability of {0}",
    "Add dynamic data binding to {0}",
    "Resolve UI inconsistencies in {0}",
    "Polish {0} component logic",
    "Adjust styling in {0}",
    "Enhance error handling in {0}",
    "Update state management in {0}"
)

$commitCount = 0

foreach ($file in $files) {
    if ($file -match "([^\\/]+)$") {
        $basename = $matches[1]
    } else {
        $basename = $file
    }
    
    $msgTemplate = $commitMessages | Get-Random
    $msg = $msgTemplate -f $basename
    
    Write-Host "Adding and committing: $file"
    git add $file
    git commit -m "$msg"
    
    $commitCount++
}

Write-Host "Made $commitCount commits."
Write-Host "Pushing to remote..."
git push
