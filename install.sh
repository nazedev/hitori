#!/usr/bin/env bash
set -e

# Define color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[1;35m'
NC='\033[0m' # No Color

# Function to detect the package manager
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

run_as_root() {
  if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    "$@"
  fi
}

install_node22() {
  local PKG="$1"
  if [ "$PKG" = "pkg" ]; then
    # Termux: langsung install nodejs-lts
    pkg install -y nodejs-lts
  else
    echo -e "${CYAN}[INFO] Installing Node.js 22 via NVM...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install 22
    nvm use 22
    nvm alias default 22
    echo -e "${GREEN}[INFO] Node.js version: $(node -v)${NC}"
  fi
}

main() {
  local PKG=$(detect_pkg)

  if [ -z "$PKG" ]; then
    echo -e "${RED}[ERROR] Unsupported or missing package manager.${NC}"
    exit 1
  fi

  echo -e "${CYAN}[INFO] Detected package manager: $PKG${NC}"
  echo -e "${CYAN}[INFO] Installing system dependencies...${NC}"

  case "$PKG" in
    pkg) # Termux
      pkg update -y
      pkg install -y git ffmpeg mc yarn curl
      ;;
    apt|apt-get) # Ubuntu/Debian
      run_as_root $PKG update -y
      run_as_root $PKG install -y git ffmpeg mc curl
      ;;
    pacman) # Arch Linux
      run_as_root pacman -Syu --noconfirm
      run_as_root pacman -S --noconfirm git ffmpeg mc curl
      ;;
    dnf) # Fedora/AlmaLinux
      run_as_root dnf install -y git ffmpeg mc curl
      ;;
    yum) # CentOS/RHEL
      run_as_root yum install -y epel-release
      run_as_root yum install -y git ffmpeg mc curl
      ;;
  esac

  # Install Node.js 22
  install_node22 "$PKG"

  # Load NVM if installed
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  echo -e "${CYAN}[INFO] Installing PM2...${NC}"
  if [ "$PKG" = "pkg" ]; then
    yarn global add pm2
  else
    npm install -g pm2
  fi

  if [ -f "package.json" ]; then
    if [ "$PKG" = "pkg" ]; then
      echo -e "${CYAN}[INFO] Found package.json. Termux (pkg) detected. Running 'yarn install'...${NC}"
      yarn install || true
    else
      echo -e "${CYAN}[INFO] Found package.json. Running 'npm install'...${NC}"
      npm install || true
    fi
  else
    echo -e "${YELLOW}[WARNING] No package.json found. Skipping project dependency installation.${NC}"
  fi

  if [ "$PKG" = "pkg" ]; then
    echo -e "${GREEN}[SUCCESS] All dependencies have been installed successfully!${NC} Run \"yarn start\" to launch the application."
    echo -e "${PURPLE}[START] Starting application with yarn...${NC}"
    yarn start
  else
    echo -e "${GREEN}[SUCCESS] All dependencies have been installed successfully!${NC} Run \"npm start\" to launch the application."
    echo -e "${PURPLE}[START] Starting application with npm...${NC}"
    npm start
  fi
}

main "$@"