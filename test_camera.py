"""
SafeguardIQ — Real Camera YOLO Test
Captures frames via OpenCV, runs YOLOv8n detection, shows live window.
Press Q to quit.
"""
import cv2
from ultralytics import YOLO

RTSP_URL = "rtsp://192.168.29.211:8554/live"
MODEL    = "yolov8n.pt"   # replace with ppe-v1.pt once trained

print(f"[INIT] Loading model: {MODEL}")
model = YOLO(MODEL)
print(f"[INIT] Model loaded — {len(model.names)} classes")

print(f"[CAM] Connecting to {RTSP_URL}")
cap = cv2.VideoCapture(RTSP_URL)

if not cap.isOpened():
    print("[ERROR] Cannot open stream — check the RTSP URL")
    exit(1)

print("[CAM] Connected. Running detection... Press Q to quit.")

frame_count = 0
while True:
    ret, frame = cap.read()
    if not ret:
        print("[CAM] Frame read failed, retrying...")
        continue

    frame_count += 1

    # Run YOLO every frame
    results = model.predict(frame, conf=0.4, verbose=False)

    # Draw detections on frame
    annotated = results[0].plot()

    # Print detections to console
    boxes = results[0].boxes
    if boxes is not None and len(boxes) > 0:
        for box in boxes:
            cls_id = int(box.cls[0])
            cls_name = model.names[cls_id]
            conf = float(box.conf[0])
            print(f"[DETECT] Frame {frame_count}: {cls_name} ({conf*100:.0f}%)")

    # Show live window
    cv2.imshow("SafeguardIQ — Live Detection", annotated)

    # Press Q to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("[DONE] Detection stopped.")
