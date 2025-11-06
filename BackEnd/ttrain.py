"""
train_transformer_vad.py
-------------------------------------
Train a hybrid mBERT + VAD model to classify depression types
from Tanglish/Tamil text and Valence-Arousal-Dominance features.
-------------------------------------
"""

import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import BertTokenizer, BertModel
from torch import nn, optim
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from tqdm import tqdm

# ==========================================
# 1️⃣ Dataset Preparation
# ==========================================
class TanglishVADDataset(Dataset):
    def __init__(self, df, tokenizer, max_len=128):
        self.texts = df['cleaned_tamil'].tolist()
        self.vad = df[['valence', 'arousal', 'dominance']].values
        self.labels = df['label_id'].tolist()  # Fixed: use 'label_id' instead of 'depression_type'
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            return_tensors='pt',
            truncation=True,
            padding='max_length',
            max_length=self.max_len
        )
        return {
            'input_ids': encoding['input_ids'].squeeze(0),
            'attention_mask': encoding['attention_mask'].squeeze(0),
            'vad': torch.tensor(self.vad[idx], dtype=torch.float32),
            'labels': torch.tensor(self.labels[idx], dtype=torch.long)  # Added this line
        }


# ==========================================
# 2️⃣ Model Definition: mBERT + VAD
# ==========================================
class VADBERTClassifier(nn.Module):
    def __init__(self, num_classes=4):
        super(VADBERTClassifier, self).__init__()
        self.bert = BertModel.from_pretrained("bert-base-multilingual-cased")
        self.dropout = nn.Dropout(0.3)
        self.vad_fc = nn.Linear(3, 16)           # expand VAD feature space
        self.classifier = nn.Linear(768 + 16, num_classes)

    def forward(self, input_ids, attention_mask, vad):
        bert_outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = bert_outputs.pooler_output    # [CLS] embedding
        vad_emb = torch.relu(self.vad_fc(vad))
        combined = torch.cat((pooled_output, vad_emb), dim=1)
        output = self.dropout(combined)
        logits = self.classifier(output)
        return logits


# ==========================================
# 3️⃣ Training Function
# ==========================================
def train_model(model, dataloader, optimizer, criterion, device):
    model.train()
    total_loss = 0
    for batch in tqdm(dataloader, desc="Training"):
        optimizer.zero_grad()
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        vad = batch['vad'].to(device)
        labels = batch['labels'].to(device)

        logits = model(input_ids, attention_mask, vad)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    return total_loss / len(dataloader)


# ==========================================
# 4️⃣ Main Script
# ==========================================
def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Load dataset
    df = pd.read_csv("datasets/reddit_tamil_vad_dataset.csv")
    
    # Check if dataset has required columns
    required_cols = ['original_text', 'cleaned_tamil', 'valence', 'arousal', 'dominance', 'depression_type']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    print(f"📊 Dataset loaded: {len(df)} samples")
    print(f"Depression type distribution:\n{df['depression_type'].value_counts()}")

    # Encode labels
    le = LabelEncoder()
    df['label_id'] = le.fit_transform(df['depression_type'])
    
    print(f"\n🧠 Classes: {list(le.classes_)}")
    print(f"Label encoding: {dict(zip(le.classes_, le.transform(le.classes_)))}")

    # Check if we have enough data for train/test split
    if len(df) < 2:
        raise ValueError(f"Not enough data for training. Need at least 2 samples, got {len(df)}")
    
    # Split data - adjust test_size if dataset is very small
    test_size = min(0.2, max(1/len(df), 0.1))  # At least 1 sample for validation
    
    try:
        train_df, val_df = train_test_split(
            df, 
            test_size=test_size, 
            random_state=42, 
            stratify=df['label_id']
        )
    except ValueError:
        # If stratification fails (not enough samples per class), split without stratify
        print("⚠️ Warning: Not enough samples per class for stratified split. Using random split.")
        train_df, val_df = train_test_split(df, test_size=test_size, random_state=42)

    tokenizer = BertTokenizer.from_pretrained("bert-base-multilingual-cased")

    train_dataset = TanglishVADDataset(train_df, tokenizer)
    val_dataset = TanglishVADDataset(val_df, tokenizer)

    train_loader = DataLoader(train_dataset, batch_size=4, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=4)

    model = VADBERTClassifier(num_classes=len(le.classes_)).to(device)
    optimizer = optim.AdamW(model.parameters(), lr=2e-5)
    criterion = nn.CrossEntropyLoss()

    print(f"\n📊 Train samples: {len(train_dataset)}, Validation: {len(val_dataset)}")

    for epoch in range(3):
        avg_loss = train_model(model, train_loader, optimizer, criterion, device)
        print(f"Epoch {epoch+1}: Loss = {avg_loss:.4f}")

    torch.save(model.state_dict(), "vad_bert_model.pt")
    print("✅ Model saved as vad_bert_model.pt")


if __name__ == "__main__":
    main()
