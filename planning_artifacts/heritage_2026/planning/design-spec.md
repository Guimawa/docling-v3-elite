# Design System & UX Specification: Docling

## ⚡ Design Philosophy: "The Silent Pilot"
Docling is a non-invasive tool. It provides high value with zero cognitive load.

### Visual Identity (Elite 2026)
- **Primary Font**: Outfit (Headings), Inter (Body).
- **Theme**: "Crystal Light" (Pure White #FFFFFF, Soft Sky Blue #F0F9FF, Deep Charcoal #121212).
- **Core Contrast**: Guaranteed 7:1 ratio for outdoor readability.

## 📱 Core UI Screens (MVP)

### 1. The Elite Scanner (The Hero Screen)
- **Full-screen Camera View** with perspective warping overlay.
- **Floating Batch Indicator**: Shows number of documents in current queue.
- **Quick-Shutter**: Large circular button for dirty/gloved hands.

### 2. Validation Dashboard (The Swipe Deck)
- **Cards Display**: UI shows the image on top, extracted data on bottom.
- **Gestures**: 
  - Swipe Right: Validate & Sync.
  - Swipe Left: Edit manually.
  - Long Press: Re-scan.

### 3. The Pricing Map (Market Intelligence)
- **Minimalist Map**: Showing average price points in the localized radius.
- **Heatmap Toggles**: Toggle between "Sand/Gravel", "Cement", "Wood", "Metal".

## 🛠️ Technical Architecture Layer
- **Frontend**: React Native (Expo) + NativeWind v5.
- **State Management**: Zustand (Offline-first persistence).
- **AI Integration**: Gemini 3.1 Flash-Lite (Edge Inference).
- **Backend**: Supabase (Auth/DB) + Cloudflare Workers (API Sync).