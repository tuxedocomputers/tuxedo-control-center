{
  lib,
  buildNpmPackage,
  fetchFromGitHub,
  electron,
  nodejs,
  python3,
  pkg-config,
  git,
  makeWrapper,
  copyDesktopItems,
  makeDesktopItem,
  systemd,
  libayatana-appindicator,
}:

buildNpmPackage (finalAttrs: {
  pname = "tuxedo-control-center";
  version = "3.1.1";

  src = fetchFromGitHub {
    owner = "tuxedocomputers";
    repo = "tuxedo-control-center";
    tag = "v${finalAttrs.version}";
    hash = "sha256-WKJFyqH7kc2eW1Ung7YY1H1kQ7gR6Wko3QsUN1PpkFo=";
  };

  npmDepsFetcherVersion = 2;
  # dbus-next and node-ble are git dependencies (git+ssh in the lockfile).
  forceGitDeps = true;
  npmDepsHash = "sha256-hc6WoeXZ8qMJhcpb/wRfAm49UmYjcT5Eu8SlzYNhiSs=";

  # Lifecycle scripts download Electron and run electron-builder; the build
  # steps are run explicitly in buildPhase instead.
  npmFlags = [ "--ignore-scripts" ];
  makeCacheWritable = true;

  env = {
    ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
    NG_CLI_ANALYTICS = "false";
    npm_config_nodedir = nodejs;
  };

  nativeBuildInputs = [
    python3
    pkg-config
    git
    makeWrapper
    copyDesktopItems
  ];

  buildInputs = [ systemd ];

  postPatch = ''
    substituteInPlace \
      src/common/classes/TccPaths.ts \
      src/dist-data/tccd.service \
      src/dist-data/com.tuxedocomputers.tccd-service.policy \
      src/dist-data/99-webcam.rules \
      --replace-fail /opt/tuxedo-control-center/resources/dist/tuxedo-control-center \
                     "$out/lib/tuxedo-control-center"

    substituteInPlace src/dist-data/99-webcam.rules \
      --replace-fail /usr/bin/python3 ${python3}/bin/python3

    substituteInPlace src/dist-data/tccd-sleep.service \
      --replace-fail '/bin/bash -c "systemctl stop tccd"' '${systemd}/bin/systemctl stop tccd' \
      --replace-fail '/bin/bash -c "systemctl start tccd"' '${systemd}/bin/systemctl start tccd'

    substituteInPlace src/dist-data/tuxedo-control-center-tray.desktop \
      --replace-fail /opt/tuxedo-control-center/tuxedo-control-center tuxedo-control-center
  '';

  # Replaces the upstream `build-service-prod`, which packs tccd into a
  # single binary with `pkg` (downloads a prebuilt node at build time).
  buildPhase = ''
    runHook preBuild

    npm run build-electron

    npx node-gyp rebuild --release
    npx tsc -p ./src/service-app
    cp ./src/package.json ./dist/tuxedo-control-center/service-app/package.json
    mkdir -p ./dist/tuxedo-control-center/service-app/native-lib
    npm run esbuild-service-prod

    npm run build-ng-prod
    npm run copy-files

    runHook postBuild
  '';

  # tccd is the bundled service run on nixpkgs' node.
  installPhase = ''
    runHook preInstall

    app=$out/lib/tuxedo-control-center
    mkdir -p $app $out/bin
    cp -r dist/tuxedo-control-center/. $app

    npm prune --omit=dev --no-save
    cp -r node_modules $app/node_modules

    mkdir -p $app/data/service
    makeWrapper ${lib.getExe nodejs} $app/data/service/tccd \
      --add-flags $app/service-app/service-app/esbuild.js \
      --prefix PATH : ${lib.makeBinPath [ systemd ]}

    makeWrapper ${lib.getExe electron} $out/bin/tuxedo-control-center \
      --add-flags $app \
      --set ELECTRON_FORCE_IS_PACKAGED 1 \
      --prefix LD_LIBRARY_PATH : ${lib.makeLibraryPath [ libayatana-appindicator ]}

    install -Dm644 src/dist-data/tccd.service -t $out/lib/systemd/system
    install -Dm644 src/dist-data/tccd-sleep.service -t $out/lib/systemd/system
    install -Dm644 src/dist-data/com.tuxedocomputers.tccd-service.policy -t $out/share/polkit-1/actions
    install -Dm644 src/dist-data/com.tuxedocomputers.tomte-access.policy -t $out/share/polkit-1/actions
    install -Dm644 src/dist-data/com.tuxedocomputers.tccd-dbus.conf -t $out/share/dbus-1/system.d
    install -Dm644 src/dist-data/99-webcam.rules -t $out/lib/udev/rules.d
    install -Dm644 src/dist-data/com.tuxedocomputers.tcc-gui.metainfo.xml -t $out/share/metainfo
    install -Dm644 src/dist-data/tuxedo-control-center_256.svg \
      $out/share/icons/hicolor/scalable/apps/tuxedo-control-center.svg
    install -Dm644 src/dist-data/tuxedo-control-center-tray.desktop -t $out/etc/xdg/autostart

    runHook postInstall
  '';

  desktopItems = [
    (makeDesktopItem {
      name = "tuxedo-control-center";
      desktopName = "TUXEDO Control Center";
      comment = "An application helping you to tune your TUXEDO";
      exec = "tuxedo-control-center";
      icon = "tuxedo-control-center";
      categories = [ "System" ];
      keywords = [ "TCC" ];
    })
  ];

  meta = {
    description = "Control hardware like CPU cores and fans of TUXEDO laptops";
    homepage = "https://github.com/tuxedocomputers/tuxedo-control-center";
    license = lib.licenses.gpl3Plus;
    platforms = [ "x86_64-linux" ];
    mainProgram = "tuxedo-control-center";
    maintainers = [ ];
  };
})
