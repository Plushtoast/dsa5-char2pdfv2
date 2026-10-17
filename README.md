![Version](https://img.shields.io/github/v/tag/Plushtoast/dsa5-char2pdfv2?label=Version&style=flat-square&color=2577a1) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FPlushtoast%2Fdsa5-char2pdfv2%2Ffoundry14%2Fmodule.json&label=Foundry%20Core%20Compatible%20Version&query=$.compatibility.verified&style=flat-square&color=ff6400)

> [!IMPORTANT]  
>  
> This module displaces JWinsens original [DSA5-Foundry-VTT-Char2PDF](https://github.com/JWinsen/DSA5-Foundry-VTT-Char2PDF)
> Many thanks to his effort in creating the module!

<hr>

# DSA5-Foundry-VTT-Char2PDF
*Foundry VTT module to transfer the DSA 5 actors to PDF*

This module is to extend the functionality of the [Foundry VTT](https://foundryvtt.com/) platform and gives the users of [The Dark Eye / Das schwarze Auge 5](https://foundryvtt.com/packages/dsa5) the possibility to export their characters as PDF.

Two export modes:

1. **HTML character sheet** (default) — printable multi-page A4 sheet in the world’s language (`de` / otherwise `en`). Lists are not capped; extra rows become extra pages. Choose parchment (table) or printer-friendly appearance.
2. **Ulisses template (legacy)** — fills the official Ulisses Heldendokument. Long inventories and spell lists still hit the form’s field limit.

Language follows `game.i18n.lang`. There is no language dropdown.  

## Installation
### Automatic Installtion
See https://foundryvtt.wiki/en/basics/Modules. 

1. Open the Add-on Modules tab in the Configuration and Setup dialog.
2. Click Install Module, paste --> `https://github.com/Plushtoast/dsa5-char2pdfv2/releases/latest/download/module.json`
   in as the Manifest URL, then click Install.

### Manual Installation
If the above installation doesn't work you can try doing it manually.
Use this manifest link:
```
https://raw.githubusercontent.com/Plushtoast/dsa5-char2pdfv2/foundry14/module.json
```

### Completion of the installation
As `gamemaster` go to the `Manage Modules` options menu in the `Game Settings` for your World, then enable the `DSA5 - Char2PDF` module.

## Where to find the button for export ? 

![alt text](https://github.com/Plushtoast/dsa5-char2pdfv2/blob/main/Where_to_find_the_Button.png?raw=true)

Please be aware. This context menu entry will only appear for actors which have been created with the template `DSA5.ActorSheetdsa5Character` and as `character` type. 
Other templates and types are not recognized. 

## Used libraries
- *FileSaver.js* ([FileSaver.js](https://github.com/eligrey/FileSaver.js)) by [eligrey](https://github.com/eligrey)
- *pdf-lib.js* ([pdf-lib](https://github.com/Hopding/pdf-lib)) by [Hopding](https://github.com/Hopding) — Ulisses fill
- *html2pdf.js* ([html2pdf.js](https://github.com/eKoopmans/html2pdf.js)) by [eKoopmans](https://github.com/eKoopmans) — HTML sheet (html2canvas + jsPDF)

## Image credits

Parchment, frames, logos and combat ornaments in `assets/images/` come from the Roll20 DSA character generator asset set (WebP). They are used as sheet chrome for the HTML export.

## License

Copyright © 2021 JWinsen

This package is under an [MIT license](LICENSE) and the [Foundry Virtual Tabletop Limited License Agreement for module development](https://foundryvtt.com/article/license/).
