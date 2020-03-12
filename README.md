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
|  |--dist-data         Data needed for packaging
|--build-src            Source used for building
```

## Development setup

1. Install git, nodejs, gcc, g++, make \
   Ex (deb):
   ```
   apt install -y git

   curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
   apt-get install -y nodejs

   apt install -y gcc g++ make
   ```
2. Clone & install libraries

   `git clone <repository-url>`

   `cd tuxedo-control-center`

   `npm install`

3. Install service file that points to development build path

### NPM scripts 
`npm run <script-name>`

| Script name                    | Description                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| build                          | Build all apps service/electron/angular                         |
| start                          | Normal start of electron app after build                        |
| start-watch                    | Start GUI with automatic reload on changes to angular directory |
| test-common                    | Test common files (jasmine)                                     |
| gen-lang                       | Generate base for translation (`ng-app/assets/locale/lang.xlf`) |
| pack-prod -- all \| deb \| rpm | Build and package for chosen target(s)                          |
| inc-version-patch              | Patch version increase (updates package.json files)             |
| inc-version-minor              | Minor version increase (updates package.json files)             |
| inc-version-major              | Major version increase (updates package.json files)             |

### Debugging
Debugging of electron main and render process is configured for vscode in .vscode/launch.json