#/bin/bash

set -euo pipefail

pack_dir_path="$1"
result_dir="../static"

find "$pack_dir_path/CustomBattlers" "$pack_dir_path/Other/BaseSprites" "$pack_dir_path/Other/Triples" -type f -name "*.png" -print0 \
    | parallel -0 --jobs 8 -n 1000 --no-run-if-empty 'magick mogrify -format png -filter point -resize 96x96 {}'

cargo run --release -- -o "output" -f "json" \
    --sprites-export \
    --artist-credits-file-path "$pack_dir_path/Sprite_Credits.csv" \
    --fused-sprites-dir-path "$pack_dir_path/CustomBattlers" \
    --base-sprites-dir-path "$pack_dir_path/Other/BaseSprites" \
    --input-sprites-are-split

cp "output/sprites_metadata.json" "$result_dir"
cp -r "output/split_sprites" "$result_dir"
cp "$pack_dir_path"/Other/Triples/*.png "$result_dir/split_sprites/special"
