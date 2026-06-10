import sys
import os
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QPushButton, QLabel, QFileDialog, QComboBox, QMessageBox, 
    QSlider, QCheckBox, QTabWidget, QSpinBox
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QPixmap, QImage, QDragEnterEvent, QDropEvent
import cv2

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import apply_effect

class DropLabel(QLabel):
    def __init__(self, title):
        super().__init__(title)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setStyleSheet("""
            QLabel {
                border: 2px dashed #aaa;
                border-radius: 10px;
                background-color: #f9f9f9;
                color: #555;
                font-size: 16px;
            }
        """)
        self.setAcceptDrops(True)
        self.image_path = None

    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasUrls():
            event.accept()
        else:
            event.ignore()

    def dropEvent(self, event: QDropEvent):
        file_path = event.mimeData().urls()[0].toLocalFile()
        if file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp')):
            self.image_path = file_path
            self.set_image(file_path)
            window = self.window()
            if hasattr(window, 'process_image'):
                window.process_image()

    def set_image(self, file_path):
        pixmap = QPixmap(file_path)
        self.setPixmap(pixmap.scaled(self.width(), self.height(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))

    def set_cv_image(self, cv_img):
        rgb_image = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb_image.shape
        bytes_per_line = ch * w
        qt_img = QImage(rgb_image.data, w, h, bytes_per_line, QImage.Format.Format_RGB888)
        pixmap = QPixmap.fromImage(qt_img)
        self.setPixmap(pixmap.scaled(self.width(), self.height(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Pencil Sketch App - Advanced")
        self.setGeometry(100, 100, 1200, 700)
        self.processed_img_cv = None
        self.cap = None
        
        self.init_ui()

    def init_ui(self):
        tabs = QTabWidget()
        self.setCentralWidget(tabs)

        # Tab 1: Image Processing
        tab_image = QWidget()
        self.init_image_tab(tab_image)
        tabs.addTab(tab_image, "Image Processing")

        # Tab 2: Live Webcam
        tab_webcam = QWidget()
        self.init_webcam_tab(tab_webcam)
        tabs.addTab(tab_webcam, "Live Camera")
        
        tabs.currentChanged.connect(self.on_tab_change)

    def init_image_tab(self, parent):
        main_layout = QVBoxLayout()
        parent.setLayout(main_layout)

        controls_layout = QHBoxLayout()
        
        # Open / Save
        btn_layout = QVBoxLayout()
        self.btn_open = QPushButton("Open Image")
        self.btn_open.clicked.connect(self.open_image)
        btn_layout.addWidget(self.btn_open)

        self.btn_save = QPushButton("Save Image")
        self.btn_save.clicked.connect(self.save_image)
        self.btn_save.setEnabled(False)
        btn_layout.addWidget(self.btn_save)
        controls_layout.addLayout(btn_layout)

        # Effect Settings
        effect_layout = QVBoxLayout()
        self.effect_combo = QComboBox()
        self.effect_combo.addItems([
            "pencil", "color_pencil", "watercolor", "cartoon", 
            "style_mosaic", "style_candy", "style_starry_night", 
            "style_anime", "style_3d"
        ])
        self.effect_combo.currentTextChanged.connect(self.process_image)
        effect_layout.addWidget(QLabel("Effect Style:"))
        effect_layout.addWidget(self.effect_combo)
        
        slider_layout = QHBoxLayout()
        slider_layout.addWidget(QLabel("Blur Amount:"))
        self.slider_blur = QSlider(Qt.Orientation.Horizontal)
        self.slider_blur.setRange(3, 51)
        self.slider_blur.setSingleStep(2)
        self.slider_blur.setValue(21)
        self.slider_blur.valueChanged.connect(self.process_image)
        slider_layout.addWidget(self.slider_blur)
        effect_layout.addLayout(slider_layout)
        
        controls_layout.addLayout(effect_layout)

        # AI Options
        ai_layout = QVBoxLayout()
        self.chk_bg_remove = QCheckBox("AI Background Removal")
        self.chk_bg_remove.stateChanged.connect(self.process_image)
        ai_layout.addWidget(self.chk_bg_remove)
        
        self.chk_super_res = QCheckBox("AI Super Resolution (EDSR)")
        self.chk_super_res.stateChanged.connect(self.process_image)
        ai_layout.addWidget(self.chk_super_res)
        
        controls_layout.addLayout(ai_layout)

        main_layout.addLayout(controls_layout)

        # Image panels
        images_layout = QHBoxLayout()
        self.lbl_original = DropLabel("Drag and Drop Original Image Here")
        images_layout.addWidget(self.lbl_original)

        self.lbl_processed = DropLabel("Processed Image")
        self.lbl_processed.setAcceptDrops(False)
        images_layout.addWidget(self.lbl_processed)

        main_layout.addLayout(images_layout)
        main_layout.setStretch(1, 1)

    def init_webcam_tab(self, parent):
        layout = QVBoxLayout()
        parent.setLayout(layout)
        
        controls = QHBoxLayout()
        self.btn_start_cam = QPushButton("Start Camera")
        self.btn_start_cam.clicked.connect(self.toggle_camera)
        controls.addWidget(self.btn_start_cam)
        
        self.cam_effect = QComboBox()
        self.cam_effect.addItems(["pencil", "color_pencil", "watercolor", "cartoon", "none"])
        controls.addWidget(self.cam_effect)
        
        layout.addLayout(controls)
        
        self.lbl_cam = QLabel("Webcam Feed")
        self.lbl_cam.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.lbl_cam.setStyleSheet("background-color: black; color: white;")
        layout.addWidget(self.lbl_cam)
        layout.setStretch(1, 1)
        
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_frame)

    def on_tab_change(self, index):
        if index != 1 and self.cap is not None:
            self.stop_camera()

    def toggle_camera(self):
        if self.cap is None:
            self.cap = cv2.VideoCapture(0)
            self.timer.start(30) # ~30fps
            self.btn_start_cam.setText("Stop Camera")
        else:
            self.stop_camera()
            
    def stop_camera(self):
        self.timer.stop()
        if self.cap:
            self.cap.release()
            self.cap = None
        self.lbl_cam.clear()
        self.lbl_cam.setText("Webcam Feed Stopped")
        self.btn_start_cam.setText("Start Camera")

    def update_frame(self):
        if self.cap is None: return
        ret, frame = self.cap.read()
        if ret:
            effect = self.cam_effect.currentText()
            try:
                frame = apply_effect(frame, effect, blur_size=21, do_bg_remove=False, do_super_res=False)
            except Exception as e:
                pass
            
            rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            h, w, ch = rgb_image.shape
            bytes_per_line = ch * w
            qt_img = QImage(rgb_image.data, w, h, bytes_per_line, QImage.Format.Format_RGB888)
            pixmap = QPixmap.fromImage(qt_img)
            self.lbl_cam.setPixmap(pixmap.scaled(self.lbl_cam.width(), self.lbl_cam.height(), Qt.AspectRatioMode.KeepAspectRatio))

    def open_image(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Open Image", "", "Images (*.png *.jpeg *.jpg)")
        if file_name:
            self.lbl_original.image_path = file_name
            self.lbl_original.set_image(file_name)
            self.process_image()

    def process_image(self):
        if not hasattr(self, 'lbl_original') or not self.lbl_original.image_path:
            return

        try:
            img = cv2.imread(self.lbl_original.image_path)
            if img is None:
                raise ValueError("Failed to read image.")

            # Make blur size odd
            b_size = self.slider_blur.value()
            if b_size % 2 == 0: b_size += 1

            self.processed_img_cv = apply_effect(
                img, 
                effect=self.effect_combo.currentText(),
                blur_size=b_size,
                do_bg_remove=self.chk_bg_remove.isChecked(),
                do_super_res=self.chk_super_res.isChecked()
            )
            
            self.lbl_processed.set_cv_image(self.processed_img_cv)
            self.btn_save.setEnabled(True)
        except Exception as e:
            # We don't want popups on every slider move if an error occurs (e.g. downloading model)
            print(f"Processing Error: {e}")

    def save_image(self):
        if self.processed_img_cv is None: return
        file_name, _ = QFileDialog.getSaveFileName(self, "Save Image", "", "JPEG (*.jpg);;PNG (*.png)")
        if file_name:
            cv2.imwrite(file_name, self.processed_img_cv)
            QMessageBox.information(self, "Success", f"Saved to {file_name}")

if __name__ == "__main__":
    app = QApplication(sys.path)
    app.setStyle("Fusion")
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
