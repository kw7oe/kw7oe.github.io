---
title: "Run Qwen3.5 Locally in Your macOS"
date: 2026-02-28T19:30:53+08:00
draft: true
---

Recently, Qwen3.5 is one of the hottest model that's being widely discussed. It's a vision-language model and perform quite well
in coding benchmark. This mean that I could host it locally in my Mac Mini, and use it with `opencode`.

I didn't find much resources online on how to set it up. Hence, here's a short article for it.

## Qwen3.5

Qwen3.5 comes with different parameters and quantization level.

For example: [`qwen3.5:35b`](https://ollama.com/library/qwen3.5:35b) refers to Qwen3.5 with 35 billion parameters. It also come with different
quantization level, for example, 4 bit quantization means it's having 4 bit per weight.

With this information, you can calculate the memory usage require using the following formula (from [BentoML](https://bentoml.com/llm/getting-started/calculating-gpu-memory-for-llms)):

```bash
# Memory (GB) = P * (Q / 8) * (1 + Overhead)
35 * 4 / 8 bits * 1.2 = ~21G
```

This mean that you can run this model with M series Mac with 32GB RAM. I'm running with Mac mini with M4 Pro chip, 14-core CPU, 20-core GPU and 64GB Memory.

## Tools

There's multiple ways to run LLM locally in macOS:

- [`ollama`][0]
    - Easiest one to get started, and works out of the box with `opencode`.
- [`mlx`][1]
  - Perform the best but at the time of writing `mlx-vlm` doesn't support tool calling.
  - Without tool calling, you can't really use it to vibe code, since it can't read/edit files.
  - There's a [PR](https://github.com/Blaizzy/mlx-vlm/pull/773) in progress to support that.
- [`llama.cpp`][2]
  - Works with unsloth AI Qwen3.5 with improved tool calling and coding performance. See [here](https://x.com/UnslothAI/status/2027449469596545535?s=20).


I suggest start with `ollama` first and explore the others once you get a hang of it.

### ollama

First of all, install `ollama` followed the isntructions [here](https://ollama.com/). Then run the following:

```bash
# Require 17GB
ollama run qwen3.5:27b

# Require 24GB
ollama run qwen3.5:35b
```

By default, it's running with 4 bit quantization. You can see the details here:
[`qwen3.5:27b`](https://ollama.com/library/qwen3.5:27b) and [`qwen3.5:35b`](https://ollama.com/library/qwen3.5:35b).

To connect it with your `opencode`, run the following command:

```bash
# Replace 'opencode' with 'claude' or 'codex' as you see fit
ollama launch opencode --model qwen3.5:27b
ollama launch opencode --model qwen3.5:35b
```

This will modified your configuration, and then launch `opencode` with Qwen3.5 selected as the model.


![opencode with ollama qwen3.5 selected](/images/opencode-ollama.png)

You can now enter some prompt and test the latency. In my machine, the "How are you?" prompt takes 58 seconds to generate:

![it takes ~58s to response to 'how are you?' prompt](/images/opencode-ollama-response.png)

On my second run, it takes 16.8s.

![it takes ~16s to response to 'how are you?' prompt](/images/opencode-ollama-response-2.png)

That's it! It can probably be tuned further to be faster, but that's a topic for another day.

### MLX

MLX is Apples' machine learning framework. You'll be using `mlx-lm` or `mlx-vlm` to run the models on `mlx`. Since Qwen3.5 is a vision langauge model, you can't run it with just `mlx-lm`. Instead you need to use `mlx-vlm` _(v for vision)_.

I used Homebrew to install `python3` so `pip3 install "mlx-vlm[torch]"` would result in:

```
❯ pip3 install "mlx-vlm[torch]"
error: externally-managed-environment
```

Hence, I'll need to use `pipx` as it suggested:

```bash
brew install pipx
pipx install "mlx-vlm[torch]"
```

With `mlx-vlm` installed, you now pull the model images and test it out with:

```bash
# 27B with 4 bit quantization
mlx_vlm.generate --model mlx-community/Qwen3.5-27B-4bit --max-tokens 100 --temperature 0.0 --prompt "How are you?"

# 35B with 4 bit quantization
mlx_vlm.generate --model mlx-community/Qwen3.5-35B-A3B-4bit --max-tokens 100 --temperature 0.0 --prompt "How are you?"
```

Output:

```
Fetching 14 files: 100%|███████████████████████████████████████████| 14/14 [00:00<00:00, 64175.14it/s]
Download complete: : 0.00B [00:00, ?B/s]                                       | 0/14 [00:00<?, ?it/s]
==========
Files: []

Prompt: <|im_start|>user
How are you?<|im_end|>
<|im_start|>assistant
<think>

Thinking Process:

1.  **Analyze the Request:**
    *   Input: "How are you?"
    *   Intent: A standard greeting/check-in.
    *   Expected Response: A polite, friendly, and helpful response acknowledging the greeting and offering assistance.

2.  **Determine the Tone:**
    *   Friendly, professional, helpful, and concise.
    *   As an AI, I should acknowledge my nature (optional but often good for
==========
Prompt: 14 tokens, 61.059 tokens-per-sec
Generation: 100 tokens, 89.100 tokens-per-sec
Peak memory: 20.464
```

If you want to run with other parameters, you can find it [here](https://huggingface.co/mlx-community/models?search=qwen3.5).

To use it with `opencode`, first start the `mlx-vlm` server with:

```bash
# You could also skip --host 0.0.0.0 and bind to localhost isntead
mlx_vlm.server --port 8088 --host 0.0.0.0
```

Then add this to you `opencode` configuration (for me, it's in `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "mlx-vlm": {
      "models": {
        "mlx-community/Qwen3.5-35B-A3B-4bit": {
          "_launch": false,
          "name": "qwen3.5"
        }
      },
      "name": "MLX VLM (Qwen3.5)",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://127.0.0.1:8088"
      }
    }
}
```

The key for `provider.mlx-vlm.models` should match the huggingface repo name. So change it to
`mlx-community/Qwen3.5-27B-4bit` if you are using the 27B one.

Now run `opencode` and select switch model. You should see the `qwen3.5` options available:

![opencode with mlx-vlm qwen3.5 selected](/images/opencode-mlx.png)

Enter some prompt and test it out. The "How are you?" prompt now takes only 6.4 seconds to generate:

![it takes ~6s to response to 'how are you?' prompt](/images/opencode-mlx-response.png)

You'll notice that when using mlx, the output aren't working well out of the box:

```
The user is asking how I am, which is a casual greeting - I should respond briefly and offer to help.
</think>
I'm doing well, thanks for asking! How can I help you today?
```

It's not showing the thinking UI correctly. This is due to the `mlx-vlm` server doesn't currently support parsing these texts correctly.
When using with `ollama`, it would generate:

```
Thinking: User asked 'How are you?' which is a casual greeting - respond briefly and offer help since this is a conversational exchange.
I'm doing well! How about you? What can I help you with today?
```

MLX is fast, but currently doesn't support tool calling. It's still impressive to use it when tools calling isn't needed.

## llama.cpp

> This part is largely based on unsloth guide over [here][3].

First install llama.cpp following the instructions [here](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md):

```bash
brew install llama.cpp
```

Then, you can start the server with `llama-server`:

```bash
# Config is based on: https://unsloth.ai/docs/models/qwen3.5#thinking-mode-1
llama-server \
  -hf unsloth/Qwen3.5-35B-A3B-GGUF:UD-Q4_K_XL \
  --alias qwen35a3b \
  --ctx-size 16384 \
  --temp 0.6 \
  --top-p 0.95 \
  --top-k 20 \
  --min-p 0.00 \
  --host 0.0.0.0 \
```

Then add this to your opencode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "llama.cpp": {
      "models": {
        "qwen35a3b": {
          "_launch": true,
          "name": "qwen35a3b"
        }
      },
      "name": "llama.cpp (local)",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://127.0.0.1:8080/v1"
      }
    }
  }
}

```

Now run `opencode` and select switch model. You should see the `qwen3.5` options available:

![opencode with llama.cpp qwen3.5 selected](/images/opencode-llamacpp.png)

Enter some prompt and test it out. The "How are you?" prompt now takes only 6.4 seconds to generate:

![it takes ~6s to response to 'how are you?' prompt](/images/opencode-llamacpp-response.png)



[0]: https://ollama.com/
[1]: https://github.com/ml-explore/mlx
[2]: https://github.com/ggml-org/llama.cpp
[3]: https://unsloth.ai/docs/models/qwen3.5#qwen3.5-35b-a3b
