{
  description = "TUXEDO Control Center";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          # nix/package.nix is the nixpkgs-style definition (fetchFromGitHub);
          # the flake builds the checked-out tree instead.
          tuxedo-control-center = pkgs.callPackage ./nix/package.nix { };
        in
        {
          inherit tuxedo-control-center;
          default = tuxedo-control-center.overrideAttrs { src = pkgs.lib.cleanSource self; };
        }
      );

      nixosModules.default =
        { lib, pkgs, ... }:
        {
          imports = [ ./nix/module.nix ];
          hardware.tuxedo-control-center.package = lib.mkDefault self.packages.${pkgs.stdenv.hostPlatform.system}.default;
        };

      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            inputsFrom = [ self.packages.${system}.default ];
            packages = [
              pkgs.electron
              pkgs.biome
            ];
            ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
            ELECTRON_OVERRIDE_DIST_PATH = "${pkgs.electron}/libexec/electron";
          };
        }
      );
    };
}
