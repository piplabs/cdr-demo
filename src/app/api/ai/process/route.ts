import { NextResponse } from "next/server";
import { keccak256, toHex } from "viem";

const POSITIVE_WORDS = ["good", "great", "love", "excellent", "amazing", "best", "happy", "recommend", "wonderful", "fantastic", "beautiful", "perfect", "awesome", "brilliant", "outstanding"];
const NEGATIVE_WORDS = ["bad", "terrible", "hate", "worst", "awful", "poor", "disappointing", "horrible", "ugly", "dreadful", "boring", "useless", "annoying", "disgusting"];

function sentimentAnalyzer(input: string) {
  const words = input.toLowerCase().split(/\s+/);
  const posCount = words.filter((w) => POSITIVE_WORDS.includes(w)).length;
  const negCount = words.filter((w) => NEGATIVE_WORDS.includes(w)).length;
  const total = words.length || 1;
  const score = (posCount - negCount) / total;
  const sentiment = score > 0.05 ? "positive" : score < -0.05 ? "negative" : "neutral";
  const confidence = Math.min(Math.abs(score) * 10, 0.99);
  const keywords = words.filter((w) => POSITIVE_WORDS.includes(w) || NEGATIVE_WORDS.includes(w));
  return { sentiment, confidence: Math.round(confidence * 100) / 100, keywords: [...new Set(keywords)] };
}

function textSummarizer(input: string) {
  const sentences = input.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const words = input.split(/\s+/).filter(Boolean);
  const summary = sentences.length > 2
    ? `${sentences[0]}. ... ${sentences[sentences.length - 1]}.`
    : input;
  return {
    word_count: words.length,
    sentence_count: sentences.length,
    summary,
    reading_time: `${Math.max(1, Math.ceil(words.length / 200))} min`,
  };
}

function entityExtractor(input: string) {
  const emails = input.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
  const urls = input.match(/https?:\/\/[^\s]+/g) || [];
  const numbers = input.match(/\b\d+\.?\d*\b/g) || [];
  const names = input.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  return { emails, urls, numbers, names: [...new Set(names)] };
}

const MODELS: Record<number, { name: string; fn: (input: string) => unknown }> = {
  0: { name: "Sentiment Analyzer", fn: sentimentAnalyzer },
  1: { name: "Text Summarizer", fn: textSummarizer },
  2: { name: "Entity Extractor", fn: entityExtractor },
};

export async function POST(request: Request) {
  const body = await request.json();
  const { modelId, input } = body;

  const model = MODELS[modelId];
  if (!model) {
    return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
  }
  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "Input required" }, { status: 400 });
  }

  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));

  const result = model.fn(input);
  const resultJson = JSON.stringify(result);
  const attestation = keccak256(toHex(new TextEncoder().encode(resultJson)));

  return NextResponse.json({ result, attestation });
}
