import { NextResponse } from "next/server";

import { getCoachFeedbackLlmConfig } from "@/src/lib/llm/jsonCompletion";

type ChatMessage = {
  role?: unknown;
  content?: unknown;
};

type ChatCompletionBody = {
  model?: unknown;
  messages?: unknown;
  temperature?: unknown;
  stream?: unknown;
  reasoning_effort?: unknown;
};

type ResponsesApiOutputContent = {
  text?: unknown;
};

type ResponsesApiOutputItem = {
  content?: unknown;
};

type ResponsesApiResponse = {
  output_text?: unknown;
  output?: unknown;
};

type ResponsesApiStreamEvent = ResponsesApiResponse & {
  type?: unknown;
  delta?: unknown;
  response?: unknown;
  error?: {
    message?: unknown;
  };
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveEndpoint(baseUrl: string, wireApi: "chat_completions" | "responses") {
  const normalized = trimTrailingSlash(baseUrl);

  if (wireApi === "responses") {
    return normalized.endsWith("/responses") ? normalized : `${normalized}/responses`;
  }

  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

function normalizeMessageContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string") return text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function normalizeRole(role: unknown) {
  const value = asString(role).trim();
  return value === "assistant" || value === "user" || value === "system" || value === "developer"
    ? value
    : "user";
}

function splitMessages(messages: unknown) {
  const normalizedMessages = Array.isArray(messages) ? (messages as ChatMessage[]) : [];
  const instructions: string[] = [];
  const input: Array<{ role: "user" | "assistant" | "system" | "developer"; content: string }> = [];

  for (const message of normalizedMessages) {
    const role = normalizeRole(message.role);
    const content = normalizeMessageContent(message.content).trim();
    if (!content) continue;

    if (role === "system" || role === "developer") {
      instructions.push(content);
      continue;
    }

    input.push({ role, content });
  }

  return {
    instructions: instructions.join("\n\n"),
    input: input.length > 0 ? input : [{ role: "user" as const, content: "Continue the conversation." }],
  };
}

function extractResponsesText(payload: ResponsesApiResponse) {
  const outputText = asString(payload.output_text).trim();
  if (outputText) return outputText;

  if (!Array.isArray(payload.output)) return "";

  return payload.output
    .flatMap((item: ResponsesApiOutputItem) => {
      if (!Array.isArray(item.content)) return [];
      return item.content
        .map((content: ResponsesApiOutputContent) => asString(content.text).trim())
        .filter(Boolean);
    })
    .join("\n")
    .trim();
}

function chatCompletionChunk(content: string, finishReason: string | null = null) {
  return JSON.stringify({
    id: `convoai-proxy-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: getCoachFeedbackLlmConfig().model,
    choices: [
      {
        index: 0,
        delta: finishReason ? {} : { content },
        finish_reason: finishReason,
      },
    ],
  });
}

function streamResponsesAsChatCompletions(upstream: Response) {
  if (!upstream.body) {
    return new Response("data: [DONE]\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffered = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();

      function emit(value: string) {
        controller.enqueue(encoder.encode(value));
      }

      function handleLine(line: string) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) return;

        const data = trimmed.slice("data:".length).trim();
        if (!data || data === "[DONE]") return;

        try {
          const event = JSON.parse(data) as ResponsesApiStreamEvent;
          const errorMessage = asString(event.error?.message).trim();
          if (errorMessage) {
            emit(`data: ${chatCompletionChunk(errorMessage, "error")}\n\n`);
            return;
          }

          const eventType = asString(event.type);
          const delta = asString(event.delta);
          const responseText = event.response
            ? extractResponsesText(event.response as ResponsesApiResponse)
            : "";
          const eventText = extractResponsesText(event);
          const text = delta || responseText || eventText;

          if (text && (eventType.includes("delta") || delta || responseText || eventText)) {
            emit(`data: ${chatCompletionChunk(text)}\n\n`);
          }
        } catch {
          // Ignore provider keepalive/comments or non-JSON chunks.
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffered += decoder.decode(value, { stream: true });
          const lines = buffered.split(/\r?\n/);
          buffered = lines.pop() ?? "";
          for (const line of lines) handleLine(line);
        }

        if (buffered) handleLine(buffered);
        emit(`data: ${chatCompletionChunk("", "stop")}\n\n`);
        emit("data: [DONE]\n\n");
      } catch (error) {
        emit(
          `data: ${chatCompletionChunk(
            error instanceof Error ? error.message : "LLM proxy stream failed.",
            "error",
          )}\n\n`,
        );
        emit("data: [DONE]\n\n");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  const config = getCoachFeedbackLlmConfig();
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!config.apiKey || bearer !== config.apiKey) {
    return NextResponse.json({ error: "Unauthorized LLM proxy request." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ChatCompletionBody;
  const { instructions, input } = splitMessages(body.messages);
  const model = asString(body.model).trim() || config.model;
  const temperature = typeof body.temperature === "number" ? body.temperature : undefined;
  const reasoningEffort = asString(body.reasoning_effort).trim() || config.reasoningEffort;

  const upstreamBody =
    config.wireApi === "responses"
      ? {
          model,
          input,
          ...(instructions ? { instructions } : {}),
          ...(temperature === undefined ? {} : { temperature }),
          ...(body.stream === false ? {} : { stream: true }),
          ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
        }
      : body;

  const upstreamResponse = await fetch(resolveEndpoint(config.baseUrl, config.wireApi), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamBody),
    cache: "no-store",
  });

  if (!upstreamResponse.ok) {
    const details = await upstreamResponse.text().catch(() => "");
    return NextResponse.json(
      { error: `Upstream LLM failed with HTTP ${upstreamResponse.status}.`, details },
      { status: upstreamResponse.status },
    );
  }

  if (config.wireApi !== "responses") {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
      },
    });
  }

  if (body.stream === false) {
    const payload = (await upstreamResponse.json()) as ResponsesApiResponse;
    const content = extractResponsesText(payload);
    return NextResponse.json({
      id: `convoai-proxy-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    });
  }

  return streamResponsesAsChatCompletions(upstreamResponse);
}
