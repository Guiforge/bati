# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "mistralai",
#     "python-dotenv",
# ]
# ///

import os
import sys
import argparse

from dotenv import load_dotenv

load_dotenv()

from mistralai import Mistral
from mistralai.models import ToolFileChunk

def main():
    parser = argparse.ArgumentParser(description="Generate an image prompt using Mistral AI.")
    parser.add_argument("prompt", type=str, help="The basic idea for the image.")
    parser.add_argument("--model", type=str, default="mistral-large-latest", help="Mistral model to use")
    parser.add_argument(
        "--image-model",
        type=str,
        default="mistral-medium-2505",
        help="Model used for the image generation agent (default: mistral-medium-2505)",
    )
    parser.add_argument("--output", "-o", type=str, help="Path to save the generated prompt to a file")
    parser.add_argument(
        "--style-file",
        type=str,
        default=None,
        help="Optional path to a text/markdown file containing style constraints to append to the prompt",
    )

    args = parser.parse_args()

    client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

    print(f"🎨 Enhancing prompt for: '{args.prompt}' using {args.model}...")

    try:
        # 1. Enhance the prompt first
        style_hint = ""
        if args.style_file:
            try:
                with open(args.style_file, "r", encoding="utf-8") as f:
                    style_hint = f.read().strip()
            except Exception as e:
                print(f"\n⚠️  Could not read --style-file '{args.style_file}': {e}")

        system_prompt = (
            "You are an expert at writing prompts for AI image generators. "
            "Your task is to take a user's simple idea and expand it into a highly detailed, descriptive prompt "
            "that specifies style, lighting, composition, and mood. Output ONLY the prompt, nothing else."
        )

        user_prompt = f"Create a detailed image generation prompt for: {args.prompt}"
        if style_hint:
            user_prompt += "\n\nStyle constraints to follow:\n" + style_hint

        chat_response = client.chat.complete(
            model=args.model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                }
            ]
        )

        enhanced_prompt = chat_response.choices[0].message.content
        print("\n✨ Enhanced Prompt:\n")
        print(enhanced_prompt)

        # 2. Check if we should generate an image
        should_generate_image = False
        if args.output:
            _, ext = os.path.splitext(args.output)
            if ext.lower() in ['.jpg', '.jpeg', '.png', '.webp']:
                should_generate_image = True

        if should_generate_image:
            print("\n🖼️  Generating image with Mistral Agent...")

            # Per Mistral docs: create an agent with the image_generation tool, then use conversations API.
            image_agent = client.beta.agents.create(
                model=args.image_model,
                name="Image Generation Agent",
                description="Agent used to generate images.",
                instructions="Use the image_generation tool when you have to create images.",
                tools=[{"type": "image_generation"}],
                completion_args={
                    "temperature": 0.3,
                    "top_p": 0.95,
                },
            )

            response = client.beta.conversations.start(
                agent_id=image_agent.id,
                inputs=enhanced_prompt,
            )

            # Find and download generated image(s)
            file_chunks: list[ToolFileChunk] = []
            for output in getattr(response, "outputs", []) or []:
                content = getattr(output, "content", None)
                if isinstance(content, list):
                    for chunk in content:
                        if isinstance(chunk, ToolFileChunk):
                            file_chunks.append(chunk)

            if not file_chunks:
                print("\n❌ No image file was returned by the agent.")
                print("Response:", response)
                sys.exit(2)

            # Save first image to the requested output path, additional images (if any) get a suffix.
            base, ext = os.path.splitext(args.output)
            for i, chunk in enumerate(file_chunks):
                out_path = args.output if i == 0 else f"{base}_{i}{ext or '.png'}"
                print(f"   Downloading image (ID: {chunk.file_id})...")
                file_bytes = client.files.download(file_id=chunk.file_id).read()
                with open(out_path, "wb") as f:
                    f.write(file_bytes)
                file_type = getattr(chunk, "file_type", None)
                if file_type and ext and ext.lower().lstrip(".") != str(file_type).lower():
                    print(f"\n⚠️  Saved a {file_type} file to '{out_path}' (extension is '{ext}').")
                print(f"\n💾 Image saved to: {out_path}")

        else:
            # Just save the text prompt
            if args.output:
                try:
                    with open(args.output, "w") as f:
                        f.write(enhanced_prompt)
                    print(f"\n💾 Text prompt saved to: {args.output}")
                except Exception as e:
                    print(f"\n❌ Error saving to file: {e}")
            else:
                print("\n(Use -o output.png to generate and save an actual image)")

    except Exception as e:
        print(f"Error: {e}")
        # Print full traceback for debugging
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
