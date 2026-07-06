$TOKEN   = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8'
$headers = @{ 'Authorization' = "Bearer $TOKEN"; 'Content-Type' = 'application/json' }

function New-Prop($body) {
    try {
        $r = Invoke-RestMethod -Uri 'https://api.hubapi.com/crm/v3/properties/contacts' `
             -Method Post -Headers $headers -Body ($body | ConvertTo-Json -Depth 10)
        Write-Host "OK  $($r.name)"
    } catch {
        $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message
        Write-Host "--- $($body.name): $msg"
    }
}

# OC
New-Prop @{
    name='sticker_oc'; label='Sticker - Oficina Comercial'
    type='enumeration'; fieldType='select'; groupName='contactinformation'
    options=@(
        @{label='Belgrano';        value='belgrano';        displayOrder=0;  hidden=$false}
        @{label='Centro';          value='centro';          displayOrder=1;  hidden=$false}
        @{label='Flores';          value='flores';          displayOrder=2;  hidden=$false}
        @{label='Palermo';         value='palermo';         displayOrder=3;  hidden=$false}
        @{label='La Plata';        value='la_plata';        displayOrder=4;  hidden=$false}
        @{label='Lanus';           value='lanus';           displayOrder=5;  hidden=$false}
        @{label='Lomas de Zamora'; value='lomas_de_zamora'; displayOrder=6;  hidden=$false}
        @{label='Moron';           value='moron';           displayOrder=7;  hidden=$false}
        @{label='Pilar';           value='pilar';           displayOrder=8;  hidden=$false}
        @{label='Quilmes';         value='quilmes';         displayOrder=9;  hidden=$false}
        @{label='San Martin';      value='san_martin';      displayOrder=10; hidden=$false}
        @{label='San Miguel';      value='san_miguel';      displayOrder=11; hidden=$false}
        @{label='Zona Norte';      value='zona_norte';      displayOrder=12; hidden=$false}
        @{label='Otra';            value='otra';            displayOrder=13; hidden=$false}
    )
}

# EDC
New-Prop @{
    name='sticker_edc'; label='Sticker - EDC'
    type='enumeration'; fieldType='select'; groupName='contactinformation'
    options=@(
        @{label='ADORNA CLAUDIO';           value='adorna_claudio';           displayOrder=0;  hidden=$false}
        @{label='APOLO DIEGO';              value='apolo_diego';              displayOrder=1;  hidden=$false}
        @{label='AVENDANO BERNARDO';        value='avendano_bernardo';        displayOrder=2;  hidden=$false}
        @{label='BAGNERA SANTIAGO';         value='bagnera_santiago';         displayOrder=3;  hidden=$false}
        @{label='CAMBA VALERIA';            value='camba_valeria';            displayOrder=4;  hidden=$false}
        @{label='CAMMISA SILVA JORGE';      value='cammisa_silva_jorge';      displayOrder=5;  hidden=$false}
        @{label='CAPITANI HORACIO';         value='capitani_horacio';         displayOrder=6;  hidden=$false}
        @{label='COLMENARES ALFONZO';       value='colmenares_alfonzo';       displayOrder=7;  hidden=$false}
        @{label='CORREA PEREIRA JINEE';     value='correa_pereira_jinee';     displayOrder=8;  hidden=$false}
        @{label='CURUTCHET ANALIA';         value='curutchet_analia';         displayOrder=9;  hidden=$false}
        @{label='GALLARDO GARCIA DAPHNE';   value='gallardo_garcia_daphne';   displayOrder=10; hidden=$false}
        @{label='GIANI DIEGO';              value='giani_diego';              displayOrder=11; hidden=$false}
        @{label='GUANIPA NEGRETTE GERARDO'; value='guanipa_negrette_gerardo'; displayOrder=12; hidden=$false}
        @{label='INSUA CAMILA';             value='insua_camila';             displayOrder=13; hidden=$false}
        @{label='JEAGNINA MARLY VARA';      value='jeagnina_marly_vara';      displayOrder=14; hidden=$false}
        @{label='LOPEZ BENITEZ ANAIRI';     value='lopez_benitez_anairi';     displayOrder=15; hidden=$false}
        @{label='MARTINELLI GUIDO';         value='martinelli_guido';         displayOrder=16; hidden=$false}
        @{label='MERAYO BALTAZAR';          value='merayo_baltazar';          displayOrder=17; hidden=$false}
        @{label='MOLDES VANESA YANINA';     value='moldes_vanesa_yanina';     displayOrder=18; hidden=$false}
        @{label='MORALES EMANUEL';          value='morales_emanuel';          displayOrder=19; hidden=$false}
        @{label='MORGANTE SALVADOR';        value='morgante_salvador';        displayOrder=20; hidden=$false}
        @{label='NEMINA ROZENCWAIG ALDANA'; value='nemina_rozencwaig_aldana'; displayOrder=21; hidden=$false}
        @{label='NUNEZ VANESA SOLEDAD';     value='nunez_vanesa_soledad';     displayOrder=22; hidden=$false}
        @{label='PEREYRA MOINE GONZALO';    value='pereyra_moine_gonzalo';    displayOrder=23; hidden=$false}
        @{label='RUSSO EMILIANO';           value='russo_emiliano';           displayOrder=24; hidden=$false}
        @{label='TESTI IGNACIO MARTIN';     value='testi_ignacio_martin';     displayOrder=25; hidden=$false}
        @{label='VERA MONTERO RODRIGO';     value='vera_montero_rodrigo';     displayOrder=26; hidden=$false}
        @{label='VILLAVICENCIO THIAGO';     value='villavicencio_thiago';     displayOrder=27; hidden=$false}
        @{label='ZARATE RUIZ DIAZ GUSTAVO'; value='zarate_ruiz_diaz_gustavo'; displayOrder=28; hidden=$false}
        @{label='Otro no listado';          value='otro';                     displayOrder=29; hidden=$false}
    )
}

# Material preexistente
New-Prop @{
    name='sticker_material_preexistente'; label='Sticker - Material preexistente'
    type='enumeration'; fieldType='radio'; groupName='contactinformation'
    options=@(
        @{label='Si'; value='si'; displayOrder=0; hidden=$false}
        @{label='No'; value='no'; displayOrder=1; hidden=$false}
    )
}

# Textos simples
foreach ($p in @(
    @{n='sticker_inmobiliaria';       l='Sticker - Inmobiliaria'}
    @{n='sticker_localidad';          l='Sticker - Localidad'}
    @{n='sticker_horario';            l='Sticker - Rango horario inmo'}
    @{n='sticker_contacto_inmo';      l='Sticker - Contacto inmobiliaria'}
    @{n='sticker_celular_contacto';   l='Sticker - Celular contacto'}
    @{n='sticker_especifica_material';l='Sticker - Especifica material preexistente'}
)) {
    New-Prop @{ name=$p.n; label=$p.l; type='string'; fieldType='text'; groupName='contactinformation' }
}

# Textos largos
foreach ($p in @(
    @{n='sticker_direccion';      l='Sticker - Direccion exacta'}
    @{n='sticker_detalle_pedido'; l='Sticker - Detalle del pedido'}
    @{n='sticker_observaciones';  l='Sticker - Observaciones'}
)) {
    New-Prop @{ name=$p.n; label=$p.l; type='string'; fieldType='textarea'; groupName='contactinformation' }
}

# Foto
New-Prop @{
    name='sticker_foto'; label='Sticker - Foto vidriera'
    type='string'; fieldType='file'; groupName='contactinformation'
}

Write-Host "`nListo."
