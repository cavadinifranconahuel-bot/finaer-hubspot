Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-DocxText {
    param([string]$path)
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
        $entry = $zip.GetEntry('word/document.xml')
        $reader = New-Object System.IO.StreamReader($entry.Open())
        $xml = $reader.ReadToEnd()
        $reader.Close()
        $zip.Dispose()
        $text = ($xml -replace '<[^>]+>', '') -replace '\s+', ' '
        return $text.Trim()
    } catch {
        return "ERROR: $_"
    }
}

$files = @(
    'C:\Users\Usuario\OneDrive\Desktop\HubSpot\HubSpot actualmente.docx',
    'C:\Users\Usuario\OneDrive\Desktop\HubSpot\Prueba Piloto de HubSpot.docx',
    'C:\Users\Usuario\OneDrive\Desktop\HubSpot\Relevamiento HubSpot - Enero 2026.docx',
    'C:\Users\Usuario\OneDrive\Desktop\HubSpot\Respuestas - Criterio propio.docx',
    'C:\Users\Usuario\Downloads\Modelo de Desarrollo - Gestion de Visitas.docx',
    'C:\Users\Usuario\Downloads\HubSpot .docx',
    'C:\Users\Usuario\Downloads\Gestion de Incumplimientos - HubSpot.docx',
    'C:\Users\Usuario\Downloads\HubSpot - Gestion de Incumplimientos .docx',
    'C:\Users\Usuario\Downloads\Registro de Visitas Comerciales - HubSpot.docx',
    'C:\Users\Usuario\Downloads\CHECKLIST HUBSPOT NUEVA.docx',
    'C:\Users\Usuario\Downloads\CHECKLIST HUBSPOT INACTIVA (3).docx',
    'C:\Users\Usuario\Downloads\CHECKLIST  ACTIVA.docx',
    'C:\Users\Usuario\Downloads\datos basicos inmobiliarias.docx',
    'C:\Users\Usuario\Downloads\CHECKLIST HUBSPOT perdida.docx',
    'C:\Users\Usuario\Downloads\CHECKLIST HUBSPOT pasivas.docx',
    'C:\Users\Usuario\Downloads\hubspot-mapeo-propiedades (1).docx'
)

foreach ($f in $files) {
    $name = Split-Path $f -Leaf
    Write-Output "========== $name =========="
    $text = Get-DocxText $f
    Write-Output $text.Substring(0, [Math]::Min($text.Length, 4000))
    Write-Output ""
}
