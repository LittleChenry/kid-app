#!/bin/bash
set -uo pipefail

NAS_ROOT=""
DRY_RUN=false
FIX_MODE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --fix) FIX_MODE=true ;;
    *) ;;
  esac
done

for arg in "$@"; do
  case "$arg" in
    --dry-run|--fix) ;;
    *) NAS_ROOT="$arg"; break ;;
  esac
done

if [ -z "$NAS_ROOT" ]; then
  NAS_ROOT="/mnt/huawei-nas"
fi

EXTENSIONS="mkv avi wmv flv webm ts m2ts vob m4v"
CONVERTED=0
SKIPPED=0
FAILED=0

log() { echo "[$(date '+%H:%M:%S')] $*"; }

cleanup() {
  rm -f /tmp/ffprog.* /tmp/ffreport.* 2>/dev/null
}
trap cleanup EXIT

move_to_original() {
  local file="$1"
  local dir
  dir=$(dirname "$file")
  local original_dir="$dir/original"
  mkdir -p "$original_dir"
  mv "$file" "$original_dir/"
}

convert_with_progress() {
  local input="$1"
  local output="$2"
  local label="$3"
  local progfile="/tmp/ffprog.$$"

  local duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$input" 2>/dev/null | cut -d. -f1)
  [ -z "$duration" ] && duration=0

  local d_min=0 d_sec=0
  if [ "$duration" -gt 0 ]; then
    d_min=$((duration / 60))
    d_sec=$((duration % 60))
  fi
  printf "  时长 %02d:%02d\n" $d_min $d_sec

  ffmpeg -nostdin -i "$input" \
    -c:v libx264 -preset ultrafast -crf 28 \
    -c:a aac \
    -movflags faststart \
    -hide_banner -loglevel warning \
    -progress "$progfile" \
    "$output" &
  local ffpid=$!

  local last_pct=-1
  while kill -0 $ffpid 2>/dev/null; do
    if [ -f "$progfile" ]; then
      local out_time_us=$(grep -o 'out_time_us=\([0-9]\+\)' "$progfile" 2>/dev/null | tail -1 | cut -d= -f2)
      if [ -n "$out_time_us" ] && [ "$duration" -gt 0 ]; then
        local out_time=$((out_time_us / 1000000))
        local pct=$((out_time * 100 / duration))
        [ "$pct" -gt 100 ] && pct=100
        if [ "$pct" -ne "$last_pct" ]; then
          last_pct=$pct
          local c_min=$((out_time / 60))
          local c_sec=$((out_time % 60))
          local bar_len=20
          local filled=$((pct * bar_len / 100))
          printf "\r  ["

          local i=1
          while [ "$i" -le "$bar_len" ]; do
            if [ "$i" -le "$filled" ]; then printf '#'
            else printf '·'
            fi
            i=$((i + 1))
          done

          printf "]  %3d%%  %02d:%02d/%02d:%02d" $pct $c_min $c_sec $d_min $d_sec
        fi
      fi
    fi
    sleep 1
  done

  wait $ffpid 2>/dev/null
  printf "\n"
  rm -f "$progfile"

  [ -f "$output" ] && [ -s "$output" ]
}

# ---- fix mode ----
if [ "$FIX_MODE" = true ]; then
  log "Fix mode: checking for MP4 files with original still present..."
  for ext in $EXTENSIONS; do
    while IFS= read -r -d '' file; do
      dir=$(dirname "$file")
      base=$(basename "$file")
      name="${base%.*}"
      mp4="$dir/$name.mp4"

      if [ ! -f "$mp4" ] || [ ! -s "$mp4" ]; then
        continue
      fi

      original_dir="$dir/original"
      if [ -d "$original_dir" ] && [ -f "$original_dir/$base" ]; then
        continue
      fi

      if [ "$DRY_RUN" = true ]; then
        log "DRY-RUN: $file -> $original_dir/"
        CONVERTED=$((CONVERTED + 1))
        continue
      fi

      move_to_original "$file"
      log "FIXED: $base -> original/"
      CONVERTED=$((CONVERTED + 1))
    done < <(find "$NAS_ROOT" -type f -iname "*.$ext" -not -path "*/original/*" -print0)
  done
  echo ""
  log "--- Fix done: $CONVERTED moved, $SKIPPED skipped ---"
  exit 0
fi

# ---- cleanup small incomplete MP4s ----
log "Checking for incomplete MP4 files (smaller than 10MB, will be re-converted)..."
INCOMPLETE_CLEANED=0
for ext in $EXTENSIONS; do
  while IFS= read -r -d '' file; do
    dir=$(dirname "$file")
    base=$(basename "$file")
    name="${base%.*}"
    mp4="$dir/$name.mp4"
    if [ -f "$mp4" ] && [ "$(stat -c%s "$mp4" 2>/dev/null || echo 0)" -lt 10485760 ]; then
      rm -f "$mp4"
      log "  Removed incomplete: $mp4"
      INCOMPLETE_CLEANED=$((INCOMPLETE_CLEANED + 1))
    fi
  done < <(find "$NAS_ROOT" -type f -iname "*.$ext" -not -path "*/original/*" -print0)
done
if [ "$INCOMPLETE_CLEANED" -gt 0 ]; then
  log "Cleaned $INCOMPLETE_CLEANED incomplete file(s)"
fi

# ---- main conversion loop ----
log "Scanning $NAS_ROOT for non-MP4 video files..."
echo ""

for ext in $EXTENSIONS; do
  while IFS= read -r -d '' file; do
    dir=$(dirname "$file")
    base=$(basename "$file")
    name="${base%.*}"
    output="$dir/$name.mp4"

    if [ -f "$output" ] && [ "$(stat -c%s "$output" 2>/dev/null || echo 0)" -ge 10485760 ]; then
      log "SKIP ($ext): $name.mp4 already exists"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    if [ "$DRY_RUN" = true ]; then
      log "DRY-RUN: $file -> $output"
      CONVERTED=$((CONVERTED + 1))
      continue
    fi

    log "CONVERT ($((CONVERTED + FAILED + 1))): $base"
    if convert_with_progress "$file" "$output" "$name"; then
      move_to_original "$file"
      echo "  ✓ DONE"
      CONVERTED=$((CONVERTED + 1))
    else
      echo "  ✗ FAILED"
      rm -f "$output" 2>/dev/null
      FAILED=$((FAILED + 1))
    fi
  done < <(find "$NAS_ROOT" -type f -iname "*.$ext" -not -path "*/original/*" -print0)
done

echo ""
log "--- Summary: $CONVERTED converted, $SKIPPED skipped, $FAILED failed ---"

if [ "$FAILED" -gt 0 ]; then
  log "Tip: After fixing issues, run with --fix to move any remaining originals"
fi
