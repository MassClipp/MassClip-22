# Test Fixtures

Place test files here:
- `test-video.mp4` - Minimal test video for upload tests
- `test-image.jpg` - Test image for profile pictures
- Add other test assets as needed

You can create a minimal test video with ffmpeg:

\`\`\`bash
ffmpeg -f lavfi -i color=black:s=100x100:d=1 -f lavfi -i anullsrc -shortest test-video.mp4
\`\`\`
