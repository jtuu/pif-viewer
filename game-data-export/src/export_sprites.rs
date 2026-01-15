use anyhow::{Context, Ok, Result};
use image::GenericImageView;
use rayon::iter::{IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator};
use serde::Serialize;
use std::collections::{hash_map, HashMap, HashSet};
use std::fs::{create_dir_all, read_dir, read_to_string, File};
use std::io::Write;
use std::path::PathBuf;

use crate::export_data::OutputFormat;
use crate::util::*;

const SPRITE_SIZE: u32 = 96;

struct SpritesheetInfo {
    path: PathBuf,
    is_fused: bool,
    head_id: String,
    alt_name: Option<String>,
}

impl SpritesheetInfo {
    fn get_name(&self) -> String {
        let alt_name = self.alt_name.as_deref().unwrap_or("");
        return format!("{}{}", self.head_id, alt_name);
    }

    fn get_download_url(&self) -> String {
        let alt_name = self.alt_name.as_deref().unwrap_or("");
        if self.is_fused {
            return format!(
                "https://infinitefusion.net/customsprites/spritesheets/spritesheets_custom/{}/{}{}.png",
                self.head_id, self.head_id, alt_name
            );
        }
        return format!(
            "https://infinitefusion.net/customsprites/spritesheets/spritesheets_base/{}{}.png",
            self.head_id, alt_name
        );
    }

    fn download_and_save(&self) -> Result<()> {
        let spritesheet_url = self.get_download_url();
        let response = reqwest::blocking::get(&spritesheet_url)
            .with_context(|| format!("Failed to download file '{}'", &spritesheet_url))?;
        let spritesheet_bytes = response.bytes()?;
        let mut spritesheet_file = File::create(&self.path)
            .with_context(|| format!("Failed to create file '{}'", self.path.display()))?;
        spritesheet_file
            .write_all(&spritesheet_bytes)
            .with_context(|| format!("Failed to write file '{}'", self.path.display()))?;
        return Ok(());
    }
}

#[derive(Serialize, Clone)]
struct SpriteInfo {
    base_name: String,
    is_fused: bool,
    has_main: bool,
    alt_count: usize,
    main_artists: Vec<usize>,
    // From alt name to vec of artists
    alt_artists: HashMap<String, Vec<usize>>,
}

impl SpriteInfo {
    fn new(name: &str) -> Self {
        return Self {
            base_name: name.to_owned(),
            is_fused: false,
            has_main: false,
            alt_count: 0,
            main_artists: Vec::new(),
            alt_artists: HashMap::new(),
        };
    }

    fn has_alt(&self, alt: &str) -> bool {
        let mut alt_idx = 0;
        for (i, ch) in alt.chars().enumerate() {
            let idx = ch as usize - 'a' as usize;
            alt_idx += idx + i * ('z' as usize - 'a' as usize + 1);
        }
        return alt_idx < self.alt_count;
    }
}

#[derive(Serialize)]
struct Sprites {
    artists: Vec<String>,
    sprites: HashMap<String, SpriteInfo>,
}

fn count_sprite_alt_suffix_len(name: &str) -> usize {
    let mut chars = name.chars();
    let mut suffix_len = 0;
    // Count how many letters are at the end of the string
    loop {
        if let Some(ch) = chars.next_back() {
            if !ch.is_alphabetic() {
                break;
            }
            suffix_len += 1;
        } else {
            break;
        }
    }
    return suffix_len;
}

fn get_sprite_alt_name(name: &str) -> Option<&str> {
    let suffix_len = count_sprite_alt_suffix_len(name);
    if suffix_len == 0 {
        return None;
    }
    return Some(&name[name.len() - suffix_len..name.len()]);
}

fn get_sprite_base_name(name: &str) -> &str {
    let suffix_len = count_sprite_alt_suffix_len(name);
    return &name[0..name.len() - suffix_len];
}

fn make_unfused_sprite_filename(head_id: &str, alt_name: Option<&str>) -> String {
    let alt_name = alt_name.as_deref().unwrap_or("");
    return format!("{}{}.png", head_id, alt_name);
}

fn make_fused_sprite_filename(head_id: &str, body_id: &str, alt_name: Option<&str>) -> String {
    let alt_name = alt_name.as_deref().unwrap_or("");
    return format!("{}.{}{}.png", head_id, body_id, alt_name);
}

fn make_alt_name(idx: usize) -> String {
    let full_len = 'z' as usize - 'a' as usize + 1;
    let full_letter_count = idx / full_len;
    let last_remainder = idx % full_len;
    let mut alt_name = "a".repeat(full_letter_count);
    alt_name.push(char::from_u32(last_remainder as u32 + 'a' as u32).unwrap());
    return alt_name;
}

struct SpritesheetSplitResult {
    successful_splits: Vec<String>,
    failed_splits: Vec<String>,
}

impl SpritesheetSplitResult {
    fn give_sprite_info(
        &self,
        spritesheet_info: &SpritesheetInfo,
        sprite_info_map: &mut HashMap<String, SpriteInfo>,
        sprite_artist_map: &HashMap<String, Vec<usize>>,
    ) {
        for sprite_key in &self.successful_splits {
            let alt_name = spritesheet_info.alt_name.as_deref().unwrap_or("");
            let full_name = format!("{}{}", sprite_key, alt_name);
            add_sprite_info(sprite_info_map, sprite_artist_map, &full_name);
        }
    }
}

/// Returns sprites that couldn't be split because they were blank.
fn split_spritesheet(
    split_sprites_base_dir_path: &PathBuf,
    sprite_info_map: Option<&HashMap<String, SpriteInfo>>,
    spritesheet_info: &SpritesheetInfo,
) -> Result<SpritesheetSplitResult> {
    let spritesheet_img = image::open(&spritesheet_info.path)
        .with_context(|| format!("Failed to read file '{}'", spritesheet_info.path.display()))?;
    let num_cols = spritesheet_img.width() / SPRITE_SIZE;
    let num_rows = spritesheet_img.height() / SPRITE_SIZE;

    // Place all sprites from this spritesheet into this directory
    let split_sprites_dir_path = split_sprites_base_dir_path.join(&spritesheet_info.head_id);
    create_dir_all(&split_sprites_dir_path).with_context(|| {
        format!(
            "Failed to create directory '{}'",
            split_sprites_dir_path.display()
        )
    })?;

    let mut blank_sprites = Vec::new();
    let mut successful_splits = Vec::new();

    // Iterate through sprites in spritesheet.
    // The head pokemon is the same for all sprites.
    // The body pokemon is determined by the the sprite's position.
    for row in 0..num_rows {
        for col in 0..num_cols {
            // If fused spritesheet then sprite index is body id
            // If unfused spritesheet then sprite index is alt id
            let sprite_idx = row * num_cols + col;
            let sprite_key = if spritesheet_info.is_fused {
                &format!("{}.{}", spritesheet_info.head_id, sprite_idx)
            } else {
                &spritesheet_info.head_id
            };
            // The spritesheet simply contains a blank space if the sprite doesn't exist
            let sprite_exists = if let Some(sprite_info_map) = sprite_info_map {
                if let Some(sprite_info) = sprite_info_map.get(sprite_key) {
                    if spritesheet_info.is_fused {
                        if let Some(alt_name) = &spritesheet_info.alt_name {
                            sprite_info.has_alt(alt_name)
                        } else {
                            sprite_info.has_main
                        }
                    } else {
                        if sprite_idx == 0 {
                            sprite_info.has_main
                        } else {
                            (sprite_idx as usize + 1) < sprite_info.alt_count
                        }
                    }
                } else {
                    false
                }
            } else {
                // Assume all sprites exist if no info map
                true
            };
            // Cut sprite out of spritesheet
            let sprite_x = col * SPRITE_SIZE;
            let sprite_y = row * SPRITE_SIZE;
            let sprite_img = spritesheet_img.crop_imm(sprite_x, sprite_y, SPRITE_SIZE, SPRITE_SIZE);
            // Check if sprite actually contains pixels
            let is_blank = {
                let mut sprite_pixels = sprite_img.pixels();
                let (_, _, first_pixel) = sprite_pixels.next().unwrap();
                sprite_pixels.all(|(_, _, pixel)| pixel == first_pixel)
            };
            if sprite_exists && is_blank {
                // Should exist but is somehow blank
                blank_sprites.push(sprite_key.to_owned());
            } else if !is_blank {
                // Sprite can be split if it contains pixels
                let sprite_filename = if spritesheet_info.is_fused {
                    make_fused_sprite_filename(
                        &spritesheet_info.head_id,
                        &sprite_idx.to_string(),
                        spritesheet_info.alt_name.as_deref(),
                    )
                } else {
                    let alt_name = if sprite_idx == 0 {
                        None
                    } else {
                        Some(make_alt_name(sprite_idx as usize - 1))
                    };
                    make_unfused_sprite_filename(&spritesheet_info.head_id, alt_name.as_deref())
                };
                let sprite_path = split_sprites_dir_path.join(&sprite_filename);
                sprite_img
                    .save(&sprite_path)
                    .with_context(|| format!("Failed to write file '{}'", sprite_path.display()))?;
                successful_splits.push(sprite_key.to_owned());
            };
        }
    }

    return Ok(SpritesheetSplitResult {
        successful_splits,
        failed_splits: blank_sprites,
    });
}

fn find_spritesheets(dir: &PathBuf, is_fused: bool) -> Result<Vec<SpritesheetInfo>> {
    let mut spritesheets = Vec::new();
    for dir_entry in read_dir(dir)? {
        // Find spritesheet files in dir
        let dir_entry = dir_entry?;
        let dir_entry_path = dir_entry.path();
        if !dir_entry_path.is_file() {
            continue;
        }
        let sheet_name_noext = dir_entry_path.file_stem().unwrap().to_str().unwrap();
        let head_id = get_sprite_base_name(sheet_name_noext).to_owned();
        let alt_name = get_sprite_alt_name(sheet_name_noext).map(|s| s.to_owned());
        spritesheets.push(SpritesheetInfo {
            path: dir_entry_path,
            is_fused,
            head_id,
            alt_name,
        });
    }
    return Ok(spritesheets);
}

fn add_sprite_info(
    sprite_info_map: &mut HashMap<String, SpriteInfo>,
    sprite_artist_map: &HashMap<String, Vec<usize>>,
    full_name: &str,
) {
    // Strip alt char from name
    let base_name = get_sprite_base_name(full_name);
    let is_main = full_name == base_name;
    let is_fused = base_name.contains(".");
    // Use base name as key, get existing or create new
    let sprite_info = match sprite_info_map.entry(base_name.to_owned()) {
        hash_map::Entry::Occupied(o) => o.into_mut(),
        hash_map::Entry::Vacant(v) => v.insert(SpriteInfo::new(base_name)),
    };
    // Add info to struct
    if is_main {
        sprite_info.has_main = true;
    } else {
        sprite_info.alt_count += 1;
    }
    sprite_info.is_fused = is_fused;
    if let Some(artists) = sprite_artist_map.get(full_name) {
        if let Some(alt_name) = get_sprite_alt_name(full_name) {
            sprite_info
                .alt_artists
                .insert(alt_name.to_owned(), artists.to_vec());
        } else {
            sprite_info.main_artists = artists.to_vec();
        }
    }
}

pub fn export_sprites(
    data_dir_path: &PathBuf,
    graphics_dir_path: &PathBuf,
    output_dir_path: &PathBuf,
    output_format: OutputFormat,
    use_sprite_list_file: bool,
    download_sprites: bool,
) -> Result<()> {
    let (artists, sprite_artist_map) = {
        let mut sprite_artist_map = HashMap::new();
        let mut all_artists = HashSet::new();
        let artist_credits_file_path = data_dir_path.join("sprites").join("Sprite Credits.csv");
        let mut artist_credits_file = csv::ReaderBuilder::new()
            .has_headers(false)
            .flexible(true)
            .from_path(&artist_credits_file_path)
            .with_context(|| {
                format!(
                    "Failed to read file '{}'",
                    artist_credits_file_path.display()
                )
            })?;
        // CSV file that contains information about who made the sprites.
        // First column is sprite name.
        // Second column is artist name, multiple artists are delimited by " & ".
        // Other columns are probably not needed.
        for row in artist_credits_file.records() {
            let row = row?;
            let sprite_name = row[0].to_string();
            let artist_name = row[1].to_string();
            let artist_names = artist_name
                .split(" & ")
                .map(|s| s.to_owned())
                .collect::<Vec<String>>();
            for artist in &artist_names {
                all_artists.insert(artist.to_owned());
            }
            sprite_artist_map.insert(sprite_name, artist_names);
        }

        // Map artist names to this vec's indices
        let all_artists = all_artists.into_iter().collect::<Vec<String>>();
        let mut sprite_artist_id_map = HashMap::new();

        for (sprite_name, artists) in &sprite_artist_map {
            sprite_artist_id_map.insert(
                sprite_name.to_owned(),
                artists
                    .iter()
                    .map(|name| all_artists.iter().position(|a| a == name).unwrap())
                    .collect::<Vec<usize>>(),
            );
        }

        (all_artists, sprite_artist_id_map)
    };

    let sprite_info_map = if use_sprite_list_file {
        let mut sprite_info_map: HashMap<String, SpriteInfo> = HashMap::new();
        // These files have lists of all fused and unfused custom sprites
        let fused_sprites_list_file =
            read_to_string(data_dir_path.join("sprites").join("CUSTOM_SPRITES"))
                .with_context(|| "Failed to read fused sprites list file")?;
        let unfused_sprites_list_file =
            read_to_string(data_dir_path.join("sprites").join("BASE_SPRITES"))
                .with_context(|| "Failed to read unfused sprites list file")?;
        // Sprite names are formatted as "<head_id>.<body_id><alt_char>.png"
        for filename in fused_sprites_list_file
            .lines()
            .chain(unfused_sprites_list_file.lines())
        {
            // Strip file extension from name
            if let Some(sprite_name) = filename.strip_suffix(".png") {
                add_sprite_info(&mut sprite_info_map, &sprite_artist_map, sprite_name);
            }
        }
        Some(sprite_info_map)
    } else {
        None
    };

    let spritesheets = if use_sprite_list_file {
        // Find all spritesheet files in directories
        let mut spritesheets = Vec::new();

        // Find unfused spritesheets
        spritesheets.append(&mut find_spritesheets(
            &graphics_dir_path
                .join("CustomBattlers")
                .join("spritesheets")
                .join("spritesheets_base"),
            false,
        )?);

        // Find fused spritesheets
        for entry in read_dir(
            &graphics_dir_path
                .join("CustomBattlers")
                .join("spritesheets")
                .join("spritesheets_custom"),
        )? {
            // Find spritesheet dirs in base dir
            let entry = entry?;
            let entry_path = entry.path();
            if !entry_path.is_dir() {
                continue;
            }
            spritesheets.append(&mut find_spritesheets(&entry_path, true)?);
        }

        spritesheets
    } else if download_sprites {
        // Generate SpritesheetInfo for every pokemon and then download all spritesheets
        let mut spritesheets = Vec::new();
        let num_pokes = 501;
        let unfused_dir = graphics_dir_path
            .join("CustomBattlers")
            .join("spritesheets")
            .join("spritesheets_base");
        let fused_dir = graphics_dir_path
            .join("CustomBattlers")
            .join("spritesheets")
            .join("spritesheets_custom");
        for head_id in 1..=num_pokes {
            let unfused_path = unfused_dir.join(format!("{}.png", head_id));
            let fused_path = fused_dir.join(format!("{}.png", head_id));
            let unfused_sheet = SpritesheetInfo {
                path: unfused_path,
                is_fused: false,
                head_id: head_id.to_string(),
                alt_name: None,
            };
            let fused_sheet = SpritesheetInfo {
                path: fused_path,
                is_fused: true,
                head_id: head_id.to_string(),
                alt_name: None,
            };
            spritesheets.push(unfused_sheet);
            spritesheets.push(fused_sheet);
        }

        spritesheets.par_iter().try_for_each(|spritesheet_info| {
            return spritesheet_info.download_and_save();
        })?;

        spritesheets
    } else {
        Vec::new()
    };

    let split_sprites_base_dir_path = output_dir_path.join("split_sprites");
    // Iterate through spritesheets and split them into individual image files
    let split_results = spritesheets
        .par_iter()
        .with_min_len(50) // Seems like a good number

        .try_fold(|| HashMap::new(), |mut successful_splits_map, spritesheet_info| {
            let spritesheet_split_result = split_spritesheet(
                &split_sprites_base_dir_path,
                sprite_info_map.as_ref(),
                spritesheet_info,
            )?;

            // Save SpriteInfo of successful splits
            spritesheet_split_result.give_sprite_info(spritesheet_info, &mut successful_splits_map, &sprite_artist_map);

            if spritesheet_split_result.failed_splits.is_empty() {
                // Success
                return Ok(successful_splits_map);
            } else if !use_sprite_list_file {
                // We can't know which sprites are supposed to exist
                return Ok(successful_splits_map);
            } else if !download_sprites {
                // Not success but nothing we can do
                println!(
                    "Encountered blank sprites in spritesheet '{}': {:?}",
                    spritesheet_info.get_name(),
                    spritesheet_split_result.failed_splits
                );
                return Ok(successful_splits_map);
            }

            println!(
                "Encountered blank sprites in spritesheet '{}', attempting to download new spritesheet: {:?}",
                spritesheet_info.get_name(),
                spritesheet_split_result.failed_splits
            );

            // Try download newer spritesheet from pif server
            spritesheet_info.download_and_save()?;

            // Build new info map with just blank sprites
            let mut blank_sprites_info_map = HashMap::new();
            if let Some(sprite_info_map) = &sprite_info_map {
                for sprite_key in &spritesheet_split_result.failed_splits {
                    let sprite_info = sprite_info_map.get(sprite_key).unwrap().clone();
                    blank_sprites_info_map.insert(sprite_key.to_owned(), sprite_info);
                }
            }

            // Retry splitting with new spritesheet
            let spritesheet_split_result = split_spritesheet(
                &split_sprites_base_dir_path,
                Some(blank_sprites_info_map).as_ref(),
                spritesheet_info,
            )?;

            // Save SpriteInfo of successful splits
            spritesheet_split_result.give_sprite_info(spritesheet_info, &mut successful_splits_map, &sprite_artist_map);

            if !spritesheet_split_result.failed_splits.is_empty() {
                // Failed to split all sprites again, accept defeat
                println!("Failed to split blank sprites in spritesheet '{}': {:?}", spritesheet_info.get_name(), spritesheet_split_result.failed_splits);
            }

            return Ok(successful_splits_map);
        })
        .try_reduce(|| HashMap::new(), |mut a, b| {a.extend(b); return Ok(a)})?;

    // Write a file containing information about sprites
    let sprites_metadata_result = Sprites {
        artists,
        sprites: split_results,
    };

    return match output_format {
        OutputFormat::Json => write_json_file(
            &output_dir_path.join("sprites_metadata.json"),
            &sprites_metadata_result,
        ),
        OutputFormat::Binary => write_binary_file(
            &output_dir_path.join("sprites_metadata.dat"),
            &sprites_metadata_result,
        ),
    };
}
