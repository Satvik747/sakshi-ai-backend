import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

def run_anomaly_detection(input_file, output_file):
    print(f"Loading cleaned data from {input_file}...")
    try:
        df = pd.read_csv(input_file)
    except FileNotFoundError:
        print(f"CRITICAL ERROR: {input_file} not found. Run step1_cleaner.py first.")
        return

    money_cols = [col for col in df.columns if any(k in col.lower() for k in ['amount', 'cost', 'expenditure', 'sanction'])]
    if not money_cols:
        print("Error: Could not find a column containing the transaction amounts.")
        return
    target_col = money_cols[0]
    df[target_col] = pd.to_numeric(df[target_col], errors='coerce').fillna(0)

    # Feature 1: raw expenditure amount
    # Feature 2: vendor frequency — flags vendors receiving an unusually high
    # number of payments (a common shell-vendor / kickback pattern)
    vendor_counts = df['Vendor'].value_counts()
    df['Vendor_Frequency'] = df['Vendor'].map(vendor_counts)

    # Feature 3: amount relative to the average for that district (IDA) —
    # flags payments that are unusually large or small compared to peer
    # transactions in the same district, instead of just a global average
    ida_avg = df.groupby('IDA')[target_col].transform('mean')
    df['Amount_vs_IDA_Avg'] = df[target_col] / ida_avg.replace(0, 1)

    features = [target_col, 'Vendor_Frequency', 'Amount_vs_IDA_Avg']
    print(f"Training on {len(features)} dimensions: {features}")

    scaler = StandardScaler()
    scaled = scaler.fit_transform(df[features])

    model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
    df['Anomaly_Flag'] = model.fit_predict(scaled)

    scaled_df = pd.DataFrame(scaled, columns=features, index=df.index)
    reason_map = {
        target_col: 'Unusually large payment amount',
        'Vendor_Frequency': 'Vendor receiving abnormally frequent payments',
        'Amount_vs_IDA_Avg': 'Amount far from district average'
    }
    df['Flag_Reason'] = scaled_df.abs().idxmax(axis=1).map(reason_map)

    anomalies = df[df['Anomaly_Flag'] == -1]
    print("-" * 30)
    print("ML DETECTION RESULTS:")
    print(f"Total transactions audited: {len(df)}")
    print(f"High-Risk Anomalies flagged: {len(anomalies)}")
    print("-" * 30)

    df.to_csv(output_file, index=False)
    print(f"Success! Risk-scored data saved as {output_file}.")

if __name__ == "__main__":
    run_anomaly_detection('cleaned_expenditures.csv', 'scored_expenditures.csv')