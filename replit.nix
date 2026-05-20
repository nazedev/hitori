{ pkgs }: {
    deps = [
        pkgs.nodejs_22
        pkgs.nodePackages.typescript
        pkgs.ffmpeg
        pkgs.git
        pkgs.neofetch
        pkgs.speedtest-cli
        pkgs.wget
        pkgs.yarn
        pkgs.libuuid
    ];
    env = {
        LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
            pkgs.libuuid
        ];
    };
}
