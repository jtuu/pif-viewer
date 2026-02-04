#!/bin/bash

# Only copy sprites whose pixels have changed

from_dir="output/split_sprites"

function process_files {
    to_dir="../static/split_sprites"
    for f in "$@"; do
        head_dir=$(basename $(dirname "$f"))
        [ -n "$var" ] && [ "$var" -eq "$var" ] 2>/dev/null
        dir_is_numeric=$?
        if [ $dir_is_numeric ]; then
            filename=$(basename "$f")
            old_file="$to_dir/$head_dir/$filename"
            if [ -f "$old_file" ]; then
                magick compare "$f" "$old_file" null: 2>/dev/null
                if [ $? -ne 0 ]; then
                    # Pixels differ
                    echo "changed $f $old_file"
                    cp "$f" "$old_file"
                fi
            else
                # New file
                echo "new     $f $old_file"
                cp "$f" "$old_file"
            fi
        fi
    done
}

export -f process_files

find "$from_dir" -type f -name "*.png" -print0 \
    | parallel -0 --jobs 8 -n 1000 --no-run-if-empty 'process_files {}'
