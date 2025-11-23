# AgentLink Visualizer

A web-based visualization tool for exploring cross-references between AGENTS.md and CLAUDE.md files in your repositories.

## Features

- **Efficient file browsing** - Uses File System Access API (Chrome/Edge required)
- **Memory optimized** - Only reads AGENTS.md and CLAUDE.md files, ignoring all other file types
- Interactive force-directed graph visualization
- File tree explorer
- Markdown content viewer with syntax highlighting
- Support for relative path references (`@../path`, `@./file`, etc.)
- Filter by parse mode (CLAUDE.md or AGENTS.md)

## Installation

**Prerequisites:** Node.js 16+ and pnpm (or npm)

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd agentlink-visualizer
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or: npm install
   ```

3. Run the development server:
   ```bash
   pnpm run dev
   # or: npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## Usage

1. Click **"Select Local Folder"** in the top-right corner
2. Select a folder containing `AGENTS.md` or `CLAUDE.md` files
3. The app will scan the directory tree and load only the relevant files
4. Switch between "Parse CLAUDE.md" and "Parse AGENTS.md" modes to see different relationship graphs
5. Click on nodes to view file contents
6. Drag nodes to rearrange the graph

## How It Works

AgentLink visualizes cross-references between markdown files in your repository:

- **CLAUDE.md files** - Project rules and context files
- **AGENTS.md files** - Agent coordination and task delegation files

The visualizer uses the **File System Access API** to efficiently browse your local folders without loading unnecessary files into memory. It only reads `AGENTS.md` and `CLAUDE.md` files, making it suitable for large projects with 1000+ markdown files.

The app parses `@path/to/file` references and creates an interactive graph showing how these files relate to each other.

## Deployment

### GitHub Pages (Free)

1. Build the app:
   ```bash
   pnpm run build
   ```

2. Deploy to GitHub Pages:
   - Push your code to GitHub
   - Go to repository Settings > Pages
   - Set source to "GitHub Actions" or deploy the `dist` folder
   - Your app will be available at `https://<username>.github.io/<repo-name>/`

### Other Platforms

This app can be deployed to any static hosting service:
- Vercel
- Netlify
- Cloudflare Pages
- Any web server (just serve the `dist` folder)

## Browser Compatibility

This app requires a browser that supports the **File System Access API**:
- Chrome 86+
- Edge 86+
- Opera 72+

**Note:** Firefox and Safari are not currently supported due to lack of File System Access API support.

## Technology Stack

- React 19.2
- TypeScript 5.8
- Vite 6.2
- D3.js 7.9 (force-directed graph visualization)
- Lucide React (icons)
- File System Access API

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
