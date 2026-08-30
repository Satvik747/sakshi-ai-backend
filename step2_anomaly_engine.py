import pandas as pd
from sklearn.ensemble import IsolationForest
import warnings
warnings.filterwarnings('ignore')

def run_anomaly_detection(input_file, output_file):
    print(f"Loading cleaned data from {input_file}...")
    try:
        df = pd.read_csv(input_file)
    except FileNotFoundError:
        print(f"CRITICAL ERROR: {input_file} not found. Run step1_cleaner.py first.")
        return
    
    # Dynamically find the column that holds the financial values
    money_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['amount', 'cost', 'expenditure', 'sanction'])]
    
    if not money_cols:
        print("Error: Could not find a column containing the transaction amounts.")
        print(f"Available columns are: {list(df.columns)}")
        return
        
    target_col = money_cols[0]
    print(f"Analyzing financial column: '{target_col}'")
    
    # Sanitize the money data (convert to strict numbers, fill blanks with 0)
    df[target_col] = pd.to_numeric(df[target_col], errors='coerce').fillna(0)
    
    # Initialize the Machine Learning Model
    # contamination=0.01 tells the AI to flag the top 1% outliers
    print("Training Isolation Forest ML model... (this takes a few seconds)")
    model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
    
    # Execute the anomaly detection
    df['Anomaly_Flag'] = model.fit_predict(df[[target_col]])
    
    # In scikit-learn, -1 means "Fraud Risk" and 1 means "Normal"
    anomalies = df[df['Anomaly_Flag'] == -1]
    
    print("-" * 30)
    print("ML DETECTION RESULTS:")
    print(f"Total transactions audited: {len(df)}")
    print(f"High-Risk Anomalies flagged: {len(anomalies)}")
    print("-" * 30)
    
    # Save the results
    df.to_csv(output_file, index=False)
    print(f"Success! Risk-scored data saved as {output_file}.")

if __name__ == "__main__":
    CLEANED_FILE = 'cleaned_expenditures.csv'
    SCORED_FILE = 'scored_expenditures.csv'
    run_anomaly_detection(CLEANED_FILE, SCORED_FILE)