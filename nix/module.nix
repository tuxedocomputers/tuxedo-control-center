{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.hardware.tuxedo-control-center;
in
{
  options.hardware.tuxedo-control-center = {
    enable = lib.mkEnableOption "the TUXEDO Control Center daemon (tccd) and GUI";

    package = lib.mkPackageOption pkgs "tuxedo-control-center" { };
  };

  config = lib.mkIf cfg.enable {
    # tccd talks to the TUXEDO kernel drivers.
    hardware.tuxedo-drivers.enable = lib.mkDefault true;

    environment.systemPackages = [ cfg.package ];

    systemd.packages = [ cfg.package ];
    systemd.services.tccd.wantedBy = [ "multi-user.target" ];
    systemd.services.tccd-sleep.wantedBy = [ "sleep.target" ];

    services.dbus.packages = [ cfg.package ];
    services.udev.packages = [ cfg.package ];
    security.polkit.enable = true;
  };
}
