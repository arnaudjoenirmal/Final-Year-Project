import os

base_dir = r'd:\fyp\web-scraping'
output_file = os.path.join(base_dir, 'cleaned.txt')

post_folders = [f'post{i}' for i in range(1, 9)]
all_comments = []

for folder in post_folders:
    cleaned_path = os.path.join(base_dir, folder, 'cleaned.txt')
    if os.path.exists(cleaned_path):
        with open(cleaned_path, 'r', encoding='utf-8') as f:
            all_comments.append(f.read().strip())

with open(output_file, 'w', encoding='utf-8') as out:
    out.write('\n\n'.join(all_comments))

print(f"All comments combined into: {output_file}")