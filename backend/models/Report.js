const mongoose = require("mongoose");

const noiseReportSchema = new mongoose.Schema({
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ["audio", "video"], required: true },
  reason: { type: String, required: true },
  comment: { type: String },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: Object },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NoiseReport", noiseReportSchema);
