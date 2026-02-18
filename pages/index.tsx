import { useState, useMemo } from 'react';
import Head from 'next/head';
import type { DiagnoseResponse } from './api/diagnose';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Gender = 'male' | 'female';
type DiagnosisType =
  | '標準型'
  | '隠れ肥満型'
  | '筋肉量多め型'
  | '内臓脂肪リスク型'
  | '痩せすぎ注意型';

interface FormData {
  gender: Gender | '';
  height: number | '';
  weight: number | '';
  age: number | '';
  bodyFat: number | '';
  waist: number | '';
  hip: number | '';
}

interface DiagnosisResult {
  bmi: number;
  bmiCategory: string;
  diagnosisType: DiagnosisType;
  advice: DiagnoseResponse;
  formData: {
    gender: Gender;
    age: number;
    height: number;
    weight: number;
    bodyFat?: number;
    waist?: number;
    hip?: number;
  };
}

// ─────────────────────────────────────────────
// Constants & Config
// ─────────────────────────────────────────────
const DIAGNOSIS_CONFIG: Record<
  DiagnosisType,
  { emoji: string; tagline: string; gradientFrom: string; gradientTo: string; textColor: string; bgLight: string; borderColor: string }
> = {
  '標準型': {
    emoji: '🌿',
    tagline: 'バランスの取れた理想的な体型です',
    gradientFrom: 'from-emerald-400',
    gradientTo: 'to-teal-500',
    textColor: 'text-emerald-700',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  '隠れ肥満型': {
    emoji: '🎭',
    tagline: '見た目と体内の状態にギャップがあるタイプ',
    gradientFrom: 'from-violet-400',
    gradientTo: 'to-purple-500',
    textColor: 'text-violet-700',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  '筋肉量多め型': {
    emoji: '💪',
    tagline: '筋肉多めの頼もしいアスリート体型',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-indigo-500',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  '内臓脂肪リスク型': {
    emoji: '⚡',
    tagline: 'お腹周りのケアが鍵を握るタイプ',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-orange-500',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  '痩せすぎ注意型': {
    emoji: '🌸',
    tagline: '栄養と休養をしっかり摂りたいタイプ',
    gradientFrom: 'from-pink-400',
    gradientTo: 'to-rose-500',
    textColor: 'text-pink-700',
    bgLight: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
};

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────
function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return '低体重';
  if (bmi < 25) return '普通体重';
  if (bmi < 30) return '肥満（1度）';
  return '肥満（2度以上）';
}

function getDiagnosisType(
  bmi: number,
  gender: Gender,
  bodyFat?: number,
  waist?: number
): DiagnosisType {
  if (bmi < 18.5) return '痩せすぎ注意型';

  if (bodyFat !== undefined) {
    const highFatThreshold = gender === 'male' ? 25 : 30;
    const lowFatThreshold = gender === 'male' ? 15 : 20;
    if (bmi < 25 && bodyFat >= highFatThreshold) return '隠れ肥満型';
    if (bmi >= 25 && bodyFat <= lowFatThreshold) return '筋肉量多め型';
  }

  if (waist !== undefined) {
    const threshold = gender === 'male' ? 85 : 90;
    if (waist >= threshold) return '内臓脂肪リスク型';
  }

  if (bmi < 25) return '標準型';
  return '内臓脂肪リスク型';
}

function getBMIGaugePosition(bmi: number): number {
  // Map BMI 10-40 → 0-100%
  return Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100));
}

function getBMIColor(bmi: number): string {
  if (bmi < 18.5) return '#60a5fa'; // blue
  if (bmi < 25) return '#34d399'; // green
  if (bmi < 30) return '#fbbf24'; // amber
  return '#f87171'; // red
}

function generateRange(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

// ─────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────
function BMIGauge({ bmi }: { bmi: number }) {
  const position = getBMIGaugePosition(bmi);
  const color = getBMIColor(bmi);

  return (
    <div className="mt-4">
      <div className="relative h-5 rounded-full overflow-visible bg-gradient-to-r from-blue-300 via-emerald-300 via-yellow-300 to-red-400">
        {/* Zone labels */}
        <div className="absolute -top-5 left-0 text-xs text-slate-400" style={{ left: '0%' }}>低体重</div>
        <div className="absolute -top-5 text-xs text-slate-400" style={{ left: '28%' }}>普通</div>
        <div className="absolute -top-5 text-xs text-slate-400" style={{ left: '56%' }}>過体重</div>
        <div className="absolute -top-5 text-xs text-slate-400" style={{ left: '78%' }}>肥満</div>

        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg transition-all duration-700"
          style={{ left: `${position}%`, backgroundColor: color }}
        />
      </div>

      {/* Scale numbers */}
      <div className="relative mt-2 text-xs text-slate-400">
        <span className="absolute" style={{ left: '0%' }}>10</span>
        <span className="absolute -translate-x-1/2" style={{ left: '28%' }}>18.5</span>
        <span className="absolute -translate-x-1/2" style={{ left: '50%' }}>25</span>
        <span className="absolute -translate-x-1/2" style={{ left: '67%' }}>30</span>
        <span className="absolute -translate-x-full" style={{ left: '100%' }}>40+</span>
      </div>
    </div>
  );
}

function AdviceSection({
  icon,
  label,
  content,
  className = '',
}: {
  icon: string;
  label: string;
  content: string;
  className?: string;
}) {
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${className}`}>
      <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
        <p className="text-slate-700 text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="loading-dot w-2 h-2 rounded-full bg-white inline-block" />
      <span className="loading-dot w-2 h-2 rounded-full bg-white inline-block" />
      <span className="loading-dot w-2 h-2 rounded-full bg-white inline-block" />
    </span>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState<'form' | 'loading' | 'result'>('form');
  const [showOptional, setShowOptional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const [formData, setFormData] = useState<FormData>({
    gender: '',
    height: '',
    weight: '',
    age: '',
    bodyFat: '',
    waist: '',
    hip: '',
  });

  // Realtime BMI preview
  const previewBMI = useMemo(() => {
    if (formData.height === '' || formData.weight === '') return null;
    return calculateBMI(Number(formData.weight), Number(formData.height));
  }, [formData.height, formData.weight]);

  const isFormValid =
    formData.gender !== '' &&
    formData.height !== '' &&
    formData.weight !== '' &&
    formData.age !== '';

  function handleChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value === '' ? '' : Number(value) }));
  }

  function handleGenderChange(value: Gender) {
    setFormData((prev) => ({ ...prev, gender: value }));
  }

  async function handleSubmit() {
    if (!isFormValid) return;

    setStep('loading');
    setError(null);

    const bmi = calculateBMI(Number(formData.weight), Number(formData.height));
    const bmiCategory = getBMICategory(bmi);
    const diagnosisType = getDiagnosisType(
      bmi,
      formData.gender as Gender,
      formData.bodyFat !== '' ? Number(formData.bodyFat) : undefined,
      formData.waist !== '' ? Number(formData.waist) : undefined
    );

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: formData.gender,
          age: Number(formData.age),
          height: Number(formData.height),
          weight: Number(formData.weight),
          bmi,
          bmiCategory,
          diagnosisType,
          bodyFat: formData.bodyFat !== '' ? Number(formData.bodyFat) : undefined,
          waist: formData.waist !== '' ? Number(formData.waist) : undefined,
          hip: formData.hip !== '' ? Number(formData.hip) : undefined,
        }),
      });

      if (!response.ok) throw new Error('API error');

      const advice = await response.json() as DiagnoseResponse;

      setResult({
        bmi,
        bmiCategory,
        diagnosisType,
        advice,
        formData: {
          gender: formData.gender as Gender,
          age: Number(formData.age),
          height: Number(formData.height),
          weight: Number(formData.weight),
          bodyFat: formData.bodyFat !== '' ? Number(formData.bodyFat) : undefined,
          waist: formData.waist !== '' ? Number(formData.waist) : undefined,
          hip: formData.hip !== '' ? Number(formData.hip) : undefined,
        },
      });
      setStep('result');
    } catch {
      setError('診断中にエラーが発生しました。もう一度お試しください。');
      setStep('form');
    }
  }

  function handleReset() {
    setStep('form');
    setResult(null);
    setError(null);
    setFormData({ gender: '', height: '', weight: '', age: '', bodyFat: '', waist: '', hip: '' });
    setShowOptional(false);
  }

  function handleShare() {
    if (!result) return;
    const config = DIAGNOSIS_CONFIG[result.diagnosisType];
    const hasOptional = result.formData.bodyFat || result.formData.waist || result.formData.hip;
    const tweet = [
      `【体型診断】${config.emoji} ${result.diagnosisType}`,
      ``,
      `BMI: ${result.bmi}（${result.bmiCategory}）`,
      `${result.formData.gender === 'male' ? '男性' : '女性'} / ${result.formData.age}歳`,
      hasOptional ? `（詳細データあり）` : ``,
      ``,
      result.advice.action,
      ``,
      `#体型診断 #BMI計算 #健康チェック`,
    ]
      .filter((line) => line !== undefined)
      .join('\n')
      .trim();

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const heightOptions = generateRange(100, 230);
  const weightOptions = generateRange(10, 200);
  const ageOptions = generateRange(10, 100);
  const bodyFatOptions = generateRange(1, 70);
  const waistOptions = generateRange(40, 200);
  const hipOptions = generateRange(40, 200);

  return (
    <>
      <Head>
        <title>体型診断 BMI計算ツール</title>
        <meta name="description" content="身長・体重・性別・年齢を入力するだけで、あなたの体型タイプを診断。AIによる詳細なアドバイスも。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Background */}
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-500">
        {/* Hero Header */}
        <div className="text-center pt-10 pb-6 px-4">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-white text-sm font-medium mb-4">
            <span>✨</span>
            <span>AI体型診断ツール</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            あなたの体型タイプ、<br className="sm:hidden" />診断します
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-sm mx-auto">
            4つの項目を入力するだけで、あなたに合った体型タイプとアドバイスがわかります
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-xl mx-auto px-4 pb-16">
          {step === 'form' && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-teal-500 to-blue-500 px-6 py-4">
                <h2 className="text-white font-bold text-lg">基本情報を入力</h2>
                <p className="text-white/70 text-xs mt-0.5">すべて必須項目です</p>
              </div>

              <div className="px-6 py-6 space-y-5">
                {/* Gender */}
                <div>
                  <label className="form-label">性別</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => handleGenderChange(g)}
                        className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
                          formData.gender === g
                            ? 'border-teal-400 bg-teal-50 text-teal-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {g === 'male' ? '👨 男性' : '👩 女性'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label className="form-label">年齢</label>
                  <select
                    className="form-select"
                    value={formData.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {ageOptions.map((v) => (
                      <option key={v} value={v}>{v}歳</option>
                    ))}
                  </select>
                </div>

                {/* Height & Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">身長</label>
                    <select
                      className="form-select"
                      value={formData.height}
                      onChange={(e) => handleChange('height', e.target.value)}
                    >
                      <option value="">選択</option>
                      {heightOptions.map((v) => (
                        <option key={v} value={v}>{v} cm</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">体重</label>
                    <select
                      className="form-select"
                      value={formData.weight}
                      onChange={(e) => handleChange('weight', e.target.value)}
                    >
                      <option value="">選択</option>
                      {weightOptions.map((v) => (
                        <option key={v} value={v}>{v} kg</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Realtime BMI Preview */}
                {previewBMI !== null && (
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">BMI プレビュー</p>
                    <p className="text-2xl font-black text-slate-700">
                      {previewBMI}
                      <span className="text-sm font-normal text-slate-400 ml-1">
                        （{getBMICategory(previewBMI)}）
                      </span>
                    </p>
                  </div>
                )}

                {/* Optional Fields Toggle */}
                <div className="border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setShowOptional(!showOptional)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    <span>
                      <span className="mr-2">✨</span>
                      任意項目を追加する（より詳しい診断）
                    </span>
                    <span className={`transition-transform duration-200 ${showOptional ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  <p className="text-xs text-slate-400 mt-1 ml-6">
                    入力するとAIがより詳細な体型診断を行います
                  </p>
                </div>

                {/* Optional Fields */}
                {showOptional && (
                  <div className="space-y-4 animate-fade-in bg-teal-50/50 rounded-2xl p-4 border border-teal-100">
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">任意項目</p>

                    {/* Body Fat */}
                    <div>
                      <label className="form-label">体脂肪率（%）</label>
                      <select
                        className="form-select"
                        value={formData.bodyFat}
                        onChange={(e) => handleChange('bodyFat', e.target.value)}
                      >
                        <option value="">入力しない</option>
                        {bodyFatOptions.map((v) => (
                          <option key={v} value={v}>{v}%</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-400 mt-1">
                        隠れ肥満・筋肉量多め型の診断に使用
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Waist */}
                      <div>
                        <label className="form-label">ウエスト（cm）</label>
                        <select
                          className="form-select"
                          value={formData.waist}
                          onChange={(e) => handleChange('waist', e.target.value)}
                        >
                          <option value="">入力しない</option>
                          {waistOptions.map((v) => (
                            <option key={v} value={v}>{v} cm</option>
                          ))}
                        </select>
                      </div>
                      {/* Hip */}
                      <div>
                        <label className="form-label">ヒップ（cm）</label>
                        <select
                          className="form-select"
                          value={formData.hip}
                          onChange={(e) => handleChange('hip', e.target.value)}
                        >
                          <option value="">入力しない</option>
                          {hipOptions.map((v) => (
                            <option key={v} value={v}>{v} cm</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  className="btn-primary"
                >
                  体型診断を始める →
                </button>

                <p className="text-center text-xs text-slate-400">
                  入力内容は保存・送信されません
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {step === 'loading' && (
            <div className="bg-white rounded-3xl shadow-2xl p-12 text-center animate-fade-in">
              <div className="text-6xl mb-6 animate-pulse-slow">🤖</div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">AI が診断中...</h2>
              <p className="text-slate-400 text-sm mb-6">あなたのデータを分析しています</p>
              <div className="flex justify-center gap-2">
                <LoadingDots />
              </div>
              <div className="mt-8 space-y-2">
                {['体型タイプを判定中', 'リスクを分析中', 'アドバイスを生成中'].map((text, i) => (
                  <div
                    key={text}
                    className="flex items-center gap-2 text-sm text-slate-400 justify-center"
                    style={{ animationDelay: `${i * 0.5}s` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result State */}
          {step === 'result' && result && (() => {
            const config = DIAGNOSIS_CONFIG[result.diagnosisType];
            const hasOptional = !!(result.formData.bodyFat || result.formData.waist || result.formData.hip);

            return (
              <div className="space-y-4 animate-fade-in">
                {/* Diagnosis Type Card */}
                <div className={`bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} rounded-3xl p-6 text-white shadow-2xl`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">あなたの体型タイプ</p>
                      <h2 className="text-3xl font-black">{result.diagnosisType}</h2>
                      <p className="text-white/80 text-sm mt-1">{config.tagline}</p>
                    </div>
                    <span className="text-6xl">{config.emoji}</span>
                  </div>

                  {/* BMI Display */}
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl font-black">{result.bmi}</span>
                      <div>
                        <p className="text-xs text-white/70">BMI</p>
                        <p className="text-sm font-semibold">{result.bmiCategory}</p>
                      </div>
                    </div>
                    <BMIGauge bmi={result.bmi} />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="bg-white/15 rounded-xl p-2 text-center">
                      <p className="text-white/60 text-xs">性別</p>
                      <p className="font-bold text-sm">{result.formData.gender === 'male' ? '男性' : '女性'}</p>
                    </div>
                    <div className="bg-white/15 rounded-xl p-2 text-center">
                      <p className="text-white/60 text-xs">年齢</p>
                      <p className="font-bold text-sm">{result.formData.age}歳</p>
                    </div>
                    <div className="bg-white/15 rounded-xl p-2 text-center">
                      <p className="text-white/60 text-xs">身長</p>
                      <p className="font-bold text-sm">{result.formData.height}cm</p>
                    </div>
                    <div className="bg-white/15 rounded-xl p-2 text-center">
                      <p className="text-white/60 text-xs">体重</p>
                      <p className="font-bold text-sm">{result.formData.weight}kg</p>
                    </div>
                  </div>

                  {/* Optional data badge */}
                  {hasOptional && (
                    <div className="mt-3 flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 w-fit text-xs font-medium">
                      <span>✨</span>
                      <span>詳細データあり：より精密な診断を実施</span>
                    </div>
                  )}
                </div>

                {/* AI Advice Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  <div className={`px-5 py-3 ${config.bgLight} border-b ${config.borderColor}`}>
                    <p className={`text-xs font-bold uppercase tracking-widest ${config.textColor}`}>
                      🤖 AI 診断アドバイス
                    </p>
                  </div>
                  <div className="p-5 space-y-3">
                    <AdviceSection
                      icon="📊"
                      label="健康リスク要約"
                      content={result.advice.riskSummary}
                      className={`${config.bgLight} ${config.borderColor}`}
                    />
                    <AdviceSection
                      icon="💚"
                      label="安心ひとこと"
                      content={result.advice.comfortComment}
                      className="bg-slate-50 border-slate-200"
                    />
                    <AdviceSection
                      icon="🎯"
                      label="今日からやること1つ"
                      content={result.advice.action}
                      className="bg-slate-50 border-slate-200"
                    />
                    <AdviceSection
                      icon="💡"
                      label="その理由"
                      content={result.advice.reason}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Twitter Share */}
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2.5 py-4 px-6 bg-black text-white font-bold rounded-2xl hover:bg-gray-900 active:scale-95 transition-all duration-200 shadow-lg"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>X（Twitter）でシェアする</span>
                  </button>

                  {/* Retry */}
                  <button
                    onClick={handleReset}
                    className="w-full py-3.5 px-6 bg-white text-slate-600 font-semibold rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all duration-200"
                  >
                    もう一度診断する
                  </button>
                </div>

                {/* Disclaimer */}
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/60">
                  <p className="text-xs text-slate-500 leading-relaxed text-center">
                    ※ この診断はエンターテインメント目的のものです。医療的な診断・アドバイスではありません。
                    健康上の懸念がある場合は、医師や専門家にご相談ください。
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
