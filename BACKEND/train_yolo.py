import os
import torch
from ultralytics import YOLO

def main():
    print("=" * 50)
    print("LEGAL-AI YOLOv8 Training Pipeline")
    print("=" * 50)

    # 1. Check GPU availability
    if torch.cuda.is_available():
        print(f"✅ GPU Detected: {torch.cuda.get_device_name(0)}")
        device = 0
    else:
        print("❌ No GPU detected. Training will fall back to CPU (This will be very slow).")
        device = 'cpu'

    # Path to the downloaded Roboflow Universe dataset
    dataset_yaml = r"E:\LEGALAI\MRP.v1i.yolov8\data.yaml"
    
    if not os.path.exists(dataset_yaml):
        print(f"\n⚠️ Dataset configuration file not found at: {dataset_yaml}")
        print("Please export your Roboflow dataset to 'datasets' folder as YOLOv8 PyTorch format.")
        return

    print("\n🚀 Initializing YOLOv8 nano model...")
    # Initialize the model from the official YOLOv8n weights
    model = YOLO("yolov8n.pt")
    
    print("\n🔥 Starting Training Process (100 Epochs)...")
    # Train the model
    results = model.train(
        data=dataset_yaml,
        epochs=50,              # Number of training epochs (reduced for CPU speed)
        imgsz=640,              # Resize images to 640x640 (standard for YOLO)
        batch=16,               # Batch size (RTX 3050 4GB handles 16 well)
        device=device,          # Run on RTX 3050 GPU
        name="legalai_yolov8",  # Name of the output folder (runs/detect/legalai_yolov8)
        plots=True              # Generate accuracy graphs
    )
    
    print("\n✅ Training Complete!")
    print(f"Your trained model weights are saved at: {os.path.join('runs', 'detect', 'legalai_yolov8', 'weights', 'best.pt')}")

if __name__ == "__main__":
    # Workaround for Windows multiprocessing freezing issue in PyTorch
    from multiprocessing import freeze_support
    freeze_support()
    main()
