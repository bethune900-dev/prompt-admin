import { PromptData, ModelType } from './types';

export const DEFAULT_CONFIG = {
  model: ModelType.FLASH,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
};

export const INITIAL_PROMPTS: PromptData[] = [
  {
    id: '1',
    title: '中文翻译专家',
    description: '将任何文本翻译成地道、优雅的中文。',
    systemInstruction: '你是一位精通多国语言的专业翻译家。你的目标是将原文翻译成信、达、雅的简体中文。不要逐字翻译，要根据语境调整语序和用词，使其符合中文母语者的阅读习惯。',
    template: '请将以下文本翻译成中文：\n\n{{text}}',
    tags: ['工具', '翻译'],
    config: DEFAULT_CONFIG,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    history: [],
    isFavorite: true,
  },
  {
    id: '2',
    title: '代码解释器',
    description: '解释复杂的代码片段，适合学习和Code Review。',
    systemInstruction: '你是一位资深软件工程师和教育家。请用通俗易懂的语言解释用户提供的代码。涵盖代码的功能、逻辑流、潜在的性能问题以及最佳实践建议。',
    template: '请解释这段 {{language}} 代码：\n\n```{{language}}\n{{code}}\n```',
    tags: ['编程', '学习'],
    config: { ...DEFAULT_CONFIG, model: ModelType.PRO },
    updatedAt: Date.now(),
    createdAt: Date.now(),
    history: [],
    isFavorite: false,
  },
  {
    id: '3',
    title: '创意小红书文案',
    description: '生成吸引人的社交媒体文案，带Emoji。',
    systemInstruction: '你是一位小红书爆款文案写手。你的文案风格应该是：热情、亲切、使用大量的Emoji，段落短小精悍。',
    template: '请为主题“{{topic}}”写一篇小红书文案。核心卖点是：{{features}}。',
    tags: ['创作', '社交媒体'],
    config: { ...DEFAULT_CONFIG, temperature: 0.9 },
    updatedAt: Date.now(),
    createdAt: Date.now(),
    history: [],
    isFavorite: false,
  }
];