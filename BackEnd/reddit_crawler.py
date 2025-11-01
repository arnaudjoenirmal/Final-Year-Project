import praw
import pandas as pd
import re

# NOTE: the credentials below are from the user's provided script. In production, move to env vars.
reddit = praw.Reddit(
    client_id="Tk5EVhPSfPH-CYzQbmL4fA",
    client_secret="OeF5E36_-dNKh7nrMCxHS66Il0yTzA",
    user_agent="tamil-depression-research/0.1 by YOUR_REDDIT_USERNAME"
)


def clean_filename(text, maxlen=50):
    safe = re.sub(r'[^A-Za-z0-9]+', '_', text)
    return safe[:maxlen].strip('_')


def fetch_submission_text(url: str) -> dict:
    """Fetch submission metadata and comments, returns dict with 'post' and 'comments'"""
    submission = reddit.submission(url=url)

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

    submission.comments.replace_more(limit=0)
    comments = [ {"body": c.body} for c in submission.comments.list() ]

    return {"post": post_data, "comments": comments}


def save_submission_csv(submission_dict: dict, out_prefix: str | None = None):
    """Save post and comments as CSVs. Returns filenames."""
    post = submission_dict["post"]
    comments = submission_dict["comments"]
    if out_prefix is None:
        out_prefix = clean_filename(post.get("title", "reddit_post"))

    post_fname = f"{out_prefix}_post.csv"
    comments_fname = f"{out_prefix}_comments.csv"

    pd.DataFrame([post]).to_csv(post_fname, index=False)
    pd.DataFrame(comments).to_csv(comments_fname, index=False)

    return post_fname, comments_fname
