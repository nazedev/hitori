#!/usr/bin/env bash
set -e

BOLD='\033[1m'
DIM='\033[2m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

echo -e "\n  ${BOLD}Hitori Bot Installation${NC}\n"
echo -e "  ${BLUE}i${NC} ${DIM}Starting setup process...${NC}\n"

LOG_FILE="${TMPDIR:-/tmp}/hitori_install.log"

SPIN_PID=""
trap 'cleanup' EXIT
trap 'handle_interrupt' INT TERM HUP QUIT

cleanup() {
    if [ -n "$SPIN_PID" ] && kill -0 $SPIN_PID 2>/dev/null; then
        kill $SPIN_PID >/dev/null 2>&1 || true
    fi
    tput cnorm 2>/dev/null || true
}

handle_interrupt() {
    echo -e "\n\n  ${YELLOW}⚠${NC} ${BOLD}Installation cancelled by user.${NC}"
    echo -e "  ${CYAN}Thank you for trying out Hitori Bot! Have a great day.${NC}\n"
    exit 130
}

run_with_spinner() {
    local msg="$1"
    local cmd="$2"
    
    tput civis 2>/dev/null || true
    
    eval "$cmd" > "$LOG_FILE" 2>&1 &
    local pid=$!
    SPIN_PID=$pid

    local spin_frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
    local i=0
    
    local progress=0
    local increment=1
    
    while kill -0 $pid 2>/dev/null; do
        if [ $progress -lt 99 ]; then
            progress=$((progress + increment))
            if [ $progress -ge 60 ]; then increment=1; fi
            if [ $progress -ge 85 ]; then increment=0; fi
            if [ $progress -ge 85 ] && [ $((RANDOM % 10)) -eq 0 ] && [ $progress -lt 99 ]; then
                progress=$((progress + 1))
            fi
        fi

        local filled=$((progress / 5))
        local empty=$((20 - filled))
        
        local bar_solid=""
        local bar_empty=""
        local j
        for ((j=0; j<filled; j++)); do bar_solid="${bar_solid}█"; done
        for ((j=0; j<empty; j++)); do bar_empty="${bar_empty}░"; done

        local colored_bar="${CYAN}${bar_solid}${GRAY}${bar_empty}${NC}"
        
        printf "\r  ${YELLOW}%b${NC} %-33s ${GRAY}[${NC}%b${GRAY}]${NC} ${DIM}%3d%%${NC}" "${spin_frames[i++ % ${#spin_frames[@]}]}" "$msg" "$colored_bar" "$progress"
        sleep 0.4
    done
    local exit_code=0
    wait $pid || exit_code=$?
    SPIN_PID=""

    printf "\r\033[K"
    tput cnorm 2>/dev/null || true

    local full_bar_solid=""
    for ((j=0; j<20; j++)); do full_bar_solid="${full_bar_solid}█"; done

    if [ $exit_code -eq 0 ]; then
        local full_bar="${GREEN}${full_bar_solid}${NC}"
        printf "  ${GREEN}✔${NC} %-33s ${GRAY}[${NC}%b${GRAY}]${NC} ${DIM}100%%${NC}\n" "$msg" "$full_bar"
    else
        local full_bar="${RED}${full_bar_solid}${NC}"
        printf "  ${RED}✖${NC} %-33s ${GRAY}[${NC}%b${GRAY}]${NC} ${RED}FAIL${NC}\n" "$msg" "$full_bar"
        echo -e "\n  ${RED}=== ERROR LOG ===${NC}"
        cat "$LOG_FILE" | while read -r line; do echo -e "  ${NC}$line"; done
        echo -e "  ${RED}=================${NC}"
        echo -e "  ${DIM}Full log saved to: $LOG_FILE${NC}\n"
        exit 1
    fi
}

detect_pkg() {
  if command -v pkg >/dev/null 2>&1; then echo "pkg"
  elif command -v apt >/dev/null 2>&1; then echo "apt"
  elif command -v apt-get >/dev/null 2>&1; then echo "apt-get"
  elif command -v pacman >/dev/null 2>&1; then echo "pacman"
  elif command -v dnf >/dev/null 2>&1; then echo "dnf"
  elif command -v yum >/dev/null 2>&1; then echo "yum"
  else echo ""
  fi
}

SUDO_CMD=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
fi

main() {
    if [[ "$PWD" == *"/storage/"* ]]; then
        echo -e "\n  ${RED}✖ ERROR: Unsupported Directory Location${NC}"
        echo -e "  You are attempting to install the bot in Android's shared storage (/storage/...)."
        echo -e "  This filesystem does not support 'symlinks', which are strictly required by Node.js.\n"
        echo -e "  ${YELLOW}How to fix this:${NC}"
        echo -e "  Please run the command below to PERMANENTLY MOVE the bot to the native Termux environment."
        echo -e "  (Note: In the future, you must use 'cd ~/hitori-master' to access your bot)\n"
        echo -e "  ${CYAN}mv \"$PWD\" ~/hitori-master && cd ~/hitori-master && bash install.sh${NC}\n"
        exit 1
    fi

    local PKG=$(detect_pkg)

    if [ -z "$PKG" ]; then
        echo -e "  ${RED}✖${NC} ${BOLD}Package manager not recognized.${NC} Cannot install dependencies automatically."
        exit 1
    fi

    if [ -n "$SUDO_CMD" ]; then
        echo -e "  ${BLUE}i${NC} ${DIM}Requesting administrator privileges for global installation...${NC}"
        $SUDO_CMD -v
    fi

    local NEED_INSTALL=false
    if ! command -v git >/dev/null 2>&1; then NEED_INSTALL=true; fi
    if ! command -v node >/dev/null 2>&1; then NEED_INSTALL=true; fi
    if ! command -v ffmpeg >/dev/null 2>&1; then NEED_INSTALL=true; fi
    if [ "$PKG" = "pkg" ] || [ "$PKG" = "pacman" ] || [ "$PKG" = "dnf" ]; then
        if ! command -v yarn >/dev/null 2>&1; then NEED_INSTALL=true; fi
    else
        if ! command -v npm >/dev/null 2>&1; then NEED_INSTALL=true; fi
    fi

    if [ "$NEED_INSTALL" = true ]; then
        local cmd=""
        case "$PKG" in
          pkg) cmd="pkg update -y && pkg install -y git nodejs-lts ffmpeg yarn" ;;
          apt|apt-get) cmd="$SUDO_CMD $PKG update -y && $SUDO_CMD $PKG install -y git nodejs npm ffmpeg" ;;
          pacman) cmd="$SUDO_CMD pacman -Syu --noconfirm && $SUDO_CMD pacman -S --noconfirm git nodejs npm ffmpeg yarn" ;;
          dnf) cmd="$SUDO_CMD dnf install -y git nodejs npm ffmpeg yarn" ;;
          yum) cmd="$SUDO_CMD yum install -y epel-release && $SUDO_CMD yum install -y git nodejs npm ffmpeg" ;;
        esac
        run_with_spinner "Installing system dependencies" "$cmd"
    else
        echo -e "  ${GREEN}✔${NC} ${DIM}System dependencies already installed.${NC}"
    fi

    if ! command -v pm2 >/dev/null 2>&1; then
        local pm2_cmd=""
        if [ "$PKG" = "pkg" ]; then
            pm2_cmd="yarn global add pm2"
        else
            pm2_cmd="$SUDO_CMD npm install -g pm2"
        fi
        run_with_spinner "Installing PM2" "$pm2_cmd"
    else
        echo -e "  ${GREEN}✔${NC} ${DIM}PM2 already installed.${NC}"
    fi

    if [ -f "package.json" ]; then
        local install_cmd=""
        if [ "$PKG" = "pkg" ]; then
            install_cmd="yarn install"
        else
            install_cmd="npm install"
        fi
        run_with_spinner "Installing project dependencies" "$install_cmd"
    else
        echo -e "  ${YELLOW}⚠${NC} ${DIM}No package.json found. Skipping project dependency installation.${NC}"
    fi

    chmod +x cli.js 2>/dev/null || true
    local link_cmd=""
    if [ "$PKG" = "pkg" ]; then
        link_cmd="yarn link 2>/dev/null || true"
    else
        link_cmd="$SUDO_CMD npm link 2>/dev/null || true"
    fi
    run_with_spinner "Registering global 'hitori'" "$link_cmd"

    echo -e "\n  ${GREEN}✔${NC} ${BOLD}All dependencies have been installed successfully!${NC}"
    echo -e "  ${BLUE}i${NC} ${DIM}You can now use the 'hitori' command from anywhere.${NC}\n"

    echo -e "  ${MAGENTA}✦${NC} ${BOLD}Launching first-time setup wizard...${NC}\n"
    node cli.js --setup
}

main "$@"
