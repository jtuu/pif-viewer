import os
import re
import json
import multiprocessing
from PIL import Image


source_dir = "spritesheets_custom"
dest_dir = "split_sprites"
sprite_size = 96


def split_spritesheet(args):
    (sheet_path, head_id, alt_id) = args
    img = Image.open(sheet_path)
    cols = img.width // sprite_size
    rows = img.height // sprite_size
    sprites_dir = os.path.join(dest_dir, str(head_id))
    os.makedirs(sprites_dir, exist_ok=True)
    exist = []
    for row in range(rows):
        for col in range(cols):
            body_id = row * cols + col
            x = col * sprite_size
            y = row * sprite_size
            sprite = img.crop((x, y, x + sprite_size, y + sprite_size))
            is_blank = not sprite.getbbox()
            exist.append(not is_blank)
            if is_blank:
                continue
            filename = "{}.{}{}.png".format(head_id, body_id, alt_id)
            sprite.save(os.path.join(sprites_dir, filename))
    return (head_id, alt_id, exist)


def find_spritesheets():
    spritesheets = []
    for filename1 in os.listdir(source_dir):
        sheet_dir = os.path.join(source_dir, filename1)
        if os.path.isdir(sheet_dir):
            head_id = int(filename1)
            for filename2 in os.listdir(sheet_dir):
                sheet_path = os.path.join(sheet_dir, filename2)
                match = re.match(r"(\d+)([a-z]?)\.png", filename2)
                if os.path.isfile(sheet_path) and match:
                    alt_id = match.group(2)
                    spritesheets.append((sheet_path, head_id, alt_id))
    return spritesheets


if __name__ == "__main__":
    spritesheets = find_spritesheets()
    print("Processing {} spritesheets".format(len(spritesheets)))
    head_exist_map = {}
    total_done = 0
    with multiprocessing.Pool() as pool:
        for result in pool.imap_unordered(split_spritesheet, spritesheets, 50):
            (head_id, alt_id, exist) = result
            total_done += 1
            head_exist_map["{}{}".format(head_id, alt_id)] = exist
            if total_done % (len(spritesheets) // 10) == 0:
                print("{}/{}".format(total_done, len(spritesheets)))
    print("{}/{}".format(total_done, len(spritesheets)))
    exist_map = {}
    for i in range(len(spritesheets)):
        (_, head_id, alt_id) = spritesheets[i]
        exist = head_exist_map["{}{}".format(head_id, alt_id)]
        for j in range(len(exist)):
            sprite_exists = exist[j]
            if sprite_exists:
                key = "{}.{}".format(head_id, j)
                count = exist_map.get(key, 0)
                exist_map[key] = count + 1
    with open("pokemon.json", "r") as f:
        pokemon = json.load(f)
    for poke in pokemon:
        key = "{}.{}".format(poke["head_id"], poke["body_id"])
        if key in exist_map:
            poke["alt_count"] = exist_map[key]
        else:
            poke["alt_count"] = 1
    with open("pokemon.json", "w") as f:
        json.dump(pokemon, f, indent=4)
