#!/bin/bash

show_help() {
    cat << 'SlP'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CARA PAKAI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  bash gitdiff.sh [OPSI] [ARGUMEN GIT DIFF]
  bash gitdiff.sh [COMMIT]
  bash gitdiff.sh [COMMIT1] [COMMIT2]
  bash gitdiff.sh [COMMIT1] [COMMIT2] -- [FILE...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPSI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -h, --help        Lihat bantuan ini
  -o <file>         Output ke file — .html atau .md
                    Contoh: -o diff.html, -o diff.md
  -U<n>             Jumlah baris context (default: 2)
                    Contoh: -U0 (tanpa context), -U5 (5 baris)
  --staged          Bandingkan staging vs commit terakhir
  --cached          Sama kayak --staged

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENSI COMMIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Hash penuh      : 9beb418f9e6849...
  Hash pendek     : 9beb418
  HEAD            : commit terakhir
  HEAD~1          : 1 commit sebelum HEAD
  HEAD~N          : N commit sebelum HEAD
  HEAD^           : parent dari HEAD (sama kayak HEAD~1)
  HEAD^^          : parent dari parent (sama kayak HEAD~2)
  branch_name     : ujung dari branch tersebut
  tag_name        : commit yang ditandai
  origin/main     : ujung dari remote branch

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTOH PEMAKAIAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Working tree vs staging (belum di-add)
  bash gitdiff.sh

  # Staging vs commit terakhir (udah di-add, belum commit)
  bash gitdiff.sh --staged
  bash gitdiff.sh --cached

  # Working tree vs commit terakhir (semua perubahan)
  bash gitdiff.sh HEAD

  # Dua commit tertentu
  bash gitdiff.sh 7ce6e13 a9d104b

  # Commit terakhir vs sebelumnya
  bash gitdiff.sh HEAD~1 HEAD

  # 3 commit ke belakang vs sekarang
  bash gitdiff.sh HEAD~3 HEAD

  # Antar branch
  bash gitdiff.sh main fix/bug-pairing
  bash gitdiff.sh develop staging

  # Branch lokal vs remote
  bash gitdiff.sh main origin/main

  # Antar tag
  bash gitdiff.sh v1.0.0 v2.0.0

  # File tertentu aja
  bash gitdiff.sh 7ce6e13 a9d104b -- utils/helpers.js

  # Beberapa file sekaligus
  bash gitdiff.sh 20bbef5 15a83fa -- middleware/auth.js services/notification.js

  # Semua file dengan ekstensi tertentu
  bash gitdiff.sh 20bbef5 15a83fa -- '*.js'
  bash gitdiff.sh 20bbef5 15a83fa -- '*.json'

  # Folder tertentu aja
  bash gitdiff.sh 8a4419e cdcd588 -- lib/
  bash gitdiff.sh 8a4419e cdcd588 -- src/

  # Context lebih banyak
  bash gitdiff.sh -U5 20bbef5 15a83fa

  # Tanpa context sama sekali
  bash gitdiff.sh -U0 20bbef5 15a83fa

  # Output ke file HTML
  bash gitdiff.sh HEAD~1 HEAD -o diff.html

  # Output ke file Markdown
  bash gitdiff.sh HEAD~1 HEAD -o diff.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ========================================
  FILE : lib/exif.js
  ========================================

     4|4   import Crypto from 'crypto';     ← context (nggak berubah)
  -  5     import FileType from 'file-type' ← dihapus (nomor file lama)
  +  5     import { fileTypeFrom... }       ← ditambah (nomor file baru)
     6|6   import { fileURLToPath }         ← context

  ----------------------------------------  ← pemisah antar hunk

  Nomor baris:
    lama|baru  → baris nggak berubah, nomor di file lama | file baru
    lama       → baris dihapus, cuma ada di file lama
    baru       → baris ditambah, cuma ada di file baru

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WARNA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  merah (-)   baris dihapus
  hijau (+)   baris ditambah
  cyan        info commit & ringkasan
  redup       nomor baris

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # Kalau panjang — pipe ke less
  bash gitdiff.sh 8a4419e cdcd588 | less -R

  # Simpan ke file
  bash gitdiff.sh 8a4419e cdcd588 > hasil.txt

  # Jadiin alias permanen — tambahin ke ~/.bashrc atau ~/.zshrc
  alias gd='bash /path/ke/gitdiff.sh'

  # Cek hash commit yang ada
  git log --oneline

SlP
}

# ── Parse args ──────────────────────────────────────────────
OUTPUT=""
DIFF_ARGS=()

for arg in "$@"; do
    case "$arg" in
        -h|--help) show_help; exit 0 ;;
    esac
done

while [[ $# -gt 0 ]]; do
    case "$1" in
        -o)
            OUTPUT="$2"
            shift 2
            ;;
        -o*)
            OUTPUT="${1#-o}"
            shift
            ;;
        *)
            DIFF_ARGS+=("$1")
            shift
            ;;
    esac
done

COMMIT1="${DIFF_ARGS[0]}"
COMMIT2="${DIFF_ARGS[1]}"

print_commit_info() {
    local ref="$1"
    local label="$2"
    local hash msg author date
    hash=$(git rev-parse --short "$ref" 2>/dev/null) || return
    msg=$(git log -1 --format="%s" "$ref" 2>/dev/null)
    author=$(git log -1 --format="%an" "$ref" 2>/dev/null)
    date=$(git log -1 --format="%ci" "$ref" 2>/dev/null)
    echo "$label $hash — $msg ($author, $date)"
}

INFO1="$(print_commit_info "$COMMIT1" "FROM")"
INFO2="$(print_commit_info "$COMMIT2" "  TO")"

# ── MODE: TERMINAL ───────────────────────────────────────────
if [[ -z "$OUTPUT" ]]; then
    git -c color.ui=never --no-pager diff -U2 "${DIFF_ARGS[@]}" | awk \
        -v info1="$INFO1" \
        -v info2="$INFO2" \
    '
    BEGIN {
        eq  = "========================================"
        hr  = "----------------------------------------"
        RED = "\033[31m"
        GRN = "\033[32m"
        RST = "\033[m"
        DIM = "\033[2m"
        CYN = "\033[36m"
        BLD = "\033[1m"

        if (info1 != "") print CYN BLD info1 RST
        if (info2 != "") print CYN BLD info2 RST
        if (info1 != "" || info2 != "") print ""

        total_add = 0
        total_del = 0
        file_count = 0
    }

    {
        if ($0 ~ /^diff --git /) {
            if (in_file) print ""
            match($0, / b\/(.+)$/, m)
            print eq
            print "FILE : " m[1]
            print eq
            in_file = 1
            in_hunk = 0
            first_hunk = 1
            file_count++
            next
        }

        if ($0 ~ /^(index |--- |\+\+\+ )/) next
        if ($0 ~ /^\\ No newline/) next

        if ($0 ~ /^@@ /) {
            if (!first_hunk) {
                print ""
                print hr
            }
            print ""
            first_hunk = 0
            in_hunk = 1
            match($0, /^@@ -([0-9]+)(,[0-9]+)? \+([0-9]+)(,[0-9]+)? @@/, n)
            old_ln = n[1]
            new_ln = n[3]
            next
        }

        if (in_hunk) {
            if ($0 ~ /^-/) {
                print RED "-" DIM sprintf("%4d    ", old_ln) RST " " substr($0, 2) RST
                old_ln++
                total_del++
            } else if ($0 ~ /^\+/) {
                print GRN "+" DIM sprintf("%4d    ", new_ln) RST " " substr($0, 2) RST
                new_ln++
                total_add++
            } else {
                print " " DIM sprintf("%4d|%-4d", old_ln, new_ln) RST " " substr($0, 2)
                old_ln++
                new_ln++
            }
        }
    }

    END {
        if (in_file) print ""
        print ""
        print eq
        printf "%s%s%d file%s changed%s",BLD,CYN, file_count, (file_count>1?"s":""), RST
        if (total_add > 0) printf "  " GRN "+" total_add RST
        if (total_del > 0) printf "  " RED "-" total_del RST
        print ""
        print eq
    }
    '
    exit 0
fi

# ── MODE: MARKDOWN ───────────────────────────────────────────
if [[ "$OUTPUT" == *.md ]]; then
    git -c color.ui=never --no-pager diff -U2 "${DIFF_ARGS[@]}" | gawk \
        -v info1="$INFO1" \
        -v info2="$INFO2" \
        -v outfile="$OUTPUT" \
    '
    BEGIN {
        total_add = 0
        total_del = 0
        file_count = 0
        out = ""
        cur_file = ""
        cur_block = ""
        cur_add = 0
        cur_del = 0
        in_hunk = 0
        first_hunk = 1
    }

    function flush_file() {
        if (cur_file == "") return
        if (!first_hunk) cur_block = cur_block "```\n"
        stat = ""
        if (cur_add > 0) stat = stat " +" cur_add
        if (cur_del > 0) stat = stat " -" cur_del
        out = out "### `" cur_file "`" stat "\n\n"
        out = out cur_block "\n"
        cur_file = ""
        cur_block = ""
        cur_add = 0
        cur_del = 0
        first_hunk = 1
    }

    {
        if ($0 ~ /^diff --git /) {
            flush_file()
            match($0, / b\/(.+)$/, m)
            cur_file = m[1]
            in_hunk = 0
            first_hunk = 1
            file_count++
            next
        }

        if ($0 ~ /^(index |--- |\+\+\+ )/) next
        if ($0 ~ /^\\ No newline/) next

        if ($0 ~ /^@@ /) {
            if (first_hunk) {
                cur_block = cur_block "```diff\n"
            } else {
                cur_block = cur_block "...\n"
            }
            first_hunk = 0
            in_hunk = 1
            match($0, /^@@ -([0-9]+)(,[0-9]+)? \+([0-9]+)(,[0-9]+)? @@/, n)
            old_ln = n[1]
            new_ln = n[3]
            next
        }

        if (in_hunk) {
            if ($0 ~ /^-/) {
                cur_block = cur_block sprintf("-%4d      %s\n", old_ln, substr($0, 2))
                old_ln++; total_del++; cur_del++
            } else if ($0 ~ /^\+/) {
                cur_block = cur_block sprintf("+%4d      %s\n", new_ln, substr($0, 2))
                new_ln++; total_add++; cur_add++
            } else {
                cur_block = cur_block sprintf(" %4d|%-4d %s\n", old_ln, new_ln, substr($0, 2))
                old_ln++; new_ln++
            }
        }
    }

    END {
        flush_file()

        summary = file_count " file" (file_count > 1 ? "s" : "") " changed"
        if (total_add > 0) summary = summary ", +" total_add
        if (total_del > 0) summary = summary ", -" total_del

        header = "# git diff\n\n"
        if (info1 != "") header = header "> " info1 "\n"
        if (info2 != "") header = header "> " info2 "\n"
        if (info1 != "" || info2 != "") header = header "\n"
        header = header "**" summary "**\n\n---\n\n"

        print header out > outfile
        print "✅ Markdown saved to: " outfile > "/dev/stderr"
    }
    '
    exit 0
fi

# ── MODE: HTML ───────────────────────────────────────────────
git -c color.ui=never --no-pager diff -U2 "${DIFF_ARGS[@]}" | gawk \
    -v info1="$INFO1" \
    -v info2="$INFO2" \
    -v outfile="$OUTPUT" \
'
function esc(s,    r) {
    r = s
    gsub(/&/, "\\&amp;", r)
    gsub(/</, "\\&lt;", r)
    gsub(/>/, "\\&gt;", r)
    return r
}

BEGIN {
    total_add = 0
    total_del = 0
    file_count = 0
    files_html = ""
    cur_file = ""
    cur_rows = ""
    cur_add = 0
    cur_del = 0

    split("Dockerfile:🐳 .sh:🐧 .bat:🪟 .js:🟨 .ts:🔷 .json:📦 .nix:❄️ .md:📝 .yml:⚙️ .yaml:⚙️ .env:🔒 .py:🐍 .go:🐹", icons_raw, " ")
    for (i in icons_raw) {
        cnt = split(icons_raw[i], kv, ":")
        icons[kv[1]] = kv[2]
    }
}

function get_icon(fname,    ext, base) {
    base = fname
    sub(/.*\//, "", base)
    if (base in icons) return icons[base]
    if (match(fname, /\.[^.]+$/)) {
        ext = substr(fname, RSTART)
        if (ext in icons) return icons[ext]
    }
    return "📄"
}

function flush_file() {
    if (cur_file == "") return
    icon = get_icon(cur_file)
    stat = ""
    if (cur_add > 0) stat = stat "<span class=\"stat-add\">+" cur_add "</span>"
    if (cur_del > 0) stat = stat "<span class=\"stat-del\">&minus;" cur_del "</span>"
    files_html = files_html \
        "<div class=\"file-block\">" \
        "<div class=\"file-header\">" \
        "<span class=\"file-icon\">" icon "</span>" \
        "<span class=\"file-name\">" esc(cur_file) "</span>" \
        "<div class=\"file-stat\">" stat "</div>" \
        "</div>" \
        "<table>" cur_rows "</table>" \
        "</div>"
    cur_file = ""
    cur_rows = ""
    cur_add = 0
    cur_del = 0
}

function row(cls, sign, lo, ln, code) {
    cur_rows = cur_rows \
        "<tr class=\"" cls "\">" \
        "<td class=\"sign\">" sign "</td>" \
        "<td class=\"ln-old\">" lo "</td>" \
        "<td class=\"ln-new\">" ln "</td>" \
        "<td class=\"code\">" esc(code) "</td>" \
        "</tr>"
}

function hunk_sep() {
    cur_rows = cur_rows "<tr class=\"hunk-sep\"><td colspan=\"4\">&middot; &middot; &middot;</td></tr>"
}

{
    if ($0 ~ /^diff --git /) {
        flush_file()
        match($0, / b\/(.+)$/, m)
        cur_file = m[1]
        in_hunk = 0
        first_hunk = 1
        file_count++
        next
    }

    if ($0 ~ /^(index |--- |\+\+\+ )/) next
    if ($0 ~ /^\\ No newline/) next

    if ($0 ~ /^@@ /) {
        if (!first_hunk) hunk_sep()
        first_hunk = 0
        in_hunk = 1
        match($0, /^@@ -([0-9]+)(,[0-9]+)? \+([0-9]+)(,[0-9]+)? @@/, n)
        old_ln = n[1]
        new_ln = n[3]
        next
    }

    if (in_hunk) {
        if ($0 ~ /^-/) {
            row("del", "&minus;", old_ln, "", substr($0, 2))
            old_ln++; total_del++; cur_del++
        } else if ($0 ~ /^\+/) {
            row("add", "+", "", new_ln, substr($0, 2))
            new_ln++; total_add++; cur_add++
        } else {
            row("ctx", "", old_ln, new_ln, substr($0, 2))
            old_ln++; new_ln++
        }
    }
}

END {
    flush_file()

    summary = file_count " file" (file_count > 1 ? "s" : "") " changed"
    from_html = (info1 != "") ? "<div class=\"from-line\">" esc(info1) "</div>" : ""
    to_html   = (info2 != "") ? "<div class=\"to-line\">"   esc(info2) "</div>" : ""
    commit_block = (from_html != "" || to_html != "") ? \
        "<div class=\"commit-info\">" from_html to_html "</div>" : ""

    badge_files = "<span class=\"badge badge-files\">" summary "</span>"
    badge_add   = (total_add > 0) ? "<span class=\"badge badge-add\">+" total_add "</span>" : ""
    badge_del   = (total_del > 0) ? "<span class=\"badge badge-del\">&minus;" total_del "</span>" : ""

    html = "<!DOCTYPE html>\n" \
"<html lang=\"id\">\n<head>\n" \
"<meta charset=\"UTF-8\">\n" \
"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" \
"<title>git diff</title>\n" \
"<style>\n" \
"@import url(\"https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;600&display=swap\");\n" \
"*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n" \
":root{--bg:#0d0f14;--surface:#13161e;--border:#1e2330;--header:#161923;--add-bg:#0d2318;--add-fg:#4ade80;--add-ln:#1a4028;--del-bg:#2a0e0e;--del-fg:#f87171;--del-ln:#3d1515;--ctx-fg:#8892a4;--ln-fg:#3d4559;--file-fg:#e2e8f0;--commit-from:#60a5fa;--commit-to:#a78bfa;--hr:#1a1f2e}\n" \
"body{font-family:\"IBM Plex Sans\",sans-serif;background:var(--bg);color:var(--file-fg);min-height:100vh;padding:24px 16px 48px}\n" \
"header{max-width:960px;margin:0 auto 24px}\n" \
".meta-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ln-fg);margin-bottom:8px}\n" \
".commit-info{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 18px;font-family:\"JetBrains Mono\",monospace;font-size:13px;display:flex;flex-direction:column;gap:5px}\n" \
".from-line{color:var(--commit-from)}.to-line{color:var(--commit-to)}\n" \
".summary-bar{max-width:960px;margin:0 auto 20px;display:flex;align-items:center;gap:10px}\n" \
".badge{font-family:\"JetBrains Mono\",monospace;font-size:12px;padding:3px 10px;border-radius:20px;font-weight:700}\n" \
".badge-add{background:#0d2318;color:var(--add-fg);border:1px solid #1a4028}\n" \
".badge-del{background:#2a0e0e;color:var(--del-fg);border:1px solid #3d1515}\n" \
".badge-files{background:#131a2e;color:#60a5fa;border:1px solid #1e2e4a}\n" \
".diff-container{max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:18px}\n" \
".file-block{border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface)}\n" \
".file-header{background:var(--header);padding:10px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)}\n" \
".file-icon{font-size:14px;opacity:.7}.file-name{font-family:\"JetBrains Mono\",monospace;font-size:13px;font-weight:700}\n" \
".file-stat{margin-left:auto;font-family:\"JetBrains Mono\",monospace;font-size:11px;display:flex;gap:8px}\n" \
".stat-add{color:var(--add-fg)}.stat-del{color:var(--del-fg)}\n" \
"table{width:100%;border-collapse:collapse;font-family:\"JetBrains Mono\",monospace;font-size:12.5px}\n" \
".hunk-sep td{background:#0f1520;color:#2d3a52;padding:4px 0;text-align:center;font-size:11px;border-top:1px solid var(--hr);border-bottom:1px solid var(--hr)}\n" \
"tr.add{background:var(--add-bg)}tr.del{background:var(--del-bg)}tr.ctx{background:transparent}\n" \
"td.sign{width:20px;text-align:center;padding:1px 0;font-weight:700;user-select:none}\n" \
"tr.add td.sign{color:var(--add-fg)}tr.del td.sign{color:var(--del-fg)}tr.ctx td.sign{color:transparent}\n" \
"td.ln-old,td.ln-new{width:44px;text-align:right;padding:1px 8px;color:var(--ln-fg);user-select:none;font-size:11px}\n" \
"tr.add td.ln-old{background:var(--add-ln)}tr.add td.ln-new{background:var(--add-ln);color:var(--add-fg);opacity:.7}\n" \
"tr.del td.ln-old{background:var(--del-ln);color:var(--del-fg);opacity:.7}tr.del td.ln-new{background:var(--del-ln)}\n" \
"td.code{padding:1px 14px 1px 8px;white-space:pre;overflow-x:auto;line-height:1.7}\n" \
"tr.add td.code{color:var(--add-fg)}tr.del td.code{color:var(--del-fg)}tr.ctx td.code{color:var(--ctx-fg)}\n" \
"</style>\n</head>\n<body>\n" \
"<header><div class=\"meta-label\">git diff</div>" commit_block "</header>\n" \
"<div class=\"summary-bar\">" badge_files badge_add badge_del "</div>\n" \
"<div class=\"diff-container\">" files_html "</div>\n" \
"</body>\n</html>"

    print html > outfile
    print "✅ HTML saved to: " outfile > "/dev/stderr"
}
'
