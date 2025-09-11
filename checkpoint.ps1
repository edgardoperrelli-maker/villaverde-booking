param(
    [string]$Message = "Checkpoint automatico"
)

# Aggiungi tutti i file modificati
git add .

# Crea un commit con il messaggio scelto
git commit -m $Message

# Crea un tag con data/ora
$tag = "chkpt-" + (Get-Date -Format "yyyyMMdd-HHmmss")
git tag -a $tag -m $Message

Write-Output "✅ Checkpoint creato: $Message (tag: $tag)"