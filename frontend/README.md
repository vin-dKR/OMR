# OMR Answer Checker Frontend

A React-based frontend for the OMR Answer Checker application that uses AI to process and grade OMR answer sheets.

## Features

- **Dual AI Support**: Choose between OpenAI GPT-4 Vision and Google Gemini
- **Batch Processing**: Process multiple student response sheets efficiently
- **One-by-One Processing**: Reliable image processing with individual error handling
- **Local Storage**: Results are saved locally and can be exported as JSON
- **Environment Variables**: Support for API keys via `.env` file

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

You have two options for configuring API keys:

#### Option A: Environment Variables (Recommended)

Create a `.env` file in the frontend root directory:

```bash
# AI Provider API Keys
VITE_OPENAI_API_KEY=your_actual_openai_api_key_here
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Note**: The `VITE_` prefix is required for Vite to expose these variables to the frontend.

#### Option B: Manual Entry

Enter your API keys directly in the application UI:
- OpenAI: Get your key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Gemini: Get your key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 3. Start Development Server

```bash
npm run dev
```

## Environment Variables Priority

1. **Environment Variables** (highest priority)
2. **Manually Entered Keys** (can override env vars)
3. **Default Configuration** (lowest priority)

## Usage

1. **Select AI Provider**: Choose between OpenAI or Gemini
2. **Upload Answer Key**: Upload the correct answer sheet
3. **Upload Student Sheets**: Upload up to 30 student response sheets
4. **Process**: Click "Process with AI" to start processing
5. **View Results**: Results are displayed and automatically saved locally

## API Key Security

- API keys are stored locally in your browser's localStorage
- Environment variables are loaded at build time
- Keys are never sent to our servers
- Images are processed directly by the selected AI provider

## Supported Models

### OpenAI
- GPT-4 Vision Preview (recommended)
- GPT-4o
- GPT-4o Mini

### Gemini
- Gemini 1.5 Flash (fast, cost-effective)
- Gemini 1.5 Pro (high accuracy)
- Gemini 2.0 Flash (latest features)

## Cost Estimation

- **OpenAI**: ~$0.01 per 1K input tokens, $0.03 per 1K output tokens
- **Gemini**: ~$0.0025 per 1K input tokens, $0.0075 per 1K output tokens

Gemini is typically 2-4x cheaper for similar processing tasks.

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### API Key Issues
- Ensure your `.env` file is in the frontend root directory
- Check that environment variable names start with `VITE_`
- Verify API keys are valid and have sufficient credits

### Processing Issues
- Try switching between AI providers
- Ensure images are clear and well-lit
- Check that OMR sheets have distinct bubble markings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
