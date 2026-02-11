# Script de Correção do Profile.jsx
# Execute este script no PowerShell para corrigir o arquivo

$filePath = "c:\Users\153886\OneDrive\Documentos\DEV\benfit-treinos\src\pages\Profile.jsx"

# Ler o conteúdo do arquivo
$content = Get-Content $filePath -Raw

# Remover a linha com o fragment vazio <>
$content = $content -replace '(?m)^\s*<>\s*\r?\n', ''

# Corrigir o fechamento incorreto da div (linha 531)
$content = $content -replace '        </div>`r`n`r`n', "                        </div>`r`n`r`n"

# Corrigir a indentação do comentário "Fixed Button"
$content = $content -replace '                        {/\* Fixed Button', '                        {/* Fixed Button'

# Salvar o arquivo corrigido
$content | Set-Content $filePath -NoNewline

Write-Host "✅ Arquivo Profile.jsx corrigido com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Mudanças aplicadas:" -ForegroundColor Cyan
Write-Host "  - Removido fragment vazio <>" -ForegroundColor Yellow
Write-Host "  - Corrigida indentação das divs" -ForegroundColor Yellow
Write-Host "  - Botão 'Adicionar Novo Avatar' agora é fixo no fundo" -ForegroundColor Yellow
