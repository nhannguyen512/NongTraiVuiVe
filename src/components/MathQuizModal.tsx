import React, { useEffect, useState } from 'react';
import { CheckCircle2, HelpCircle, Sparkles, XCircle, Zap } from 'lucide-react';
import type { MathQuestion, PetInstanceState } from '../shared/gameTypes';
import { hasPetSkill } from '../shared/gameTypes';

interface MathQuizModalProps {
  question: MathQuestion;
  combo: number;
  activePet?: PetInstanceState;
  submitting: boolean;
  resultFeedback: {
    isCorrect: boolean;
    correctAnswer: number;
    coinsEarned: number;
    expEarned: number;
  } | null;
  onSelectAnswer: (choice: number) => void;
}

export const MathQuizModal: React.FC<MathQuizModalProps> = ({
  question,
  combo,
  activePet,
  submitting,
  resultFeedback,
  onSelectAnswer,
}) => {
  const [showVisualHint, setShowVisualHint] = useState(false);

  const doubleActive = hasPetSkill(activePet, 'double_score') && combo >= 1;
  const bonusExpActive = hasPetSkill(activePet, 'bonus_exp');

  useEffect(() => {
    setShowVisualHint(false);
  }, [question.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (submitting || resultFeedback) return;
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const idx = Number(e.code.replace('Digit', '')) - 1;
        if (question.choices[idx] !== undefined) {
          onSelectAnswer(question.choices[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [question, submitting, resultFeedback, onSelectAnswer]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/45">
      <div
        className={`w-full max-w-md bg-[#fffdf7] border-2 ${
          resultFeedback
            ? resultFeedback.isCorrect
              ? 'border-emerald-500'
              : 'border-rose-500 animate-shake'
            : question.isBonus
            ? 'border-amber-400'
            : 'border-[#e5dec9]'
        } rounded-3xl p-6 shadow-2xl animate-pop-in`}
      >
        {/* Top Metadata Line (No static pill clutter) */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-3">
          <div className="flex items-center gap-2">
            <span className={question.isBonus ? 'text-amber-600' : 'text-sky-700'}>
              {question.isBonus ? 'Quả Cầu Vàng Thưởng Lớn' : 'Thử Thách Cửu Chương'}
            </span>
            {combo > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-orange-600 tabular-nums">Chuỗi {combo} câu</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowVisualHint((prev) => !prev)}
            className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{showVisualHint ? 'Ẩn gợi ý' : 'Gợi ý ô vuông'}</span>
          </button>
        </div>

        {/* Active Pet Skills Bar */}
        {(doubleActive || bonusExpActive) && (
          <div className="flex items-center gap-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 mb-4">
            <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              {doubleActive && 'Kỹ năng Nhân Đôi (×2 Xu) đang bật'}
              {doubleActive && bonusExpActive && ' · '}
              {bonusExpActive && '+35% EXP thú cưng'}
            </span>
          </div>
        )}

        {/* Question Display */}
        <div className="bg-sky-50 border border-sky-200 rounded-2xl py-6 px-4 text-center mb-4">
          <div className="font-display text-5xl font-bold text-slate-900 tracking-wide tabular-nums">
            {question.a} × {question.b} = ?
          </div>
        </div>

        {/* Optional Visual Multiplication Array Hint for Grades 3-5 */}
        {showVisualHint && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col items-center">
            <p className="text-xs font-semibold text-emerald-800 mb-2 tabular-nums">
              {question.a} hàng × {question.b} chấm tròn
            </p>
            <div className="flex flex-col gap-1">
              {Array.from({ length: question.a }).map((_, rIdx) => (
                <div key={rIdx} className="flex gap-1">
                  {Array.from({ length: question.b }).map((__, cIdx) => (
                    <span key={cIdx} className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer Choices */}
        {!resultFeedback ? (
          <div className="grid grid-cols-2 gap-3">
            {question.choices.map((choice, idx) => (
              <button
                key={choice}
                type="button"
                disabled={submitting}
                onClick={() => onSelectAnswer(choice)}
                className="relative py-4 px-4 rounded-2xl bg-white hover:bg-amber-50 border-2 border-[#e5dec9] hover:border-amber-400 active:scale-95 transition-all font-display text-3xl font-bold text-slate-900 tabular-nums cursor-pointer shadow-sm"
              >
                <span className="absolute top-2 left-3 text-[11px] font-mono-num text-slate-400">
                  [{idx + 1}]
                </span>
                {choice}
              </button>
            ))}
          </div>
        ) : (
          <div
            className={`rounded-2xl p-4 flex items-center justify-between ${
              resultFeedback.isCorrect
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {resultFeedback.isCorrect ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
              )}
              <div>
                <p className="font-display font-bold text-lg">
                  {resultFeedback.isCorrect ? 'Chính xác tuyệt vời!' : 'Chưa đúng mất rồi!'}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  Đáp án: {question.a} × {question.b} = {resultFeedback.correctAnswer}
                </p>
              </div>
            </div>
            {resultFeedback.isCorrect && (
              <div className="text-right font-mono-num text-xs font-bold text-emerald-800">
                <div className="flex items-center gap-1 justify-end">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>+{resultFeedback.coinsEarned} Xu</span>
                </div>
                <div>+{resultFeedback.expEarned} EXP</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
