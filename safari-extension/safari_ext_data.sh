#!/bin/bash
set -e

# --- Base variables ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
DEST_DIR="$SCRIPT_DIR"
PROJECT_NAME="YouTube No Translation"
ICON_SRC="$ROOT_DIR/assets/icons/icon.png"
APPICONSET="$DEST_DIR/$PROJECT_NAME/$PROJECT_NAME/Assets.xcassets/AppIcon.appiconset"
ACCENTCOLOR="$DEST_DIR/$PROJECT_NAME/$PROJECT_NAME/Assets.xcassets/AccentColor.colorset"
LARGEICON="$DEST_DIR/$PROJECT_NAME/$PROJECT_NAME/Assets.xcassets/LargeIcon.imageset"
DIST_DIR="$DEST_DIR/$PROJECT_NAME/$PROJECT_NAME/Resources/dist"

# --- Initial validations ---
if [ ! -f "$ICON_SRC" ]; then
  echo "Source icon not found at $ICON_SRC"
  exit 1
fi

echo "Assuming Safari extension project is already generated at $DEST_DIR"

# --- Prepare icon and color directories ---
rm -rf "$APPICONSET"
mkdir -p "$APPICONSET" "$ACCENTCOLOR" "$LARGEICON"

# --- Create AccentColor.colorset ---
cat > "$ACCENTCOLOR/Contents.json" <<EOF
{
  "colors" : [
    {
      "idiom" : "universal",
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "red" : "1.0",
          "green" : "0.0",
          "blue" : "0.0",
          "alpha" : "1.0"
        }
      }
    }
  ],
  "info" : {
    "version" : 1,
    "author" : "xcode"
  }
}
EOF
echo "AccentColor.colorset created."

# --- Generate App Icons ---
declare -a ICON_SIZES=(
  "16 1" "16 2" "20 1" "20 2" "20 3" "29 1" "29 2" "29 3"
  "32 1" "32 2" "40 1" "40 2" "40 3" "60 1" "60 2" "60 3"
  "76 1" "76 2" "83.5 2" "128 1" "128 2" "256 1" "256 2"
  "512 1" "512 2" "1024 1"
)

for entry in "${ICON_SIZES[@]}"; do
  read -r base_size scale <<< "$entry"
  name="icon-${base_size}"
  [[ $scale == "2" ]] && name+="@2x"
  [[ $scale == "3" ]] && name+="@3x"

  px=$(awk "BEGIN {print int($base_size * $scale)}")
  [[ $base_size == *"."* ]] && px=$(printf "%.0f" "$px")

  sips -z "$px" "$px" "$ICON_SRC" --out "$APPICONSET/$name.png" >/dev/null
done
echo "Icons generated at $APPICONSET."

# --- Create AppIcon.appiconset Contents.json ---
cat > "$APPICONSET/Contents.json" <<EOF
... (misma sección JSON del script original con las entradas de íconos) ...
EOF
echo "AppIcon.appiconset Contents.json created."

# --- Create LargeIcon.imageset ---
cp "$ICON_SRC" "$LARGEICON/icon.png"
cat > "$LARGEICON/Contents.json" <<EOF
{
  "images" : [
    {
      "idiom" : "universal",
      "filename" : "icon.png",
      "scale" : "1x"
    }
  ],
  "info" : {
    "version" : 1,
    "author" : "xcode"
  }
}
EOF
echo "LargeIcon.imageset created."

# --- Reorganize Safari extension files ---
cd "$DIST_DIR" || {
  echo "Could not access directory: $DIST_DIR"
  exit 1
}

echo "Reorganizing files inside Safari extension..."

mkdir -p content background popup

[ -f content.js ] && mv -f content.js content/ || echo "  content.js not found"
[ -f background.js ] && mv -f background.js background/ || echo "  background.js not found"
[ -f popup.html ] && mv -f popup.html popup/ || echo "  popup.html not found"
[ -f browser-polyfill.js ] && echo "browser-polyfill.js is present." || echo "  browser-polyfill.js not found"

echo "Done. Verify Xcode -> Copy Bundle Resources includes all required files."
echo "Script completed successfully."