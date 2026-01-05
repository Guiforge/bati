# Mistral Image Prompt Generator

This script uses Mistral AI to generate detailed, high-quality prompts for image generation models (like DALL-E, Midjourney, etc.).

**Note:** Mistral AI currently provides Text and Vision (image understanding) models, but does not have a public API for *generating* images directly. This script helps you leverage Mistral's language capabilities to create better images with other tools.

## Setup

1. Install [uv](https://docs.astral.sh/uv/).
2. Get a Mistral API Key from [console.mistral.ai](https://console.mistral.ai/).
3. Set your API key:

   ```bash
   export MISTRAL_API_KEY="your_api_key_here"
   ```

## Usage

Run the script directly with `uv`:

```bash
uv run scripts/generate_image_mistral.py "A futuristic city with flying cars"
```

Generate and save an actual image (uses Mistral Agents built-in `image_generation` tool):

```bash
uv run scripts/generate_image_mistral.py "A futuristic city" -o city.jpg
```

You can also inject a style guide (for consistent art direction):

```bash
uv run scripts/generate_image_mistral.py "A village under construction" -o village.png --style-file docs/prompt.image.md
```

## Arguments

- `prompt`: The basic idea for the image (required).
- `--output`, `-o`: Output path.
  - If the extension is an image type (`.png`, `.jpg`, `.jpeg`, `.webp`), the script will generate and download an image.
  - Otherwise, it saves the generated *text prompt*.
- `--api-key`: Your Mistral API key (optional if set in env).
- `--model`: The Mistral model to use (default: `mistral-large-latest`).
- `--image-model`: Model used for the image generation agent (default: `mistral-medium-2505`).
- `--style-file`: Path to a text/markdown file with style constraints appended to the prompt.
