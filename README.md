![Version](https://img.shields.io/github/v/tag/JWinsen/DSA5-Foundry-VTT-Char2PDF?label=Version&style=flat-square&color=2577a1) ![Latest Release Download Count](https://img.shields.io/github/downloads/JWinsen/DSA5-Foundry-VTT-Char2PDF/latest/module.zip?label=Downloads&style=flat-square&color=9b43a8) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FJWinsen%2FDSA5-Foundry-VTT-Char2PDF%2Fmain%2Fmodule.json&label=Foundry%20Core%20Compatible%20Version&query=$.compatibleCoreVersion&style=flat-square&color=ff6400)

# DSA5-Foundry-VTT-Char2PDF
*Foundry VTT module to transfer the DSA 5 actors to PDF*

This module is to extend the functionality of the [Foundry VTT](https://foundryvtt.com/) platform and gives the users of [The Dark Eye / Das schwarze Auge 5](https://foundryvtt.com/packages/dsa5) the possibility to export their characters into the official Ulisses PDF template.  

## Installation
### Automatic Installtion
See https://foundryvtt.wiki/en/basics/Modules. 

1. Open the Add-on Modules tab in the Configuration and Setup dialog.
2. Click Install Module, paste --> `https://github.com/JWinsen/DSA5-Foundry-VTT-Char2PDF/releases/latest/download/module.json`
   in as the Manifest URL, then click Install.

### Manual Installation
If the above installation doesn't work you can try doing it manually.
Use this manifest link:
```
https://raw.githubusercontent.com/Plushtoast/dsa5-char2pdf/main/module.json
```

### Completion of the installation
As `gamemaster` go to the `Manage Modules` options menu in the `Game Settings` for your World, then enable the `DSA5 - Char2PDF` module.

## Where to find the button for export ? 

![alt text](https://github.com/JWinsen/DSA5-Foundry-VTT-Char2PDF/blob/main/Where_to_find_the_Button.png?raw=true)

Please be aware. This context menue entry will only appear for actors which have been created with the template `DSA5.ActorSheetdsa5Character` and as `character` type. 
Other templates and types are not recognized. 

## Used librarys: 
- *FileSaver.js* (using [FileSaver.js](https://github.com/eligrey/FileSaver.js)) by [eligrey](https://github.com/eligrey)
- *pdf-lib.js* (using [pdf-lib.js](https://github.com/Hopding/pdf-lib)) by [Hopding](https://github.com/Hopding)

## License

Copyright © 2021 JWinsen

This package is under an [MIT license](LICENSE) and the [Foundry Virtual Tabletop Limited License Agreement for module development](https://foundryvtt.com/article/license/).
