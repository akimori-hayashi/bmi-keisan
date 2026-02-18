import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface DiagnoseRequest {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  bmi: number;
  bmiCategory: string;
  diagnosisType: string;
  bodyFat?: number;
  waist?: number;
  hip?: number;
}

export interface DiagnoseResponse {
  riskSummary: string;
  comfortComment: string;
  action: string;
  reason: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiagnoseResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    gender,
    age,
    height,
    weight,
    bmi,
    bmiCategory,
    diagnosisType,
    bodyFat,
    waist,
    hip,
  } = req.body as DiagnoseRequest;

  const genderLabel = gender === 'male' ? '男性' : '女性';
  const optionalData = [
    bodyFat !== undefined ? `体脂肪率: ${bodyFat}%` : null,
    waist !== undefined ? `ウエスト周囲径: ${waist}cm` : null,
    hip !== undefined ? `ヒップ周囲径: ${hip}cm` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `以下のユーザーデータを基に、体型診断アドバイスをJSON形式で生成してください。

【ユーザーデータ】
性別: ${genderLabel}
年齢: ${age}歳
身長: ${height}cm
体重: ${weight}kg
BMI: ${bmi.toFixed(1)}（${bmiCategory}）
診断タイプ: 「${diagnosisType}」
${optionalData ? `追加データ:\n${optionalData}` : '（追加データなし）'}

【出力形式】
以下のJSON形式のみ出力してください（コードブロック・説明不要）：

{
  "riskSummary": "健康リスク要約（1〜2文。「このままの生活が続くと〜のリスクが高まりやすい傾向があります」のような柔らかい表現。診断タイプが標準型・筋肉量多め型の場合は「〜を維持できると、〜が期待できます」のようなポジティブな表現）",
  "comfortComment": "安心感を与えるコメント（1〜2文。ユーザーを励ます、前向きな言葉）",
  "action": "今日からできる具体的なアクション（1つだけ。小さくて続けやすいもの）",
  "reason": "そのアクションをすすめる理由（1文。納得感のある説明）"
}

【重要なルール】
- 明るく、親しみやすいトーン（堅苦しくない）
- 「危険です」「病気になります」「絶対に〜してください」などの断定・命令表現は絶対に使わない
- 「〜傾向があります」「〜しやすい」「〜かもしれません」などの柔らかい表現を使う
- サクサク読める短い文で（各項目2文以内）
- エンタメ要素を入れて楽しく読めるように
- 必ずJSONのみ出力すること（前後に文章不要）`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type' });
    }

    // Extract JSON from response (handle potential code blocks)
    const rawText = content.text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Invalid response format' });
    }

    const parsed = JSON.parse(jsonMatch[0]) as DiagnoseResponse;

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Claude API error:', error);
    // Fallback response when API is not available
    const fallbacks: Record<string, DiagnoseResponse> = {
      '標準型': {
        riskSummary: 'このバランスを維持できると、長期的な健康を保ちやすい傾向があります。',
        comfortComment: '今すぐ何かを変えなきゃ、という状態ではありません。今の生活を大切に続けていきましょう！',
        action: 'まずは毎日の食事に野菜を1品追加するだけでOKです',
        reason: '大きな変化より小さな積み重ねの方が長続きしやすいからです',
      },
      '隠れ肥満型': {
        riskSummary: 'このままの生活が続くと、将来的に代謝が落ちやすい傾向があります。',
        comfortComment: '見た目でわからないだけで、体はちゃんとサインを出しています。焦らず少しずつ向き合いましょう。',
        action: 'まずは1日10〜15分のウォーキングからはじめてみましょう',
        reason: '有酸素運動は体脂肪を燃やす効率がよく、無理なく続けやすいからです',
      },
      '筋肉量多め型': {
        riskSummary: '筋肉量が多く体は頑丈ですが、このまま運動を続けると関節への負担が気になる場合があります。',
        comfortComment: 'BMIの数値より体脂肪率の方があなたには大切な指標です。数字に振り回されないで！',
        action: 'ストレッチやヨガを週2回取り入れてみましょう',
        reason: '筋肉の柔軟性を高めることで、ケガのリスクを下げやすいからです',
      },
      '内臓脂肪リスク型': {
        riskSummary: 'このままの生活が続くと、生活習慣が気になりやすい傾向があります。',
        comfortComment: '気づいた今がスタートライン！少しずつ変えていけば、体は必ず応えてくれます。',
        action: 'まずは1日15分の散歩からで十分です',
        reason: '急な運動は続かない人が多く、散歩なら毎日でも続けやすいからです',
      },
      '痩せすぎ注意型': {
        riskSummary: 'このままの体重が続くと、疲れやすくなったり免疫が下がりやすい傾向があります。',
        comfortComment: '無理に体重を増やそうとしなくて大丈夫。まず食事を楽しむことを大切にしましょう！',
        action: '1日3食のうち1食にたんぱく質（卵・豆腐・肉など）を意識して加えてみましょう',
        reason: '筋肉や体の基盤づくりにたんぱく質が欠かせないからです',
      },
    };

    const fallback = fallbacks[diagnosisType] || fallbacks['標準型'];
    return res.status(200).json(fallback);
  }
}
