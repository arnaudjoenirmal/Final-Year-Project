import praw
import pandas as pd
import time
import re  # Added for filename cleaning

# 🔹 Step 1: Authenticate
reddit = praw.Reddit(
    client_id="Tk5EVhPSfPH-CYzQbmL4fA",
    client_secret="OeF5E36_-dNKh7nrMCxHS66Il0yTzA",
    user_agent="tamil-depression-research/0.1 by YOUR_REDDIT_USERNAME"
)

# 🔹 Example: Specific post URL
url = input("Enter the url: ")
# url = "https://www.reddit.com/r/Chennai/comments/y3lgd8/why_is_depression_becoming_common"

# Fetch submission
submission = reddit.submission(url=url)

# 🔹 Clean title for filename
def clean_filename(text, maxlen=50):
    # keep only alphanumeric + underscores
    safe = re.sub(r'[^A-Za-z0-9]+', '_', text)
    return safe[:maxlen].strip('_')  # trim & shorten if too long

fname_base = clean_filename(submission.title)

# Save post metadata
post_data = {
    "post_id": submission.id,
    "title": submission.title,
    "body": submission.selftext,
    "subreddit": str(submission.subreddit),
    "author": str(submission.author) if submission.author else "[deleted]",
    "created_utc": int(submission.created_utc),
    "score": submission.score,
    "num_comments": submission.num_comments,
    "url": f"https://www.reddit.com{submission.permalink}"
}

# 🔹 Fetch all comments
submission.comments.replace_more(limit=0)  # expands "load more"
comments = []
for c in submission.comments.list():
    comments.append({
        "body": c.body
    })

# 🔹 Save with filenames based on title
pd.DataFrame([post_data]).to_csv(f"{fname_base}_post.csv", index=False)
pd.DataFrame(comments).to_csv(f"{fname_base}_comments.csv", index=False)

print(f"✅ Saved files: {fname_base}_post.csv and {fname_base}_comments.csv")
