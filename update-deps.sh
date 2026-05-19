#!/usr/bin/env bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[1;35m'
NC='\033[0m'

PACKAGE_JSON="${1:-package.json}"
PKG_DIR="$(dirname "$(realpath "$PACKAGE_JSON")")"

if [ ! -f "$PACKAGE_JSON" ]; then
  echo -e "${RED}[ERROR] $PACKAGE_JSON not found!${NC}"
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo -e "${RED}[ERROR] node is required!${NC}"; exit 1; }

# ─── Detect package manager ───────────────────────────────────────────────────
detect_pm() {
  # 1. packageManager field in package.json
  local PM_FIELD
  PM_FIELD=$(node -e "
    try {
      const p = require('$(realpath "$PACKAGE_JSON")');
      if (p.packageManager) {
        const name = p.packageManager.split('@')[0].trim();
        console.log(name);
      }
    } catch(e) {}
  " 2>/dev/null)

  if [ -n "$PM_FIELD" ]; then
    echo "$PM_FIELD"
    return
  fi

  # 2. Lock file detection
  if [ -f "$PKG_DIR/bun.lockb" ] || [ -f "$PKG_DIR/bun.lock" ]; then
    echo "bun"; return
  elif [ -f "$PKG_DIR/pnpm-lock.yaml" ]; then
    echo "pnpm"; return
  elif [ -f "$PKG_DIR/yarn.lock" ]; then
    echo "yarn"; return
  elif [ -f "$PKG_DIR/package-lock.json" ]; then
    echo "npm"; return
  fi

  # 3. Available command
  for cmd in bun pnpm yarn npm; do
    command -v "$cmd" >/dev/null 2>&1 && echo "$cmd" && return
  done

  # 4. Default
  echo "npm"
}

PM=$(detect_pm)
echo -e "${CYAN}[INFO] Package manager : ${YELLOW}$PM${NC}"
echo -e "${CYAN}[INFO] Scanning        : $PACKAGE_JSON${NC}"
echo ""

# ─── Fetch latest version using detected PM ───────────────────────────────────
fetch_latest() {
  local PKG="$1"
  local VER=""
  case "$PM" in
    yarn)
      VER=$(yarn info "$PKG" version --silent 2>/dev/null)
      ;;
    pnpm)
      VER=$(pnpm view "$PKG" version 2>/dev/null)
      ;;
    bun)
      VER=$(bun pm ls 2>/dev/null | grep -oP "(?<=$PKG@)[^\s]+" | head -n1)
      # bun doesn't have a great show command, fallback to npm show
      [ -z "$VER" ] && VER=$(npm show "$PKG" version 2>/dev/null)
      ;;
    *)
      VER=$(npm show "$PKG" version 2>/dev/null)
      ;;
  esac
  echo "$VER"
}

# ─── Extract all deps ─────────────────────────────────────────────────────────
DEPS=$(node -e "
const pkg = require('$(realpath "$PACKAGE_JSON")');
const sections = ['dependencies','devDependencies','peerDependencies','optionalDependencies'];
const seen = new Set();
for (const section of sections) {
  if (!pkg[section]) continue;
  for (const [name, ver] of Object.entries(pkg[section])) {
    if (!seen.has(name)) {
      seen.add(name);
      console.log(name + '|' + ver + '|' + section);
    }
  }
}
")

UPDATED=0
SKIPPED=0
IGNORED=0
FAILED=0

# ─── semver compare: returns 0 (true) if $1 < $2 ──���──────────────────────────
semver_lt() {
  [ "$1" = "$2" ] && return 1
  local LOWER
  LOWER=$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n1)
  [ "$LOWER" = "$1" ]
}

# ─── Main loop ────────────────────────────────────────────────────────────────
while IFS='|' read -r PACKAGE RAW_VER SECTION; do
  # Skip non-semver specifiers
  case "$RAW_VER" in
    git+*|git://*|github:*|bitbucket:*|file:*|http://*|https://*)
      echo -e "${PURPLE}[SKIP]${NC}    $PACKAGE  ($RAW_VER) — git/file/url, skipped"
      IGNORED=$((IGNORED + 1))
      continue
      ;;
    "")
      IGNORED=$((IGNORED + 1))
      continue
      ;;
  esac

  # Detect npm alias: npm:realpackage@version
  IS_ALIAS=false
  REAL_PKG="$PACKAGE"
  if [[ "$RAW_VER" == npm:* ]]; then
    IS_ALIAS=true
    ALIAS_BODY="${RAW_VER#npm:}"
    REAL_PKG="${ALIAS_BODY%@*}"
    CLEAN_VER="${ALIAS_BODY##*@}"
  else
    CLEAN_VER=$(echo "$RAW_VER" | sed 's/^[^0-9a-zA-Z*]*//' | sed 's/[ ].*$//')
  fi

  # Resolve special version keywords
  case "$CLEAN_VER" in
    latest|"*"|x|"")
      CLEAN_VER="0.0.0"
      ;;
  esac

  # Handle range like ">=1.0.0 <2.0.0" or "1.x" or "1.2.x"
  if [[ "$CLEAN_VER" =~ [xX*] ]] || [[ "$CLEAN_VER" =~ " " ]]; then
    CLEAN_VER=$(echo "$CLEAN_VER" | grep -oP '[\d]+\.[\d]+\.[\d]+' | head -n1)
    [ -z "$CLEAN_VER" ] && CLEAN_VER="0.0.0"
  fi

  # Fetch latest
  LATEST=$(fetch_latest "$REAL_PKG")

  if [ -z "$LATEST" ]; then
    echo -e "${RED}[FAILED]${NC}  $PACKAGE → cannot fetch from registry"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Compare
  NEEDS_UPDATE=false
  if [ "$CLEAN_VER" = "0.0.0" ]; then
    NEEDS_UPDATE=true
  elif semver_lt "$CLEAN_VER" "$LATEST"; then
    NEEDS_UPDATE=true
  fi

  if [ "$NEEDS_UPDATE" = true ]; then
    echo -e "${YELLOW}[UPDATE]${NC}  ${CYAN}[$SECTION]${NC} $PACKAGE  ${RED}$RAW_VER${NC} → ${GREEN}^$LATEST${NC}"

    if [ "$IS_ALIAS" = true ]; then
      NEW_VAL="npm:${REAL_PKG}@^${LATEST}"
    else
      NEW_VAL="^${LATEST}"
    fi

    ESCAPED_PKG=$(printf '%s\n' "$PACKAGE" | sed 's/[[\.*^$()+?{|]/\\&/g')
    ESCAPED_OLD=$(printf '%s\n' "$RAW_VER"  | sed 's/[[\.*^$()+?{|]/\\&/g')

    sed -i "s|\"${ESCAPED_PKG}\": \"${ESCAPED_OLD}\"|\"${ESCAPED_PKG}\": \"${NEW_VAL}\"|g" "$PACKAGE_JSON"

    UPDATED=$((UPDATED + 1))
  else
    echo -e "${GREEN}[OK]${NC}      ${CYAN}[$SECTION]${NC} $PACKAGE  $RAW_VER (latest: $LATEST)"
    SKIPPED=$((SKIPPED + 1))
  fi

done <<< "$DEPS"

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}================================${NC}"
echo -e "${GREEN}Updated : $UPDATED package(s)${NC}"
echo -e "${CYAN}OK      : $SKIPPED package(s)${NC}"
echo -e "${PURPLE}Ignored : $IGNORED package(s)${NC}"
echo -e "${RED}Failed  : $FAILED package(s)${NC}"
echo -e "${CYAN}================================${NC}"

if [ "$UPDATED" -gt 0 ]; then
  echo ""
  case "$PM" in
    yarn)  echo -e "${YELLOW}[INFO] Run 'yarn install' to apply changes.${NC}" ;;
    pnpm)  echo -e "${YELLOW}[INFO] Run 'pnpm install' to apply changes.${NC}" ;;
    bun)   echo -e "${YELLOW}[INFO] Run 'bun install' to apply changes.${NC}" ;;
    *)     echo -e "${YELLOW}[INFO] Run 'npm install' to apply changes.${NC}" ;;
  esac
fi
