#!/bin/bash

set -e

clone_files_main_repo=(
    "/Data/abilities.dat"
    "/Data/species.dat"
    "/Data/types.dat"
    "/Data/moves.dat"
    "/Data/sprites/Sprite Credits.csv"
    "/Data/sprites/CUSTOM_SPRITES"
    "/Data/sprites/BASE_SPRITES"
    "/Data/Scripts/052_AddOns/FusionMoveTutor.rb"
)
clone_files_other_repo=(
    "/CUSTOM_SPRITES"
    "/BASE_SPRITES"
)
overwrite_files=(
    "Data/sprites/CUSTOM_SPRITES,CUSTOM_SPRITES"
    "Data/sprites/BASE_SPRITES,BASE_SPRITES"
)
clone_dirs=("Graphics/CustomBattlers/spritesheets" "Graphics/Battlers/special")

input_dir="input"
output_dir="output"

output_format="json"
pif_repo_name="infinitefusion-e18"
other_repo_name="pif-downloadables"
version_file="$output_dir/data_version.txt"
sprites_dir="$output_dir/split_sprites"
result_dir="../static"

if [ "$output_format" = "json" ]; then
    output_file="$output_dir/game_data.json"
    sprites_file="$output_dir/sprites_metadata.json"
else
    output_file="$output_dir/game_data.dat"
    sprites_file="$output_dir/sprites_metadata.dat"
fi

mkdir -p "$input_dir"
mkdir -p "$output_dir"
cd "$input_dir"

# Clone single branch with no files and no history
if [ ! -d "$pif_repo_name" ]; then
    git clone -b releases --single-branch \
         --no-checkout --filter=blob:none \
        "https://github.com/infinitefusion/$pif_repo_name"
fi

if [ ! -d "$other_repo_name" ]; then
    git clone -b master --single-branch \
        --no-checkout --filter=blob:none \
        "https://github.com/infinitefusion/$other_repo_name"
fi

cd "$pif_repo_name"

# Download only selected files and dirs
git sparse-checkout set --no-cone "${clone_files_main_repo[@]}" "${clone_dirs[@]}"
git checkout releases

# Use hash of newest commit as version identifier
data_version="$(git rev-parse HEAD)"

# Download files from other repo
cd "../$other_repo_name"
git sparse-checkout set --no-cone "${clone_files_other_repo[@]}"
git checkout master

# Overwrite files in main repo if other repo has newer files
for pair in "${overwrite_files[@]}"; do
    IFS=","
    set -- $pair
    a="../$pif_repo_name/$1"
    b="../$other_repo_name/$2"
    if [ "$a" -ot "$b" ]; then
        cp "$b" "$a"
    fi
done

# Add hash from other repo
data_version="${data_version}:$(git rev-parse HEAD)"

# Go back to game-data-export
cd ../..

# Get version of previous export
if [ -f "$version_file" ]; then
    saved_data_version="$(<$version_file)"
else
    saved_data_version=""
fi

if [ -f "$output_file" ] && [ -f "$sprites_file" ] && [ "$data_version" = "$saved_data_version" ]; then
    # Exported data already exists and is up to date
    echo "Data export already up to date"
else
    # Run export
    cargo run --release -- -i "$input_dir/$pif_repo_name" -o "$output_dir" -f "$output_format" --data-export --sprites-export --use-sprite-list-file
    cp "$output_file" "$result_dir"
    cp "$sprites_file" "$result_dir"
    cp -r "$sprites_dir" "$result_dir"
    cp -r "$input_dir/$pif_repo_name/Graphics/Battlers/special" "$result_dir/split_sprites"
    # Save version identifier
    echo "$data_version" > "$version_file"
fi
