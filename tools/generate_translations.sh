#!/usr/bin/env bash
#
# Generate Shavian transliterations from Latin source files
# Uses the 'shave' tool with custom dictionary to create British and American variants
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRANSLATIONS_DIR="$SCRIPT_DIR/translations"
DICT_FILE="$SCRIPT_DIR/shaw-type.dict"

# Check if shave is installed
if ! command -v shave &> /dev/null; then
    echo "Error: 'shave' tool not found. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' tool not found. Please install it first (brew install jq)."
    exit 1
fi

# Check if dictionary file exists
if [ ! -f "$DICT_FILE" ]; then
    echo "Error: Dictionary file not found at $DICT_FILE"
    exit 1
fi

echo "Generating Shavian transliterations..."

# Function to transliterate a JSON file
# Args: input_file, output_file, dialect (british or american)
transliterate_json() {
    local input_file="$1"
    local output_file="$2"
    local dialect="$3"

    echo "  Processing $input_file -> $output_file ($dialect)"

    # Extract just the values from JSON
    local temp_values="$(mktemp)"
    jq -r '.[]' "$input_file" > "$temp_values"

    # Transliterate the values using shave
    local temp_shavian="$(mktemp)"
    if [ "$dialect" = "british" ]; then
        cat "$temp_values" | shave --readlex-british "$DICT_FILE" > "$temp_shavian"
    else
        cat "$temp_values" | shave --readlex-american "$DICT_FILE" > "$temp_shavian"
    fi

    # Get the keys from the original JSON
    local temp_keys="$(mktemp)"
    jq -r 'keys[]' "$input_file" > "$temp_keys"

    # Build new JSON with transliterated values
    local temp_json="$(mktemp)"
    echo "{" > "$temp_json"

    local first=true
    while IFS= read -r key && IFS= read -r value <&3; do
        # Escape double quotes and backslashes in the value for JSON
        value=$(echo "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')

        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$temp_json"
        fi

        printf '  "%s": "%s"' "$key" "$value" >> "$temp_json"
    done < "$temp_keys" 3< "$temp_shavian"

    echo "" >> "$temp_json"
    echo "}" >> "$temp_json"

    # Pretty print with jq and save
    jq '.' "$temp_json" > "$output_file"

    # Cleanup temp files
    rm -f "$temp_values" "$temp_keys" "$temp_shavian" "$temp_json"
}

# Transliterate HTML content files
# Args: input_file, output_file, dialect (british or american)
transliterate_html() {
    local input_file="$1"
    local output_file="$2"
    local dialect="$3"

    echo "  Processing $input_file -> $output_file ($dialect)"

    if [ "$dialect" = "british" ]; then
        cat "$input_file" | shave --readlex-british "$DICT_FILE" > "$output_file"
    else
        cat "$input_file" | shave --readlex-american "$DICT_FILE" > "$output_file"
    fi
}

# Process JSON translations
echo "Generating JSON translations:"
transliterate_json "$TRANSLATIONS_DIR/latin.json" "$TRANSLATIONS_DIR/shavian_british.json" "british"
transliterate_json "$TRANSLATIONS_DIR/latin.json" "$TRANSLATIONS_DIR/shavian_american.json" "american"

# Process HTML content files
SITE_DIR="$SCRIPT_DIR/../site"

echo ""
echo "Checking for HTML content files to transliterate:"

if [ -f "$SITE_DIR/about_latin.html" ]; then
    echo "  Found about_latin.html, generating Shavian versions..."
    transliterate_html "$SITE_DIR/about_latin.html" "$SITE_DIR/about_shavian.html" "british"
else
    echo "  about_latin.html not found (skipping)"
fi

if [ -f "$SITE_DIR/keyboards_latin.html" ]; then
    echo "  Found keyboards_latin.html, generating Shavian versions..."
    transliterate_html "$SITE_DIR/keyboards_latin.html" "$SITE_DIR/keyboards_shavian.html" "british"
else
    echo "  keyboards_latin.html not found (skipping)"
fi

if [ -f "$SITE_DIR/resources_latin.html" ]; then
    echo "  Found resources_latin.html, generating Shavian versions..."
    transliterate_html "$SITE_DIR/resources_latin.html" "$SITE_DIR/resources_shavian.html" "british"
else
    echo "  resources_latin.html not found (skipping)"
fi

echo ""
echo "✅ Translation generation complete!"
echo "Generated files:"
echo "  - $TRANSLATIONS_DIR/shavian_british.json"
echo "  - $TRANSLATIONS_DIR/shavian_american.json"
