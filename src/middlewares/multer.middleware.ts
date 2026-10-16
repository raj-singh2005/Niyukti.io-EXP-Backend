import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Saves to the directory visible in your tree
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // 1. Generate a unique string (Timestamp + Random Number)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    
    // 2. Extract the original file extension (e.g., ".pdf" or ".png")
    const ext = path.extname(file.originalname);
    
    // 3. Extract the base name, remove spaces to prevent URL issues, and combine
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    
    // Result example: "Raj_Resume-1697223456789-123456789.pdf"
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB hard limit to protect server memory
  },
});