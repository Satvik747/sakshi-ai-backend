import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import warnings
warnings.filterwarnings('ignore')

def detect_duplicates_within_constituency(input_file, output_file):
    print(f"Loading data from {input_file} for NLP Semantic Auditing...")
    try:
        df = pd.read_csv(input_file)
    except FileNotFoundError:
        print(f"CRITICAL ERROR: {input_file} not found. Run step1_cleaner.py first.")
        return
        
    candidate_cols = [
        col for col in df.columns 
        if any(keyword in col.lower() for keyword in ['work', 'project', 'description', 'detail', 'activity'])
        and 'mp' not in col.lower()
    ]
    
    if not candidate_cols:
        print("Error: Could not find the project description column.")
        return
        
    text_col = candidate_cols[0]
    print(f"Targeting work description column: '{text_col}'")
    
    if 'Normalized_MP_Name' not in df.columns:
        print("Error: Missing 'Normalized_MP_Name'. Ensure Step 1 was executed.")
        return
        
    df[text_col] = df[text_col].fillna('').astype(str)
    df = df[df[text_col].str.strip() != '']
    
    THRESHOLD = 0.85 
    all_flagged_duplicates = []
    
    grouped = df.groupby('Normalized_MP_Name')
    total_groups = len(grouped)
    print(f"Auditing unique works across {total_groups} MP groups...")
    
    vectorizer = TfidfVectorizer(stop_words='english', min_df=1)
    
    for idx, (mp_name, group_df) in enumerate(grouped, 1):
        # Extract only distinct descriptions per MP to prevent combinatorial bloat
        unique_descriptions = group_df[text_col].unique()
        n_works = len(unique_descriptions)
        
        if n_works < 2:
            continue
            
        try:
            tfidf_matrix = vectorizer.fit_transform(unique_descriptions)
            cosine_sim = cosine_similarity(tfidf_matrix)
        except ValueError:
            continue
            
        upper_tri = np.triu(cosine_sim, k=1)
        matches = np.argwhere(upper_tri >= THRESHOLD)
        
        for i, j in matches:
            all_flagged_duplicates.append({
                'MP_Name': mp_name,
                'Similarity_Score_%': round(float(upper_tri[i, j]) * 100, 2),
                'Work_A': unique_descriptions[i],
                'Work_B': unique_descriptions[j]
            })
            
        if idx % 100 == 0 or idx == total_groups:
            print(f"Progress: Processed {idx}/{total_groups} MPs...")
                    
    duplicate_df = pd.DataFrame(all_flagged_duplicates)
    
    print("-" * 35)
    print("NLP DUPLICATE DETECTION RESULTS:")
    print(f"Total Unique Works Scanned: {len(df[text_col].unique())}")
    print(f"Disguised duplicates intercepted: {len(duplicate_df)}")
    print("-" * 35)
    
    if not duplicate_df.empty:
        duplicate_df = duplicate_df.sort_values(by='Similarity_Score_%', ascending=False)
        duplicate_df.to_csv(output_file, index=False)
        print(f"Success! Flagged duplicates saved to {output_file}.")
    else:
        print("No duplicates detected above the 85% threshold.")

if __name__ == "__main__":
    CLEANED_FILE = 'cleaned_expenditures.csv'
    FLAGGED_DUPLICATES = 'flagged_nlp_duplicates.csv'
    detect_duplicates_within_constituency(CLEANED_FILE, FLAGGED_DUPLICATES)