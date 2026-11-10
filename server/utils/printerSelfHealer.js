/**
 * Silent Self-Healing Thermal Printer Engine for Windows
 * Automatically ensures 80mm thermal receipt printers (TD80, Xprinter, POS-80)
 * are configured with the full-width paper profile (72mm / 575 dots) without
 * requiring the cashier or technician to run manual setup tools.
 */

const { exec } = require('child_process');

function initPrinterSelfHealing() {
  if (process.platform !== 'win32') return;

  // Run asynchronously with a delay so server boots instantly without waiting
  setTimeout(() => {
    try {
      const psCommand = `
        $thermalPrinters = Get-Printer | Where-Object { 
          $_.Name -like "*TD80*" -or 
          $_.Name -like "*POS-80*" -or 
          $_.Name -like "*XP-80*" -or 
          $_.Name -like "*POS80*" -or 
          $_.Name -like "*Thermal*" -or 
          $_.Name -like "*Receipt*" -or 
          $_.Name -like "*Xprinter*" -or 
          ($_.Default -eq $true -and $_.Name -notlike "*PDF*" -and $_.Name -notlike "*XPS*" -and $_.Name -notlike "*OneNote*" -and $_.Name -notlike "*Fax*")
        }
        foreach ($p in $thermalPrinters) {
          try {
            # 1. Reset WorkOffline if accidentally stuck
            $wmi = Get-CimInstance -ClassName Win32_Printer -Filter "Name='$($p.Name)'"
            if ($wmi -and $wmi.WorkOffline) {
              Set-CimInstance -Query "Select * From Win32_Printer Where Name='$($p.Name)'" -Property @{WorkOffline = $false} -ErrorAction SilentlyContinue
            }

            # 2. Check and fix paper size to 80mm roll (72mm printable) if locked to 48mm or wide Letter/A4
            $cfg = Get-PrintConfiguration -PrinterName $p.Name -ErrorAction SilentlyContinue
            if ($cfg -and $cfg.PrintTicketXML) {
              [xml]$ticket = $cfg.PrintTicketXML
              $feature = $ticket.PrintTicket.Feature | Where-Object { $_.name -eq "psk:PageMediaSize" }
              
              if ($feature -and ($feature.InnerXml -like "*CUSTOMSIZE*" -or $feature.InnerXml -like "*58_x_*" -or $feature.InnerXml -like "*Letter*" -or $feature.InnerXml -like "*ISOA4*")) {
                $nsAttr = $ticket.PrintTicket.Attributes | Where-Object { $_.Name -like "xmlns:ns*" } | Select-Object -First 1
                $prefix = if ($nsAttr) { $nsAttr.LocalName } else { "ns0000" }
                if (-not $nsAttr) {
                  $ticket.PrintTicket.SetAttribute("xmlns:ns0000", "http://schemas.microsoft.com/windows/printing/oemdriverpt/")
                }
                $optName = "$($prefix):Paper_80_x_297"
                $feature.InnerXml = "<psf:Option name=`"$optName`"><psf:ScoredProperty name=`"psk:MediaSizeWidth`"><psf:Value xsi:type=`"xsd:integer`">71946</psf:Value></psf:ScoredProperty><psf:ScoredProperty name=`"psk:MediaSizeHeight`"><psf:Value xsi:type=`"xsd:integer`">296917</psf:Value></psf:ScoredProperty></psf:Option>"
                
                $toRemove = @()
                foreach ($pi in $ticket.PrintTicket.ParameterInit) {
                  if ($pi.name -like "*PageMediaSize*") { $toRemove += $pi }
                }
                foreach ($r in $toRemove) { $ticket.PrintTicket.RemoveChild($r) | Out-Null }
                
                Set-PrintConfiguration -PrinterName $p.Name -PrintTicketXml $ticket.OuterXml -ErrorAction SilentlyContinue
              }
            }
          } catch {}
        }
      `.replace(/\r?\n\s+/g, ' ');

      exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psCommand}"`, { timeout: 15000 }, (err) => {
        if (err) {
          // Fail silently in production
        } else {
          console.log('[Printer Self-Healer] Verified thermal printers configuration.');
        }
      });
    } catch (e) {
      // 100% Fail-safe: Never crash server
    }
  }, 3000);
}

module.exports = { initPrinterSelfHealing };
