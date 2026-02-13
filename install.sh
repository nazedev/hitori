#!/usr/bin/env bash
set -e
async_install() {
  return 0
}

detect_pkg() {
  if command -v pkg >/dev/null 2>&1; then
    echo "pkg"
  elif command -v apt >/dev/null 2>&1; then
    echo "apt"
  elif command -v apt-get >/dev/null 2>&1; then
    echo "apt-get"
  elif command -v pacman >/dev/null 2>&1; then
    echo "pacman"
  elif command -v dnf >/dev/null 2>&1; then
    echo "dnf"
  elif command -v yum >/dev/null 2>&1; then
    echo "yum"
  else
    echo ""
  fi
}

main() {
  local PKG=$(detect_pkg)

  if [ -z "$PKG" ]; then
    echo "ERROR: No supported package manager detected."
    exit 1
  fi

  echo "Detected package manager: $PKG"
  echo "Installing dependencies..."

  case "$PKG" in
    pkg)
      pkg install -y git imagemagick nodejs ffmpeg mc nano yarn
      ;;
    apt|apt-get)
      sudo $PKG install -y git imagemagick nodejs ffmpeg webp mc nano yarn
      ;;
    pacman)
      sudo pacman -Syu --noconfirm
      sudo pacman -S --noconfirm git imagemagick nodejs ffmpeg libwebp mc nano yarn
      ;;
    dnf)
      sudo dnf install -y git ImageMagick nodejs ffmpeg libwebp mc nano yarn
      ;;
    yum)
      sudo yum install -y epel-release
      sudo yum install -y git ImageMagick nodejs ffmpeg libwebp mc nano yarn
      ;;
  esac

  echo "Running yarn install..."
  yarn install || true

  echo "Starting application..."
  npm start

  echo "All dependencies have been installed. Run \"npm start\" to launch the application again."
}

main "$@"
