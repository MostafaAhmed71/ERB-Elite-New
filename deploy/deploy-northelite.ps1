# Redirect to root update script
& (Join-Path (Split-Path -Parent $PSScriptRoot) "update-server.ps1") @args
