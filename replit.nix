{pkgs}: {
  deps = [
    pkgs.libgbm
    pkgs.dbus
    pkgs.expat
    pkgs.xorg.libxcb
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.gtk3
    pkgs.pango
    pkgs.cairo
    pkgs.alsa-lib
    pkgs.mesa
    pkgs.libxkbcommon
    pkgs.libdrm
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.nss
    pkgs.nspr
    pkgs.glib
  ];
}
