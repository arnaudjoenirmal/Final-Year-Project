from Levenshtein import distance as levenshtein_distance

file_path = "tamil_unique_words.csv"
with open(file_path, "r", encoding="utf-8") as f:
    words = [line.strip() for line in f.readlines()]

def find_closest(word, max_distance=3):
    best_word = None
    best_distance = float("inf")

    for w in words:
        dist = levenshtein_distance(word, w)
        if dist < best_distance and dist <= max_distance:
            best_distance = dist
            best_word = w

    return best_word

while True:
    input_word = input("\nEnter a Tamil word (or type 'exit' to quit): ").strip()
    if input_word.lower() == "exit":
        break
    closest = find_closest(input_word)
    if closest:
        print(f"Closest match: {closest}")
    else:
        print("No close match found.")