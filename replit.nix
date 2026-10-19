{ pkgs }: {
    deps = [
        pkgs.nodejs_22
        pkgs.python3
        pkgs.ffmpeg
        pkgs.git
        pkgs.speedtest-cli
        pkgs.wget
        pkgs.libuuid
    ];
    env = {
        LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
            pkgs.libuuid
        ];
    };
}