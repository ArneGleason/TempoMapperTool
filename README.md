# Tempo Mapper Tool

A powerful, web-based application designed to facilitate the creation of precise tempo maps for audio recordings. This tool allows users to align a variable-tempo audio performance with a rhythmic grid (or vice versa), making it essential for remixing, transcription, and music production workflows where strict timing alignment is required.

## 🎯 Aim

The primary goal of the Tempo Mapper Tool is to provide a fluid, interactive interface for manipulating time and tempo. Unlike traditional DAWs where tempo mapping can be clunky, this tool focuses specifically on the workflow of aligning "musical time" (Bars/Beats) with "absolute time" (Seconds), offering specialized visualization and editing capabilities to make the process intuitive and accurate.

## ✨ Key Features

### 1. Interactive Timeline
-   **Tempo Lane**: Visualizes tempo changes over time. Users can add, move, and edit tempo points to define the relationship between the grid and audio.
-   **Audio Lane**: Displays the imported audio waveform.
-   **Navigation**: Smooth zooming and panning to navigate through complex recordings.

### 2. Advanced Waveform Visualization
-   **Dynamic Warping**: The waveform visualization automatically stretches and compresses based on the current tempo map, allowing you to visually verify if the grid aligns with the audio peaks.
-   **Transient Detection**: Enhances visual precision by color-coding transient attacks (Beats) in **Bright Yellow** against a **Dark Green** sustain background.
-   **Hi-DPI Support**: Renders crisp, detailed waveforms on high-resolution displays.

### 3. Precision Editing Controls
-   **Inspector Panel**: A dedicated sidebar for inspecting and editing selected elements.
-   **Multi-Selection**: Select multiple tempo points (Shift+Click or Lasso) to edit them as a group.
-   **Relative Editing**: Moving a group of points maintains their relative positions.
-   **Batch Handling**:
    -   **Average Value/Position**: Edit the average BPM or Location of a group.
    -   **Scale Variance**: Expand or compress the dynamic range of tempo changes within a selection (e.g., exaggerate or flatten tempo drift).
-   **Fine-Tuning**: Hold **SHIFT** while dragging for 1/25th speed precision control.

### 4. Playback & Synchronization
-   **Real-time Playback**: Synchronized audio playback with a moving playhead.
-   **Metronome/Grid**: (Planned/In-Progress) Visual and auditory references to verify alignment.

## 🚀 Getting Started (Local Development)

To run this project locally on your machine:

### Prerequisites
-   [Node.js](https://nodejs.org/) (v16 or higher recommended)
-   npm (comes with Node.js)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/ArneGleason/TempoMapperTool.git
    cd TempoMapperTool
    ```

2.  **Install Dependencies**
    Navigate to the client directory (where the React app lives) and install packages.
    ```bash
    cd client
    npm install
    ```

3.  **Run Development Server**
    Start the local development server.
    ```bash
    npm run dev
    ```

4.  **Open in Browser**
    The terminal will show the local URL (usually `http://localhost:5173/`). Open this link in your web browser.

## 🛠️ Tech Stack
-   **Frontend**: React.js
-   **State Management**: React Context API
-   **Audio**: Web Audio API
-   **Visualization**: HTML5 Canvas (Custom Renderers) & SVG
-   **Build Tool**: Vite

## 📝 License
[MIT](LICENSE) (or whichever license you prefer)
