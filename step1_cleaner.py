import pandas as pd
import re
import os

def clean_mp_name(name):
    """Standardize MP names by removing titles and punctuation."""
    if pd.isna(name): 
        return ""
    name = str(name).lower()
    for title in ['smt.', 'smt', 'shri', 'dr.', 'dr', 'mr.', 'ms.']:
        name = re.sub(rf'\b{title}\b', '', name)
    name = re.sub(r'\(.*?\)', '', name)
    name = re.sub(r'[^a-z\s]', '', name)
    return ' '.join(name.split())

# Check if file exists
input_file = 'mplads_expenditures_2026-08-22.csv'
output_file = 'cleaned_expenditures.csv'

if not os.path.exists(input_file):
    print(f"Error: Could not find {input_file}. Make sure it is in the same folder as this script.")
else:
    print("Loading raw data...")
    df = pd.read_csv(input_file)
    
    initial_rows = len(df)
    print(f"Started with {initial_rows} rows.")
    
    # Remove exact duplicate rows
    df = df.drop_duplicates()
    print(f"Dropped {initial_rows - len(df)} duplicate rows.")
    
    # Clean the MP names
    print("Cleaning MP names...")
    df['Normalized_MP_Name'] = df['MP Name'].apply(clean_mp_name)
    
    # Save the new cleaned file
    df.to_csv(output_file, index=False)
    print(f"Success! Cleaned data saved as {output_file}.")