import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

def run_mp_segmentation(input_file, output_file):
    print(f"Loading data from {input_file} for MP Risk Segmentation...")
    try:
        df = pd.read_csv(input_file)
    except FileNotFoundError:
        print(f"CRITICAL ERROR: {input_file} not found. Run step1_cleaner.py first.")
        return
        
    money_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['amount', 'cost', 'expenditure', 'sanction'])]
    if not money_cols:
        print("Error: Could not find financial columns for clustering.")
        return
        
    target_col = money_cols[0]
    df[target_col] = pd.to_numeric(df[target_col], errors='coerce').fillna(0)
    
    # 1. Aggregate data by MP
    print("Aggregating fund utilization metrics per MP...")
    mp_stats = df.groupby('Normalized_MP_Name').agg(
        Total_Works=('Normalized_MP_Name', 'count'),
        Total_Expenditure=(target_col, 'sum')
    ).reset_index()
    
    # 2. Scale the features (K-Means requires normalized data so large financial numbers don't skew the math)
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(mp_stats[['Total_Works', 'Total_Expenditure']])
    
    # 3. Initialize and run K-Means (K=3: Low, Medium, High Risk/Utilization)
    print("Running K-Means Clustering (K=3)...")
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    mp_stats['Risk_Cluster'] = kmeans.fit_predict(scaled_features)
    
    # 4. Map numerical clusters to readable labels based on their average expenditure
    cluster_means = mp_stats.groupby('Risk_Cluster')['Total_Expenditure'].mean().sort_values()
    
    label_map = {
        cluster_means.index[0]: 'Low Utilization / High Risk (Stalled)',
        cluster_means.index[1]: 'Normal Pacing',
        cluster_means.index[2]: 'High Expenditure (Monitor for rapid drain)'
    }
    mp_stats['Segment_Label'] = mp_stats['Risk_Cluster'].map(label_map)
    
    print("-" * 30)
    print("K-MEANS SEGMENTATION RESULTS:")
    print(mp_stats['Segment_Label'].value_counts().to_string())
    print("-" * 30)
    
    # Save the MP segmentation data for the React Dashboard
    mp_stats.to_csv(output_file, index=False)
    print(f"Success! MP clusters saved as {output_file}.")

if __name__ == "__main__":
    # We read from the clean data, not the scored data, to evaluate pure utilization
    CLEANED_FILE = 'cleaned_expenditures.csv'
    CLUSTERED_FILE = 'mp_risk_segments.csv'
    run_mp_segmentation(CLEANED_FILE, CLUSTERED_FILE)