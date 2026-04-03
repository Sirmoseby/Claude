import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="relative overflow-hidden bg-slate-950 rounded-2xl p-8 ring-1 ring-white/10 max-w-md w-full">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase mb-2">Get in touch</p>
        <h2 className="text-3xl font-black tracking-tight text-white mb-1">
          Let's <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">talk</span>
        </h2>
        <p className="text-slate-400 text-sm mb-8">We'll get back to you within 24 hours.</p>
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✦</div>
            <p className="text-white font-semibold">Message sent!</p>
            <p className="text-slate-400 text-sm mt-1">We'll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
              <input
                type="text" id="name" name="name"
                value={formData.name} onChange={handleChange} required
                placeholder="Alex Johnson"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:border-violet-400 focus:ring-0 focus:outline-none rounded-xl text-sm transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email" id="email" name="email"
                value={formData.email} onChange={handleChange} required
                placeholder="alex@company.com"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:border-violet-400 focus:ring-0 focus:outline-none rounded-xl text-sm transition-colors"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-xs font-medium text-slate-400 mb-1.5">Message</label>
              <textarea
                id="message" name="message"
                value={formData.message} onChange={handleChange} required rows={4}
                placeholder="Tell us what you're working on..."
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:border-violet-400 focus:ring-0 focus:outline-none rounded-xl text-sm transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150"
            >
              Send message
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  name = "Sarah Chen",
  role = "Head of Product, Stripe",
  quote = "This tool cut our design iteration time in half. The output is remarkably polished — it's become a core part of how our team prototypes.",
  avatar = "SC",
}) => {
  return (
    <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-8 ring-1 ring-white/10 max-w-md w-full hover:scale-[1.02] hover:ring-white/20 transition-all duration-300">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="text-violet-400 text-sm">★</span>
          ))}
        </div>
        <blockquote className="text-white/90 text-lg font-light leading-relaxed mb-8">
          "{quote}"
        </blockquote>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {avatar}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{name}</p>
            <p className="text-slate-400 text-xs">{role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="relative overflow-hidden bg-zinc-950 rounded-2xl p-10 ring-1 ring-white/10 max-w-xs w-full text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" />
      <div className="relative">
        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-6">Counter</p>
        <div className="text-8xl font-black tabular-nums text-white tracking-tighter mb-8">
          {count < 0 ? (
            <span className="text-rose-400">{count}</span>
          ) : count > 0 ? (
            <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">{count}</span>
          ) : (
            <span className="text-zinc-600">0</span>
          )}
        </div>
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={() => setCount(c => c - 1)}
            className="w-10 h-10 rounded-full border border-white/20 text-white/70 hover:border-white/40 hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all duration-150 text-lg font-light"
          >
            −
          </button>
          <button
            onClick={() => setCount(0)}
            className="px-4 py-1.5 rounded-full text-xs font-medium text-zinc-500 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-150"
          >
            reset
          </button>
          <button
            onClick={() => setCount(c => c + 1)}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600 text-white hover:-translate-y-0.5 active:scale-95 transition-all duration-150 text-lg font-light"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    setSubmitted(true);";
      case "card":
        return '    <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-8 ring-1 ring-white/10 max-w-md w-full hover:scale-[1.02] hover:ring-white/20 transition-all duration-300">';
      default:
        return '        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-6">Counter</p>';
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    setSubmitted(true);\n    console.log('Form submitted:', formData);";
      case "card":
        return '    <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-8 ring-1 ring-white/10 max-w-md w-full hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/10 hover:ring-white/20 transition-all duration-300">';
      default:
        return '        <p className="text-xs font-semibold tracking-widest text-violet-500 uppercase mb-6">Counter</p>';
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-12">
      <Card />
    </div>
  );
}`;
    }

    if (componentName === "ContactForm") {
      return `import ContactForm from '@/components/ContactForm';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-12">
      <ContactForm />
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-12">
      <${componentName} />
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
