# TuxedoControlCenter

## Project structure

```
tuxedo-control-center
|  README.md
|--src
|  |--ng-app            Angular GUI (aka electron renderer)
|  |--e-app             Electron main
|  |--service-app       Daemon part (Node 12)
|  |--common            Common shared sources
|  |  |--classes
|  |  |--models
|  |--dist-data         Data needed for packageing
|---build-src           Source used for building
```

## Development setup

1. Install node and npm
2. Clone

   `git clone`

   `npm install`

3. Install service file that points to development build path

### NPM scripts 
`npm run script-name`

| Script                           | Description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| build                            | Build all apps service/electron/angular                     |
| start                            | Normal start of electron app                                |
| start-watch                      | Start with automatic reload on changes to angular directory |
| test-common                      | Test common files (jasmine)                                 |
| pack-prod [-- all \| deb \| rpm] | Build and package for chosen target(s)                      |
| inc-version-patch                | Patch version increase (updates package.json files)         |
| inc-version-minor                | Minor version increase (updates package.json files)         |
| inc-version-major                | Major version increase (updates package.json files)         |

### Debugging
Debugging of electron main and render process is configured for vscode in .vscode/launch.json