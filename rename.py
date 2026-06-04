import os
import json
import glob

base_dir = "/Users/luissantra/Projects/Photography Web Portfolio"
data_file = os.path.join(base_dir, "data", "galleries.json")
images_dir = os.path.join(base_dir, "images")
originals_dir = os.path.join(base_dir, "originals")

with open(data_file, 'r') as f:
    galleries = json.load(f)

rename_map = {} # Maps old_basename (with extension) to new_basename (with extension)

# 1. Process regular galleries first to build rename_map
for gallery in galleries:
    if gallery['id'] == 'favourites':
        continue
    
    folder = gallery['id']
    cover_path = gallery['coverImage']
    cover_basename = cover_path.split('/')[-1]
    
    has_thumb_cover = cover_basename.startswith('thumb_')
    if has_thumb_cover:
        cover_basename = cover_basename[len('thumb_'):]
    
    counter = 1
    new_images = []
    
    for old_img in gallery['images']:
        if old_img == cover_basename:
            new_img = f"{folder}-caratula.webp"
        else:
            new_img = f"{folder}-{counter:02d}.webp"
            counter += 1
            
        rename_map[old_img] = new_img
        new_images.append(new_img)
        
        # Rename in images/
        old_path = os.path.join(images_dir, folder, old_img)
        new_path = os.path.join(images_dir, folder, new_img)
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            
        # Rename thumb in images/
        old_thumb = os.path.join(images_dir, folder, f"thumb_{old_img}")
        new_thumb = os.path.join(images_dir, folder, f"thumb_{new_img}")
        if os.path.exists(old_thumb):
            os.rename(old_thumb, new_thumb)
            
        # Rename original in originals/
        orig_folder = os.path.join(originals_dir, folder)
        if os.path.exists(orig_folder):
            old_base_no_ext, _ = os.path.splitext(old_img)
            new_base_no_ext, _ = os.path.splitext(new_img)
            # Find the original file
            for f in os.listdir(orig_folder):
                orig_name_no_ext, orig_ext = os.path.splitext(f)
                if orig_name_no_ext == old_base_no_ext:
                    old_orig_path = os.path.join(orig_folder, f)
                    new_orig_path = os.path.join(orig_folder, new_base_no_ext + orig_ext)
                    os.rename(old_orig_path, new_orig_path)
                    break
                    
    # Update gallery coverImage
    if has_thumb_cover:
        gallery['coverImage'] = f"images/{folder}/thumb_{folder}-caratula.webp"
    else:
        gallery['coverImage'] = f"images/{folder}/{folder}-caratula.webp"
        
    gallery['images'] = new_images

# 2. Process favourites
for gallery in galleries:
    if gallery['id'] == 'favourites':
        folder = gallery['id']
        cover_path = gallery['coverImage']
        cover_basename = cover_path.split('/')[-1]
        
        has_thumb_cover = cover_basename.startswith('thumb_')
        if has_thumb_cover:
            cover_basename = cover_basename[len('thumb_'):]
            
        new_images = []
        for old_img in gallery['images']:
            if old_img in rename_map:
                new_img = rename_map[old_img]
            else:
                print(f"Warning: {old_img} not found in rename_map for favourites. Keep it as is.")
                new_img = old_img
                
            new_images.append(new_img)
            
            # Rename in images/favourites/
            old_path = os.path.join(images_dir, folder, old_img)
            new_path = os.path.join(images_dir, folder, new_img)
            if os.path.exists(old_path):
                os.rename(old_path, new_path)
                
            old_thumb = os.path.join(images_dir, folder, f"thumb_{old_img}")
            new_thumb = os.path.join(images_dir, folder, f"thumb_{new_img}")
            if os.path.exists(old_thumb):
                os.rename(old_thumb, new_thumb)
                
        # Update cover
        if cover_basename in rename_map:
            new_cover_basename = rename_map[cover_basename]
            if has_thumb_cover:
                gallery['coverImage'] = f"images/favourites/thumb_{new_cover_basename}"
            else:
                gallery['coverImage'] = f"images/favourites/{new_cover_basename}"
                
        gallery['images'] = new_images

# 3. Save JSON
with open(data_file, 'w') as f:
    json.dump(galleries, f, indent=2)

print("Renaming process finished.")
